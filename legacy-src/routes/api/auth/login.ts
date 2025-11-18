import { createFileRoute } from '@tanstack/react-router'
import { createClient, createResponseWithCookies } from '@/lib/auth/supabase-server-tanstack'

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
          
          // Check if Supabase is properly configured
          if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error('Supabase environment variables not configured')
            return Response.json(
              { error: 'Server configuration error. Please contact support.' },
              { status: 500 }
            )
          }
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            console.error('Supabase login error:', error)
            // Return generic error for security (don't reveal if email exists)
            return Response.json(
              { error: 'Invalid credentials' },
              { status: 401 }
            )
          }

          // Create response with cookies set from Supabase
          return createResponseWithCookies(
            {
              userId: data.user?.id,
              email: data.user?.email,
              message: 'Login successful',
            },
            { status: 200 }
          )
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

