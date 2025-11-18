"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface TaskCreateFormProps {
  repoId: string;
  repoName: string;
  onSuccess?: (taskId: string) => void;
  initialData?: {
    title?: string;
    description?: string;
  };
}

/**
 * Task creation form component
 * Allows users to create tasks for a repository
 */
export function TaskCreateForm({
  repoId,
  repoName,
  onSuccess,
  initialData,
}: TaskCreateFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId,
          title: title.trim(),
          description: description.trim(),
          priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create task");
        return;
      }

      // Success - redirect or call callback
      if (onSuccess) {
        onSuccess(data.taskId);
      } else {
        router.push(`/tasks/${data.taskId}`);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-small text-neutral-600 mb-4">
          Creating task for repository: <span className="font-medium">{repoName}</span>
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      <Input
        id="title"
        label="Task Title *"
        type="text"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., Add /health endpoint"
        disabled={isLoading}
      />

      <Textarea
        id="description"
        label="Description *"
        required
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe what needs to be done..."
        disabled={isLoading}
      />

      <Select
        id="priority"
        label="Priority"
        value={priority}
        onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}
        disabled={isLoading}
      >
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
      </Select>

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading || !title.trim() || !description.trim()}
          isLoading={isLoading}
          className="flex-1"
        >
          Create Task
        </Button>
      </div>
    </form>
  );
}

