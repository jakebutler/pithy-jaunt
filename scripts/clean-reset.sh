#!/bin/bash
# Clean reset script - kills servers, clears caches, and resets the database
set -e

echo "🧹 Starting clean reset..."
echo ""

# Step 1: Kill all Node.js processes (Next.js and Convex dev servers)
echo "1. Killing all Node.js dev servers..."
pkill -f "next dev" || echo "   No Next.js dev server running"
pkill -f "convex dev" || echo "   No Convex dev server running"
pkill -f "tsx" || echo "   No tsx processes running"
echo "   ✓ Servers stopped"
echo ""

# Step 2: Clear Next.js cache
echo "2. Clearing Next.js cache..."
rm -rf .next
echo "   ✓ Next.js cache cleared"
echo ""

# Step 3: Clear node_modules cache (optional, commented out for speed)
# echo "3. Clearing node_modules cache..."
# rm -rf node_modules/.cache
# echo "   ✓ node_modules cache cleared"
# echo ""

echo "✅ Clean reset complete!"
echo ""
echo "Next steps:"
echo "1. Run this script to clear all tasks: npx tsx scripts/delete-all-tasks.ts"
echo "2. Start Convex dev server: npx convex dev"
echo "3. Start Next.js dev server: npm run dev"
echo ""

