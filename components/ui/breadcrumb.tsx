import Link from "next/link";
// ReactNode not currently used but may be needed for future props

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-small" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <span className="text-neutral-400 mx-2" aria-hidden="true">
                /
              </span>
            )}
            {isLast || !item.to ? (
              <span
                className={`${
                  isLast ? "text-neutral-dark font-medium" : "text-neutral-600"
                }`}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.to}
                className="text-neutral-600 hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

