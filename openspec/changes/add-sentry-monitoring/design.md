# Design: Sentry Monitoring Integration

## Context

Pithy Jaunt is a TanStack Start application (React-based full-stack framework) that requires comprehensive error tracking and performance monitoring. The application has both client-side React components and server-side API routes that need monitoring.

**Constraints:**
- TanStack Start uses Vite for bundling
- Application runs in both browser and Node.js environments
- Need to track errors across client and server boundaries
- Must support environment-based configuration (dev, staging, production)

## Goals / Non-Goals

**Goals:**
- Capture all unhandled errors in client and server code
- Track performance metrics for API routes and page loads
- Provide user context for error events
- Enable source map debugging in production
- Filter out development noise and known non-critical errors

**Non-Goals:**
- Session replay (can be added later if needed)
- Custom alerting rules (use Sentry's default alerting)
- Integration with other monitoring tools (Galileo remains separate)

## Decisions

### Decision: Use @sentry/react and @sentry/node SDKs

**Rationale:**
- Official Sentry SDKs provide best integration with React and Node.js
- Automatic error boundary integration for React
- Built-in performance monitoring
- Active maintenance and community support

**Alternatives considered:**
- Custom error tracking service - too much development overhead
- Other monitoring tools (Datadog, New Relic) - Sentry is more focused on error tracking and has better React integration

### Decision: Initialize Sentry separately for client and server

**Rationale:**
- TanStack Start has separate entry points for client (`src/client.tsx`) and server (`src/server.tsx`)
- Different configuration needed for browser vs Node.js environments
- Allows environment-specific settings per runtime

**Alternatives considered:**
- Single initialization file - doesn't work with TanStack Start's architecture
- Shared configuration module - acceptable, but separate initialization is clearer

### Decision: Use Sentry Vite plugin for source maps

**Rationale:**
- Automatic source map upload during build
- Release tracking integration
- No manual upload step required

**Alternatives considered:**
- Manual source map upload - more error-prone and requires additional CI steps
- Skip source maps - makes production debugging much harder

### Decision: Sample performance transactions at 20% for production

**Rationale:**
- Balance between data collection and Sentry quota usage
- 20% provides sufficient data for performance analysis
- Can be adjusted based on traffic volume

**Alternatives considered:**
- 100% sampling - may exceed Sentry quota for high-traffic applications
- 10% sampling - may miss important performance issues

### Decision: Filter out development errors and known non-critical errors

**Rationale:**
- Reduces noise in Sentry dashboard
- Focuses attention on production issues
- Prevents quota waste on development errors

**Implementation:**
- Use `beforeSend` hook to filter errors
- Check environment variable to skip development errors
- Filter known error patterns (e.g., network errors from user's browser)

## Risks / Trade-offs

**Risk: Sentry quota limits**
- **Mitigation**: Use transaction sampling, filter development errors, monitor quota usage

**Risk: Performance overhead**
- **Mitigation**: Sentry SDK is lightweight, async error reporting, configurable sampling

**Risk: Source map exposure**
- **Mitigation**: Use Sentry's private source map storage, don't expose source maps publicly

**Risk: PII in error reports**
- **Mitigation**: Configure data scrubbing, don't log sensitive user data in error messages

## Migration Plan

1. **Phase 1: Setup** - Install packages, configure environment variables
2. **Phase 2: Client Integration** - Add client-side Sentry initialization and error boundary
3. **Phase 3: Server Integration** - Add server-side Sentry initialization and error handlers
4. **Phase 4: Error Handling Updates** - Update existing error handlers to use Sentry
5. **Phase 5: Performance Monitoring** - Enable and configure performance tracking
6. **Phase 6: Source Maps** - Configure and test source map upload
7. **Phase 7: Testing** - Validate error capture and performance monitoring
8. **Phase 8: Documentation** - Document setup and usage

**Rollback:**
- Remove Sentry initialization code
- Remove Sentry packages
- Revert error handler changes
- No data migration needed (Sentry is additive)

## Open Questions

- Should we enable session replay? (Defer to later if needed)
- What alerting thresholds should we configure? (Use Sentry defaults initially)
- Should we integrate Sentry with Slack/email notifications? (Can be added later)

