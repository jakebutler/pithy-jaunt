"use client";

import { MouseEvent } from "react";

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

/**
 * External link component that stops event propagation
 * Prevents parent Link components from being triggered
 */
export function ExternalLink({
  href,
  children,
  className,
  target = "_blank",
  rel = "noopener noreferrer",
}: ExternalLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
  };

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

