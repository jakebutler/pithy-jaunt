import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create or update a user from Supabase auth
 * Called when a user signs up or logs in
 */
export const upsertUser = mutation({
  args: {
    supabaseUserId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_supabase_id", (q) =>
        q.eq("supabaseUserId", args.supabaseUserId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        supabaseUserId: args.supabaseUserId,
        email: args.email,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Get user by Supabase user ID
 */
export const getUserBySupabaseId = query({
  args: { supabaseUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_supabase_id", (q) =>
        q.eq("supabaseUserId", args.supabaseUserId)
      )
      .first();
  },
});

/**
 * Get user by email
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Add push notification token for a user
 */
export const addPushToken = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const tokens = user.pushTokens || [];
    
    // Avoid duplicates
    if (!tokens.includes(args.token)) {
      tokens.push(args.token);
      await ctx.db.patch(args.userId, {
        pushTokens: tokens,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Remove push notification token for a user
 */
export const removePushToken = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const tokens = (user.pushTokens || []).filter((t) => t !== args.token);
    
    await ctx.db.patch(args.userId, {
      pushTokens: tokens,
      updatedAt: Date.now(),
    });
  },
});

