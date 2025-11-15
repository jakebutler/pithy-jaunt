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
    const eventSource = new EventSource(`/api/task/${taskId}/logs`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      wasConnectedRef.current = true;
    };

    eventSource.onmessage = (event) => {
      try {
        const logEvent: LogEvent = JSON.parse(event.data);
        setLogs((prev) => [...prev, logEvent]);
      } catch (err) {
        console.error("Failed to parse log event:", err);
      }
    };

    eventSource.onerror = (err) => {
      // EventSource errors are common - only show error if we were connected
      if (wasConnectedRef.current) {
        console.error("EventSource error:", err);
        setError("Connection lost. Attempting to reconnect...");
        setIsConnected(false);
      } else {
        // Initial connection - might be 404 or auth error, check readyState
        if (eventSource.readyState === EventSource.CLOSED) {
          setError("Failed to connect to log stream. Logs may not be available yet.");
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
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Execution Logs</h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-2 text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm">
          {error}
        </div>
      )}

      <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm overflow-auto max-h-96">
        {logs.length === 0 ? (
          <div className="text-gray-500">Waiting for logs...</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={
                log.type === "error"
                  ? "text-red-400"
                  : log.type === "llm_request"
                  ? "text-blue-400"
                  : "text-green-400"
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

