"use client";

import { GitIngestReport as GitIngestReportType } from "@/lib/gitingest/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface GitIngestReportProps {
  status: "pending" | "processing" | "completed" | "failed";
  report?: GitIngestReportType;
  error?: string;
  repoId: string;
}

export function GitIngestReport({
  status,
  report,
  error,
  repoId,
}: GitIngestReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  // Poll for updates when status is "processing"
  useEffect(() => {
    if (status !== "processing") {
      return;
    }

    const interval = setInterval(() => {
      // Refresh the page data by revalidating
      router.refresh();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [status, router]);

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
    } catch (err) {
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (status === "pending") {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              GitIngest Report
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Repository report not yet generated
            </p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              GitIngest Report
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Generating repository report... This may take a few moments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-red-900">
              GitIngest Report - Failed
            </h3>
            <p className="text-sm text-red-600 mt-1">
              {error || "Report generation failed. Please try again."}
            </p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Retrying..." : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  if (status === "completed" && report) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            GitIngest Report
          </h3>
          {report.generatedAt && (
            <p className="text-sm text-gray-500 mt-1">
              Generated{" "}
              {new Date(
                typeof report.generatedAt === "number"
                  ? report.generatedAt
                  : parseInt(String(report.generatedAt))
              ).toLocaleString()}
            </p>
          )}
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Summary
            </h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {String(report.summary)}
            </p>
          </div>
        )}

        {/* Structure */}
        {report.structure && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Repository Structure
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">File Count:</span>{" "}
                <span className="font-medium">
                  {typeof report.structure.fileCount === "number"
                    ? report.structure.fileCount
                    : 0}
                </span>
              </div>
              {report.structure.languages.length > 0 && (
                <div>
                  <span className="text-gray-500">Languages:</span>{" "}
                  <span className="font-medium">
                    {report.structure.languages.join(", ")}
                  </span>
                </div>
              )}
            </div>
            {report.structure.entryPoints.length > 0 && (
              <div className="mt-2">
                <span className="text-gray-500 text-sm">Entry Points:</span>
                <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                  {report.structure.entryPoints.map((entry, idx) => (
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
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Patterns & Architecture
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {report.patterns.framework && (
                <div>
                  <span className="text-gray-500">Framework:</span>{" "}
                  <span className="font-medium">
                    {String(report.patterns.framework)}
                  </span>
                </div>
              )}
              {report.patterns.architecture && (
                <div>
                  <span className="text-gray-500">Architecture:</span>{" "}
                  <span className="font-medium">
                    {String(report.patterns.architecture)}
                  </span>
                </div>
              )}
            </div>
            {report.patterns.testing.length > 0 && (
              <div className="mt-2">
                <span className="text-gray-500 text-sm">Testing:</span>{" "}
                <span className="text-sm text-gray-600">
                  {report.patterns.testing.join(", ")}
                </span>
              </div>
            )}
            {report.patterns.buildTools.length > 0 && (
              <div className="mt-2">
                <span className="text-gray-500 text-sm">Build Tools:</span>{" "}
                <span className="text-sm text-gray-600">
                  {report.patterns.buildTools.join(", ")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Dependencies */}
        {report.dependencies && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Dependencies
            </h4>
            {report.dependencies.packageManager && (
              <div className="mb-2 text-sm">
                <span className="text-gray-500">Package Manager:</span>{" "}
                <span className="font-medium">
                  {String(report.dependencies.packageManager)}
                </span>
              </div>
            )}
            {report.dependencies.runtime.length > 0 && (
              <div className="mb-2">
                <span className="text-gray-500 text-sm">Runtime:</span>
                <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                  {report.dependencies.runtime.slice(0, 10).map((dep, idx) => (
                    <li key={idx}>{dep}</li>
                  ))}
                  {report.dependencies.runtime.length > 10 && (
                    <li className="text-gray-400">
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
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              LLM Context
            </h4>
            <div className="bg-gray-50 rounded-md p-3">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {String(report.llmContext)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}


