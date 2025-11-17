import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '@/lib/auth/context'
import { ConvexClientProvider } from '@/lib/convex/client'
// Import CSS directly - TanStack Start will handle it
import '@/src/globals.css'

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
    <ConvexClientProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ConvexClientProvider>
  )
}

