# Deployment Guide

This project deploys as three independent pieces, all on free tiers (no card
required for the ones marked "no card"):

| Piece    | Provider           | Free tier notes |
|----------|---------------------|------------------|
| Database | **Neon** (Postgres) | No card. Serverless Postgres, generous free tier. |
| Backend  | **Render**          | No card for a free Web Service (sleeps after 15 min idle, cold-starts on next request — fine for a demo). |
| Frontend | **Vercel**          | No card. Static/SPA hosting, instant deploys from GitHub. |

AWS deployment is covered at the bottom as the optional bonus path.

---

## 0. Prerequisites

- Code pushed to a GitHub repository (see "Push to GitHub" below if not done yet).
- Accounts: GitHub, Neon, Render, Vercel — sign up with GitHub SSO on all
  three to skip separate passwords.

### Push to GitHub

```bash
cd Project
git init                     # if not already a repo
git add .
git commit -m "Initial commit: Mini ERP + CRM Operations Portal"
git branch -M main
gh repo create mini-erp-crm-portal --public --source=. --remote=origin
git push -u origin main
```
(No `gh`? Create the empty repo on github.com instead, then
`git remote add origin <url>` and `git push -u origin main`.)

---

## 1. Database — Neon

1. Go to https://neon.tech → sign up → **New Project**. Pick any region close
   to where Render will run (e.g. `us-east` if Render's free region is
   Oregon/Virginia).
2. Once created, open **Connection Details** and copy the connection string.
   It looks like:
   ```
   postgres://<user>:<password>@<host>.neon.tech/<dbname>?sslmode=require
   ```
3. Keep this tab open — you'll paste it into Render as `DATABASE_URL` in the
   next step. (Neon's Postgres always requires SSL — that's why the backend
   has the `DB_SSL` flag described below.)

*(Supabase or Render's own managed Postgres work identically — same
connection-string-into-`DATABASE_URL` flow.)*

---

## 2. Backend — Render

1. https://render.com → sign up → **New +** → **Web Service** → connect your
   GitHub repo → pick this repo.
2. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
3. Under **Environment**, add these variables (Render's dashboard, not a
   committed file — this is how env vars are managed in production, never
   hardcoded):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | a long random string — generate one with `openssl rand -hex 32` |
   | `JWT_EXPIRES_IN` | `8h` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | your Vercel URL (you'll get this in step 3 — come back and fill it in, or set to `*` temporarily) |
   | `PORT` | `4000` (Render sets its own `PORT` too; the app already reads `process.env.PORT`, Render's injected value wins) |
4. Deploy. Watch the logs — on first boot you should see:
   ```
   Database connection established.
   Database schema synchronized.
   Server listening on port 4000
   ```
   If you instead see an SSL error, double-check `DB_SSL=true` is set.
5. Once live, note the backend URL, e.g. `https://mini-erp-crm-backend.onrender.com`.
6. **Seed the database** — Render's free tier doesn't give you a persistent
   shell by default, so the simplest option is to run the seed script from
   your own machine, pointed at the Neon database:
   ```bash
   cd backend
   DATABASE_URL="<neon connection string>" DB_SSL=true node src/seed.js
   ```
   This creates the 4 role logins and sample customers/products directly in
   the Neon database Render is also using.

   Alternative: Render → your service → **Shell** tab (available even on
   free web services) → `node src/seed.js` (env vars are already set for the
   service, so no need to pass them again).

---

## 3. Frontend — Vercel

1. https://vercel.com → sign up → **Add New** → **Project** → import the same
   GitHub repo.
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
3. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<your-render-backend-url>/api` |
4. Deploy. Vercel gives you a URL like `https://mini-erp-crm-portal.vercel.app`.
5. **Go back to Render** and set `CORS_ORIGIN` to this exact Vercel URL (no
   trailing slash), then trigger a redeploy of the backend so CORS accepts
   requests from it.

---

## 4. Verify the live deployment

1. Open the Vercel URL, log in with `admin@erp.test` / `Password@123` (see
   README for all 4 role logins).
2. Create a customer, create a product, create a challan, confirm it, check
   stock decreased, download the PDF.
3. If anything 401/CORS-fails, check: `CORS_ORIGIN` on Render matches the
   Vercel URL exactly, and `VITE_API_BASE_URL` on Vercel points at
   `.../api` (not missing the `/api` suffix).

---

## Environment variable management summary

- **Local development**: each app reads a `.env` file (`backend/.env`,
  `frontend/.env`) that is git-ignored — copy from the committed
  `.env.example` in each folder and fill in real values. Never commit `.env`.
- **Production (Render/Vercel)**: env vars are set in each platform's
  dashboard, injected at runtime/build time. Same variable names as
  `.env.example`, so there's no code difference between local and deployed —
  only where the values come from changes.
- **Secrets** (`JWT_SECRET`, DB credentials) only ever live in `.env` (local,
  git-ignored) or the hosting platform's env var store — never in code or
  git history.

---

## Bonus: AWS deployment path

Not required (the case study treats this as bonus and explicitly says not to
spend money) — outlined here in case you want the extra credit. Uses only
free-tier-eligible services for a light demo load.

1. **Database — RDS PostgreSQL (free tier)**
   - RDS console → Create database → PostgreSQL → **Free tier** template →
     `db.t3.micro`, 20GB storage.
   - Set master username/password, note the endpoint hostname.
   - Security group: allow inbound port 5432 from your backend's security
     group (or your IP while testing) — not from `0.0.0.0/0`.
   - `DATABASE_URL=postgres://<user>:<pass>@<rds-endpoint>:5432/<dbname>`, `DB_SSL=true`.

2. **Backend — Elastic Beanstalk (Node.js platform) or EC2 free-tier t2/t3.micro**
   - Simplest: `eb init` → `eb create` with the Node.js platform, deploy the
     `backend/` folder; set the same env vars as the Render step via
     `eb setenv KEY=value ...` or the EB console's Configuration →
     Software → Environment properties.
   - Or plain EC2: launch a free-tier `t2.micro` (Ubuntu), install Node 20+,
     `git clone` the repo, `npm install --production`, run with `pm2` for
     process management, put Nginx in front as a reverse proxy to port 4000,
     and open port 443/80 in the security group (get a free TLS cert via
     Let's Encrypt/certbot).

3. **Frontend — S3 static website hosting + CloudFront**
   - `npm run build` locally, `aws s3 sync dist/ s3://<bucket-name>` to a
     bucket configured for static website hosting.
   - Put a CloudFront distribution in front for HTTPS + caching, pointed at
     the S3 website endpoint.
   - Set `VITE_API_BASE_URL` at build time (before `npm run build`) to the
     backend's public URL.

4. **Optional bonus-on-bonus**: product image upload to S3 — create a bucket,
   an IAM user scoped to `s3:PutObject`/`s3:GetObject` on that bucket only,
   and add an `aws-sdk`/`@aws-sdk/client-s3` upload endpoint on the backend
   using those credentials via env vars (`AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`) — not implemented
   in this submission (see `docs/ASSUMPTIONS.md`).

AWS costs money once free-tier limits are exceeded or free-tier eligibility
expires (12 months for RDS/EC2 free tier on a new account) — keep an eye on
Billing → Budgets if you go this route.
