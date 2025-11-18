"use client";

import { useEffect, useState } from "react";
import { Alert } from "./alert";
import type { Toast } from "@/lib/toast/context";

export interface ToastProps extends Toast {
  onDismiss?: (id: string) => void;
}

export function Toast({ id, variant = "info", title, message, duration = 5000, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          onDismiss?.(id);
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss?.(id);
    }, 300);
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isVisible && !isExiting
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 translate-x-full scale-95"
      }`}
      role="alert"
      aria-live={variant === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div className="shadow-lg rounded-lg overflow-hidden">
        <Alert variant={variant} dismissible onDismiss={handleDismiss}>
          {title && <div className="font-semibold mb-1">{title}</div>}
          <div className="text-sm">{message}</div>
        </Alert>
      </div>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

