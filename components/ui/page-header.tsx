import { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-h1 text-neutral-dark mb-2">{title}</h1>
          {description && (
            typeof description === 'string' ? (
              <p className="text-body text-neutral-600">{description}</p>
            ) : (
              <div className="text-body text-neutral-600">{description}</div>
            )
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

