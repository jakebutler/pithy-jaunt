# Pithy Jaunt – Comprehensive Documentation Suite (Updated)

This document is the single source of truth for Pithy Jaunt. It combines the PRD, full technical documentation, API contract, Daytona templates, mobile + web specs, UX components, and hackathon task list. Use this as the canonical artifact to begin parallel development across backend, web, and mobile teams.

---

# 1. Product Requirements Document (PRD)

## Executive Summary

Pithy Jaunt is a mobile-first and web-enabled Agent–DevOps autopilot that turns natural language tasks into working pull requests. Users connect a public GitHub repo, request a feature or bug fix via mobile or web (typed or voice), and Pithy Jaunt:

1. Runs CodeRabbit to analyze the repo and propose tasks.
2. Creates Daytona workspaces to execute tasks using LLM-driven coding agents (OpenAI, Anthropic).
3. Runs Browser Use to capture UI screenshots and tests.
4. Creates a PR with screenshots and test results.
5. Notifies the user (push/email) for approval and optionally merges.

The first hackathon MVP focuses on the core flow: repo connect → CodeRabbit analysis → spawn Daytona → implement change → PR → notify user.

---

## Technology Stack (finalized for hackathon MVP)

* **Frontend (Web)**: Next.js 15 (App Router), Tailwind CSS, ShadCN components
* **Frontend (Mobile)**: React Native (Expo) built via Rork rapid prototyping
* **Backend**: Convex (serverless functions & realtime), optional Supabase for auth & storage
* **Auth**: Start with Supabase Auth (email/password, magic link). WorkOS integration as a later step for SSO.
* **CI / Environments**: Daytona for ephemeral execution environments (sandboxes)
* **Repo Analysis**: CodeRabbit (API-driven analysis & task generation)
* **UI Testing / Screenshots**: Browser Use
* **Observability**: Galileo for traces & metrics
* **LLM Providers**: OpenAI, Anthropic — injectable via .env and switchable per-request
* **Notifications**: Resend (email) + Expo push notifications (mobile)

---

## Milestones & Deliverables (short-term hackathon scope)

1. Onboarding & Repo Connect (web + mobile)
2. CodeRabbit analysis + task extraction
3. Daytona workspace creation + execution runner
4. LLM agent integration (OpenAI + Anthropic) and system prompt
5. PR creation with Browser Use screenshots
6. Notifications + PR approval flow (mobile & web)
7. Demo & polish (voice-to-task stub, multi-task instance reuse)

---

# 2. Full API Contract (Complete)

NOTE: All endpoints assume `Authorization: Bearer <CONVEX_SESSION_TOKEN>` or a signed cookie from Supabase. Replace with WorkOS SSO flows post-hackathon.

Base URL (example): `https://api.pithy-jaunt.example.com`

---

## Authentication

### `POST /auth/signup`

Create a new user (Supabase-auth-backed).

**Request**

```
POST /auth/signup
Content-Type: application/json
{
  "email": "dev@example.com",
  "password": "s3cr3t"
}
```

**Response** (201)

```
{
  "userId": "user_abc123",
  "email": "dev@example.com",
  "sessionToken": "sess_..."
}
```

---

### `POST /auth/login`

Login and return a session token.

**Request**

```
POST /auth/login
Content-Type: application/json
{ "email": "dev@example.com", "password": "s3cr3t" }
```

**Response** (200)

```
{ "sessionToken": "sess_...", "userId":"user_abc123" }
```

---

### `POST /auth/magic-link`

Send a magic link via email (optional).

**Request**

```
{ "email" : "dev@example.com" }
```

**Response** (200)

```
{ "status": "sent" }
```

---

## Repo management

### `POST /repo/connect`

User supplies a public repo URL to analyze and link to their account. This endpoint will:

* Validate the URL
* Clone (read-only) the repo into a temp workspace
* Detect if CodeRabbit is already present
* If missing, create a `.coderabbit.yaml` bootstrap in a temp branch or storage and call CodeRabbit
* Return an initial CodeRabbit report summary and suggested tasks

**Request**

```
POST /repo/connect
Content-Type: application/json
Authorization: Bearer <token>
{
  "repoUrl": "https://github.com/username/repo",
  "branch": "main"  // optional, default: main
}
```

**Response** (202 Accepted)

```
{
  "repoId": "repo_123",
  "repoUrl": "https://github.com/username/repo",
  "coderabbitDetected": false,
  "tasks": [
    { "id": "task_r1t1", "title": "Add health check endpoint", "roughness": "medium" }
  ],
  "next": "/repo/repo_123/tasks"
}
```

**Errors**

* 400 bad URL
* 403 private repo (not supported in MVP)
* 500 clone error

---

### `GET /repo/:repoId/report`

Retrieve the last CodeRabbit analysis (cached result). Useful for the web dashboard.

**Response**

```
{
  "repoId": "repo_123",
  "analyzedAt": "2025-11-12T15:04:00Z",
  "summary": "...",
  "tasks": [... full task objects ...]
}
```

---

## Task lifecycle

### `POST /task`

Create a new task either from CodeRabbit suggestions or user input.

**Request**

```
POST /task
Authorization: Bearer <token>
{
  "repoId": "repo_123",
  "title": "Add /health endpoint",
  "description": "Add a simple /health returning 200 and status JSON",
  "priority": "normal",
  "initiator": "user", // or "coderabbit"
  "modelPreference": { "provider": "openai", "model": "gpt-4o" }
}
```

**Response** (201)

```
{
  "taskId": "task_abc456",
  "status": "queued",
  "assignedWorkspace": null
}
```

---

### `GET /task/:taskId`

Get task status and result (PR URL if completed).

**Response**

```
{
  "taskId": "task_abc456",
  "status": "completed",
  "repoId": "repo_123",
  "branchName": "pj/task_abc456",
  "prUrl": "https://github.com/username/repo/pull/789",
  "logsUrl": "/task/task_abc456/logs"
}
```

---

### `POST /task/:taskId/execute`

Kick off execution (provision Daytona workspace, run agent, collect Browser Use screenshots, create PR).

**Request**

```
POST /task/task_abc456/execute
Authorization: Bearer <token>
{ "keepWorkspaceAlive": false }
```

**Response** (202)

```
{ "taskId": "task_abc456", "status": "running", "workspaceId": "ws_999" }
```

---

### `GET /task/:taskId/logs` (SSE)

Server-Sent Events stream of logs and structured events during execution (tail logs). The client should connect and display events in real-time.

**Event message examples:**

* `{"type":"info","message":"Cloned repo"}`
* `{"type":"llm_request","provider":"openai","model":"gpt-4o","duration_ms":1234}`
* `{"type":"patch","diff":"--- a/file.js
  +++ b/file.js
  ..."}`
* `{"type":"pr_created","url":"https://github.com/.../pull/123"}`

---

### `POST /task/:taskId/approve`

User approves the PR from their device (mobile or web). This call will try to merge the PR if permitted.

**Request**

```
POST /task/task_abc456/approve
Authorization: Bearer <token>
{ "mergeMethod": "merge" }
```

**Response**

```
{ "taskId": "task_abc456", "merged": true }
```

---

### `POST /task/:taskId/cancel`

Cancel a queued or running task, and optionally terminate the Daytona instance.

**Request**

```
{ "terminateWorkspace": true }
```

**Response**

```
{ "status": "cancelled" }
```

---

## Workspace / Daytona management

### `POST /workspace/create`

Create a Daytona workspace (usually called by task.execute but exposed for debugging / admin).

**Request**

```
POST /workspace/create
{ "repoUrl":"https://github.com/...", "taskId":"task_abc456", "template":"pithy-jaunt-dev" }
```

**Response**

```
{ "workspaceId":"ws_999","status":"creating","url":"https://daytona.workspace/.." }
```

---

### `GET /workspace/:workspaceId`

Return workspace status and metrics (uptime, assigned tasks, last used).

**Response**

```
{ "workspaceId":"ws_999","status":"running","assignedTasks":["task_abc456"], "createdAt":"..." }
```

---

## PR and CodeRabbit webhooks

### `POST /webhook/coderabbit` (incoming)

Receive asynchronous CodeRabbit analysis result callbacks.

**Payload**

```
{ "repoId":"repo_123", "analysisId":"cr_1","tasks": [...] }
```

**Response**

```
{ "status":"ok" }
```

---

### `POST /webhook/github` (incoming)

Support for PR events (optional — useful after OAuth integration).

---

# 3. Component Architecture (UI components)

We will use ShadCN + Tailwind as the primary UI primitives for the web app and mirror many components on mobile in React Native.

Below is a table of UI components with purpose, inputs, and notes to help select ShadCN registry components.

| Component Name      |                                                  Purpose | Key Props / Data                | Notes / ShadCN Matches                         |
| ------------------- | -------------------------------------------------------: | ------------------------------- | ---------------------------------------------- |
| AppShell            |                         Global layout (sidebar + header) | `user`, `navItems`              | Use `Shell` / `Sidebar` patterns               |
| RepoConnectForm     |               Onboarding form where user pastes repo URL | `onSubmit(repoUrl)`             | `Form` + `Input` + `Button`                    |
| CodeRabbitReport    | Displays CodeRabbit analysis summary and suggested tasks | `report` object, `onCreateTask` | `Card`, `Accordion` for file issues            |
| TaskList            |                                   Lists tasks for a repo | `tasks[]`, `onOpen(taskId)`     | `Table` or `List`                              |
| TaskCard            |                                      Single task summary | `task`, `onExecute`, `onCancel` | compact, used in mobile & web                  |
| TaskLogs            |                               Real-time log viewer (SSE) | `taskId`                        | monospaced, streaming UI                       |
| WorkspaceStatus     |                           Shows Daytona workspace status | `workspace`                     | small status pill + uptime                     |
| PRPreview           |                      Shows the PR metadata + screenshots | `prUrl`, `screenshots[]`        | include `Image` gallery (Browser Use captures) |
| ModalConfirm        |                                    Generic confirm modal | `title`, `body`, `onConfirm`    | used for merge approvals                       |
| NotificationsCenter |                               List of user notifications | `notifications[]`               | toast + inbox view                             |
| VoiceRecorder       |                                  Mobile voice capture UI | `onTranscription(text)`         | integrates with Expo speech                    |
| SettingsPanel       |                           Model provider selection, keys | `providers[]`                   | allow quick switching between OpenAI/Anthropic |

**Component guidelines**

* Keep components small and composable.
* Use atomic ShadCN primitives for forms, modals, toasts.
* Reuse TaskCard across web & mobile with platform-specific renderers if necessary.

---

# 4. System Prompt(s) & Agent Behavior

(Stored as `daytona/system-prompt.md` in repo.)

**High-level system prompt (summary):**

```
You are Pithy Jaunt, a senior full-stack engineer with deep knowledge of JavaScript/TypeScript, React, Node.js, and Python. You will be given:
- A user task description
- Access to a cloned repository filesystem
- The CodeRabbit analysis (if present)
- Testing commands available in the repo

Your goal: produce a minimal, safe, idiomatic code change that accomplishes the user's task, includes tests when sensible, and returns a unified diff patch that applies cleanly with git apply.

Constraints:
- Only modify files necessary to implement the feature.
- Prefer small, well-tested changes.
- Ensure linting passes if a linter is present.
- If changes require attention (ambiguous spec), produce a short clarifying question event instead of guessing.
- When finished, output a unified patch and a concise changelog message.
```

**Provider-specific hints**

* If using Anthropic, favor concise stepwise reasoning prompts and limit chain-of-thought.
* If using OpenAI, include explicit `temperature=0.0` for deterministic edits where possible.

---

# 5. Daytona Template + Execution Script (detailed)

Files to store in `/daytona`:

* `Dockerfile`
* `daytona.template.json`
* `execution.sh`
* `runner.py` (agent runner)
* `system-prompt.md`

## daytona.template.json (example)

```
{
  "name": "pithy-jaunt-dev",
  "image": "pithy-jaunt/daytona:latest",
  "timeout_minutes": 25,
  "init": ["/app/execution.sh"]
}
```

## Dockerfile (example)

```
FROM node:20-bullseye
WORKDIR /app
RUN apt-get update && apt-get install -y git python3 python3-pip curl
RUN npm install -g @githubnext/github-copilot-cli || true
COPY package.json package-lock.json ./
RUN npm ci --omit=dev || true
COPY . /app
RUN pip3 install browser-use
```

## execution.sh (detailed)

Make executable. Key env vars provided by workspace creation: `TARGET_REPO`, `BRANCH_NAME`, `TASK_ID`, `AGENT_PROMPT`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CODERABBIT_API_KEY`.

```bash
#!/usr/bin/env bash
set -euo pipefail
export PATH=$PATH:/usr/local/bin

echo "[pj] starting execution for $TASK_ID"
mkdir -p /tmp/pj
cd /tmp/pj

echo "cloning $TARGET_REPO"
git clone "$TARGET_REPO" repo
cd repo

# create branch
BRANCH=${BRANCH_NAME:-pj/${TASK_ID}}
git checkout -b "$BRANCH"

# run language agent
python3 /app/runner.py --prompt-file /app/system-prompt.md --task "$AGENT_PROMPT" --out /tmp/patch.diff

# apply patch
if git apply /tmp/patch.diff; then
  git add -A
  git commit -m "Pithy Jaunt automated change: $TASK_ID"
  git push origin "$BRANCH"
  # create PR using gh CLI
  gh pr create --title "Pithy Jaunt: $TASK_ID" --body "Automated change for task $TASK_ID" --base main --head "$BRANCH"
  echo "PR created"
else
  echo "Patch failed to apply" >&2
  exit 2
fi

# run Browser Use tests if browser-use config present
if [ -f .browseruse.yml ]; then
  echo "running Browser Use tests"
  browser-use run --config .browseruse.yml --save-screenshots /tmp/screens
  # attach screenshots to the PR (upload flow or use GitHub API to attach)
fi

# optionally keep workspace alive until user closes
if [ "${KEEP_ALIVE:-false}" = "true" ]; then
  echo "keeping workspace alive for interactive debugging"
  sleep 900
fi

echo "execution complete"
```

## runner.py (brief)

* Loads system prompt + AGENT_PROMPT
* Calls chosen LLM provider(s)
* Receives unified diff or returns error/clarifying question
* Writes `/tmp/patch.diff`
* Emits structured SSE-style logs to stdout (consumed by the host)

---

# 6. Data Models (simplified)

**Repo**

```
{ id, url, owner, name, analyzerStatus, lastAnalyzedAt }
```

**Task**

```
{ id, repoId, title, description, status, createdAt, modelPreference, assignedWorkspaceId, prUrl }
```

**Workspace**

```
{ id, template, status, createdAt, assignedTasks[] }
```

---

# 7. Web + Mobile UX Flow (end-to-end)

1. User signs up / logs in (Supabase auth)
2. User pastes repo URL in RepoConnectForm (web or mobile)
3. Backend clones repo, triggers CodeRabbit
4. CodeRabbit returns analysis → convert to Task objects
5. User selects a task or creates a new one (voice or text)
6. Task.execute creates or reuses a Daytona workspace and streams logs back
7. When PR is ready, mobile push & web notification appear. User approves from phone.
8. PR merges. Task completed.

---

# 8. Component List (full table)

| Component        | Platform   | Inputs              | Outputs / Events       | Description                                    |
| ---------------- | ---------- | ------------------- | ---------------------- | ---------------------------------------------- |
| AppShell         | Web        | user, nav           | nav events             | Main layout w/ sidebar, header, content region |
| RepoConnectForm  | Web/Mobile | repoUrl             | onConnect(repoId)      | Validates URL, triggers /repo/connect          |
| RepoCard         | Web/Mobile | repo                | onViewReport           | Shows summary stats and last analysis          |
| CodeRabbitReport | Web        | report              | onCreateTask(taskSpec) | Expandable list of issues & suggested tasks    |
| TaskList         | Web/Mobile | tasks[]             | onOpenTask             | List view of tasks with filters                |
| TaskCard         | Web/Mobile | task                | onExecute/onCancel     | Compact task UI with quick actions             |
| TaskCreateModal  | Web/Mobile | repoId, initialData | onCreate(taskId)       | Create custom task form                        |
| TaskLogs         | Web/Mobile | taskId              | n/a                    | SSE log viewer with timestamps                 |
| WorkspacePanel   | Web        | workspace           | onTerminate            | Shows Daytona instance health & assigned tasks |
| PRPreview        | Web/Mobile | prUrl, screenshots  | onApprove              | Shows PR, diff, browser-use screenshots        |
| Notifications    | Web/Mobile | notifications[]     | onClick(notification)  | Toast & inbox listing                          |
| VoiceRecorder    | Mobile     | none                | onTranscription(text)  | Record and transcribe voice to text            |
| Settings         | Web/Mobile | userSettings        | onSave                 | Model provider selection, keys placeholder     |

---

# 9. .env Template (updated)

```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
GITHUB_TOKEN=
DAYTONA_API_KEY=
GALILEO_API_KEY=
CODERABBIT_API_KEY=
RESEND_API_KEY=
MODEL_PROVIDER=openai
MODEL_NAME=gpt-4o
```

---

# 10. Developer Notes & Conventions

* **Branch strategy:** `pj/<taskId>` for automated branches. PR title: `Pithy Jaunt: <taskTitle>`.
* **Patch format:** unified diff output only from the agent. The runner will `git apply` the patch. If the patch fails, the task should be marked `needs_review`.
* **Workspace lifetime:** default 25 minutes. If `keepAlive` specified, up to 15 minutes extension.
* **Security:** All repo clones are read-only in MVP; PR creation is done using a GitHub token with repo:public_repo scope. Do not support private repos in MVP.
* **Observability:** Instrument the flow (repo.connect, task.create, task.execute, pr.create) with Galileo tracing and metrics.

---

# 11. Next Steps — Ready for Implementation

I updated the canvas with the full API contract, component architecture, Daytona execution details, and UX flows. You can now:

1. Use this document to scaffold the Convex backend functions (task endpoints and workers).
2. Start building the Next.js web UI using ShadCN components mapped above.
3. Begin the Rork mobile project using the Rork initial prompt.
4. Prepare Daytona template & Dockerfile in `/daytona` and load into Daytona with your API key.

---

If you'd like, I can now:

* Export this canvas to a single downloadable markdown or ZIP file (I can generate it here).
* Generate starter Convex functions (boilerplate) as diffs to apply to your repo.
* Produce a prioritized hackathon timeline (hour-by-hour) for solo development.

Which of those would you like me to perform next?
