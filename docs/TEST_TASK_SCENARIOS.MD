# Task 1 Simple - README update
Update the README.md file to add a new "Installation" section after the existing description. The section should include:
- Prerequisites (list any required tools or dependencies)
- Step-by-step installation instructions
- A note about environment variables if applicable

Place this section after the main description and before any existing "Features" or "Usage" sections.



# Task 2 Medium - Add a new feature/component

Add a new health check endpoint to the application. 

If this is a web application:
- Create a new route/endpoint at `/health` or `/api/health`
- Return a JSON response with status: "ok" and timestamp
- Make it accessible via GET request

If this is a Next.js app, add it to the app/api/health/route.ts file.
If this is an Express/Node.js app, add it to the main server file or routes.
If it's a different framework, add it following the project's conventions.

The endpoint should return: {"status": "ok", "timestamp": "<current ISO timestamp>"}



# Task 3 Complex - Multi-file change with dependencies

Add a centralized error handling and logging utility to the project.

1. Create a new utility file (e.g., `lib/utils/error-handler.ts` or `utils/logger.ts`) that exports:
   - A function to log errors with context
   - A function to format error messages
   - Error types/interfaces if using TypeScript

2. Update at least one existing file that currently has error handling to use this new utility instead of inline error handling.

3. If there's a configuration file (like `package.json` or `tsconfig.json`), ensure any new dependencies are properly declared.

The utility should:
- Accept error objects and optional context
- Format errors consistently
- Support different log levels (error, warn, info)
- Be type-safe if using TypeScript