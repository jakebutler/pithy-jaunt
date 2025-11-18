"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface TaskActionsProps {
  taskId: string;
  taskStatus: "queued" | "running" | "completed" | "failed" | "needs_review" | "cancelled";
  prUrl?: string;
}

/**
 * TaskActions component handles task action buttons with loading states and feedback
 */
export function TaskActions({ taskId, taskStatus, prUrl }: TaskActionsProps) {
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

    console.log("[TaskActions] Executing task:", taskId);

    try {
      const response = await fetch(`/api/task/${taskId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      // Always read the response as text first, then try to parse as JSON
      const responseText = await response.text();
      console.log("[TaskActions] Raw response text:", responseText);
      console.log("[TaskActions] Response status:", response.status);
      console.log("[TaskActions] Response statusText:", response.statusText);
      console.log("[TaskActions] Response ok:", response.ok);
      
      let data: { error?: string; message?: string; details?: string } = { error: "Unknown error" };
      
      // Try to parse as JSON
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
          console.log("[TaskActions] Parsed JSON data:", data);
        } catch (parseError) {
          console.error("[TaskActions] Failed to parse JSON:", parseError);
          // If it's not JSON, use the text as the error message
          data = {
            error: `Server error: ${response.status} ${response.statusText}`,
            details: responseText
          };
        }
      } else {
        // Empty response
        data = {
          error: `Server error: ${response.status} ${response.statusText}`,
          details: "Empty response body"
        };
      }

      // Ensure we always have an error field
      if (!data.error) {
        data.error = data.message || `Error ${response.status}`;
      }

      if (!response.ok) {
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || `Failed to execute task (${response.status})`;
        
        console.error("[TaskActions] Error executing task:", {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          details: data.details,
          fullData: data,
          responseText,
        });
        
        setError(errorMessage);
        setIsExecuting(false);
        return;
      }

      // Show success message
      setSuccessMessage("Task execution started successfully!");
      setIsExecuting(false);
      
      // Reload the page to show updated status
      window.location.reload();
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch {
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

      // Reload to show updated status
      window.location.reload();
    } catch {
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

      // Reload to show updated status
      window.location.reload();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }
  }

  // Execute button should be disabled when task is running or currently executing
  const isExecuteDisabled = isRunning || isExecuting;

  return (
    <div className="space-y-3">
      {/* Status Messages */}
      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" dismissible onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {canExecute && (
          <Button
            onClick={handleExecute}
            disabled={isExecuteDisabled}
            isLoading={isExecuting}
            variant="primary"
            aria-label={isExecuting ? "Executing task" : "Execute task"}
          >
            Execute Task
          </Button>
        )}

        {canCancel && (
          <Button
            onClick={handleCancel}
            variant="secondary"
            aria-label="Cancel task"
          >
            Cancel Task
          </Button>
        )}

        {canApprove && (
          <Button
            onClick={handleApprove}
            variant="primary"
            aria-label="Approve and merge PR"
            className="bg-success hover:bg-success-dark"
          >
            Approve & Merge PR
          </Button>
        )}

        {prUrl && (
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-colors"
          >
            View PR
          </a>
        )}
      </div>
    </div>
  );
}

