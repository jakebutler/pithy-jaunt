import { createFileRoute } from '@tanstack/react-router'
import { createClient, createResponseWithCookies } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'

export const Route = createFileRoute('/api/auth/signup')({
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

          if (password.length < 8) {
            return Response.json(
              { error: 'Password must be at least 8 characters' },
              { status: 400 }
            )
          }

          // Create user in Supabase
          const supabase = createClient(request)
          
          // Check if Supabase is properly configured
          if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error('Supabase environment variables not configured')
            return Response.json(
              { error: 'Server configuration error. Please contact support.' },
              { status: 500 }
            )
          }
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
            },
          })

          if (error) {
            console.error('Supabase signup error:', error)
            return Response.json(
              { error: error.message },
              { status: error.status || 400 }
            )
          }

          // Sync user to Convex (if user was created)
          if (data.user) {
            try {
              const { api } = await import('@/convex/_generated/api')
              await convexClient.mutation(api.users.upsertUser, {
                supabaseUserId: data.user.id,
                email: data.user.email || email,
              })
            } catch (convexError) {
              // Log but don't fail signup if Convex sync fails
              console.error('Failed to sync user to Convex:', convexError)
            }
          }

          // Create response with cookies set from Supabase
          return createResponseWithCookies(
            {
              userId: data.user?.id,
              email: data.user?.email,
              message: 'User created successfully',
            },
            { status: 201 }
          )
        } catch (error) {
          console.error('Signup error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        }
      },
    },
  },
})

