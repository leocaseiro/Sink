/// <reference path="../../worker-configuration.d.ts" />

import { Buffer } from 'node:buffer'
import { collectBackupData } from './backup'

interface GitHubBackupConfig {
  token: string
  repo: string
  branch: string
  path: string
}

function getGitHubBackupConfig(): GitHubBackupConfig | null {
  const config = useRuntimeConfig()
  const token = config.githubBackupToken
  const repo = config.githubBackupRepo
  if (!token || !repo) {
    return null
  }
  return {
    token,
    repo,
    branch: config.githubBackupBranch || 'main',
    path: (config.githubBackupPath || 'backups').replace(/^\/+|\/+$/g, ''),
  }
}

async function putGitHubFile(cfg: GitHubBackupConfig, filePath: string, content: string, message: string): Promise<void> {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const apiUrl = `https://api.github.com/repos/${cfg.repo}/contents/${encodedPath}`
  const headers = {
    'Authorization': `Bearer ${cfg.token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'sink-backup',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // GitHub's Contents API needs the current blob SHA to overwrite an existing file.
  let sha: string | undefined
  const existing = await fetch(`${apiUrl}?ref=${encodeURIComponent(cfg.branch)}`, { headers })
  if (existing.ok) {
    sha = ((await existing.json()) as { sha?: string }).sha
  }
  else if (existing.status !== 404) {
    throw new Error(`GitHub GET ${filePath} failed: ${existing.status} ${await existing.text()}`)
  }

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub PUT ${filePath} failed: ${response.status} ${await response.text()}`)
  }
}

export async function backupKVToGitHub(env: Cloudflare.Env, isManual: boolean = false): Promise<void> {
  const cfg = getGitHubBackupConfig()
  if (!cfg) {
    console.info('[backup:github] GitHub backup not configured, skipping')
    return
  }

  const backupData = await collectBackupData(env)
  const content = JSON.stringify(backupData, null, 2)
  const date = backupData.exportedAt.slice(0, 10)
  const snapshotPath = `${cfg.path}/links-${isManual ? 'manual-' : ''}${date}.json`
  const latestPath = `${cfg.path}/latest.json`
  const message = `chore(backup): ${backupData.count} links @ ${backupData.exportedAt}`

  // Dated snapshot (one per day) + always-current latest.json. The repo's commit
  // history is the readable archive with per-day diffs.
  await putGitHubFile(cfg, snapshotPath, content, message)
  await putGitHubFile(cfg, latestPath, content, message)

  console.info(`[backup:github] Backup committed to ${cfg.repo}: ${snapshotPath} (${backupData.count} links)`)
}
