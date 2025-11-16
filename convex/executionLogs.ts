import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create execution log entry
 */
export const createLog = mutation({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.string(),
    logs: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("executionLogs", {
      taskId: args.taskId,
      workspaceId: args.workspaceId,
      logs: args.logs,
      status: args.status,
      error: args.error,
      createdAt: now,
    });
  },
});

/**
 * Get execution logs for a task
 */
export const getLogsByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("executionLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});

/**
 * Get latest execution log for a task
 */
export const getLatestLogByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("executionLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();

    return logs;
  },
});

/**
 * Get execution logs by workspace ID
 */
export const getLogsByWorkspace = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("executionLogs")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
  },
});

/**
 * Delete old execution logs (cleanup)
 * Deletes logs older than the specified number of days
 */
export const deleteOldLogs = mutation({
  args: {
    olderThanDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    const oldLogs = await ctx.db
      .query("executionLogs")
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .collect();

    let deleted = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deleted++;
    }

    return { deleted };
  },
});

/**
 * Delete all execution logs for a task
 */
export const deleteLogsByTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("executionLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    let deleted = 0;
    for (const log of logs) {
      await ctx.db.delete(log._id);
      deleted++;
    }

    return { deleted };
  },
});

/**
 * Delete all execution logs for multiple tasks
 */
export const deleteLogsByTasks = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    let totalDeleted = 0;
    
    for (const taskId of args.taskIds) {
      const logs = await ctx.db
        .query("executionLogs")
        .withIndex("by_task", (q) => q.eq("taskId", taskId))
        .collect();

      for (const log of logs) {
        await ctx.db.delete(log._id);
        totalDeleted++;
      }
    }

    return { deleted: totalDeleted };
  },
});

