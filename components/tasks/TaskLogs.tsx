"use client";

import { useEffect, useRef, useState } from "react";

interface TaskLogsProps {
  taskId: string;
}

interface LogEvent {
  type: "info" | "llm_request" | "patch" | "pr_created" | "error";
  message?: string;
  provider?: string;
  model?: string;
  duration_ms?: number;
  diff?: string;
  url?: string;
}

/**
 * Task logs component
 * Displays real-time execution logs using Server-Sent Events
 */
export function TaskLogs({ taskId }: TaskLogsProps) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    // Create EventSource connection
    const url = `/api/task/${taskId}/logs`;
    console.log("[TaskLogs] Connecting to:", url);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[TaskLogs] Connection opened");
      setIsConnected(true);
      setError(null);
      wasConnectedRef.current = true;
    };

    eventSource.onmessage = (event) => {
      try {
        const logEvent: LogEvent = JSON.parse(event.data);
        console.log("[TaskLogs] Received log event:", logEvent);
        setLogs((prev) => [...prev, logEvent]);
      } catch (err) {
        console.error("[TaskLogs] Failed to parse log event:", err, event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[TaskLogs] EventSource error:", {
        readyState: eventSource.readyState,
        url,
        error: err,
      });
      
      // EventSource errors are common - only show error if we were connected
      if (wasConnectedRef.current) {
        setError("Connection lost. Attempting to reconnect...");
        setIsConnected(false);
      } else {
        // Initial connection - might be 404 or auth error, check readyState
        if (eventSource.readyState === EventSource.CLOSED) {
          setError("Failed to connect to log stream. Logs may not be available yet.");
          console.error("[TaskLogs] Connection closed immediately. Check if route exists and is accessible.");
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          console.log("[TaskLogs] Still connecting...");
        }
      }
      // Don't close immediately - EventSource will auto-reconnect
      // Only close if we're unmounting (handled in cleanup)
    };

    // Cleanup on unmount
    return () => {
      wasConnectedRef.current = false;
      eventSource.close();
    };
  }, [taskId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function formatLogEvent(event: LogEvent, index: number): string {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (event.type) {
      case "info":
        return `[${timestamp}] ${event.message || ""}`;
      case "llm_request":
        return `[${timestamp}] LLM Request: ${event.provider}/${event.model} (${event.duration_ms}ms)`;
      case "patch":
        return `[${timestamp}] Code changes:\n${event.diff || ""}`;
      case "pr_created":
        return `[${timestamp}] PR created: ${event.url || ""}`;
      case "error":
        return `[${timestamp}] ERROR: ${event.message || ""}`;
      default:
        return `[${timestamp}] ${JSON.stringify(event)}`;
    }
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <h3 className="text-h3 text-neutral-dark">Execution Logs</h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-2 text-small text-success-dark">
              <span className="w-2 h-2 bg-success-dark rounded-full animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-small text-neutral-500">
              <span className="w-2 h-2 bg-neutral-400 rounded-full" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-warning-light border-b border-warning text-warning-dark text-small">
          {error}
        </div>
      )}

      <div className="p-4 bg-neutral-900 text-success-light font-mono text-small overflow-auto max-h-96">
        {logs.length === 0 ? (
          <div className="text-neutral-500">Waiting for logs...</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={
                log.type === "error"
                  ? "text-error-light"
                  : log.type === "llm_request"
                  ? "text-info-light"
                  : "text-success-light"
              }
            >
              {formatLogEvent(log, index)}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

