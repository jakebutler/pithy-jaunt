import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { createWorkspace, isDaytonaConfigured } from '@/lib/daytona/client'
import { enhanceTaskPrompt } from '@/lib/task/prompt-enhancer'
import { GitIngestReport } from '@/lib/gitingest/client'
import { captureError } from '@/lib/sentry/error-handler'

export const Route = createFileRoute('/api/task/$taskId/execute')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const startTime = Date.now()
        console.log('[TASK EXECUTE] Starting task execution request')
        
        try {
          const { taskId } = params
          console.log('[TASK EXECUTE] Task ID:', taskId)
          
          // Get authenticated user
          const supabase = createClient(request)
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser()

          if (authError || !user) {
            console.log('[TASK EXECUTE] No user found:', authError?.message)
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          console.log('[TASK EXECUTE] User authenticated:', user.id)

          // Get user from Convex
          const convexUser = await convexClient.query(
            api.users.getUserBySupabaseId,
            { supabaseUserId: user.id }
          )

          if (!convexUser) {
            console.log('[TASK EXECUTE] User not found in Convex')
            return Response.json(
              { error: 'User not found in database' },
              { status: 404 }
            )
          }

          console.log('[TASK EXECUTE] Convex user found:', convexUser._id)

          // Get task
          const task = await convexClient.query(api.tasks.getTaskById, {
            taskId: taskId as Id<'tasks'>,
          })

          if (!task) {
            console.log('[TASK EXECUTE] Task not found:', taskId)
            return Response.json(
              { error: 'Task not found' },
              { status: 404 }
            )
          }

          // Verify user owns the task
          if (task.userId !== convexUser._id) {
            return Response.json(
              { error: 'Forbidden: You don\'t have access to this task' },
              { status: 403 }
            )
          }

          // Check if task is in a valid state for execution
          if (task.status !== 'queued' && task.status !== 'needs_review') {
            return Response.json(
              {
                error: `Task cannot be executed. Current status: ${task.status}`,
              },
              { status: 400 }
            )
          }

          // Parse request body (optional)
          let keepWorkspaceAlive = false
          try {
            const contentType = request.headers.get('content-type')
            if (contentType?.includes('application/json')) {
              const body = await request.json()
              keepWorkspaceAlive = body.keepWorkspaceAlive || false
            }
          } catch (error) {
            // Empty body or invalid JSON is fine, use defaults
          }

          // Get repository info
          const repo = await convexClient.query(api.repos.getRepoById, {
            repoId: task.repoId,
          })

          if (!repo || !repo.url || !repo.branch) {
            return Response.json(
              { error: 'Repository not found or missing required fields' },
              { status: 404 }
            )
          }

          // Validate task has model preference
          if (!task.modelPreference || !task.modelPreference.provider || !task.modelPreference.model) {
            return Response.json(
              { error: 'Task model preference is missing or invalid' },
              { status: 400 }
            )
          }

          // Check if Daytona is configured
          if (!isDaytonaConfigured()) {
            return Response.json(
              {
                error:
                  'Daytona is not configured. Please set DAYTONA_API_URL and DAYTONA_API_KEY environment variables.',
              },
              { status: 503 }
            )
          }

          // Get GitIngest report if available
          const gitingestReport: GitIngestReport | null = 
            repo.gitingestReportStatus === 'completed' && repo.gitingestReport
              ? (repo.gitingestReport as any as GitIngestReport)
              : null

          // Enhance task description with GitIngest report data
          const enhancedPrompt = enhanceTaskPrompt(
            task.description,
            gitingestReport
          )

          // Update task status to running
          await convexClient.mutation(api.tasks.updateTaskStatus, {
            taskId: task._id,
            status: 'running',
          })

          try {
            // Create Daytona workspace with enhanced prompt
            const workspace = await createWorkspace({
              repoUrl: repo.url,
              branch: repo.branch,
              taskId: task._id,
              taskDescription: enhancedPrompt.enhancedDescription,
              modelProvider: task.modelPreference.provider,
              model: task.modelPreference.model,
              keepWorkspaceAlive: keepWorkspaceAlive,
            })

            // Create workspace record in Convex
            const workspaceId = await convexClient.mutation(
              api.workspaces.createWorkspace,
              {
                daytonaId: workspace.workspaceId,
                template: process.env.DAYTONA_SNAPSHOT_NAME || 'butlerjake/pithy-jaunt-daytona:v1.0.2',
                assignedTasks: [task._id],
              }
            )

            // Assign workspace to task
            await convexClient.mutation(api.workspaces.assignTaskToWorkspace, {
              workspaceId,
              taskId: task._id,
            })

            // Update task with workspace ID and branch name
            await convexClient.mutation(api.tasks.updateTaskWorkspace, {
              taskId: task._id,
              assignedWorkspaceId: workspace.workspaceId,
              branchName: `pj/${task._id}`,
            })

            return Response.json(
              {
                taskId: task._id,
                status: 'running',
                workspaceId: workspace.workspaceId,
              },
              { status: 202 }
            )
          } catch (error: any) {
            console.error('Workspace creation error:', error)
            
            // Capture error in Sentry with context
            captureError(error, {
              taskId: task._id,
              repoId: task.repoId,
              userId: convexUser._id,
              operation: 'workspace_creation',
            })

            // Update task status to failed
            await convexClient.mutation(api.tasks.updateTaskStatus, {
              taskId: task._id,
              status: 'failed',
            })

            return Response.json(
              {
                error: 'Failed to create workspace',
                details: error.message || 'Unknown error',
              },
              { status: 500 }
            )
          }
        } catch (error: any) {
          console.error('Task execution error:', error)
          
          // Capture error in Sentry
          captureError(error, {
            taskId: params.taskId,
            operation: 'task_execution',
          })
          
          return Response.json(
            { 
              error: 'Failed to execute task',
              details: error.message || 'Unknown error',
            },
            { status: 500 }
          )
        }
      },
    },
  },
})

