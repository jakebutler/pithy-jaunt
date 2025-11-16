/**
 * Type definitions for Git Ingest automation
 */

export interface GitIngestResult {
  success: boolean;
  content?: string;
  error?: string;
  repo_url: string;
}

export type GitIngestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface GitIngestData {
  content: string | null;
  status: GitIngestStatus;
  generatedAt: number | null;
}

