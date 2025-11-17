import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'

export const Route = createFileRoute('/api/auth/magic-link')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email } = await request.json()

          // Validate input
          if (!email) {
            return Response.json(
              { error: 'Email is required' },
              { status: 400 }
            )
          }

          // Send magic link via Supabase
          const supabase = createClient(request)
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
            },
          })

          if (error) {
            console.error('Magic link error:', error)
            // Still return success for security (don't reveal if email exists)
          }

          // Always return success message for security
          return Response.json(
            {
              message: 'If an account exists, a magic link has been sent to your email',
            },
            { status: 200 }
          )
        } catch (error) {
          console.error('Magic link error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        }
      },
    },
  },
})

