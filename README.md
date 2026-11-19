# webapp-starter

A small foundation for useful web apps: Vite, React, TypeScript, plain CSS, Vitest, and GitHub Pages. No runtime dependencies beyond React and React DOM.

The repository is the reusable "factory": copy it for each app, describe the app in `PROJECT.md`, and build one focused feature at a time. Short persistent instructions reduce repeated setup and context; token savings depend on the task and are not guaranteed.

## Start a new app

1. On GitHub, choose **Use this template → Create a new repository**. Give the app its own name. Do not fork or keep editing the starter for each app.
2. Clone the new repository and open that folder as your Codex project.
3. Use Node 24 (`nvm use` if you use nvm), then run:

   ```sh
   npm ci
   npm run dev
   ```

4. Replace `PROJECT.md` with the app's audience, main task, first-release scope, and acceptance criteria. Rename `package.json` with `npm pkg set name=my-app && npm install --package-lock-only`, and update the title and description in `index.html`.
5. Give Codex the prompt below. The repository instructions travel with every copy.

```text
Read AGENTS.md and PROJECT.md. Build [APP IDEA] for [AUDIENCE].
The main task is [TASK]. For this release include [1–3 FEATURES].
Success means [OBSERVABLE ACCEPTANCE CRITERIA].
Update PROJECT.md, implement the smallest complete version, and run the checks.
Make reasonable assumptions and ask only about decisions that materially change the result.
Finish with what changed, what passed, and anything still blocked.
Keep this iteration local; I will review it before publishing.
```

For later changes, specify the behavior and acceptance criteria instead of pasting the setup again. Example: "Add a filter by status. Keep the chosen filter after a page refresh. Run the relevant checks."

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install exactly the committed dependency versions |
| `npm run dev` | Start the local development server |
| `npm run check` | Run tests, TypeScript checks, and production build |
| `npm test` | Run tests once |
| `npm run test:watch` | Watch tests while editing |
| `npm run typecheck` | Check TypeScript only |
| `npm run build` | Check TypeScript and build to `dist/` |
| `npm run preview` | Serve the latest production build locally |

## Publish with GitHub Pages

For **each new repository**, do this once when ready to publish:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables → New repository variable**: add `PAGES_ENABLED` with value `true`.
3. **Actions → Check and deploy → Run workflow**, choosing `main`, or push a change to `main`.

Every pull request and push to `main` runs checks. Successful `main` builds deploy only when Pages is enabled by the variable; pull requests never deploy. Until then, checks still run without requiring Pages setup. Repository settings and variables are not copied from a template.

The workflow reads `base_path` from GitHub's Pages configuration and passes it to Vite as `BASE_PATH`. A project site gets `/your-repository/`; an account site or configured custom domain gets `/`. No hard-coded repository name needs editing. For a local subpath check (macOS/Linux):

```sh
BASE_PATH=/my-app/ npm run build
BASE_PATH=/my-app/ npm run preview
```

Open the preview URL with `/my-app/` appended. Import assets from `src`, or prefix files in `public` with `import.meta.env.BASE_URL`. If adding routing, use hash routing unless the host supports history fallback; GitHub Pages does not provide application-route rewrites.

## One-time setup and credentials

- Local development needs Node 24 and npm. Git is needed to clone and push. No API key is needed for this starter.
- Authenticate Git once using your normal GitHub HTTPS credential manager or SSH key. If using the optional GitHub CLI, run `gh auth login`; its login is separate from the connected GitHub app in Codex.
- GitHub Actions uses the repository's automatic `GITHUB_TOKEN` and OIDC for Pages. Do not create a personal access token or add a deployment secret for the workflow. Account or organization policy must allow the listed official GitHub Actions.
- GitHub Free supports Pages for public repositories; private repositories require an eligible paid plan. A private repository does not by itself make the published website private.
- This is a static frontend. Secrets, private API credentials, and privileged operations need a separate backend. Values prefixed with `VITE_` are bundled for visitors to see.

## Where things live

- `src/App.tsx` — replaceable demo and first screen.
- `src/styles.css` — small responsive stylesheet using system fonts.
- `src/App.test.tsx` — interaction and keyboard test examples.
- `vite.config.ts` — shared build/test configuration and hosting base path.
- `AGENTS.md` — brief repository instructions for coding agents.
- `PROJECT.md` — editable product brief.
- `.github/workflows/pages.yml` — checks and optional Pages deployment.

Keep this structure until a real feature needs more. There is no separate lint or formatting dependency; TypeScript and behavior tests are the initial checks.

References: [Vite deployment](https://vite.dev/guide/static-deploy.html), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Vitest](https://vitest.dev/guide/), [Codex repository instructions](https://developers.openai.com/codex/guides/agents-md/).
