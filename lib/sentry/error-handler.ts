/**
 * Utility functions for error handling with Sentry integration
 */

import * as Sentry from '@sentry/node'

interface ErrorContext {
  taskId?: string
  workspaceId?: string
  repoId?: string
  userId?: string
  [key: string]: unknown
}

/**
 * Capture an error in Sentry with additional context
 */
export function captureError(error: Error | unknown, context?: ErrorContext): void {
  if (error instanceof Error) {
    Sentry.captureException(error, {
      contexts: {
        custom: context || {},
      },
      tags: context
        ? Object.entries(context).reduce(
            (acc, [key, value]) => {
              if (value) {
                acc[key] = String(value)
              }
              return acc
            },
            {} as Record<string, string>
          )
        : undefined,
    })
  } else {
    Sentry.captureException(new Error(String(error)), {
      contexts: {
        custom: context || {},
      },
    })
  }
}

/**
 * Wrap an async function to automatically capture errors in Sentry
 */
export function withSentryErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: ErrorContext | ((...args: Parameters<T>) => ErrorContext)
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      const errorContext =
        typeof context === 'function' ? context(...args) : context
      captureError(error, errorContext)
      throw error
    }
  }) as T
}

/**
 * Start a Sentry transaction for performance monitoring
 * Note: In newer Sentry SDK versions, transactions are created via startSpan
 * This function is kept for compatibility but may need to be updated based on SDK version
 */
interface SentrySpan {
  finish(): void
  setData(key: string, value: unknown): void
}

export function startTransaction(
  name: string,
  op: string,
  description?: string
): SentrySpan | undefined {
  // Use startSpan for newer SDK versions, or startTransaction for older versions
  // This is a placeholder - adjust based on your Sentry SDK version
  const sentryWithSpan = Sentry as typeof Sentry & { startSpan?: (options: { name: string; op: string; description?: string }, callback: () => void) => SentrySpan }
  const sentryWithTransaction = Sentry as typeof Sentry & { startTransaction?: (options: { name: string; op: string; description?: string }) => SentrySpan }
  
  if (typeof sentryWithSpan.startSpan === 'function') {
    return sentryWithSpan.startSpan({ name, op, description }, () => {})
  }
  // Fallback for older SDK versions
  if (typeof sentryWithTransaction.startTransaction === 'function') {
    return sentryWithTransaction.startTransaction({ name, op, description })
  }
  return undefined
}

