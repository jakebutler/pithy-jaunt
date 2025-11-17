import { createFileRoute } from '@tanstack/react-router'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { cleanupWorkspace } from '@/lib/daytona/maintenance'
import { captureError } from '@/lib/sentry/error-handler'

export const Route = createFileRoute('/api/webhook/daytona')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any = {}
        try {
          // Read raw body first
          const rawBody = await request.text()
          console.log('[Daytona Webhook] ========== RAW WEBHOOK BODY ==========')
          console.log(rawBody)
          console.log('[Daytona Webhook] ======================================')
          
          try {
            body = JSON.parse(rawBody)
          } catch (parseError) {
            console.error('[Daytona Webhook] Failed to parse JSON:', parseError)
            return Response.json(
              { error: 'Invalid JSON in webhook body' },
              { status: 400 }
            )
          }

          console.log('[Daytona Webhook] Received webhook:', {
            type: body.type,
            taskId: body.taskId,
            workspaceId: body.workspaceId,
            error: body.error,
            message: body.message,
            status: body.status,
          })

          // Handle workspace creation
          if (body.type === 'workspace.created') {
            const { workspaceId, taskId, status } = body

            const task = await convexClient.query(api.tasks.getTaskById, {
              taskId: taskId as Id<'tasks'>,
            })

            if (task) {
              await convexClient.mutation(api.tasks.updateTaskWorkspace, {
                taskId: task._id,
                assignedWorkspaceId: workspaceId,
              })

              try {
                const existingWorkspace = await convexClient.query(
                  api.workspaces.getWorkspaceByDaytonaId,
                  { daytonaId: workspaceId }
                )

                if (!existingWorkspace) {
                  await convexClient.mutation(api.workspaces.createWorkspace, {
                    daytonaId: workspaceId,
                    template: process.env.DAYTONA_SNAPSHOT_NAME || 'butlerjake/pithy-jaunt-daytona:v1.0.2',
                    assignedTasks: [task._id],
                  })
                } else {
                  await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
                    workspaceId: existingWorkspace._id,
                    status: (status || 'creating') as 'creating' | 'running' | 'stopped' | 'terminated',
                  })
                }
              } catch (workspaceError) {
                console.warn('[Daytona Webhook] Failed to create/update workspace:', workspaceError)
              }
            }
          }

          // Handle workspace status updates
          if (body.type === 'workspace.status') {
            const { workspaceId, status } = body

            const workspace = await convexClient.query(
              api.workspaces.getWorkspaceByDaytonaId,
              { daytonaId: workspaceId }
            )

            if (workspace) {
              await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
                workspaceId: workspace._id,
                status: status as 'creating' | 'running' | 'stopped' | 'terminated',
              })
            }
          }

          // Handle task progress updates
          if (body.type === 'task.progress') {
            const { workspaceId, taskId, error } = body
            const message = error || body.message || 'Task in progress'

            const task = await convexClient.query(api.tasks.getTaskById, {
              taskId: taskId as Id<'tasks'>,
            })

            if (task) {
              try {
                await convexClient.mutation(api.executionLogs.createLog, {
                  taskId: task._id,
                  workspaceId: workspaceId || task.assignedWorkspaceId || '',
                  logs: message,
                  status: 'running',
                })
              } catch (logError) {
                console.warn('[Daytona Webhook] Failed to store progress log:', logError)
              }
            }
          }

          // Handle task execution completion
          if (body.type === 'task.completed') {
            const { workspaceId, taskId, branchName, prUrl, status } = body

            const task = await convexClient.query(api.tasks.getTaskById, {
              taskId: taskId as Id<'tasks'>,
            })

            if (!task) {
              console.warn('[Daytona Webhook] Task not found:', taskId)
              return Response.json(
                { error: 'Task not found' },
                { status: 404 }
              )
            }

            await convexClient.mutation(api.tasks.updateTaskWorkspace, {
              taskId: task._id,
              branchName: branchName || undefined,
              prUrl: prUrl || undefined,
            })

            await convexClient.mutation(api.tasks.updateTaskStatus, {
              taskId: task._id,
              status: status === 'success' ? 'completed' : 'failed',
            })

            try {
              const logMessage = status === 'success' 
                ? `Task completed successfully. PR: ${prUrl || 'N/A'}`
                : `Task completed with status: ${status}`
              
              await convexClient.mutation(api.executionLogs.createLog, {
                taskId: task._id,
                workspaceId: workspaceId || task.assignedWorkspaceId || '',
                logs: logMessage,
                status: status === 'success' ? 'completed' : 'failed',
              })
            } catch (logError) {
              console.warn('[Daytona Webhook] Failed to store completion log:', logError)
            }

            // Update workspace and schedule cleanup
            try {
              const workspace = await convexClient.query(
                api.workspaces.getWorkspaceByDaytonaId,
                { daytonaId: workspaceId || task.assignedWorkspaceId || '' }
              )

              if (workspace) {
                await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
                  workspaceId: workspace._id,
                  status: 'stopped',
                })

                const taskAge = Date.now() - task.updatedAt
                const gracePeriodMs = status === 'success' 
                  ? parseInt(process.env.WORKSPACE_COMPLETION_GRACE_PERIOD_MINUTES || '5') * 60 * 1000
                  : parseInt(process.env.WORKSPACE_FAILED_GRACE_PERIOD_MINUTES || '10') * 60 * 1000

                if (taskAge >= gracePeriodMs) {
                  cleanupWorkspace(
                    workspace._id,
                    workspace.daytonaId,
                    status === 'success' ? 'task_completed' : 'task_failed'
                  ).catch((error) => {
                    console.error('[Daytona Webhook] Failed to cleanup workspace:', error)
                  })
                }
              }
            } catch (error) {
              console.log('[Daytona Webhook] Workspace not found (non-critical):', error)
            }
          }

          // Handle PR creation
          if (body.type === 'pr.created') {
            const { workspaceId, taskId, prUrl, branchName } = body

            const workspace = await convexClient.query(
              api.workspaces.getWorkspaceByDaytonaId,
              { daytonaId: workspaceId }
            )

            if (workspace && workspace.assignedTasks.includes(taskId as Id<'tasks'>)) {
              await convexClient.mutation(api.tasks.updateTaskWorkspace, {
                taskId: taskId as Id<'tasks'>,
                branchName,
                prUrl,
              })

              await convexClient.mutation(api.tasks.updateTaskStatus, {
                taskId: taskId as Id<'tasks'>,
                status: 'needs_review',
              })
            }
          }

          // Handle execution failure
          if (body.type === 'task.failed') {
            const { workspaceId, taskId, error, message } = body
            const errorMessage = error || message || 'Unknown error'
            const details = message || ''

            const task = await convexClient.query(api.tasks.getTaskById, {
              taskId: taskId as Id<'tasks'>,
            })

            if (!task) {
              console.warn('[Daytona Webhook] Task not found:', taskId)
              return Response.json(
                { error: 'Task not found' },
                { status: 404 }
              )
            }

            const isPatchFailure =
              errorMessage.toLowerCase().includes('patch') ||
              errorMessage.toLowerCase().includes('apply') ||
              errorMessage.toLowerCase().includes('conflict') ||
              errorMessage.toLowerCase().includes('context') ||
              errorMessage.toLowerCase().includes('does not exist') ||
              errorMessage.toLowerCase().includes('malformed') ||
              (details && (
                details.toLowerCase().includes('patch') ||
                details.toLowerCase().includes('apply') ||
                details.toLowerCase().includes('git apply')
              ))

            await convexClient.mutation(api.tasks.updateTaskStatus, {
              taskId: task._id,
              status: isPatchFailure ? 'needs_review' : 'failed',
            })

            try {
              const fullErrorDetails = details 
                ? `${errorMessage}\n\nDetails:\n${details}`
                : errorMessage

              await convexClient.mutation(api.executionLogs.createLog, {
                taskId: task._id,
                workspaceId: workspaceId || task.assignedWorkspaceId || '',
                logs: fullErrorDetails,
                status: 'failed',
                error: fullErrorDetails.length > 10000 
                  ? fullErrorDetails.substring(0, 10000) + '\n... (truncated)'
                  : fullErrorDetails,
              })
            } catch (logError) {
              console.warn('[Daytona Webhook] Failed to store error logs:', logError)
            }

            // Update workspace and schedule cleanup
            try {
              const workspace = await convexClient.query(
                api.workspaces.getWorkspaceByDaytonaId,
                { daytonaId: workspaceId || task.assignedWorkspaceId || '' }
              )

              if (workspace) {
                await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
                  workspaceId: workspace._id,
                  status: 'stopped',
                })

                const taskAge = Date.now() - task.updatedAt
                const gracePeriodMs = parseInt(process.env.WORKSPACE_FAILED_GRACE_PERIOD_MINUTES || '10') * 60 * 1000

                if (taskAge >= gracePeriodMs) {
                  cleanupWorkspace(
                    workspace._id,
                    workspace.daytonaId,
                    'task_failed'
                  ).catch((error) => {
                    console.error('[Daytona Webhook] Failed to cleanup workspace:', error)
                  })
                }
              }
            } catch (error) {
              console.log('[Daytona Webhook] Workspace not found (non-critical):', error)
            }
          }

          return Response.json({ status: 'ok' }, { status: 200 })
        } catch (error: any) {
          console.error('Daytona webhook error:', error)
          
          // Capture error in Sentry with webhook context
          captureError(error, {
            operation: 'daytona_webhook',
            webhookType: body?.type,
            taskId: body?.taskId,
            workspaceId: body?.workspaceId,
          })
          
          // Return 200 to prevent Daytona from retrying
          return Response.json(
            { error: 'Webhook processing failed' },
            { status: 200 }
          )
        }
      },
    },
  },
})

