import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/task/[taskId]/logs
 * Server-Sent Events stream of task execution logs
 * 
 * This endpoint streams real-time logs and events during task execution.
 * The client should connect and display events in real-time.
 * 
 * Event types:
 * - info: General information messages
 * - llm_request: LLM API calls
 * - patch: Code changes (diffs)
 * - pr_created: PR creation events
 * - error: Error messages
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const encoder = new TextEncoder();
  
  try {
    const { taskId } = await params;
    
    // Log route access for debugging
    console.log(`[Logs Route] GET /api/task/${taskId}/logs`);
    
    // Create Supabase client with cookies from request headers
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Server configuration error" })}\n\n`),
        {
          status: 500,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }
      );
    }
    
    // Get cookies from request headers
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      if (name) {
        acc[name] = valueParts.join("=");
      }
      return acc;
    }, {} as Record<string, string>);
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return Object.entries(cookies).map(([name, value]) => ({ name, value }));
        },
        setAll() {
          // SSE streams can't set cookies, so we ignore this
        },
      },
    });
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Unauthorized" })}\n\n`),
        {
          status: 401,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }
      );
    }

    // Get user from Convex
    const convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: user.id }
    );

    if (!convexUser) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "error", message: "User not found in database" })}\n\n`),
        {
          status: 404,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }
      );
    }

    // Get task
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: taskId as Id<"tasks">,
    });

    if (!task) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Task not found" })}\n\n`),
        {
          status: 404,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }
      );
    }

    // Verify user owns the task
    if (task.userId !== convexUser._id) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Forbidden: You don't have access to this task" })}\n\n`),
        {
          status: 403,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }
      );
    }

    // Create SSE stream that fetches logs from Convex
    let isClosed = false;
    let pollInterval: NodeJS.Timeout | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    const stream = new ReadableStream({
      async start(controller) {
        let lastLogId: string | null = null;

        // Send initial connection message
        try {
          const initMessage = encoder.encode(`data: ${JSON.stringify({ type: "info", message: "Connected to log stream" })}\n\n`);
          controller.enqueue(initMessage);
        } catch (error) {
          console.error("[Logs Route] Error sending initial message:", error);
          isClosed = true;
          try {
            controller.close();
          } catch {
            // Already closed
          }
          return;
        }

        // Fetch existing logs and send them
        try {
          const existingLogs = await convexClient.query(api.executionLogs.getLogsByTask, {
            taskId: task._id,
          });

          // Ensure logs is an array
          const logsArray = Array.isArray(existingLogs) ? existingLogs : [];
          
          // Send logs in chronological order (oldest first)
          const sortedLogs = logsArray.sort((a, b) => a.createdAt - b.createdAt);
          
          for (const log of sortedLogs) {
            if (isClosed) break;
            
            // Parse log content and send as events
            // Logs are stored as strings, so we'll send them as info messages
            // If the log contains structured data, we can parse it
            try {
              const logData = JSON.parse(log.logs);
              // If it's already structured, send it as-is
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(logData)}\n\n`)
              );
            } catch {
              // If it's plain text, send as info message
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: log.status === "failed" ? "error" : "info", 
                    message: log.logs,
                    timestamp: log.createdAt 
                  })}\n\n`
                )
              );
            }

            if (log.error) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: "error", 
                    message: log.error,
                    timestamp: log.createdAt 
                  })}\n\n`
                )
              );
            }

            lastLogId = log._id;
          }
        } catch (error) {
          console.error("[Logs Route] Error fetching existing logs:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Failed to fetch existing logs" })}\n\n`
            )
          );
        }

        // Poll for new logs every 2 seconds
        pollInterval = setInterval(async () => {
          if (isClosed) {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            return;
          }

          try {
            const allLogs = await convexClient.query(api.executionLogs.getLogsByTask, {
              taskId: task._id,
            });

            // Ensure logs is an array
            const logsArray = Array.isArray(allLogs) ? allLogs : [];
            
            // Sort logs chronologically (oldest first) for proper ordering
            const sortedLogs = logsArray.sort((a, b) => a.createdAt - b.createdAt);

            // Get new logs (after lastLogId)
            const newLogs = lastLogId
              ? sortedLogs.filter((log) => {
                  // Find the index of the last log we sent
                  const lastIndex = sortedLogs.findIndex((l) => l._id === lastLogId);
                  const currentIndex = sortedLogs.findIndex((l) => l._id === log._id);
                  // Return logs that come after the last one we sent
                  return currentIndex > lastIndex;
                })
              : sortedLogs;

            // Send new logs in chronological order
            for (const log of newLogs) {
              if (isClosed) break;

              try {
                const logData = JSON.parse(log.logs);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(logData)}\n\n`)
                );
              } catch {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: log.status === "failed" ? "error" : "info", 
                      message: log.logs,
                      timestamp: log.createdAt 
                    })}\n\n`
                  )
                );
              }

              if (log.error) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: "error", 
                      message: log.error,
                      timestamp: log.createdAt 
                    })}\n\n`
                  )
                );
              }

              lastLogId = log._id;
            }
          } catch (error) {
            console.error("[Logs Route] Error polling for new logs:", error);
            // Don't close on error, just log it
          }
        }, 2000);

        // Send a heartbeat every 30 seconds to keep connection alive
        heartbeatInterval = setInterval(() => {
          if (isClosed) {
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
            return;
          }
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "info", message: "Connection alive" })}\n\n`)
            );
          } catch (error) {
            console.error("[Logs Route] Error sending heartbeat:", error);
            isClosed = true;
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          }
        }, 30000);

        // Handle request abort
        request.signal.addEventListener("abort", () => {
          isClosed = true;
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
      cancel() {
        // Cleanup when stream is cancelled
        isClosed = true;
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable buffering in nginx
      },
    });
  } catch (error: any) {
    console.error("[Logs Route] Error:", error);
    console.error("[Logs Route] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Return a proper error response
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ type: "error", message: `Failed to stream logs: ${error.message || "Unknown error"}` })}\n\n`),
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      }
    );
  }
}

