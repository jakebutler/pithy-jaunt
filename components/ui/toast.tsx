"use client";

import { ReactNode, useEffect, useState } from "react";
import { Alert } from "./alert";

export interface ToastProps {
  id: string;
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
  onDismiss?: (id: string) => void;
}

export function Toast({ id, variant = "info", title, message, duration = 5000, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(id), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className={`transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
      <Alert variant={variant} dismissible onDismiss={() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(id), 300);
      }}>
        {title && <div className="font-semibold">{title}</div>}
        <div>{message}</div>
      </Alert>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

