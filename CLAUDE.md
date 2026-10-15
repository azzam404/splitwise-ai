# SplitWise AI

Group expense splitter + personal budgets with Claude-powered expense entry. Built as a
**TCS Zeta Innovate** competition submission (mid-level MERN project, 2–3 week timeline,
started 2026-10-13). Repo: https://github.com/azzam404/splitwise-ai (public, branch `main`).

## Layout

- `server/` Express 5 + Mongoose 9 REST API, **CommonJS**, semicolons. `src/{models,routes,controllers,services,middleware,utils,config}`.
- `client/` React 19 + Vite + Tailwind v4 + Zustand + Recharts, **ES modules, no semicolons** (Vite template style).
- Key services: `server/src/services/splitCalculator.js` (equal/exact/percentage splits),
  `debtSimplifier.js` (balances + max-heap debt simplification), `spending.js` (monthly maths),
  `aiService.js` (Claude calls), `activityLog.js` (group feed writes; failures are logged, never fail the request).

## Commands

```bash
cd server && npm test            # node:test suite (66 tests), in-memory MongoDB, no network
cd server && npm run dev:memory  # API on :5000 with a throwaway in-memory DB (no MongoDB install needed)
cd server && npm run dev         # API against MONGO_URI from server/.env
cd client && npm run dev         # :5173, proxies /api -> :5000 (cookies stay same-origin)
cd client && npm run lint && npm run build   # oxlint must be clean; build must pass
```

## Conventions that matter

- **Money is integer paise everywhere** in the API and DB. The client converts with
  `client/src/utils/money.js` (`toPaise`, `formatINR`, `toRupeeString`). Never store floats.
- Split shares must always sum exactly to the expense amount (remainders distributed by the calculator).
- Validation: Zod v4 schemas exported from controllers, applied with `middleware/validate.js`
  (`validate(schema)` for body, `validate(schema, 'query')` → `req.validated.query`).
- Errors: throw `AppError(status, message)`; Express 5 forwards async errors. Only non-AppError 5xx are logged.
- Access control: group data goes through `loadGroupForMember()` → 404 for non-members (never 403).
- Routes mounted under `/api/groups/:id` (balances router) also match plain group routes, so that
  router applies `requireAuth` **per route**, not via `router.use`.
- Months are `YYYY-MM` in **UTC** (matches how dates are stored). Client "today" uses
  `toLocaleDateString('en-CA')`, not `toISOString()`.
- Tests use the **Node test runner, not Jest**: Jest's VM sandbox breaks the MongoDB v7 driver
  handshake ("Missing required sub-document 'driver'"). Use `useTestDatabase()` from `tests/setup.js`
  and `createAuthedAgent()` from `tests/helpers.js`.

## AI features (Claude Haiku 5.5)

- Model `claude-haiku-5-5` via `@anthropic-ai/sdk`, `messages.parse` + `zodOutputFormat`,
  `output_config.effort: 'low'`. Haiku 5.5 rejects `temperature` and assistant prefill.
- The SDK turns `z.enum` into description hints (not hard constraints) and validates afterwards;
  a mismatch throws base `Anthropic.AnthropicError` → mapped to 422. Refusals → 422.
- AI only returns **drafts**; the user confirms in `ExpenseForm` (`aiDraft` prop). Saved expenses
  carry `createdVia: 'ai-text' | 'ai-receipt'`.
- Members are sent as keys `m1, m2…` so the model can only pick real people.
- Insights send **aggregate totals only** (tested: no names/descriptions leave the server).
- No `ANTHROPIC_API_KEY` → `/api/ai/status` says disabled, AI endpoints 503, UI hides/explains. Keep it that way.
- Tests never call the real API: `aiService.setClientForTesting(fake)`.
- The user has **Claude Pro, which does not include API access**; the key comes from console.anthropic.com
  (separate billing). Never wire Pro/Claude Code login tokens into the app.
- Status (2026-10-15): built and tested with a fake client only. **No API key yet — the user has deferred
  this to later.** Don't block on it. Once a key is in `server/.env`, live-test varied sentences
  (incl. Hinglish) and real receipts, and measure cost.

## UI rules

- Charts: one series hue (`--color-series-1`) for magnitude; no dual axes; tooltips on hover.
- Status colours (`--color-status-good/warning/critical`) always come with an icon + text label.
- Must fit a 390px phone with no horizontal scroll (use `grid-cols-1` on mobile grids — implicit
  grid columns grow to content width).
- Verify UI changes in a real browser before calling them done (headless Chrome via puppeteer-core
  from a temp folder outside the repo; seed data through the API with curl).

## Git workflow (user's standing instruction)

- Small, focused commits in Conventional Commits style (`feat(scope): …`, `fix:`, `test:`, `docs:`, `chore:`).
- Commit locally after each logical unit; **push to `origin main` at the end of each milestone**.
- Never commit `.env`, secrets, `node_modules`, or `dist`.
- `gh` may not be on PATH in Claude's shell: use `"/c/Program Files/GitHub CLI/gh.exe"`.
- Environment is Windows; interactive commands (`gh auth login`, winget prompts) don't work through `!`.

## Status & next steps

Done: auth, groups, expenses (3 split types), balances + debt simplification + settle up,
budgets + dashboard, AI quick-add / receipt scan / insights, group activity feed (`Activity` model,
snapshotted details, `GET /api/groups/:id/activity`), deploy config (`render.yaml`, `client/vercel.json`, `DEPLOY.md`).

Deploy design: Vercel rewrites `/api/*` to Render so cookies are first-party → `COOKIE_SAME_SITE=lax`
(default) and `TRUST_PROXY=1`. Render hostname is assumed to be `splitwise-ai-api.onrender.com`; if it
differs, update `client/vercel.json`.

Next:
1. User creates Atlas/Render/Vercel accounts and follows DEPLOY.md (needs the user — accounts + secrets).
2. Demo video (show AI quick-add and "4 payments instead of 10"). README polish is done (screenshots in
   `docs/screenshots/`, mermaid architecture diagram). The pitch deck is a claude.ai Slides artifact:
   https://claude.ai/artifact/6uLg2ZjMbH4AMQe7u99hVr (11 slides; placeholder `[deployed URL]` on the last slide).
   Screenshot demo data: 5-person "Goa Trip" (12 expenses → 4 payments instead of 10) + "Flat 302"; the seed
   and screenshot scripts were throwaway, kept outside the repo.
3. Later (user's call): add an Anthropic API key and live-test the AI features.

Known: `npm audit` flags `nodemon` (dev-only) — intentionally left. Debt simplification guarantees
≤ N−1 payments, not the true minimum (NP-hard); say exactly that if asked.
