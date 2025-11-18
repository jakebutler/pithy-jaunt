import { NextRequest } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const encoder = new TextEncoder()
  
  try {
    const { taskId } = await params
    
    // Get authenticated user
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Unauthorized' })}\n\n`),
        {
          status: 401,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }

    // Get user from Convex
    const convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: user.id }
    )

    if (!convexUser) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'User not found in database' })}\n\n`),
        {
          status: 404,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }

    // Get task
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: taskId as Id<'tasks'>,
    })

    if (!task) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Task not found' })}\n\n`),
        {
          status: 404,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }

    // Verify user owns the task
    if (task.userId !== convexUser._id) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Forbidden: You don\'t have access to this task' })}\n\n`),
        {
          status: 403,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }

    // Create SSE stream
    let isClosed = false
    let pollInterval: NodeJS.Timeout | null = null
    let heartbeatInterval: NodeJS.Timeout | null = null
    
    const stream = new ReadableStream({
      async start(controller) {
        let lastLogId: string | null = null

        // Send initial connection message
        try {
          const initMessage = encoder.encode(`data: ${JSON.stringify({ type: 'info', message: 'Connected to log stream' })}\n\n`)
          controller.enqueue(initMessage)
        } catch {
          isClosed = true
          controller.close()
          return
        }

        // Fetch existing logs
        try {
          const existingLogs = await convexClient.query(api.executionLogs.getLogsByTask, {
            taskId: task._id,
          })

          const logsArray = Array.isArray(existingLogs) ? existingLogs : []
          const sortedLogs = logsArray.sort((a, b) => a.createdAt - b.createdAt)
          
          for (const log of sortedLogs) {
            if (isClosed) break
            
            try {
              const logData = JSON.parse(log.logs)
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(logData)}\n\n`)
              )
            } catch {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: log.status === 'failed' ? 'error' : 'info', 
                    message: log.logs,
                    timestamp: log.createdAt 
                  })}\n\n`
                )
              )
            }

            if (log.error) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: 'error', 
                    message: log.error,
                    timestamp: log.createdAt 
                  })}\n\n`
                )
              )
            }

            lastLogId = log._id
          }
        } catch {
          // Error fetching existing logs - continue with empty logs
        }

        // Poll for new logs every 2 seconds
        pollInterval = setInterval(async () => {
          if (isClosed) {
            if (pollInterval) {
              clearInterval(pollInterval)
              pollInterval = null
            }
            return
          }

          try {
            const allLogs = await convexClient.query(api.executionLogs.getLogsByTask, {
              taskId: task._id,
            })

            const logsArray = Array.isArray(allLogs) ? allLogs : []
            const sortedLogs = logsArray.sort((a, b) => a.createdAt - b.createdAt)

            const newLogs = lastLogId
              ? sortedLogs.filter((log) => {
                  const lastIndex = sortedLogs.findIndex((l) => l._id === lastLogId)
                  const currentIndex = sortedLogs.findIndex((l) => l._id === log._id)
                  return currentIndex > lastIndex
                })
              : sortedLogs

            for (const log of newLogs) {
              if (isClosed) break

              try {
                const logData = JSON.parse(log.logs)
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(logData)}\n\n`)
                )
              } catch {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: log.status === 'failed' ? 'error' : 'info', 
                      message: log.logs,
                      timestamp: log.createdAt 
                    })}\n\n`
                  )
                )
              }

              if (log.error) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: 'error', 
                      message: log.error,
                      timestamp: log.createdAt 
                    })}\n\n`
                  )
                )
              }

              lastLogId = log._id
            }
          } catch {
            // Error polling for new logs - continue polling
          }
        }, 2000)

        // Send heartbeat every 30 seconds
        heartbeatInterval = setInterval(() => {
          if (isClosed) {
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval)
              heartbeatInterval = null
            }
            return
          }
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'info', message: 'Connection alive' })}\n\n`)
            )
          } catch {
            isClosed = true
            if (heartbeatInterval) clearInterval(heartbeatInterval)
            if (pollInterval) clearInterval(pollInterval)
          }
        }, 30000)

        // Handle request abort
        request.signal.addEventListener('abort', () => {
          isClosed = true
          if (pollInterval) clearInterval(pollInterval)
          if (heartbeatInterval) clearInterval(heartbeatInterval)
          controller.close()
        })
      },
      cancel() {
        isClosed = true
        if (pollInterval) clearInterval(pollInterval)
        if (heartbeatInterval) clearInterval(heartbeatInterval)
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : { message: String(error) };
    console.error('Logs Route Error:', err.message)
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ type: 'error', message: `Failed to stream logs: ${err.message || 'Unknown error'}` })}\n\n`),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    )
  }
}

