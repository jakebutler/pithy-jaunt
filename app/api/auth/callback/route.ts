import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to dashboard or returnTo URL
      // In Next.js API routes, we need to return a redirect response
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If error or no code, redirect to login with error
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('error', 'authentication_failed')
  return NextResponse.redirect(loginUrl)
}

