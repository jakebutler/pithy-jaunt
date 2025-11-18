import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// TanStack Start will call this with the request when needed
// For now, we create a router without request - it will be injected by TanStack Start
export function getRouter() {
  return createTanStackRouter({ 
    routeTree,
    // Context will be set by TanStack Start's request handler
    context: {
      request: undefined,
    },
  })
}

// Also export createRouter for backward compatibility
export function createRouter() {
  return getRouter()
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
