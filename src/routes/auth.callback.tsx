import { createFileRoute, redirect } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'

export const Route = createFileRoute('/auth/callback')({
  loader: async ({ context }) => {
    const request = context.request
    if (!request) {
      throw redirect({ to: '/login' })
    }
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const next = url.searchParams.get('next') || '/dashboard'

    if (code) {
      const supabase = createClient(request)
      
      // Exchange code for session
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Redirect to dashboard or returnTo URL
        throw redirect({ to: next as any })
      }
    }

    // If error or no code, redirect to login with error
    throw redirect({
      to: '/login',
      search: {
        error: 'authentication_failed',
      },
    })
  },
})

