# Change: Add Sentry Monitoring

## Why

Currently, Pithy Jaunt relies on console.error logging and webhook notifications for error tracking. This approach lacks:
- Centralized error aggregation and analysis
- Real-time alerting for production issues
- Performance monitoring and transaction tracing
- User context and session replay capabilities
- Error grouping and deduplication

Implementing Sentry will provide comprehensive error tracking, performance monitoring, and observability across both client and server-side code, enabling faster issue detection and resolution.

## What Changes

- **ADDED**: Sentry SDK integration for client-side error tracking
- **ADDED**: Sentry SDK integration for server-side error tracking
- **ADDED**: Error boundary components for React error handling
- **ADDED**: Performance monitoring and transaction tracing
- **ADDED**: Environment-based configuration (development, staging, production)
- **ADDED**: User context and session tracking
- **ADDED**: Source map upload for production debugging
- **MODIFIED**: Error handling to capture errors in Sentry
- **MODIFIED**: API route error handlers to report to Sentry

## Impact

- **Affected specs**: New `monitoring` capability
- **Affected code**:
  - `src/client.tsx` - Client-side Sentry initialization
  - `src/server.tsx` - Server-side Sentry initialization
  - `src/routes/__root.tsx` - Error boundary integration
  - `src/routes/api/**` - API error handlers
  - `vite.config.ts` - Source map configuration
  - `package.json` - New Sentry dependencies
  - Environment variables - Sentry DSN and configuration

