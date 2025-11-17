"use client";

import { Link } from "@tanstack/react-router";
import { ExternalLink } from "@/components/ui/ExternalLink";

interface TaskCardProps {
  taskId: string;
  title: string;
  description: string;
  status: "queued" | "running" | "completed" | "failed" | "needs_review" | "cancelled";
  priority: "low" | "normal" | "high";
  initiator: "user" | "coderabbit";
  prUrl?: string;
  createdAt: number;
}

/**
 * Task card component
 * Displays task information in a card format
 */
export function TaskCard({
  taskId,
  title,
  description,
  status,
  priority,
  initiator,
  prUrl,
  createdAt,
}: TaskCardProps) {
  function getStatusBadge() {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case "completed":
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Completed
          </span>
        );
      case "running":
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            Running
          </span>
        );
      case "failed":
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Failed
          </span>
        );
      case "needs_review":
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            Needs Review
          </span>
        );
      case "cancelled":
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Cancelled
          </span>
        );
      case "queued":
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Queued
          </span>
        );
    }
  }

  function getPriorityBadge() {
    const baseClasses = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
    
    switch (priority) {
      case "high":
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            High
          </span>
        );
      case "low":
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-600`}>
            Low
          </span>
        );
      case "normal":
      default:
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            Normal
          </span>
        );
    }
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <Link to="/tasks/$taskId" params={{ taskId }} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h3>
            {getStatusBadge()}
            {getPriorityBadge()}
          </div>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {description}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              Created: {formatDate(createdAt)}
            </span>
            {initiator === "coderabbit" && (
              <span className="text-purple-600">From CodeRabbit</span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {prUrl && (
            <ExternalLink
              href={prUrl}
              className="text-blue-600 hover:text-blue-800 text-xs"
            >
              View PR
            </ExternalLink>
          )}
          <svg
            className="w-5 h-5 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

