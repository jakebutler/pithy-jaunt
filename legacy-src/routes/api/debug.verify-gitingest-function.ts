import { createFileRoute } from '@tanstack/react-router'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'

export const Route = createFileRoute('/api/debug/verify-gitingest-function')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Try to access the function reference (TypeScript check)
          const functionRef = api.repos.updateGitIngestReport

          // Check if the function reference exists
          if (!functionRef) {
            return Response.json(
              {
                success: false,
                error: 'Function reference not found in generated API types',
              },
              { status: 500 }
            )
          }

          // Now actually try to call it with invalid args to verify it's deployed
          // This will fail with validation error if function exists, or "not found" if it doesn't
          try {
            await convexClient.mutation(api.repos.updateGitIngestReport, {
              repoId: 'invalid' as any,
              status: 'pending',
            })
          } catch (error: any) {
            // If we get a "not found" error, the function isn't deployed
            if (
              error?.message?.includes('Could not find') ||
              error?.message?.includes('not found')
            ) {
              return Response.json(
                {
                  success: false,
                  error: 'Function is not deployed to Convex',
                  details: error.message,
                  functionPath: 'api.repos.updateGitIngestReport',
                },
                { status: 500 }
              )
            }
            // Any other error (like validation error) means the function EXISTS
            // This is what we want - it means the function is deployed
          }

          return Response.json({
            success: true,
            message: 'updateGitIngestReport function is available and deployed',
            functionPath: 'api.repos.updateGitIngestReport',
            note: 'Function exists in both TypeScript types and Convex deployment',
          })
        } catch (error) {
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
