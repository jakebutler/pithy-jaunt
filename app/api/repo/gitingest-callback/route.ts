import { NextRequest, NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';
import { GitIngestWebhookPayload } from '@/lib/gitingest/client';
import { fetchRepositoryMetadata } from '@/lib/github/metadata';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload: GitIngestWebhookPayload = await request.json();

    // Validate payload
    if (!payload.jobId || !payload.repoUrl || !payload.status) {
      return NextResponse.json(
        { error: 'Invalid payload: missing required fields' },
        { status: 400 }
      );
    }

    // Find repository by URL
    const metadata = await fetchRepositoryMetadata(payload.repoUrl);
    const repo = await convexClient.query(api.repos.getRepoByOwnerAndName, {
      owner: metadata.owner,
      name: metadata.name,
    });

    if (!repo) {
      console.error(
        `GitIngest callback: Repository not found for ${payload.repoUrl}`
      );
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    // Update repository with report results
    if (payload.status === 'completed' && payload.report) {
      await convexClient.mutation(api.repos.updateGitIngestReport, {
        repoId: repo._id,
        status: 'completed',
        report: payload.report,
      });
    } else if (payload.status === 'failed') {
      await convexClient.mutation(api.repos.updateGitIngestReport, {
        repoId: repo._id,
        status: 'failed',
        error: payload.error || 'Report generation failed',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('GitIngest callback error:', error);

    // Return 200 to acknowledge receipt even on error
    // (GitIngest service will retry if we return error status)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 200 }
    );
  }
}

