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

