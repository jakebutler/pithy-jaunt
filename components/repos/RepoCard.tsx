"use client";

import Link from "next/link";

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
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case "completed":
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Completed
          </span>
        );
      case "analyzing":
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            Analyzing...
          </span>
        );
      case "failed":
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Failed
          </span>
        );
      case "pending":
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Pending
          </span>
        );
    }
  }

  function formatDate(timestamp?: number) {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Link
      href={`/repos/${id}`}
      className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {owner}/{name}
            </h3>
            {getStatusBadge()}
          </div>
          
          <p className="text-sm text-gray-500 mb-3 truncate">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              {url}
            </a>
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              Last analyzed: {formatDate(lastAnalyzedAt)}
            </span>
            {coderabbitDetected && (
              <span className="text-green-600">CodeRabbit configured</span>
            )}
          </div>
        </div>

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
    </Link>
  );
}

