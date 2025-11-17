import { createFileRoute } from '@tanstack/react-router'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { parseCodeRabbitComment, createTasksFromReport } from '@/lib/coderabbit/parser'

export const Route = createFileRoute('/api/webhook/github')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const eventType = request.headers.get('x-github-event')

          // Handle PR comment events (CodeRabbit reviews)
          if (eventType === 'issue_comment' && body.action === 'created') {
            // Check if comment is on a PR (not an issue)
            if (body.issue.pull_request) {
              // Check if comment is from CodeRabbit
              const isCodeRabbitComment =
                body.comment.user?.login?.toLowerCase().includes('coderabbit') ||
                body.comment.body?.includes('CodeRabbit') ||
                body.comment.body?.includes('## Summary')

              if (isCodeRabbitComment) {
                // Extract repository info
                const repoFullName = body.repository.full_name // owner/repo
                const [owner, name] = repoFullName.split('/')
                const commentBody = body.comment.body

                // Find repository in our database
                const repo = await convexClient.query(api.repos.getRepoByOwnerAndName, {
                  owner,
                  name,
                })

                if (repo) {
                  // Parse CodeRabbit comment into structured report
                  const report = parseCodeRabbitComment(commentBody)

                  // Create tasks from report
                  const tasks = createTasksFromReport(report, repo._id, repo.userId)

                  // Create tasks in Convex
                  for (const task of tasks) {
                    await convexClient.mutation(api.tasks.createTask, {
                      userId: repo.userId,
                      repoId: repo._id,
                      title: task.title,
                      description: task.description,
                      priority: task.priority,
                      initiator: 'coderabbit',
                    })
                  }

                  // Update repository analysis status
                  await convexClient.mutation(api.repos.updateRepoAnalysis, {
                    repoId: repo._id,
                    analyzerStatus: 'completed',
                    lastAnalyzedAt: Date.now(),
                  })
                }
              }
            }
          }

          return Response.json({ status: 'ok' }, { status: 200 })
        } catch (error: any) {
          console.error('GitHub webhook error:', error)
          // Return 200 to prevent GitHub from retrying
          return Response.json(
            { error: 'Webhook processing failed' },
            { status: 200 }
          )
        }
      },
    },
  },
})

