# RepoMind AI ✦

A responsive, source-grounded GitHub repository explorer with **OpenAI** and **Groq** support.

## Features

- Analyze public GitHub repositories directly from the browser, or through the Worker
- Browse indexed files and code snippets
- Detect technologies from repository paths
- Ask AI for architecture, features, code quality, and interactive Q&A
- OpenAI or Groq provider selection with editable model
- Bring your own API key **in session memory only**, not browser storage
- Optional server-managed secrets protected by an access token
- Responsive dark UI; no frontend build step

## Architecture

`index.html` + `style.css` + `app.js` = static frontend (GitHub Pages or Cloudflare Pages).
`worker.js` = Cloudflare Worker, reads public GitHub repositories and proxies AI requests. `wrangler.toml` = Worker config.

Frontend -> Worker /api/repo -> GitHub REST -> code snippets.
Frontend -> Worker /api/ai -> Groq/OpenAI, with context and filenames.

This is an MVP: it selects up to 32 files for context, first 500 eligible paths, up to 85,000 characters, and is not an exhaustive code audit. Private GitHub repos and GitHub authentication are not yet implemented. AI may make mistakes; confirm findings against source and tests.

## Deployment

1. Create a **new** GitHub repository, ideally named `repomind-ai`, and push these files to its `main` branch.
2. Enable GitHub Pages for the frontend (`main` / root), or use Cloudflare Pages.
3. Install Node 22+, then run `npx wrangler login`.
4. Update `wrangler.toml`: set `ALLOWED_ORIGIN` under `[vars]` to the exact frontend origin (scheme + hostname + optional port, no path). Example: `https://YOURNAME.github.io`.
5. Run `npx wrangler deploy`. Copy the Worker URL.
6. Open RepoMind, select **Provider settings**, enter Worker URL, select OpenAI/Groq, paste your own API key, and analyze a repository.
7. For greater GitHub API limits, set a `GITHUB_TOKEN` Worker secret.
8. For managed AI keys, run `npx wrangler secret put OPENAI_API_KEY` and/or `npx wrangler secret put GROQ_API_KEY`, plus `npx wrangler secret put APP_ACCESS_TOKEN`. Users enter only that token in settings.

### Security

Never commit API keys to GitHub. BYOK keys are held only in the browser tab's JS memory and sent over HTTPS to your Worker; the Worker forwards them to the selected provider and does not store them. The Worker should be deployed under your control. The frontend remembers only the public Worker URL in localStorage. Worker-managed keys require an access token; **do not expose that token publicly**. Add real authentication, stronger per-user quotas, and abuse protection before opening a shared managed-key version to the public. Third-party repo content is untrusted; the AI system prompt instructs the model not to obey embedded instructions. The indexer skips common private filenames and redacts some token-shaped strings, but it is not a complete secret scanner.

## Provider settings

Default Groq model: `llama-3.3-70b-versatile`
Default OpenAI model: `gpt-4.1-mini`.
A bounded allowlist exists in `worker.js`; change it to support other provider models.

## Local frontend preview

`python -m http.server 8000`. Backend remains Cloudflare Worker (configure ALLOWED_ORIGIN to localhost for local tests).

## Scope

MVP is read-only for GitHub. No repository changes, no automated code execution, no private repo support, no live testing, and no claim of exhaustive analysis. Use AI outputs as suggestions and validate them.
