import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const variantStyles = {
  primary: "bg-primary text-white hover:bg-primary-dark active:scale-95 focus:ring-primary focus:ring-offset-2",
  secondary: "bg-neutral text-white hover:bg-neutral-dark active:scale-95 focus:ring-neutral focus:ring-offset-2",
  outline: "border-2 border-neutral text-neutral hover:bg-neutral-50 active:scale-95 focus:ring-neutral focus:ring-offset-2",
  ghost: "text-neutral hover:bg-neutral-100 active:scale-95 focus:ring-neutral focus:ring-offset-2",
  danger: "bg-error text-white hover:bg-error-dark active:scale-95 focus:ring-error focus:ring-offset-2",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-small",
  md: "px-4 py-2 text-body",
  lg: "px-6 py-3 text-body",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading = false, className = "", disabled, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-semibold rounded transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

