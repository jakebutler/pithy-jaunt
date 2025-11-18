import { HTMLAttributes, ReactNode } from "react";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action, className = "", ...props }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`} {...props}>
      {icon && (
        <div className="mx-auto w-12 h-12 text-neutral-400 mb-4" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-h4 text-neutral-dark mb-2">{title}</h3>
      {description && (
        <p className="text-body text-neutral-500 max-w-md mx-auto mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

