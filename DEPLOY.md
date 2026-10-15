# Deploying SplitWise AI

Free-tier setup: **MongoDB Atlas** (database) → **Render** (API) → **Vercel** (web app).

The web app proxies `/api/*` to the API (`client/vercel.json`), so the browser only ever talks to
the Vercel domain. Auth cookies stay first-party, which avoids third-party cookie blocking in
Safari and Chrome.

## 1. Database: MongoDB Atlas

1. Create a free **M0** cluster at <https://cloud.mongodb.com>.
2. **Database Access:** add a user with a generated password.
3. **Network Access:** allow `0.0.0.0/0` (Render's free tier has no fixed outbound IP).
4. **Connect → Drivers:** copy the connection string and add a database name before the `?`:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/splitwise-ai?retryWrites=true&w=majority`

## 2. API: Render

1. At <https://render.com>, choose **New → Blueprint** and pick the `splitwise-ai` repo.
   `render.yaml` creates the `splitwise-ai-api` web service and generates both JWT secrets.
2. When prompted, fill in:
   - `MONGO_URI`: the Atlas string from step 1
   - `CLIENT_URL`: your Vercel URL (set it after step 3 if you don't know it yet)
   - `ANTHROPIC_API_KEY`: leave empty for now; the AI features stay off until it's set
3. Once it's live, open `https://<service>.onrender.com/api/health`. You should see `{"status":"ok"}`.

If Render gives the service a different hostname, update the `destination` in `client/vercel.json`.

## 3. Web app: Vercel

1. At <https://vercel.com>, choose **Add New → Project** and import the repo.
2. Set **Root Directory** to `client`. Vercel detects Vite (`npm run build` → `dist`).
3. Don't set `VITE_API_URL`: the client calls `/api`, which `vercel.json` forwards to Render.
4. Deploy, then put the Vercel URL into Render's `CLIENT_URL` and redeploy the API.

## 4. Smoke test

Register two users (one in a private window), create a group, join with the invite code, add an
expense, check balances, record a payment, then check the Activity tab and the dashboard.

## Notes

- **Cold starts:** Render's free tier sleeps after about 15 minutes idle, and the first request
  then takes about a minute. Open the site a few minutes before a demo.
- **Enabling AI later:** add `ANTHROPIC_API_KEY` in Render → Environment and the service restarts.
  `/api/ai/status` then reports the AI features as enabled.
- **Calling the API cross-site instead** (`VITE_API_URL=https://…onrender.com/api`): set
  `COOKIE_SAME_SITE=none` on Render. Browsers that block third-party cookies will still break
  login, which is why the proxy setup is the default.
