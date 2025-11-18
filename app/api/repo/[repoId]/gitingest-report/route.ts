import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { triggerGitIngestReport } from '@/lib/gitingest/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  try {
    const { repoId } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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

    // Get repository
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: repoId as Id<'repos'>,
    })

    if (!repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (repo.userId !== convexUser._id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return report data
    return NextResponse.json({
      status: repo.gitingestReportStatus,
      report: repo.gitingestReport || null,
      generatedAt: repo.gitingestReportGeneratedAt || null,
      error: repo.gitingestReportError || null,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching GitIngest report:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  try {
    const { repoId } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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

    // Get repository
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: repoId as Id<'repos'>,
    })

    if (!repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (repo.userId !== convexUser._id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if already processing
    if (repo.gitingestReportStatus === 'processing') {
      return NextResponse.json(
        { error: 'Report generation already in progress' },
        { status: 409 }
      )
    }

    // Check environment variables before proceeding
    const baseUrl = process.env.GIT_INGEST_BASE_URL
    const apiKey = process.env.GIT_INGEST_API_KEY
    
    if (!baseUrl || !apiKey) {
      console.error('GitIngest environment variables not set:', { baseUrl: !!baseUrl, apiKey: !!apiKey })
      return NextResponse.json(
        { 
          error: 'GitIngest service not configured',
          details: `Missing environment variables: ${!baseUrl ? 'GIT_INGEST_BASE_URL ' : ''}${!apiKey ? 'GIT_INGEST_API_KEY' : ''}`.trim(),
        },
        { status: 500 }
      )
    }

    // Trigger report generation
    try {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
      const callbackUrl = `${appUrl}/api/repo/gitingest-callback`

      console.log('Triggering GitIngest report:', { repoUrl: repo.url, branch: repo.branch, baseUrl })

      // Update status to processing
      await convexClient.mutation(api.repos.updateGitIngestReport, {
        repoId: repo._id,
        status: 'processing',
      })

      // Trigger GitIngest service
      await triggerGitIngestReport({
        repoUrl: repo.url,
        branch: repo.branch,
        callbackUrl,
      })

      return NextResponse.json({
        success: true,
        message: 'Report generation started',
      })
    } catch (error: unknown) {
      const err = error instanceof Error ? error : { message: String(error), stack: undefined };
      console.error('Error triggering GitIngest report:', err.message)
      if (err.stack) {
        console.error('Error stack:', err.stack)
      }
      
      // Update status to failed
      const errorMessage = err.message || 'Failed to trigger report generation'
      await convexClient.mutation(api.repos.updateGitIngestReport, {
        repoId: repo._id,
        status: 'failed',
        error: errorMessage,
      }).catch((updateError) => {
        const updateErr = updateError instanceof Error ? updateError : { message: String(updateError) };
        console.error('Failed to update GitIngest status in Convex:', updateErr.message)
      })

      // Return error response with details
      return NextResponse.json(
        { 
          error: errorMessage,
          details: err.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' && err.stack ? err.stack : undefined,
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error triggering GitIngest report:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to trigger report generation' },
      { status: 500 }
    )
  }
}

