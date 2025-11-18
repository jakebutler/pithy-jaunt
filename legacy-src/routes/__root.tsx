import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '@/lib/auth/context'
import { ConvexClientProvider } from '@/lib/convex/client'
import { ErrorBoundary, useSentryUserContext } from '@/lib/sentry/error-boundary'
// Import CSS using ?url for TanStack Start SSR injection
import appCss from '../globals.css?url'

interface RouterContext {
  request?: Request
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'Transform natural language into working pull requests' },
    ],
    title: 'Pithy Jaunt - AI-Powered DevOps Autopilot',
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  if (typeof window !== 'undefined') {
    console.log('[RootComponent] Rendering on client');
  }
  
  // TanStack Start handles <html> and <body> tags automatically
  // We just need to return the app content
  return (
    <ErrorBoundary>
      <ConvexClientProvider>
        <AuthProvider>
          <SentryUserContextWrapper>
            <Outlet />
          </SentryUserContextWrapper>
        </AuthProvider>
      </ConvexClientProvider>
    </ErrorBoundary>
  )
}

/**
 * Wrapper component to set Sentry user context when auth state changes
 */
function SentryUserContextWrapper({ children }: { children: React.ReactNode }) {
  useSentryUserContext()
  return <>{children}</>
}

