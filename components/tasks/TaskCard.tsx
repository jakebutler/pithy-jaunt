"use client";

import Link from "next/link";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "running":
        return <Badge variant="info" pulse>Running</Badge>;
      case "failed":
        return <Badge variant="error">Failed</Badge>;
      case "needs_review":
        return <Badge variant="warning">Needs Review</Badge>;
      case "cancelled":
        return <Badge variant="default">Cancelled</Badge>;
      case "queued":
      default:
        return <Badge variant="default">Queued</Badge>;
    }
  }

  function getPriorityBadge() {
    switch (priority) {
      case "high":
        return <Badge variant="error" size="sm">High</Badge>;
      case "low":
        return <Badge variant="default" size="sm">Low</Badge>;
      case "normal":
      default:
        return <Badge variant="info" size="sm">Normal</Badge>;
    }
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Card variant="elevated" className="block">
      <CardBody>
        <div className="flex items-start justify-between">
          <Link href={`/tasks/${taskId}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-h4 text-neutral-dark truncate">
                {title}
              </h3>
              {getStatusBadge()}
              {getPriorityBadge()}
            </div>
            
            <p className="text-small text-neutral-600 mb-3 line-clamp-2">
              {description}
            </p>

            <div className="flex items-center gap-4 text-caption text-neutral-500">
              <span>Created: {formatDate(createdAt)}</span>
              {initiator === "coderabbit" && (
                <Badge variant="info" size="sm">From CodeRabbit</Badge>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {prUrl && (
              <ExternalLink
                href={prUrl}
                className="text-small text-primary hover:text-primary-dark transition-colors"
              >
                View PR
              </ExternalLink>
            )}
            <svg
              className="w-5 h-5 text-neutral-400 flex-shrink-0"
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
      </CardBody>
    </Card>
  );
}

