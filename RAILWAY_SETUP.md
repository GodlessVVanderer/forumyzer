# Railway Deployment Setup

## Issue Fixed ✅

The "Railpack could not determine how to build the app" error has been resolved.

## What Was Changed

### Before (Broken):
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
startCommand = "node server.js"  # ❌ Wrong directory
```

### After (Fixed):
```toml
[build]
builder = "NIXPACKS"  # ✅ Use Railpack's auto-detection

[deploy]
startCommand = "cd backend && node server.js"  # ✅ Correct path
```

## Configuration Files

We now have **3 config files** for Railway (you only need one):

### Option 1: `railway.toml` (Recommended - Simplest)
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "cd backend && node server.js"
healthcheckPath = "/health"

[variables]
NODE_ENV = "production"
PORT = "3000"
```

### Option 2: `nixpacks.toml` (More Control)
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["cd backend && npm ci"]

[start]
cmd = "cd backend && node server.js"
```

### Option 3: `railway.json` (Advanced)
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && node server.js"
  }
}
```

**Choose ONE** and delete the others if you want to keep it simple.

## Railway Setup Steps

### 1. Create New Project on Railway

```bash
# Option A: Via Railway CLI (if installed)
railway login
railway init
railway link

# Option B: Via Web Dashboard
# Go to https://railway.app/new
# Click "Deploy from GitHub repo"
# Select "GodlessVVanderer/forumyzer"
```

### 2. Configure Environment Variables

In Railway Dashboard → Variables, add:

**Required:**
```
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_random_secret_string_min_32_chars
```

**Optional (for OAuth):**
```
OAUTH_CLIENT_ID=your_google_oauth_client_id
OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
```

**Auto-set (by Railway):**
```
NODE_ENV=production  # Set in railway.toml
PORT=3000           # Set in railway.toml
```

### 3. Set Root Directory (Important!)

Railway needs to know this is a monorepo:

**In Railway Dashboard:**
1. Go to your service settings
2. Find "Root Directory" setting
3. Leave it **empty** or set to `/`
4. The `railway.toml` handles the backend path

**OR via railway.toml:**
Already configured with `cd backend` in startCommand

### 4. Deploy

```bash
# Via CLI
railway up

# OR push to GitHub (auto-deploys)
git push origin claude/youtube-message-board-01NF6xKeqJ5uHsuLuA16whgp
```

### 5. Get Your Deployment URL

Railway will assign a URL like:
```
https://forumyzer-backend-production.up.railway.app
```

Save this for your Vercel frontend configuration!

## Common Issues & Solutions

### Issue: "Railpack could not determine how to build"

**Solution:** ✅ Already fixed! The new `railway.toml` uses NIXPACKS.

If still failing:
1. Delete `railway.json` and `nixpacks.toml` (keep only `railway.toml`)
2. Make sure `railway.toml` is in the **root** of the repo
3. Re-deploy

### Issue: "Module not found" or "Cannot find package.json"

**Cause:** Railway is looking in the wrong directory.

**Solution:**
```toml
# In railway.toml
[deploy]
startCommand = "cd backend && node server.js"  # Must have 'cd backend'
```

### Issue: "Port already in use" or "EADDRINUSE"

**Cause:** Railway sets PORT dynamically.

**Solution:** Make sure `backend/server.js` uses:
```javascript
const PORT = process.env.PORT || 3000;
```

### Issue: "Health check failing"

**Cause:** `/health` endpoint not responding.

**Check:**
```bash
# Test locally first
cd backend
npm start

# In another terminal:
curl http://localhost:3000/health
# Should return: {"status":"healthy"}
```

**Fix:** Add health endpoint to `backend/server.js`:
```javascript
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});
```

### Issue: "Environment variables not working"

**Solution:**
1. Check they're set in Railway Dashboard → Variables
2. Restart the service
3. Check logs: Railway Dashboard → Deployments → View Logs

### Issue: "Build succeeds but service crashes"

**Check logs:**
```bash
railway logs
```

**Common causes:**
- Missing environment variables (YOUTUBE_API_KEY, GEMINI_API_KEY)
- Database connection issues
- Port binding errors

## Verify Deployment

### 1. Check Health Endpoint
```bash
curl https://your-app.railway.app/health
# Should return: {"status":"healthy"}
```

### 2. Test API Endpoint
```bash
curl -X POST https://your-app.railway.app/api/forumize \
  -H "Content-Type: application/json" \
  -d '{"videoId":"dQw4w9WgXcQ","useAI":true}'
```

### 3. Check Logs
In Railway Dashboard:
1. Go to your service
2. Click "Deployments"
3. Click on latest deployment
4. View logs

## Monorepo Structure Explained

```
forumyzer/
├── railway.toml          ← Railway reads this (root)
├── nixpacks.toml         ← Alternative config
├── railway.json          ← Alternative config
├── backend/              ← Your Node.js server
│   ├── package.json
│   ├── server.js
│   └── Dockerfile        ← Not used by NIXPACKS
├── webapp/               ← React app (deploy to Vercel)
└── extension/            ← Chrome extension (manual)
```

**Railway deploys:** `backend/` only
**Vercel deploys:** `webapp/` only
**Extension:** Manual Chrome Web Store upload

## Railway vs Docker

### Using NIXPACKS (Recommended):
- ✅ Faster builds
- ✅ Automatic dependency detection
- ✅ Smaller deployment size
- ✅ Better for Node.js projects
- ❌ Less control over build process

### Using DOCKERFILE:
- ✅ Full control over build
- ✅ Works for any language/framework
- ✅ Can optimize for production
- ❌ Slower builds
- ❌ Larger deployment size

**For this project:** NIXPACKS is perfect since we have a simple Node.js backend.

## Alternative: Docker Deployment

If you prefer Docker, update `railway.toml`:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
startCommand = "node server.js"  # No 'cd backend' needed with Docker
```

And ensure `backend/Dockerfile` has:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Next Steps

1. ✅ Push updated configs to GitHub
2. ⏳ Deploy to Railway (auto-deploys on push)
3. ⏳ Copy Railway URL
4. ⏳ Configure Vercel with Railway URL
5. ⏳ Test full-stack deployment

## Railway CLI Commands (Optional)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# View logs
railway logs

# Open dashboard
railway open

# Deploy manually
railway up

# Set environment variable
railway variables set YOUTUBE_API_KEY=your_key

# SSH into running container
railway shell
```

## Cost Estimate

**Railway Free Tier:**
- $5 credit/month
- ~500 hours of runtime
- Should be enough for testing

**Railway Pro ($5/month):**
- $5 credit + $5/month
- Unlimited hours
- Better for production

**For this project:**
- Backend is lightweight (Node.js)
- Low memory usage (~100MB)
- Should run on free tier initially

## Support

If deployment still fails:

1. **Check Railway Status:** https://railway.statuspage.io
2. **Railway Docs:** https://docs.railway.app
3. **Railway Discord:** https://discord.gg/railway
4. **View Logs:** `railway logs` or in Dashboard

---

**Your deployment should now work!** 🎉

The error "Railpack could not determine how to build the app" has been fixed by switching from DOCKERFILE to NIXPACKS builder and adding the correct `cd backend` path.
