# Pithy Jaunt API v1 Endpoints

## Overview

All API endpoints are versioned under the `/api/v1/` prefix for mobile compatibility and future API evolution. The base URL format is:

```
https://your-domain.com/api/v1/{endpoint}
```

**Authentication**: Most endpoints require authentication via Supabase session cookies. The session is automatically validated using the `Authorization` header or session cookies.

**Response Format**: All endpoints return JSON responses with consistent error formatting:
- Success: `{ data: {...} }` or direct object
- Error: `{ error: "Error message" }` with appropriate HTTP status codes

---

## Authentication Endpoints

### `POST /api/v1/auth/signup`
Create a new user account with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `201 Created`
```json
{
  "userId": "user_abc123",
  "email": "user@example.com",
  "message": "User created successfully"
}
```

---

### `POST /api/v1/auth/login`
Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "userId": "user_abc123",
  "email": "user@example.com",
  "message": "Login successful"
}
```

---

### `POST /api/v1/auth/magic-link`
Send a passwordless authentication magic link via email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If an account exists, a magic link has been sent to your email"
}
```

---

### `GET /api/v1/auth/session`
Get the current authenticated user session.

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com"
  }
}
```

---

### `POST /api/v1/auth/logout`
End the current user session.

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

## Repository Endpoints

### `GET /api/v1/repo`
List all repositories connected by the authenticated user.

**Response:** `200 OK`
```json
{
  "repos": [
    {
      "id": "repo_123",
      "url": "https://github.com/owner/repo",
      "owner": "owner",
      "name": "repo",
      "branch": "main",
      "status": "analyzed",
      "coderabbitDetected": true,
      "lastAnalyzedAt": 1234567890,
      "createdAt": 1234567890
    }
  ]
}
```

---

### `POST /api/v1/repo/connect`
Connect a GitHub repository to the user's account and trigger CodeRabbit analysis.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main"
}
```

**Response:** `202 Accepted`
```json
{
  "repoId": "repo_123",
  "repoUrl": "https://github.com/owner/repo",
  "coderabbitDetected": true,
  "status": "analyzing",
  "next": "/repos/repo_123"
}
```

---

### `GET /api/v1/repo/[repoId]/report`
Get the latest CodeRabbit analysis report for a repository.

**Response:** `200 OK`
```json
{
  "repoId": "repo_123",
  "status": "analyzed",
  "coderabbitDetected": true,
  "lastAnalyzedAt": 1234567890,
  "report": null,
  "tasks": []
}
```

---

## Task Endpoints

### `GET /api/v1/task`
List tasks for the authenticated user.

**Query Parameters:**
- `repoId` (optional): Filter by repository ID
- `status` (optional): Filter by status (queued, running, completed, failed, cancelled, needs_review)

**Response:** `200 OK`
```json
{
  "tasks": [
    {
      "taskId": "task_123",
      "repoId": "repo_123",
      "title": "Add /health endpoint",
      "description": "Add a simple /health returning 200",
      "status": "queued",
      "priority": "normal",
      "initiator": "user",
      "assignedWorkspaceId": null,
      "branchName": null,
      "prUrl": null,
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ]
}
```

---

### `POST /api/v1/task`
Create a new task.

**Request Body:**
```json
{
  "repoId": "repo_123",
  "title": "Add /health endpoint",
  "description": "Add a simple /health returning 200 and status JSON",
  "priority": "normal",
  "modelPreference": {
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

**Response:** `201 Created`
```json
{
  "taskId": "task_123",
  "status": "queued",
  "assignedWorkspace": null
}
```

---

### `GET /api/v1/task/[taskId]`
Get task details including status and PR URL if completed.

**Response:** `200 OK`
```json
{
  "taskId": "task_123",
  "repoId": "repo_123",
  "title": "Add /health endpoint",
  "description": "Add a simple /health returning 200",
  "status": "completed",
  "priority": "normal",
  "initiator": "user",
  "assignedWorkspaceId": "ws_123",
  "branchName": "pj/task_123",
  "prUrl": "https://github.com/owner/repo/pull/123",
  "logsUrl": "/api/v1/task/task_123/logs",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

---

### `POST /api/v1/task/[taskId]/execute`
Execute a task: provision Daytona workspace, run agent, create PR.

**Request Body:**
```json
{
  "keepWorkspaceAlive": false
}
```

**Response:** `202 Accepted`
```json
{
  "taskId": "task_123",
  "status": "running",
  "workspaceId": "ws_123"
}
```

---

### `POST /api/v1/task/[taskId]/approve`
Approve a completed task and optionally merge the PR.

**Request Body:**
```json
{
  "mergeMethod": "merge"
}
```

**Valid merge methods:** `"merge"`, `"squash"`, `"rebase"`

**Response:** `200 OK`
```json
{
  "taskId": "task_123",
  "merged": true,
  "prUrl": "https://github.com/owner/repo/pull/123"
}
```

---

### `POST /api/v1/task/[taskId]/cancel`
Cancel a queued or running task.

**Request Body:**
```json
{
  "terminateWorkspace": true
}
```

**Response:** `200 OK`
```json
{
  "taskId": "task_123",
  "status": "cancelled"
}
```

---

### `GET /api/v1/task/[taskId]/logs`
Server-Sent Events (SSE) stream of task execution logs in real-time.

**Response:** `200 OK` (text/event-stream)
```
data: {"type":"info","message":"Connected to log stream"}

data: {"type":"llm_request","message":"Calling OpenAI API..."}

data: {"type":"patch","message":"Applied code changes..."}

data: {"type":"pr_created","message":"PR #123 created"}
```

**Event Types:**
- `info`: General information messages
- `llm_request`: LLM API calls
- `patch`: Code changes (diffs)
- `pr_created`: PR creation events
- `error`: Error messages

---

## Workspace Endpoints

### `GET /api/v1/workspace`
List workspaces for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status

**Response:** `200 OK`
```json
{
  "workspaces": [
    {
      "workspaceId": "ws_123",
      "daytonaId": "daytona_workspace_123",
      "template": "pithy-jaunt-dev",
      "status": "running",
      "assignedTasks": ["task_123"],
      "createdAt": 1234567890,
      "lastUsedAt": 1234567890
    }
  ]
}
```

---

### `GET /api/v1/workspace/[workspaceId]`
Get workspace details including status and metrics.

**Response:** `200 OK`
```json
{
  "workspaceId": "ws_123",
  "daytonaId": "daytona_workspace_123",
  "template": "pithy-jaunt-dev",
  "status": "running",
  "assignedTasks": ["task_123"],
  "createdAt": 1234567890,
  "lastUsedAt": 1234567890,
  "daytonaStatus": {
    "state": "Running",
    "uptime": 3600
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: User doesn't have access to the resource
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists (e.g., duplicate repo connection)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: External service unavailable (e.g., Daytona not configured)

**Error Response Format:**
```json
{
  "error": "Error message description"
}
```

---

## Notes for Mobile Integration

1. **Session Management**: Use Supabase session cookies or tokens for authentication. The session is automatically validated on protected endpoints.

2. **Real-time Logs**: The `/task/[taskId]/logs` endpoint uses Server-Sent Events (SSE). Use an SSE client library to stream logs in real-time.

3. **Task Status Flow**: Tasks progress through these states:
   - `queued` → `running` → `completed` / `failed` / `needs_review`
   - Tasks can be `cancelled` from `queued` or `running` states

4. **Repository Analysis**: After connecting a repo, analysis happens asynchronously. Poll the `/repo/[repoId]/report` endpoint or wait for webhook notifications to get analysis results.

5. **Rate Limits**: Currently no rate limiting is enforced, but be mindful of GitHub API rate limits when connecting repositories.

