# Sentry Setup Guide

This guide explains how to set up and configure Sentry error tracking and performance monitoring for Pithy Jaunt.

## Overview

Sentry provides:
- **Error Tracking**: Automatic capture of unhandled errors from both client and server code
- **Performance Monitoring**: Track API route performance and page load times
- **User Context**: Associate errors with authenticated users
- **Source Maps**: Debug production errors with original source code

## Initial Setup

### 1. Create Sentry Projects

Since Pithy Jaunt has both client-side (React) and server-side (Node.js) code, you'll need **two separate Sentry projects**:

1. Sign up at [sentry.io](https://sentry.io)
2. Create a **React** project for client-side error tracking
3. Create a **Node.js** project for server-side error tracking

**Note**: You can use the same project for both, but separate projects provide better organization and filtering.

### 2. Get Your DSNs

1. For the **React project**: Go to **Settings** → **Projects** → **[Your React Project]** → **Client Keys (DSN)**
2. For the **Node.js project**: Go to **Settings** → **Projects** → **[Your Node.js Project]** → **Client Keys (DSN)**
3. Copy both DSNs (they look like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Server-side DSN (Node.js backend)
SENTRY_DSN=your_server_sentry_dsn_here

# Client-side DSN (React frontend) - exposed to browser, must use NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SENTRY_DSN=your_client_sentry_dsn_here

# Optional: Release version (auto-detected from VERCEL_GIT_COMMIT_SHA if available)
SENTRY_RELEASE=

# Required for source map upload (only needed for production builds)
SENTRY_AUTH_TOKEN=your_sentry_auth_token_here
SENTRY_ORG=your_sentry_org_slug

# Required for source map upload - Client project (for Vite plugin to upload client source maps)
SENTRY_PROJECT_CLIENT=your_client_project_slug

# Optional: Server project (if you want to upload server source maps separately)
# SENTRY_PROJECT_SERVER=your_server_project_slug
```

### 4. Create Sentry Auth Token (for Source Maps)

1. Go to **Settings** → **Account** → **Auth Tokens**
2. Click **Create New Token**
3. Select scopes:
   - `project:releases`
   - `org:read`
4. Copy the token and add it to your `.env` file as `SENTRY_AUTH_TOKEN`

### 5. Get Organization and Project Slugs

- **Organization slug**: Found in your Sentry URL: `https://sentry.io/organizations/[org-slug]/`
- **Client project slug**: Found in your React project settings URL: `https://sentry.io/settings/[org-slug]/projects/[project-slug]/`
- **Server project slug** (optional): Found in your Node.js project settings URL (if using separate projects)

## Features

### Error Tracking

Errors are automatically captured from:
- React component errors (via Error Boundary)
- Unhandled promise rejections
- API route errors
- Server-side errors

### Performance Monitoring

Performance data is collected for:
- API route response times
- Page load times
- Custom transactions (task execution, workspace creation)

### User Context

When a user is authenticated, their user ID and email are automatically attached to error events, allowing you to:
- Filter errors by user
- See which users are affected by issues
- Contact users if needed

### Source Maps

Source maps are automatically uploaded during production builds, enabling you to:
- See original source code in error stack traces
- Debug production errors more easily
- Identify exact line numbers and file names

## Configuration

### Environment-Based Settings

Sentry is automatically configured based on your environment:

- **Development**: Errors are filtered out (not sent to Sentry) unless explicitly enabled
- **Production**: All errors are captured with 20% performance sampling
- **Test**: Errors are not sent to Sentry

### Error Filtering

The following errors are automatically filtered out:
- Network errors from user's browser
- CORS errors
- Errors from browser extensions
- Test environment errors

### Performance Sampling

- **Production**: 20% of transactions are sampled (configurable)
- **Development**: 100% of transactions are sampled

## Manual Error Reporting

You can manually capture errors in your code:

```typescript
import { captureError } from '@/lib/sentry/error-handler'

try {
  // Your code
} catch (error) {
  captureError(error, {
    taskId: 'task-123',
    workspaceId: 'workspace-456',
    operation: 'task_execution',
  })
  throw error
}
```

## Viewing Errors

1. Go to your Sentry dashboard: `https://sentry.io/organizations/[org-slug]/issues/`
2. Errors are automatically grouped by similarity
3. Click on an error to see:
   - Stack trace with source maps
   - User context
   - Request context
   - Breadcrumbs (user actions leading to error)
   - Performance data

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN**: Ensure `SENTRY_DSN` is set correctly in your environment
2. **Check Environment**: Sentry is disabled in test environment
3. **Check Filters**: Your error might be filtered out (check `lib/sentry/config.ts`)
4. **Check Network**: Ensure your deployment can reach Sentry's servers

### Source Maps Not Working

1. **Check Auth Token**: Ensure `SENTRY_AUTH_TOKEN` is set and has correct permissions
2. **Check Org/Project**: Ensure `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry project
3. **Check Build**: Source maps are only uploaded during production builds
4. **Check Release**: Ensure release version matches between build and Sentry

### Performance Data Not Appearing

1. **Check Sampling**: Only 20% of transactions are sampled in production
2. **Check Environment**: Performance monitoring is enabled in all environments
3. **Check Transactions**: Ensure you're looking at the correct time range in Sentry

## Best Practices

1. **Don't Log Sensitive Data**: Sentry captures request data - ensure no passwords, tokens, or PII are included
2. **Use Context**: Always provide context when manually capturing errors (taskId, userId, etc.)
3. **Monitor Quota**: Keep an eye on your Sentry quota to avoid hitting limits
4. **Set Up Alerts**: Configure alerts in Sentry for critical errors
5. **Review Regularly**: Check Sentry dashboard regularly to catch issues early

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [React SDK Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Node.js SDK Documentation](https://docs.sentry.io/platforms/node/)

