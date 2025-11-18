#!/usr/bin/env tsx
/**
 * Script to check Daytona workspace logs for a task
 */

import { convexClient } from '../lib/convex/server'
import { api } from '../convex/_generated/api'
import { Id } from '../convex/_generated/dataModel'
import { getWorkspaceLogs, getWorkspaceExecutionStatus } from '../lib/daytona/get-logs'

const taskId = process.argv[2]

if (!taskId) {
  console.error('Usage: tsx scripts/check-task-logs.ts <taskId>')
  process.exit(1)
}

async function checkLogs() {
  try {
    console.log(`[Check Logs] Fetching task: ${taskId}`)
    
    // Get task from Convex
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: taskId as Id<'tasks'>,
    })

    if (!task) {
      console.error(`[Check Logs] Task not found: ${taskId}`)
      process.exit(1)
    }

    console.log(`[Check Logs] Task found:`)
    console.log(`  - Title: ${task.title}`)
    console.log(`  - Status: ${task.status}`)
    console.log(`  - Workspace ID: ${task.assignedWorkspaceId || 'None'}`)
    console.log(`  - Branch: ${task.branchName || 'None'}`)
    console.log(`  - PR URL: ${task.prUrl || 'None'}`)
    console.log('')

    if (!task.assignedWorkspaceId) {
      console.error('[Check Logs] Task has no assigned workspace')
      process.exit(1)
    }

    const workspaceId = task.assignedWorkspaceId

    // Get execution status
    console.log(`[Check Logs] Checking execution status for workspace: ${workspaceId}`)
    const statusResult = await getWorkspaceExecutionStatus(workspaceId, task._id)
    
    console.log(`[Check Logs] Execution Status:`)
    console.log(`  - Is Running: ${statusResult.isRunning}`)
    console.log(`  - Session Exists: ${statusResult.sessionExists}`)
    console.log(`  - Processes: ${statusResult.processes.length}`)
    if (statusResult.processes.length > 0) {
      statusResult.processes.forEach((proc, i) => {
        console.log(`    ${i + 1}. ${proc}`)
      })
    }
    if (statusResult.error) {
      console.log(`  - Error: ${statusResult.error}`)
    }
    console.log('')

    // Get logs
    console.log(`[Check Logs] Fetching logs from workspace...`)
    const logsResult = await getWorkspaceLogs({
      workspaceId,
      taskId: task._id,
      maxLines: 500,
    })

    console.log(`[Check Logs] Logs retrieved:`)
    console.log(`  - Session ID: ${logsResult.sessionId}`)
    console.log(`  - Log entries: ${logsResult.logs.length}`)
    if (logsResult.error) {
      console.log(`  - Error: ${logsResult.error}`)
    }
    console.log('')

    if (logsResult.logs.length > 0) {
      console.log('='.repeat(80))
      console.log('WORKSPACE LOGS:')
      console.log('='.repeat(80))
      logsResult.logs.forEach((log, i) => {
        const prefix = log.level === 'error' ? '❌' : log.level === 'warning' ? '⚠️' : 'ℹ️'
        console.log(`\n[${log.timestamp}] ${prefix} ${log.message}`)
      })
      console.log('='.repeat(80))
    } else {
      console.log('No logs found. The execution may have completed or not started yet.')
    }

    // Also check Convex execution logs
    console.log('\n[Check Logs] Checking Convex execution logs...')
    const convexLogs = await convexClient.query(api.executionLogs.getLogsByTask, {
      taskId: task._id,
    })

    const logsArray = Array.isArray(convexLogs) ? convexLogs : []
    console.log(`[Check Logs] Found ${logsArray.length} log entries in Convex`)
    
    if (logsArray.length > 0) {
      console.log('\n' + '='.repeat(80))
      console.log('CONVEX EXECUTION LOGS (from webhooks):')
      console.log('='.repeat(80))
      const sortedLogs = logsArray.sort((a, b) => a.createdAt - b.createdAt)
      sortedLogs.forEach((log) => {
        const status = log.status === 'failed' ? '❌' : log.status === 'completed' ? '✅' : '⏳'
        console.log(`\n[${new Date(log.createdAt).toISOString()}] ${status} [${log.status}]`)
        console.log(`  ${log.logs}`)
        if (log.error) {
          console.log(`  Error: ${log.error}`)
        }
      })
      console.log('='.repeat(80))
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Check Logs] Error:', errorMessage)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

checkLogs()

