import { getRouter } from './router'
import { defaultRenderHandler } from '@tanstack/react-start/server'
import { createRequestHandler } from '@tanstack/router-core/ssr/server'

export default {
  async fetch(request: Request): Promise<Response> {
    const handler = createRequestHandler({
      createRouter: () => {
        const router = getRouter()
        // Provide request in router context
        router.update({
          context: {
            request,
          },
        })
        return router
      },
      request,
    })
    
    return handler(defaultRenderHandler)
  },
}
