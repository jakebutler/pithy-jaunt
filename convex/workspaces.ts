import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new workspace
 */
export const createWorkspace = mutation({
  args: {
    daytonaId: v.string(),
    template: v.string(),
    assignedTasks: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("workspaces", {
      daytonaId: args.daytonaId,
      template: args.template,
      status: "creating",
      assignedTasks: args.assignedTasks,
      createdAt: now,
      lastUsedAt: now,
    });
  },
});

/**
 * Get workspace by Daytona ID
 */
export const getWorkspaceByDaytonaId = query({
  args: { daytonaId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workspaces")
      .withIndex("by_daytona_id", (q) => q.eq("daytonaId", args.daytonaId))
      .first();
  },
});

/**
 * Get workspace by ID
 */
export const getWorkspaceById = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workspaceId);
  },
});

/**
 * Update workspace status
 */
export const updateWorkspaceStatus = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.union(
      v.literal("creating"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("terminated")
    ),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await ctx.db.patch(args.workspaceId, {
      status: args.status,
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Assign task to workspace
 */
export const assignTaskToWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Add task to assigned tasks if not already present
    if (!workspace.assignedTasks.includes(args.taskId)) {
      await ctx.db.patch(args.workspaceId, {
        assignedTasks: [...workspace.assignedTasks, args.taskId],
        lastUsedAt: Date.now(),
      });
    }
  },
});

/**
 * Delete all workspaces
 */
export const deleteAllWorkspaces = mutation({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.db.query("workspaces").collect();

    for (const workspace of workspaces) {
      await ctx.db.delete(workspace._id);
    }

    return { deleted: workspaces.length };
  },
});

/**
 * Delete workspaces that only have tasks from the specified task IDs
 * (i.e., workspaces where all assigned tasks are in the provided list)
 */
export const deleteWorkspacesByTasks = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const taskIdSet = new Set(args.taskIds.map((id) => id));
    const workspaces = await ctx.db.query("workspaces").collect();
    
    let deleted = 0;
    for (const workspace of workspaces) {
      // Check if all assigned tasks are in the provided list
      const allTasksInList = workspace.assignedTasks.every((taskId) =>
        taskIdSet.has(taskId)
      );
      
      // Only delete if all tasks are in the list (workspace is only used by these tasks)
      if (allTasksInList && workspace.assignedTasks.length > 0) {
        await ctx.db.delete(workspace._id);
        deleted++;
      }
    }

    return { deleted };
  },
});

/**
 * Get all workspaces for cleanup operations
 */
export const getAllWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("workspaces").collect();
  },
});

/**
 * Get workspaces by status
 */
export const getWorkspacesByStatus = query({
  args: {
    status: v.union(
      v.literal("creating"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("terminated")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workspaces")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

/**
 * Get workspaces that are candidates for cleanup
 * - Idle workspaces (no activity for specified time)
 * - Workspaces with completed/failed tasks
 * - Orphaned workspaces (no assigned tasks)
 */
export const getCleanupCandidates = query({
  args: {
    idleTimeoutMs: v.number(), // Milliseconds since lastUsedAt
    orphanedAgeMs: v.number(), // Milliseconds since createdAt
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const allWorkspaces = await ctx.db.query("workspaces").collect();
    
    const candidates = {
      idle: [] as Array<Id<"workspaces">>,
      completed: [] as Array<Id<"workspaces">>,
      orphaned: [] as Array<Id<"workspaces">>,
    };

    for (const workspace of allWorkspaces) {
      // Skip already terminated workspaces
      if (workspace.status === "terminated") {
        continue;
      }

      // Check for idle workspaces
      const idleTime = now - workspace.lastUsedAt;
      if (idleTime >= args.idleTimeoutMs && (workspace.status === "running" || workspace.status === "stopped")) {
        candidates.idle.push(workspace._id);
      }

      // Check for orphaned workspaces (no assigned tasks and old enough)
      const age = now - workspace.createdAt;
      if (workspace.assignedTasks.length === 0 && age >= args.orphanedAgeMs) {
        candidates.orphaned.push(workspace._id);
      }

      // Check for workspaces with completed/failed tasks
      // We'll need to check task statuses separately
      if (workspace.assignedTasks.length > 0) {
        // This will be checked in the maintenance logic by querying tasks
        // For now, we'll return workspace IDs that have tasks
      }
    }

    return candidates;
  },
});

/**
 * Batch update workspace statuses
 */
export const batchUpdateWorkspaceStatuses = mutation({
  args: {
    updates: v.array(
      v.object({
        workspaceId: v.id("workspaces"),
        status: v.union(
          v.literal("creating"),
          v.literal("running"),
          v.literal("stopped"),
          v.literal("terminated")
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const update of args.updates) {
      try {
        const workspace = await ctx.db.get(update.workspaceId);
        if (workspace) {
          await ctx.db.patch(update.workspaceId, {
            status: update.status,
            lastUsedAt: Date.now(),
          });
          results.push({ workspaceId: update.workspaceId, success: true });
        } else {
          results.push({ workspaceId: update.workspaceId, success: false, error: "Not found" });
        }
      } catch (error: any) {
        results.push({ workspaceId: update.workspaceId, success: false, error: error.message });
      }
    }
    return results;
  },
});

