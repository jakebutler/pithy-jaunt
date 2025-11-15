"use client";

interface WorkspaceStatusProps {
  status: "creating" | "running" | "stopped" | "terminated";
  uptimeMs?: number;
  lastUsedAt?: number;
}

/**
 * Workspace status component
 * Displays Daytona workspace status with uptime
 */
export function WorkspaceStatus({
  status,
  uptimeMs,
  lastUsedAt,
}: WorkspaceStatusProps) {
  function getStatusBadge() {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case "running":
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
            Running
          </span>
        );
      case "creating":
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />
            Creating
          </span>
        );
      case "stopped":
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Stopped
          </span>
        );
      case "terminated":
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Terminated
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Unknown
          </span>
        );
    }
  }

  function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function formatLastUsed(timestamp: number): string {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
      return "Just now";
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else {
      return date.toLocaleString();
    }
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      {getStatusBadge()}
      {uptimeMs !== undefined && status === "running" && (
        <span className="text-gray-600">Uptime: {formatUptime(uptimeMs)}</span>
      )}
      {lastUsedAt && (
        <span className="text-gray-500">Last used: {formatLastUsed(lastUsedAt)}</span>
      )}
    </div>
  );
}

