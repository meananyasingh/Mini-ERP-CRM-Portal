# Mini ERP + CRM Operations Portal

A small internal ERP/CRM system for a wholesale/distribution company —
customers, products & stock, sales challans, and basic CRM follow-ups —
built as a full-stack case study.

- **Backend**: Node.js, Express.js, Sequelize, PostgreSQL, JWT auth, plain JavaScript.
- **Frontend**: React (Vite), plain JavaScript, react-router-dom, axios, responsive admin UI.
- **Roles**: Admin, Sales, Warehouse, Accounts (role-based access, enforced server-side).

📄 Full data model + API contract: [`CONTRACT.md`](CONTRACT.md)
📄 Architecture notes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
📄 Deployment guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
📄 Assumptions & known limitations: [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md)
📄 API collection: [`postman_collection.json`](postman_collection.json) (import into Postman)

## Live links

| | URL |
|---|---|
| Frontend | _fill in after deploying — see docs/DEPLOYMENT.md_ |
| Backend API | _fill in after deploying — see docs/DEPLOYMENT.md_ |
| GitHub repo | _fill in after `git push`_ |

## Test credentials

Created by `backend/src/seed.js`. All passwords: `Password@123`

| Role | Email |
|---|---|
| Admin | admin@erp.test |
| Sales | sales@erp.test |
| Warehouse | warehouse@erp.test |
| Accounts | accounts@erp.test |

## Modules

1. **Auth & Roles** — JWT login, 4 roles, server-side role checks on every route.
2. **Customer CRM** — add/edit/search/view customers, follow-up notes/timeline, lead/active/inactive status.
3. **Products & Inventory** — add/edit products, stock movement log (IN/OUT with reason + who + when), low-stock flag.
4. **Sales Challan** — pick customer, add multiple products + quantities, save Draft or Confirm; confirming atomically reduces stock (never below zero) and snapshots customer/product data onto the challan; PDF export.

## Project layout

```
Project/
├── backend/          Express API (Node.js, Sequelize, PostgreSQL)
├── frontend/         React app (Vite)
├── docs/             Architecture, deployment, assumptions
├── CONTRACT.md        Data model + API contract (source of truth for both apps)
├── postman_collection.json
└── docker-compose.yml Local Postgres for development only
```

## Running it locally

### 0. Prerequisites
- Node.js 18+ and npm
- A PostgreSQL instance — easiest is Docker:
  ```bash
  docker compose up -d
  ```
  This starts Postgres on `localhost:5432` with user `erp_user` / password
  `erp_password` / database `erp_crm` (see `docker-compose.yml`). If you'd
  rather use a Postgres you already have running, or a free hosted one
  (Neon/Supabase), just point `DATABASE_URL` at that instead.

### 1. Backend

```bash
cd backend
cp .env.example .env      # then edit DATABASE_URL / JWT_SECRET if needed
npm install
npm run seed               # creates the 4 role users + sample data
npm run dev                 # starts on http://localhost:4000
```

`npm run dev` (nodemon) auto-restarts on file changes; `npm start` runs it
without nodemon (used in production). The server also runs
`sequelize.sync({ alter: true })` on boot, so tables are created
automatically — no separate migration step needed for local dev.

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:4000/api by default
npm install
npm run dev                 # starts on http://localhost:5173
```

Open http://localhost:5173 and log in with any of the test credentials above.

### 3. Try the core flow

1. Log in as `sales@erp.test`.
2. Customers → Add customer.
3. Log in as `warehouse@erp.test` (or stay as sales, just to see the read-only view) → Products → Add product with some stock.
4. Back as sales → Challans → New Challan → pick the customer, add the product with a quantity → Save as Draft.
5. Open the challan → Confirm → watch the product's stock drop (Products → the product's stock movement log now shows an `OUT` entry).
6. Download the challan as a PDF from the challan detail page.
7. Try confirming a challan that requests more than the available stock → see the clear 400 error instead of a silent failure or negative stock.

## Environment variables

See `.env.example` in `backend/` and `frontend/` for the full list; both are
git-ignored so real values never get committed. Full explanation of how
env vars are managed locally vs. in production: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md#environment-variable-management-summary).

## Deployment

Full step-by-step guide (free hosting: Vercel + Render + Neon, plus an
optional AWS bonus path): [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## API documentation

- [`CONTRACT.md`](CONTRACT.md) — every endpoint, request/response shape, and business rule.
- [`postman_collection.json`](postman_collection.json) — importable Postman collection with all requests pre-built (login auto-saves the JWT for the rest of the collection).

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for request flow, the
stock-transaction logic, and why certain design choices were made (e.g.
`sync` instead of migrations, snapshotting on challans).

## Assumptions & known limitations

See [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) — covers the role
permission matrix (not fully specified by the brief), what "cancel" does to
stock, and what was intentionally left out of scope for the 48-hour window.

## Screen recording

_If this is submitted without a live deployment, place a screen-recording
link here showing: login as each role, full customer → product → challan →
confirm → PDF flow, and the insufficient-stock error case._
