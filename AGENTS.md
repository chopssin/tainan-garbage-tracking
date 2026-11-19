# Working agreements

- Read `PROJECT.md` for the current goal, scope, and acceptance criteria.
- Use React, TypeScript, and plain CSS. Add dependencies only when the feature needs them.
- Keep changes focused. Prefer simple components and native browser features; avoid speculative abstractions.
- Search for relevant files first. Skip `node_modules`, `dist`, and lockfile contents unless the task concerns dependencies.
- For data work, read `data/COVERAGE.md` and inspect targeted records; do not dump the large source snapshot or generated route JSON into context.
- Make reasonable assumptions for reversible choices. Ask when missing information changes the outcome or authorization is needed; honor authorization already given.
- Test meaningful behavior and regressions. Run `npm run check` before handing off code; report failures or checks you could not run.
- For UI changes, check narrow screens, keyboard use, and the production preview when browser tools are available.
- Keep `PROJECT.md` concise and current when scope or durable decisions change. Do not append a running conversation log.
- Keep secrets out of the browser and repository. `VITE_*` values are public in the build.
- Preserve the Pages base path. Use imported assets or `import.meta.env.BASE_URL` for public assets.
- Commit, push, and deploy when authorized by the current task. Otherwise finish local work and report what is ready.
- Finish with a short account of the change, verification, and any blocker. Avoid repeating unchanged context.
