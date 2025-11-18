import { NextRequest, NextResponse } from 'next/server';
import { performCleanup, reconcileWorkspaceStates } from '@/lib/daytona/maintenance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify this is a cron request (Vercel adds Authorization header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    console.log('[Cron] Starting scheduled workspace cleanup...');

    // Perform cleanup
    const cleanupSummary = await performCleanup();

    // Reconcile workspace states
    const reconciliationResult = await reconcileWorkspaceStates();

    const duration = Date.now() - startTime;

    const summary = {
      cleanup: {
        processed: cleanupSummary.processed,
        terminated: cleanupSummary.terminated,
        errors: cleanupSummary.errors,
      },
      reconciliation: {
        reconciled: reconciliationResult.reconciled,
        errors: reconciliationResult.errors,
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    console.log('[Cron] Cleanup complete:', summary);

    return NextResponse.json(summary, { status: 200 });
  } catch (error: unknown) {
    console.error('[Cron] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

