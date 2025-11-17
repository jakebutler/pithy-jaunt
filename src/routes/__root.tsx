import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '@/lib/auth/context'
import { ConvexClientProvider } from '@/lib/convex/client'
import '@/app/globals.css'

interface RouterContext {
  request?: Request
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pithy Jaunt - AI-Powered DevOps Autopilot</title>
        <meta name="description" content="Transform natural language into working pull requests" />
      </head>
      <body className="antialiased">
        <ConvexClientProvider>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </ConvexClientProvider>
      </body>
    </html>
  )
}

