"use client";

import { Badge } from "@/components/ui/badge";

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
    switch (status) {
      case "running":
        return (
          <Badge variant="success" pulse>
            <span className="w-1.5 h-1.5 bg-success-dark rounded-full mr-1.5 animate-pulse" />
            Running
          </Badge>
        );
      case "creating":
        return (
          <Badge variant="info" pulse>
            <span className="w-1.5 h-1.5 bg-info-dark rounded-full mr-1.5 animate-pulse" />
            Creating
          </Badge>
        );
      case "stopped":
        return <Badge variant="default">Stopped</Badge>;
      case "terminated":
        return <Badge variant="error">Terminated</Badge>;
      default:
        return <Badge variant="default">Unknown</Badge>;
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
    <div className="flex items-center gap-4 text-small">
      {getStatusBadge()}
      {uptimeMs !== undefined && status === "running" && (
        <span className="text-neutral-600">Uptime: {formatUptime(uptimeMs)}</span>
      )}
      {lastUsedAt && (
        <span className="text-neutral-500">Last used: {formatLastUsed(lastUsedAt)}</span>
      )}
    </div>
  );
}

