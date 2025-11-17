import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import * as Sentry from '@sentry/node'
import { getSentryConfig, shouldSendToSentry } from '@/lib/sentry/config'

// Initialize Sentry on the server side
const sentryConfig = getSentryConfig()
if (sentryConfig.enabled) {
  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    release: sentryConfig.release,
    tracesSampleRate: sentryConfig.tracesSampleRate,
    integrations: [
      Sentry.httpIntegration(),
    ],
    beforeSend(event, hint) {
      return shouldSendToSentry(event, hint)
    },
  })
}

const fetch = createStartHandler(defaultStreamHandler)

export default { fetch }
