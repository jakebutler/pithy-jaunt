import { createFileRoute } from '@tanstack/react-router'
import { performCleanup, reconcileWorkspaceStates } from '@/lib/daytona/maintenance'

export const Route = createFileRoute('/api/cron/workspace-cleanup')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Verify this is a cron request (Vercel adds Authorization header)
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const startTime = Date.now()
          console.log('[Cron] Starting scheduled workspace cleanup...')

          // Perform cleanup
          const cleanupSummary = await performCleanup()

          // Reconcile workspace states
          const reconciliationResult = await reconcileWorkspaceStates()

          const duration = Date.now() - startTime

          const summary = {
            cleanup: {
              processed: cleanupSummary.processed,
              terminated: cleanupSummary.terminated,
              errors: cleanupSummary.errors,
            },
            reconciliation: {
              reconciled: reconciliationResult.reconciled,
              errors: reconciliationResult.errors,
            },
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          }

          console.log('[Cron] Cleanup complete:', summary)

          return Response.json(summary, { status: 200 })
        } catch (error: any) {
          console.error('[Cron] Error:', error)
          return Response.json(
            {
              error: 'Cleanup failed',
              message: error.message || 'Unknown error',
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
