import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { createClientWithToken } from '@/lib/auth/supabase-server-with-token'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Doc } from '@/convex/_generated/dataModel'

export async function GET(request: NextRequest) {
  try {
    // Support both cookie-based and Bearer token authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : undefined

    // Get authenticated user (using token if provided, otherwise cookies)
    let supabase
    let user
    
    if (token) {
      const result = await createClientWithToken(token)
      supabase = result.client
      user = result.user
    } else {
      supabase = await createClient()
      const result = await supabase.auth.getUser()
      user = result.data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from Convex
    const convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: user.id }
    )

    if (!convexUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    // Fetch user's repositories
    const reposResult = await convexClient.query(api.repos.getReposByUser, {
      userId: convexUser._id,
    })
    const repos = Array.isArray(reposResult) ? reposResult : []

    // Format response
    const formattedRepos = repos.map((repo: Doc<'repos'>) => ({
      id: repo._id,
      url: repo.url,
      owner: repo.owner,
      name: repo.name,
      branch: repo.branch,
      status: repo.analyzerStatus,
      coderabbitDetected: repo.coderabbitDetected,
      lastAnalyzedAt: repo.lastAnalyzedAt,
      createdAt: repo.createdAt,
    }))

    return NextResponse.json({ repos: formattedRepos }, { status: 200 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error fetching repositories:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    )
  }
}

