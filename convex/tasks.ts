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
        provider: v.union(v.literal("openai"), v.literal("anthropic")),
        model: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("tasks", {
      userId: args.userId,
      repoId: args.repoId,
      title: args.title,
      description: args.description,
      status: "queued",
      priority: args.priority,
      initiator: args.initiator,
      modelPreference:
        args.modelPreference || {
          provider: "openai",
          model: "gpt-4o",
        },
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

