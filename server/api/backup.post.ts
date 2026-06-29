defineRouteMeta({
  openAPI: {
    description: 'Manually trigger a backup to all configured destinations (R2 and/or GitHub)',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async (event) => {
  const env = event.context.cloudflare.env
  const config = useRuntimeConfig(event)

  const destinations: string[] = []

  if (env.R2) {
    await backupKVToR2(env, true)
    destinations.push('r2')
  }

  if (config.githubBackupToken && config.githubBackupRepo) {
    await backupKVToGitHub(env, true)
    destinations.push('github')
  }

  if (!destinations.length) {
    throw createError({
      status: 400,
      statusText: 'No backup destination configured (enable R2 or set NUXT_GITHUB_BACKUP_TOKEN + NUXT_GITHUB_BACKUP_REPO)',
    })
  }

  return {
    success: true,
    message: `Backup completed successfully to: ${destinations.join(', ')}`,
    destinations,
  }
})
