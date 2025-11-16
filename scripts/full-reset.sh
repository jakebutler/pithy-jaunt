#!/bin/bash
# Complete reset: Kill servers, delete data, clear caches
set -e

echo "🧹 Starting FULL RESET..."
echo ""

# Step 1: Kill all servers
echo "1. Killing all dev servers..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "convex dev" 2>/dev/null || true
pkill -f "tsx" 2>/dev/null || true
sleep 2
echo "   ✓ All servers stopped"
echo ""

# Step 2: Clear caches
echo "2. Clearing caches..."
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null || true
echo "   ✓ Caches cleared"
echo ""

# Step 3: Start Convex dev server (needed for database operations)
echo "3. Starting Convex dev server temporarily..."
npx convex dev > /tmp/convex-dev.log 2>&1 &
CONVEX_PID=$!
echo "   Waiting for Convex to be ready..."
sleep 5
echo "   ✓ Convex dev server started (PID: $CONVEX_PID)"
echo ""

# Step 4: Start Next.js temporarily
echo "4. Starting Next.js dev server temporarily..."
npm run dev > /tmp/next-dev.log 2>&1 &
NEXT_PID=$!
echo "   Waiting for Next.js to be ready..."
sleep 10
echo "   ✓ Next.js dev server started (PID: $NEXT_PID)"
echo ""

# Step 5: Delete all tasks via API
echo "5. Deleting all tasks and workspaces..."
RESPONSE=$(curl -s -X DELETE http://localhost:3000/api/admin/reset-db || echo "failed")

if echo "$RESPONSE" | grep -q "success"; then
  TASKS=$(echo "$RESPONSE" | grep -o '"tasksDeleted":[0-9]*' | cut -d':' -f2)
  WORKSPACES=$(echo "$RESPONSE" | grep -o '"workspacesDeleted":[0-9]*' | cut -d':' -f2)
  echo "   ✓ Deleted $TASKS tasks"
  echo "   ✓ Deleted $WORKSPACES workspaces"
else
  echo "   ⚠️  API call failed. Tasks may not have been deleted."
  echo "   Response: $RESPONSE"
fi
echo ""

# Step 6: Kill temporary servers
echo "6. Stopping temporary servers..."
kill $NEXT_PID 2>/dev/null || true
kill $CONVEX_PID 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "convex dev" 2>/dev/null || true
sleep 2
echo "   ✓ Temporary servers stopped"
echo ""

echo "✅ FULL RESET COMPLETE!"
echo ""
echo "Your app is now in a clean state. To start testing:"
echo ""
echo "  1. Terminal 1: npx convex dev"
echo "  2. Terminal 2: npm run dev"
echo "  3. Browser: http://localhost:3000"
echo ""

