"use client";

import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      <Card variant="outlined" className="text-center">
        <CardBody>
          <p className="text-neutral-600">Analysis not yet started</p>
        </CardBody>
      </Card>
    );
  }

  if (status === "analyzing") {
    return (
      <Alert variant="info">
        <div className="flex items-center gap-3">
          <Spinner size="md" />
          <div>
            <p className="font-medium text-info-dark">Analysis in progress</p>
            <p className="text-small text-info-dark mt-1">
              CodeRabbit is analyzing your repository. This may take a few minutes.
            </p>
            <p className="text-caption text-info-dark mt-2">
              MVP: Webhook-only approach - results will appear automatically when complete
            </p>
          </div>
        </div>
      </Alert>
    );
  }

  if (status === "failed") {
    return (
      <Alert variant="error">
        <p className="font-medium text-error-dark">Analysis failed</p>
        <p className="text-small text-error-dark mt-1">
          CodeRabbit analysis encountered an error. Please try again later.
        </p>
      </Alert>
    );
  }

  if (status === "completed" && report) {
    return (
      <div className="space-y-6">
        {report.summary && (
          <Card>
            <CardBody>
              <h3 className="text-h3 text-neutral-dark mb-3">
                Analysis Summary
              </h3>
              <p className="text-body text-neutral-700 whitespace-pre-wrap">{report.summary}</p>
            </CardBody>
          </Card>
        )}

        {report.tasks && report.tasks.length > 0 && (
          <Card>
            <CardBody>
              <h3 className="text-h3 text-neutral-dark mb-4">
                Suggested Tasks ({report.tasks.length})
              </h3>
              <div className="space-y-4">
                {report.tasks.map((task) => (
                  <Card key={task.id} variant="outlined" className="hover:border-primary transition-colors">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-neutral-dark">{task.title}</h4>
                          {task.description && (
                            <p className="text-small text-neutral-600 mt-1">
                              {task.description}
                            </p>
                          )}
                          {task.priority && (
                            <Badge variant="default" size="sm" className="mt-2">
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                        {onCreateTask && (
                          <Button
                            onClick={() => onCreateTask(task.id)}
                            variant="outline"
                            size="sm"
                            className="ml-4"
                          >
                            Create Task
                          </Button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {(!report.summary && (!report.tasks || report.tasks.length === 0)) && (
          <Card variant="outlined" className="text-center">
            <CardBody>
              <p className="text-neutral-600">No analysis results available</p>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  return null;
}

