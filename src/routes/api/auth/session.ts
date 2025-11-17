import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'

export const Route = createFileRoute('/api/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const supabase = createClient(request)
          
          // Get authenticated user - getUser() verifies with Supabase Auth server
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser()

          if (error) {
            return Response.json(
              { error: error.message },
              { status: 500 }
            )
          }

          if (!user) {
            return Response.json(
              { error: 'No active session' },
              { status: 401 }
            )
          }

          // Return user data
          return Response.json(
            {
              userId: user.id,
              email: user.email,
            },
            { status: 200 }
          )
        } catch (error) {
          console.error('Session error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        }
      },
    },
  },
})

