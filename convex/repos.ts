import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new repository connection
 */
export const createRepo = mutation({
  args: {
    userId: v.id("users"),
    url: v.string(),
    owner: v.string(),
    name: v.string(),
    branch: v.string(),
    coderabbitDetected: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if user already has this repository connected
    const existing = await ctx.db
      .query("repos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("url"), args.url))
      .first();

    if (existing) {
      throw new Error("Repository already connected");
    }

    const now = Date.now();

    return await ctx.db.insert("repos", {
      userId: args.userId,
      url: args.url,
      owner: args.owner,
      name: args.name,
      branch: args.branch,
      analyzerStatus: "pending",
      coderabbitDetected: args.coderabbitDetected,
      createdAt: now,
    });
  },
});

/**
 * Get all repositories for a user
 */
export const getReposByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a repository by ID
 */
export const getRepoById = query({
  args: { repoId: v.id("repos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.repoId);
  },
});

/**
 * Update repository analysis status
 */
export const updateRepoAnalysis = mutation({
  args: {
    repoId: v.id("repos"),
    analyzerStatus: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    lastAnalyzedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const repo = await ctx.db.get(args.repoId);
    if (!repo) {
      throw new Error("Repository not found");
    }

    await ctx.db.patch(args.repoId, {
      analyzerStatus: args.analyzerStatus,
      lastAnalyzedAt: args.lastAnalyzedAt ?? Date.now(),
    });
  },
});

/**
 * Get repository by URL and user (for duplicate checking)
 */
export const getRepoByUrlAndUser = query({
  args: {
    userId: v.id("users"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("url"), args.url))
      .first();
  },
});

