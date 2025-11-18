import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new task
 */
export const createTask = mutation({
  args: {
    userId: v.id("users"),
    repoId: v.id("repos"),
    title: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    initiator: v.union(v.literal("user"), v.literal("coderabbit")),
    modelPreference: v.optional(
      v.object({
        provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("openrouter")),
        model: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const modelPreference = args.modelPreference || {
      provider: "openrouter" as const,
      model: "moonshotai/kimi-k2-0905",
    };

    return await ctx.db.insert("tasks", {
      userId: args.userId,
      repoId: args.repoId,
      title: args.title,
      description: args.description,
      status: "queued" as const,
      priority: args.priority,
      initiator: args.initiator,
      modelPreference,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get tasks for a repository
 */
export const getTasksByRepo = query({
  args: { repoId: v.id("repos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_repo", (q) => q.eq("repoId", args.repoId))
      .order("desc")
      .collect();
  },
});

/**
 * Get tasks for a user
 */
export const getTasksByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get task by ID
 */
export const getTaskById = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

/**
 * Update task status
 */
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("needs_review"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.taskId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update task workspace and branch info
 */
export const updateTaskWorkspace = mutation({
  args: {
    taskId: v.id("tasks"),
    assignedWorkspaceId: v.optional(v.string()),
    branchName: v.optional(v.string()),
    prUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.taskId, {
      assignedWorkspaceId: args.assignedWorkspaceId ?? task.assignedWorkspaceId,
      branchName: args.branchName ?? task.branchName,
      prUrl: args.prUrl ?? task.prUrl,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a task
 */
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
  },
});

/**
 * Delete all tasks for a user
 */
export const deleteAllTasksForUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    return { deleted: tasks.length };
  },
});

/**
 * Delete ALL tasks (admin only - for development)
 */
export const deleteAllTasks = mutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    return { deleted: tasks.length };
  },
});

