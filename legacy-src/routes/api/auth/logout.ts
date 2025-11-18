import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const supabase = createClient(request)
          
          // Sign out from Supabase
          const { error } = await supabase.auth.signOut()

          if (error) {
            return Response.json(
              { error: error.message },
              { status: 500 }
            )
          }

          return Response.json(
            { message: 'Logged out successfully' },
            { status: 200 }
          )
        } catch (error) {
          console.error('Logout error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        }
      },
    },
  },
})

