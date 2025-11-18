import { NextRequest, NextResponse } from 'next/server'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { cleanupWorkspace } from '@/lib/daytona/maintenance'
import { captureError } from '@/lib/sentry/error-handler'

export async function POST(request: NextRequest) {
  let body: unknown = {}
  try {
    // Read raw body first
    const rawBody = await request.text()
    console.log('[Daytona Webhook] ========== RAW WEBHOOK BODY ==========')
    console.log(rawBody)
    console.log('[Daytona Webhook] ======================================')
    
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>
    } catch (parseError) {
      console.error('[Daytona Webhook] Failed to parse JSON:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in webhook body' },
        { status: 400 }
      )
    }

    const webhookBody = body as {
      type?: string
      taskId?: string
      workspaceId?: string
      error?: string
      message?: string
      status?: string
      branchName?: string
      prUrl?: string
    }

    console.log('[Daytona Webhook] Received webhook:', {
      type: webhookBody.type,
      taskId: webhookBody.taskId,
      workspaceId: webhookBody.workspaceId,
      error: webhookBody.error,
      message: webhookBody.message,
      status: webhookBody.status,
    })

    // Handle workspace creation
    if (webhookBody.type === 'workspace.created') {
      const { workspaceId, taskId, status } = webhookBody

      if (taskId) {
        const task = await convexClient.query(api.tasks.getTaskById, {
          taskId: taskId as Id<'tasks'>,
        })

        if (task && workspaceId) {
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
                template: process.env.DAYTONA_SNAPSHOT_NAME || 'butlerjake/pithy-jaunt-daytona:v1.0.4',
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
    }

    // Handle workspace status updates
    if (webhookBody.type === 'workspace.status') {
      const { workspaceId, status } = webhookBody

      if (workspaceId) {
        const workspace = await convexClient.query(
          api.workspaces.getWorkspaceByDaytonaId,
          { daytonaId: workspaceId }
        )

        if (workspace && status) {
          await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
            workspaceId: workspace._id,
            status: status as 'creating' | 'running' | 'stopped' | 'terminated',
          })
        }
      }
    }

    // Handle task progress updates
    if (webhookBody.type === 'task.progress') {
      const { workspaceId, taskId, error, message } = webhookBody
      const logMessage = error || message || 'Task in progress'

      if (taskId) {
        const task = await convexClient.query(api.tasks.getTaskById, {
          taskId: taskId as Id<'tasks'>,
        })

        if (task) {
          try {
            await convexClient.mutation(api.executionLogs.createLog, {
              taskId: task._id,
              workspaceId: workspaceId || task.assignedWorkspaceId || '',
              logs: logMessage,
              status: 'running',
            })
          } catch (logError) {
            console.warn('[Daytona Webhook] Failed to store progress log:', logError)
          }
        }
      }
    }

    // Handle task execution completion
    if (webhookBody.type === 'task.completed') {
      const { workspaceId, taskId, branchName, prUrl, status } = webhookBody

      if (!taskId) {
        console.warn('[Daytona Webhook] Task ID missing in completion webhook')
        return NextResponse.json(
          { error: 'Task ID required' },
          { status: 400 }
        )
      }

      const task = await convexClient.query(api.tasks.getTaskById, {
        taskId: taskId as Id<'tasks'>,
      })

      if (!task) {
        console.warn('[Daytona Webhook] Task not found:', taskId)
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }

      await convexClient.mutation(api.tasks.updateTaskWorkspace, {
        taskId: task._id,
        assignedWorkspaceId: task.assignedWorkspaceId,
        branchName: branchName,
        prUrl: prUrl,
      })

      await convexClient.mutation(api.tasks.updateTaskStatus, {
        taskId: task._id,
        status: status === 'success' ? 'completed' : 'failed',
      })

      try {
        const logMessage = status === 'success' 
          ? `Task completed successfully. PR: ${prUrl || 'N/A'}`
          : `Task completed with status: ${status || 'unknown'}`
        
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
    if (webhookBody.type === 'pr.created') {
      const { workspaceId, taskId, prUrl, branchName } = webhookBody

      if (workspaceId && taskId) {
        const workspace = await convexClient.query(
          api.workspaces.getWorkspaceByDaytonaId,
          { daytonaId: workspaceId }
        )

        if (workspace && workspace.assignedTasks.includes(taskId as Id<'tasks'>)) {
          await convexClient.mutation(api.tasks.updateTaskWorkspace, {
            taskId: taskId as Id<'tasks'>,
            assignedWorkspaceId: workspaceId,
            branchName: branchName,
            prUrl: prUrl,
          })

          await convexClient.mutation(api.tasks.updateTaskStatus, {
            taskId: taskId as Id<'tasks'>,
            status: 'needs_review',
          })
        }
      }
    }

    // Handle execution failure
    if (webhookBody.type === 'task.failed') {
      const { workspaceId, taskId, error, message } = webhookBody
      const errorMessage = error || message || 'Unknown error'
      const details = message || ''

      if (!taskId) {
        console.warn('[Daytona Webhook] Task ID missing in failure webhook')
        return NextResponse.json(
          { error: 'Task ID required' },
          { status: 400 }
        )
      }

      const task = await convexClient.query(api.tasks.getTaskById, {
        taskId: taskId as Id<'tasks'>,
      })

      if (!task) {
        console.warn('[Daytona Webhook] Task not found:', taskId)
        return NextResponse.json(
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

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error: unknown) {
    console.error('Daytona webhook error:', error)
    
    const errorToCapture = error instanceof Error ? error : new Error(String(error))
    const webhookBody = body as { type?: string; taskId?: string; workspaceId?: string }
    
    // Capture error in Sentry with webhook context
    captureError(errorToCapture, {
      operation: 'daytona_webhook',
      webhookType: webhookBody?.type,
      taskId: webhookBody?.taskId,
      workspaceId: webhookBody?.workspaceId,
    })
    
    // Return 200 to prevent Daytona from retrying
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 200 }
    )
  }
}

