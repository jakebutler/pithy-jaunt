import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex database schema for Pithy Jaunt
 */
export default defineSchema({
  // Users synced from Supabase Auth
  users: defineTable({
    supabaseUserId: v.string(), // Foreign key to Supabase auth.users
    email: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Mobile push notification tokens (array to support multiple devices)
    pushTokens: v.optional(v.array(v.string())),
  })
    .index("by_supabase_id", ["supabaseUserId"])
    .index("by_email", ["email"]),

  // Repositories connected by users
  repos: defineTable({
    userId: v.id("users"),
    url: v.string(),
    owner: v.string(),
    name: v.string(),
    branch: v.string(),
    analyzerStatus: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    lastAnalyzedAt: v.optional(v.number()),
    coderabbitDetected: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_url", ["url"]),

  // Tasks generated from CodeRabbit or user input
  tasks: defineTable({
    userId: v.id("users"),
    repoId: v.id("repos"),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("needs_review"),
      v.literal("cancelled")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high")
    ),
    initiator: v.union(v.literal("user"), v.literal("coderabbit")),
    modelPreference: v.object({
      provider: v.union(v.literal("openai"), v.literal("anthropic")),
      model: v.string(),
    }),
    assignedWorkspaceId: v.optional(v.string()),
    branchName: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_repo", ["repoId"])
    .index("by_status", ["status"]),

  // Daytona workspaces
  workspaces: defineTable({
    daytonaId: v.string(), // External workspace ID from Daytona
    template: v.string(),
    status: v.union(
      v.literal("creating"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("terminated")
    ),
    assignedTasks: v.array(v.id("tasks")),
    createdAt: v.number(),
    lastUsedAt: v.number(),
  })
    .index("by_daytona_id", ["daytonaId"])
    .index("by_status", ["status"]),
});

