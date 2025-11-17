import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email, password } = await request.json()

          // Validate input
          if (!email || !password) {
            return Response.json(
              { error: 'Email and password are required' },
              { status: 400 }
            )
          }

          // Sign in with Supabase
          const supabase = createClient(request)
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            // Return generic error for security (don't reveal if email exists)
            return Response.json(
              { error: 'Invalid credentials' },
              { status: 401 }
            )
          }

          // Get session to set cookies
          const { data: sessionData } = await supabase.auth.getSession()
          
          // Create response with session data
          const response = Response.json(
            {
              userId: data.user?.id,
              email: data.user?.email,
              message: 'Login successful',
            },
            { status: 200 }
          )

          // Set cookies from session
          if (sessionData.session) {
            // Set auth cookies (Supabase handles this via SSR package)
            const cookieHeader = request.headers.get('cookie') || ''
            // Note: In production, we'd need to properly set cookies via response headers
            // For now, the client-side will handle session via Supabase client
          }

          return response
        } catch (error) {
          console.error('Login error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        }
      },
    },
  },
})

