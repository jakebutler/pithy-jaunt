"use client";

import { GitIngestReport as GitIngestReportType } from "@/lib/gitingest/client";
import { useState } from "react";
// Router not needed - using window.location.reload() instead
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/loading";

interface GitIngestReportProps {
  status: "pending" | "processing" | "completed" | "failed";
  report?: GitIngestReportType;
  error?: string;
  repoId: string;
}

export function GitIngestReport({
  status: initialStatus,
  report: initialReport,
  error: initialError,
  repoId,
}: GitIngestReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Use Convex real-time subscription to get live updates
  const repo = useQuery(api.repos.getRepoById, {
    repoId: repoId as Id<"repos">,
  });

  // Use live data if available, otherwise fall back to initial props
  const status = repo?.gitingestReportStatus || initialStatus;
  const report = repo?.gitingestReport || initialReport;
  const error = repo?.gitingestReportError || initialError;

  async function handleGenerateReport() {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/repo/${repoId}/gitingest-report`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to generate report");
        return;
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch {
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (status === "pending") {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-h3 text-neutral-dark">
                GitIngest Report
              </h3>
              <p className="text-small text-neutral-500 mt-1">
                Repository report not yet generated
              </p>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              isLoading={isGenerating}
              variant="primary"
            >
              Generate Report
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (status === "processing") {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center gap-3">
            <Spinner size="md" />
            <div className="flex-1">
              <h3 className="text-h3 text-neutral-dark">
                GitIngest Report
              </h3>
              <p className="text-small text-neutral-500 mt-1">
                Generating repository report... This may take a few moments.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Show "Report Available" state when report is ready but user hasn't viewed it yet
  // This happens when status changes from "processing" to "completed" via real-time update
  // We check if the report exists in the live data but wasn't in the initial props
  const reportJustCompleted = status === "completed" && report && !initialReport;
  
  if (reportJustCompleted) {
    return (
      <Alert variant="success">
        <div className="flex items-center justify-between w-full">
          <div>
            <h3 className="text-h3 text-neutral-dark">
              GitIngest Report
            </h3>
            <p className="text-small text-neutral-600 mt-1">
              Report generation complete! Click below to view.
            </p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
          >
            View Report
          </Button>
        </div>
      </Alert>
    );
  }

  if (status === "failed") {
    return (
      <Alert variant="error">
        <div className="flex items-start justify-between w-full">
          <div>
            <h3 className="text-h3 text-error-dark">
              GitIngest Report - Failed
            </h3>
            <p className="text-small text-error-dark mt-1">
              {error || "Report generation failed. Please try again."}
            </p>
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            isLoading={isGenerating}
            variant="primary"
          >
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  if (status === "completed" && report) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-h3 text-neutral-dark">
            GitIngest Report
          </h3>
          {report.generatedAt && (
            <p className="text-small text-neutral-500 mt-1">
              Generated{" "}
              {new Date(
                typeof report.generatedAt === "number"
                  ? report.generatedAt
                  : parseInt(String(report.generatedAt))
              ).toLocaleString()}
            </p>
          )}
        </CardHeader>
        <CardBody>

          {/* Summary */}
          {report.summary && (
            <div className="mb-6">
              <h4 className="text-small font-semibold text-neutral-dark mb-2">
                Summary
              </h4>
              <p className="text-small text-neutral-600 whitespace-pre-wrap">
                {String(report.summary)}
              </p>
            </div>
          )}

          {/* Structure */}
          {report.structure && (
            <div className="mb-6">
              <h4 className="text-small font-semibold text-neutral-dark mb-2">
                Repository Structure
              </h4>
              <div className="grid grid-cols-2 gap-4 text-small">
                <div>
                  <span className="text-neutral-500">File Count:</span>{" "}
                  <span className="font-medium">
                    {typeof report.structure.fileCount === "number"
                      ? report.structure.fileCount
                      : 0}
                  </span>
                </div>
                {report.structure.languages.length > 0 && (
                  <div>
                    <span className="text-neutral-500">Languages:</span>{" "}
                    <span className="font-medium">
                      {report.structure.languages.join(", ")}
                    </span>
                  </div>
                )}
              </div>
              {report.structure.entryPoints.length > 0 && (
                <div className="mt-2">
                  <span className="text-neutral-500 text-small">Entry Points:</span>
                  <ul className="list-disc list-inside mt-1 text-small text-neutral-600">
                    {report.structure.entryPoints.map((entry: string, idx: number) => (
                      <li key={idx}>{entry}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Patterns */}
          {report.patterns && (
            <div className="mb-6">
              <h4 className="text-small font-semibold text-neutral-dark mb-2">
                Patterns & Architecture
              </h4>
              <div className="grid grid-cols-2 gap-4 text-small">
                {report.patterns.framework && (
                  <div>
                    <span className="text-neutral-500">Framework:</span>{" "}
                    <span className="font-medium">
                      {String(report.patterns.framework)}
                    </span>
                  </div>
                )}
                {report.patterns.architecture && (
                  <div>
                    <span className="text-neutral-500">Architecture:</span>{" "}
                    <span className="font-medium">
                      {String(report.patterns.architecture)}
                    </span>
                  </div>
                )}
              </div>
              {report.patterns.testing.length > 0 && (
                <div className="mt-2">
                  <span className="text-neutral-500 text-small">Testing:</span>{" "}
                  <span className="text-small text-neutral-600">
                    {report.patterns.testing.join(", ")}
                  </span>
                </div>
              )}
              {report.patterns.buildTools.length > 0 && (
                <div className="mt-2">
                  <span className="text-neutral-500 text-small">Build Tools:</span>{" "}
                  <span className="text-small text-neutral-600">
                    {report.patterns.buildTools.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Dependencies */}
          {report.dependencies && (
            <div className="mb-6">
              <h4 className="text-small font-semibold text-neutral-dark mb-2">
                Dependencies
              </h4>
              {report.dependencies.packageManager && (
                <div className="mb-2 text-small">
                  <span className="text-neutral-500">Package Manager:</span>{" "}
                  <span className="font-medium">
                    {String(report.dependencies.packageManager)}
                  </span>
                </div>
              )}
              {report.dependencies.runtime.length > 0 && (
                <div className="mb-2">
                  <span className="text-neutral-500 text-small">Runtime:</span>
                  <ul className="list-disc list-inside mt-1 text-small text-neutral-600">
                    {report.dependencies.runtime.slice(0, 10).map((dep: string, idx: number) => (
                      <li key={idx}>{dep}</li>
                    ))}
                    {report.dependencies.runtime.length > 10 && (
                      <li className="text-neutral-400">
                        ... and {report.dependencies.runtime.length - 10} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* LLM Context */}
          {report.llmContext && (
            <div className="border-t border-neutral-200 pt-4">
              <h4 className="text-small font-semibold text-neutral-dark mb-2">
                LLM Context
              </h4>
              <div className="bg-platinum-200 rounded-md p-3">
                <pre className="text-caption text-neutral-700 whitespace-pre-wrap font-mono">
                  {String(report.llmContext)}
                </pre>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  return null;
}


