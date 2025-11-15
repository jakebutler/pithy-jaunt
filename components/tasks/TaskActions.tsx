"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TaskActionsProps {
  taskId: string;
  taskStatus: "queued" | "running" | "completed" | "failed" | "needs_review" | "cancelled";
  prUrl?: string;
}

/**
 * TaskActions component handles task action buttons with loading states and feedback
 */
export function TaskActions({ taskId, taskStatus, prUrl }: TaskActionsProps) {
  const router = useRouter();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isRunning = taskStatus === "running";
  const canExecute = taskStatus === "queued" || taskStatus === "needs_review";
  const canCancel = taskStatus === "queued" || taskStatus === "running";
  const canApprove = taskStatus === "completed" && prUrl;

  async function handleExecute(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsExecuting(true);

    try {
      const response = await fetch(`/api/task/${taskId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || `Failed to execute task (${response.status})`;
        setError(errorMessage);
        setIsExecuting(false);
        return;
      }

      // Show success message
      setSuccessMessage("Task execution started successfully!");
      
      // Refresh the page to show updated status
      router.refresh();
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsExecuting(false);
    }
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    try {
      const response = await fetch(`/api/task/${taskId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to cancel task");
        return;
      }

      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    try {
      const response = await fetch(`/api/task/${taskId}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to approve PR");
        return;
      }

      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  }

  // Execute button should be disabled when task is running or currently executing
  const isExecuteDisabled = isRunning || isExecuting;

  return (
    <div className="space-y-3">
      {/* Status Messages */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm"
          role="status"
          aria-live="polite"
        >
          {successMessage}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {canExecute && (
          <button
            onClick={handleExecute}
            disabled={isExecuteDisabled}
            aria-label={isExecuting ? "Executing task" : "Execute task"}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center gap-2"
          >
            {isExecuting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Executing...</span>
              </>
            ) : (
              "Execute Task"
            )}
          </button>
        )}

        {canCancel && (
          <button
            onClick={handleCancel}
            aria-label="Cancel task"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel Task
          </button>
        )}

        {canApprove && (
          <button
            onClick={handleApprove}
            aria-label="Approve and merge PR"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Approve & Merge PR
          </button>
        )}

        {prUrl && (
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            View PR
          </a>
        )}
      </div>
    </div>
  );
}

