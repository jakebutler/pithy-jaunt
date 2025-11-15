# Local Deployment Status

## ✅ Servers Running

### Convex Dev Server
- **Status**: Running (PID: $(cat /tmp/convex-dev.pid 2>/dev/null || echo "unknown"))
- **Logs**: `tail -f /tmp/convex-dev.log`
- **Stop**: `kill $(cat /tmp/convex-dev.pid)`

### Next.js Dev Server  
- **Status**: Running (PID: $(cat /tmp/nextjs-dev.pid 2>/dev/null || echo "unknown"))
- **URL**: http://localhost:3000
- **Logs**: `tail -f /tmp/nextjs-dev.log`
- **Stop**: `kill $(cat /tmp/nextjs-dev.pid)`

## 🚀 Quick Commands

### View Logs
```bash
# Next.js logs
tail -f /tmp/nextjs-dev.log

# Convex logs
tail -f /tmp/convex-dev.log
```

### Stop Servers
```bash
# Stop Next.js
kill $(cat /tmp/nextjs-dev.pid)

# Stop Convex
kill $(cat /tmp/convex-dev.pid)

# Or stop both
pkill -f "next dev" && pkill -f "convex dev"
```

### Restart Servers
```bash
# Restart Next.js
kill $(cat /tmp/nextjs-dev.pid) && npm run dev > /tmp/nextjs-dev.log 2>&1 &

# Restart Convex
kill $(cat /tmp/convex-dev.pid) && npx convex dev > /tmp/convex-dev.log 2>&1 &
```

## 🧪 Testing

1. **Open the app**: http://localhost:3000
2. **Test signup**: http://localhost:3000/signup
3. **Test login**: http://localhost:3000/login
4. **Test magic link**: http://localhost:3000/magic-link

## 📊 Check Status

```bash
# Check if servers are running
ps -p $(cat /tmp/nextjs-dev.pid) && echo "Next.js: ✅ Running" || echo "Next.js: ❌ Stopped"
ps -p $(cat /tmp/convex-dev.pid) && echo "Convex: ✅ Running" || echo "Convex: ❌ Stopped"

# Check if app is responding
curl -s http://localhost:3000 > /dev/null && echo "App: ✅ Responding" || echo "App: ❌ Not responding"
```

## 🔧 Troubleshooting

### Port 3000 already in use?
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
kill $(lsof -ti:3000)
```

### Convex not connecting?
- Check `.env.local` has `NEXT_PUBLIC_CONVEX_URL`
- Verify Convex dev server is running
- Check Convex logs for errors

### Authentication not working?
- Verify Supabase keys in `.env.local`
- Check browser console for errors
- Check Next.js logs for API errors

---

**Last updated**: $(date)

