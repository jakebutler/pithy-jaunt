

Alright, friend — let’s build a clean, zero-friction deployment plan for a Vercel + Render setup that feels natural, stable, and low-ops. This is the stack you’d give to a junior dev and they’d have it running in under an hour. No yak-shaving, no premature Docker nightmares.

This plan assumes:
	•	Main app (Next.js 15, TypeScript, Node 20) → Vercel
	•	GitIngest service (Python 3.11, GitIngest package) → Render
	•	They talk via a simple HTTP API
	•	You keep everything ergonomic, simple, and easy for future self

Let’s go.

⸻

🌈 Vercel + Render Deployment Plan

(structured, actionable, minimal chaos)

⸻

1. 📁 Repo Structure (recommended)

You can keep this in the same repo or split repos. Both work.

Option A — Same repo (recommended)

root/
  apps/
    web/              # Next.js app → Vercel
    gitingest/        # Python microservice → Render
  infra/
    api-contract.md   
    deployment.md     # (optional docs)

Why same repo?
	•	Shared types & constants if needed
	•	Easier to unified PR workflow
	•	You can selectively deploy only folders on each provider

⸻

2. 🔐 Environment Variables Structure

Vercel:

Needed vars for the Next.js app:
	•	GIT_INGEST_BASE_URL → Render service URL
	•	GIT_INGEST_API_KEY → Shared secret
	•	All your existing app settings (OAuth, DB, API keys, etc.)

Render:

For the Python service:
	•	INGEST_API_KEY (same secret as above)
	•	GitHub token (if needed) GH_TOKEN
	•	Any ingestion config (timeouts, repo filters, etc.)

Rule of thumb:
👉 Only 1 shared secret between services. Everything else stays local to each provider.

⸻

3. 🚀 Deploying the Vercel app

3.1 Connect Vercel to GitHub
	•	Go to Vercel dashboard → “Add New Project”
	•	Pick apps/web
	•	Set:

Framework: Next.js
Build Command: next build
Output Directory: .vercel/output
Node version: 20

3.2 Add environment variables

In Vercel → Project → Settings → Environment Variables:

GIT_INGEST_BASE_URL=https://gitingest.onrender.com
GIT_INGEST_API_KEY=your-secret-key

Set them for:
	•	Production
	•	Preview
	•	Development (optional, or use .env.local)

3.3 Deploy

Vercel will auto-deploy on every push to main.

⸻

4. 🐍 Deploying the GitIngest Python Service on Render

4.1 Create a new Render Web Service
	•	Dashboard → New → Web Service
	•	Choose GitHub repo
	•	Select apps/gitingest

Render auto-detects Python.

Then set:

Runtime

Environment: Python 3.11
Start Command: python app.py

Or if you use uvicorn or FastAPI:

Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT

(You’ll likely want FastAPI for the ingestion API.)

Build Command

Render auto-installs from requirements.txt:

pip install -r requirements.txt

Port

Render will auto-configure $PORT.

⸻

4.2 Environment Variables in Render

In Render → Environment → add:

INGEST_API_KEY=your-secret-key
GH_TOKEN=ghp_xxxxx
LOG_LEVEL=info
ENV=production

Make sure the shared key matches Vercel’s GIT_INGEST_API_KEY.

⸻

5. 🔗 Simple & Secure Service Communication

API Contract

Let’s define a clean POST API:

POST https://<your-render-service>.onrender.com/ingest

Body:

{
  "repoUrl": "https://github.com/org/repo",
  "branch": "main"
}

Headers:

Authorization: Bearer ${GIT_INGEST_API_KEY}

Python (FastAPI) example auth check

from fastapi import FastAPI, Header, HTTPException
import os

app = FastAPI()

API_KEY = os.getenv("INGEST_API_KEY")

@app.post("/ingest")
async def ingest(payload: dict, authorization: str = Header(None)):
    if authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    repo_url = payload["repoUrl"]
    branch = payload.get("branch", "main")

    # your GitIngest logic
    return {"status": "ok", "repo": repo_url, "branch": branch}

Node → Python call example (Vercel API Route)

export async function POST(req: Request) {
  const { repoUrl, branch } = await req.json()

  const response = await fetch(`${process.env.GIT_INGEST_BASE_URL}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GIT_INGEST_API_KEY}`
    },
    body: JSON.stringify({ repoUrl, branch })
  })

  return Response.json(await response.json())
}

This is clean. Reusable. Predictable.

⸻

6. 🧪 Local Development Workflow (super smooth)

For the main app:

cd apps/web
pnpm dev

For the Python service:

cd apps/gitingest
uvicorn main:app --reload --port 8001

Then set in .env.local:

GIT_INGEST_BASE_URL=http://localhost:8001
GIT_INGEST_API_KEY=local-dev-key

Beautifully integrated dev experience.

⸻

7. 📦 CI/CD Workflow (GitHub Actions recommended)

Vercel

No CI needed — auto builds on push.

Render

Enable Auto Deploy on GitHub → every push to apps/gitingest triggers a rebuild.

Optional enhancement:
Add a GitHub Action to ensure Python type checks / lint before Render deploys.

⸻

8. 🧘 Operational Simplicity Checklist

This setup is intentionally low-ops:
	•	No Docker needed
	•	No container registry
	•	No GCP complexity
	•	No K8s
	•	No weird networking rules
	•	No YAML graveyards

Just:
	•	Vercel builds your Next app
	•	Render runs your Python service
	•	One shared secret
	•	Two service URLs
	•	Clean HTTP API boundary

This is honestly ideal for a product like yours.

⸻

9. 🎁 I can generate anything you want next

Want me to generate:

A) apps/gitingest starter FastAPI app (with GitIngest wiring)?

B) A complete deployment.md for your repo?

C) The api-contract.md file that describes the ingestion API?

D) A diagram (ASCII or image) of the architecture?

Tell me which one you want, and I’ll drop it in.