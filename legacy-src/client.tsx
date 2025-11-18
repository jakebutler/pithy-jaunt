import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start-client'
import * as Sentry from '@sentry/react'
import { getSentryConfig, shouldSendToSentry } from '@/lib/sentry/config'
// Import CSS - ensure it's loaded on client side
import './globals.css'

// Initialize Sentry on the client side
// Use NEXT_PUBLIC_SENTRY_DSN for client-side (exposed via vite.config.ts define)
const sentryConfig = getSentryConfig()
// Override DSN for client-side - prefer NEXT_PUBLIC_SENTRY_DSN from Vite's define
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  sentryConfig.dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
}
if (sentryConfig.enabled && sentryConfig.dsn) {
  try {
    Sentry.init({
      dsn: sentryConfig.dsn,
      environment: sentryConfig.environment,
      release: sentryConfig.release,
      tracesSampleRate: sentryConfig.tracesSampleRate,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      beforeSend(event, hint) {
        return shouldSendToSentry(event, hint)
      },
    })
  } catch (error) {
    console.error('[client.tsx] Sentry initialization error:', error);
  }
}

// TanStack Start hydration
// StartClient handles finding and hydrating the correct root element
hydrateRoot(document, <StartClient />)
