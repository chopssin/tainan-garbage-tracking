# Project brief

Replace this brief when starting an app. Keep only the current scope and durable decisions.

## Goal
Provide a small, reusable foundation for a static web app.

## Audience and main task
People building a focused browser tool. Replace the demo with one useful workflow.

## First release
- One responsive screen with clear labels and keyboard access.
- Only the features needed for the main task.
- Passing checks and a working GitHub Pages build.

## Constraints
Vite + React + TypeScript; plain CSS; npm; Node 24; static hosting.
No backend, authentication, database, analytics, or UI framework by default.

## Acceptance criteria
- The primary workflow works on desktop and mobile.
- Meaningful behavior has tests; `npm run check` passes.
- Assets load at the repository's Pages URL, including after a reload.

## Decisions
Deployment is opt-in per repository with `PAGES_ENABLED=true`.
Add backend services or a router only when the app requires them.
