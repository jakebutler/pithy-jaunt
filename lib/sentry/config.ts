/**
 * Sentry configuration utility
 * Provides shared configuration for both client and server Sentry initialization
 */

export interface SentryConfig {
  dsn: string
  environment: string
  release?: string
  tracesSampleRate: number
  enabled: boolean
}

/**
 * Get Sentry configuration from environment variables
 * Supports separate DSNs for client and server
 */
export function getSentryConfig(): SentryConfig {
  // Client-side uses NEXT_PUBLIC_SENTRY_DSN, server-side uses SENTRY_DSN
  // Fallback to SENTRY_DSN for backwards compatibility
  const dsn = 
    (typeof window !== 'undefined' 
      ? process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
      : process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) || ''
  const environment = process.env.NODE_ENV || 'development'
  const release = process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || undefined
  const enabled = Boolean(dsn) && environment !== 'test'

  // Performance sampling: 20% in production, 100% in development
  const tracesSampleRate = environment === 'production' ? 0.2 : 1.0

  return {
    dsn,
    environment,
    release,
    tracesSampleRate,
    enabled,
  }
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return getSentryConfig().enabled
}

/**
 * Filter function for beforeSend hook
 * Filters out development errors and known non-critical errors
 * Returns the event to send, or null to drop the event
 */
export function shouldSendToSentry(event: any, hint: any): any | null {
  const config = getSentryConfig()

  // Don't send errors in test environment
  if (config.environment === 'test') {
    return null
  }

  // Filter out known non-critical errors
  const error = hint?.originalException || hint?.syntheticException
  if (error) {
    const errorMessage = error.message || error.toString() || ''
    const errorName = error.name || ''

    // Filter out network errors from user's browser (not our fault)
    if (
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('Network request failed') ||
      errorName === 'NetworkError'
    ) {
      return null
    }

    // Filter out CORS errors (usually client-side configuration issues)
    if (errorMessage.includes('CORS') || errorMessage.includes('Cross-Origin')) {
      return null
    }
  }

  // Filter out errors from browser extensions
  if (event.exception?.values?.[0]?.stacktrace?.frames) {
    const frames = event.exception.values[0].stacktrace.frames
    const hasExtensionFrame = frames.some((frame: any) =>
      frame.filename?.includes('extension://') ||
      frame.filename?.includes('moz-extension://') ||
      frame.filename?.includes('safari-extension://')
    )
    if (hasExtensionFrame) {
      return null
    }
  }

  return event
}

