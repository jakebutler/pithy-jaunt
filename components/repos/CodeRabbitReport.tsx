"use client";

interface CodeRabbitReportProps {
  status: "pending" | "analyzing" | "completed" | "failed";
  report?: {
    summary?: string;
    tasks?: Array<{
      id: string;
      title: string;
      description: string;
      priority?: string;
    }>;
  };
  onCreateTask?: (taskId: string) => void;
}

/**
 * CodeRabbit analysis report component
 * Displays analysis results and suggested tasks
 */
export function CodeRabbitReport({
  status,
  report,
  onCreateTask,
}: CodeRabbitReportProps) {
  if (status === "pending") {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">Analysis not yet started</p>
      </div>
    );
  }

  if (status === "analyzing") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          <div>
            <p className="font-medium text-blue-900">Analysis in progress</p>
            <p className="text-sm text-blue-700 mt-1">
              CodeRabbit is analyzing your repository. This may take a few minutes.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              MVP: Webhook-only approach - results will appear automatically when complete
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="font-medium text-red-900">Analysis failed</p>
        <p className="text-sm text-red-700 mt-1">
          CodeRabbit analysis encountered an error. Please try again later.
        </p>
      </div>
    );
  }

  if (status === "completed" && report) {
    return (
      <div className="space-y-6">
        {report.summary && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Analysis Summary
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{report.summary}</p>
          </div>
        )}

        {report.tasks && report.tasks.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Suggested Tasks ({report.tasks.length})
            </h3>
            <div className="space-y-4">
              {report.tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {task.description}
                        </p>
                      )}
                      {task.priority && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {task.priority}
                        </span>
                      )}
                    </div>
                    {onCreateTask && (
                      <button
                        onClick={() => onCreateTask(task.id)}
                        className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Create Task
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!report.summary && (!report.tasks || report.tasks.length === 0)) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">No analysis results available</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

