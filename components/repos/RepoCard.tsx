"use client";

import Link from "next/link";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RepoCardProps {
  id: string;
  name: string;
  owner: string;
  url: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  lastAnalyzedAt?: number;
  coderabbitDetected: boolean;
}

/**
 * Repository card component
 * Displays repository information in a card format
 */
export function RepoCard({
  id,
  name,
  owner,
  url,
  status,
  lastAnalyzedAt,
  coderabbitDetected,
}: RepoCardProps) {
  function getStatusBadge() {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "analyzing":
        return <Badge variant="info" pulse>Analyzing...</Badge>;
      case "failed":
        return <Badge variant="error">Failed</Badge>;
      case "pending":
      default:
        return <Badge variant="default">Pending</Badge>;
    }
  }

  function formatDate(timestamp?: number) {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Card variant="elevated" className="block">
      <CardBody>
        <div className="flex items-start justify-between">
          <Link href={`/repos/${id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-h4 text-neutral-dark truncate">
                {owner}/{name}
              </h3>
              {getStatusBadge()}
            </div>
            
            <div className="flex items-center gap-4 text-caption text-neutral-500">
              <span>Last analyzed: {formatDate(lastAnalyzedAt)}</span>
              {coderabbitDetected && (
                <Badge variant="success" size="sm">CodeRabbit configured</Badge>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ExternalLink
              href={url}
              className="text-small text-neutral-500 hover:text-primary truncate max-w-xs transition-colors"
            >
              {url}
            </ExternalLink>
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

