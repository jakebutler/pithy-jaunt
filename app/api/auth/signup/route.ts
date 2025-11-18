import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured')
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    // Create user in Supabase
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`,
      },
    })

    if (error) {
      console.error('Supabase signup error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 400 }
      )
    }

    // Sync user to Convex (if user was created)
    if (data.user) {
      try {
        await convexClient.mutation(api.users.upsertUser, {
          supabaseUserId: data.user.id,
          email: data.user.email || email,
        })
      } catch (convexError) {
        // Log but don't fail signup if Convex sync fails
        console.error('Failed to sync user to Convex:', convexError)
      }
    }

    // Cookies are automatically set by the Supabase client
    return NextResponse.json({
      userId: data.user?.id,
      email: data.user?.email,
      message: 'User created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

