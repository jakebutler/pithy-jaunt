import { createFileRoute } from '@tanstack/react-router'
import { convexClient } from '@/lib/convex/server'

export const Route = createFileRoute('/api/debug/convex-info')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Get the Convex URL from environment
          const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
          const convexDeployment = process.env.CONVEX_DEPLOYMENT

          // Try to call a known function to verify connection
          let connectionTest = 'not tested'
          try {
            // Try to call a simple query to verify the deployment
            await convexClient.query('repos:getReposByUser' as any, {
              userId: 'invalid' as any,
            })
            connectionTest = 'connected (validation error expected)'
          } catch (error: any) {
            if (error?.message?.includes('Could not find')) {
              connectionTest = `error: ${error.message}`
            } else {
              connectionTest = 'connected (got validation error as expected)'
            }
          }

          return Response.json({
            convexUrl,
            convexDeployment,
            connectionTest,
            note: 'This shows which Convex deployment Vercel is configured to use',
          })
        } catch (error) {
          return Response.json(
            {
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

