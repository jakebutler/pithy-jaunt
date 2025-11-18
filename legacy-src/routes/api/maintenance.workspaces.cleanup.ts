import { createFileRoute } from '@tanstack/react-router'
import { performCleanup, reconcileWorkspaceStates } from '@/lib/daytona/maintenance'

export const Route = createFileRoute('/api/maintenance/workspaces/cleanup')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const shouldReconcile = url.searchParams.get('reconcile') !== 'false'

          console.log('[Maintenance API] Starting cleanup...')

          // Perform cleanup
          const cleanupSummary = await performCleanup()

          // Optionally reconcile states
          let reconciliationResult = null
          if (shouldReconcile) {
            console.log('[Maintenance API] Starting reconciliation...')
            reconciliationResult = await reconcileWorkspaceStates()
          }

          const summary = {
            cleanup: {
              processed: cleanupSummary.processed,
              terminated: cleanupSummary.terminated,
              errors: cleanupSummary.errors,
              results: cleanupSummary.results,
            },
            reconciliation: reconciliationResult,
            timestamp: new Date().toISOString(),
          }

          console.log('[Maintenance API] Cleanup complete:', {
            processed: cleanupSummary.processed,
            terminated: cleanupSummary.terminated,
            errors: cleanupSummary.errors,
            reconciled: reconciliationResult?.reconciled || 0,
          })

          return Response.json(summary, { status: 200 })
        } catch (error: any) {
          console.error('[Maintenance API] Error:', error)
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
