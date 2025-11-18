import { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  pulse?: boolean;
}

const variantStyles = {
  default: "bg-neutral-100 text-neutral-800",
  success: "bg-success-light text-success-dark",
  warning: "bg-warning-light text-warning-dark",
  error: "bg-error-light text-error-dark",
  info: "bg-info-light text-info-dark",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-caption rounded-sm",
  md: "px-2.5 py-0.5 text-small rounded",
};

export function Badge({ variant = "default", size = "md", pulse = false, className = "", children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center font-medium transition-all duration-200";
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const pulseStyle = pulse ? "animate-pulse" : "";

  return (
    <span className={`${baseStyles} ${variantStyle} ${sizeStyle} ${pulseStyle} ${className}`} {...props}>
      {children}
    </span>
  );
}

