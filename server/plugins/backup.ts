/// <reference path="../../worker-configuration.d.ts" />

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', async (event) => {
    const config = useRuntimeConfig()

    if (config.disableAutoBackup) {
      console.info('[backup:kv] Auto backup is disabled by configuration')
      return
    }

    const env = event.env as Cloudflare.Env

    // Run each configured destination independently so one failure can't block the other.
    try {
      await backupKVToR2(env)
    }
    catch (error) {
      console.error('[backup:r2] Backup failed:', error)
    }

    try {
      await backupKVToGitHub(env)
    }
    catch (error) {
      console.error('[backup:github] Backup failed:', error)
    }
  })
})
