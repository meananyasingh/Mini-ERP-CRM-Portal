# Architecture

## Overview

A standard 3-tier web app, split into two independently deployable apps sharing
one contract:

```
┌─────────────────┐        HTTPS/JSON        ┌──────────────────────┐        SQL       ┌────────────────┐
│  React frontend  │ ───────────────────────▶ │  Express REST API    │ ───────────────▶ │  PostgreSQL     │
│  (Vite, JS)       │ ◀─────────────────────── │  (Node.js, Sequelize) │ ◀─────────────── │                 │
└─────────────────┘        JWT in header      └──────────────────────┘                  └────────────────┘
```

- **Frontend** (`/frontend`): React + Vite, plain JavaScript, react-router-dom
  for routing, axios for API calls, no UI framework (hand-rolled CSS design
  system in `src/index.css`). Talks to the backend only over REST, never
  touches the database directly.
- **Backend** (`/backend`): Node.js + Express, plain JavaScript. Sequelize as
  the ORM against PostgreSQL. Stateless — auth is JWT, so any number of
  backend instances can run behind a load balancer with no session affinity.
- **Database**: PostgreSQL. Schema is defined via Sequelize models and created
  with `sequelize.sync({ alter: true })` on boot (see "Why sync instead of
  migrations" below).

Full data model and API contract: see [`/CONTRACT.md`](../CONTRACT.md) at the
repo root — it's the single source of truth both apps were built against.

## Request flow (example: confirming a challan)

1. Frontend calls `POST /api/challans/:id/confirm` with the JWT in the
   `Authorization` header.
2. `authenticate` middleware verifies the JWT and loads the user; `authorize('admin','sales')`
   checks the role is allowed to confirm challans.
3. Controller opens a single Sequelize transaction:
   - Locks every product row involved (`SELECT ... FOR UPDATE`) so two
     concurrent confirmations against the same product can't both pass the
     stock check and then both decrement — the second one blocks until the
     first transaction commits, then sees the updated stock.
   - Verifies every line item has enough stock. If any item is short, the
     whole transaction throws before touching any row (no partial stock
     deduction).
   - Decrements `Product.currentStock` per item and inserts a `StockMovement`
     row (`OUT`) as an audit trail.
   - Flips `Challan.status` to `Confirmed`.
4. On success, the updated challan (with items) is returned; on failure, a 400
   with a per-product shortfall list is returned and no data changed.

The same transaction + row-lock pattern is used for cancelling a confirmed
challan (restocks) and for manual stock adjustments (prevents negative stock).

## Why Sequelize `sync` instead of migration files

For a scoped 48-hour case study, hand-written migrations add process overhead
without adding much signal — the schema is fully defined by the models in
`backend/src/models/`, and `sequelize.sync({ alter: true })` (never `force`)
brings a fresh database up to that shape safely. In a longer-lived production
system this would be replaced with `sequelize-cli` migrations (or Prisma
Migrate) so schema changes are versioned and reviewable independently of code.

## Why snapshots on challan/challan items

`Challan.customerSnapshot` and `ChallanItem.productSnapshot` freeze the
customer/product data *as it was* at the moment the challan was created or
edited. This means:
- A price change on a product next week doesn't silently change the total on
  a challan from today.
- A challan PDF for an old challan always reflects what was actually agreed,
  even if the product was later renamed or the customer's address changed.

This is standard practice for anything resembling an invoice/delivery document
in real ERPs — you never want historical documents to be "live" against
mutable master data.

## Frontend structure

- `api/` — one thin wrapper module per backend resource; every function maps
  1:1 to an endpoint in `CONTRACT.md`. No component calls axios directly.
- `context/AuthContext.jsx` — the only place token/user state lives; persisted
  to `localStorage` so a refresh doesn't log the user out.
- `utils/permissions.js` — mirrors the backend's role matrix so the UI hides
  actions a role can't perform. This is a UX convenience only — the backend
  is the actual authority and re-checks every request.
- `components/` — generic, reusable pieces (table with built-in
  search+pagination, modal, status badge, route guard) so page components stay
  focused on data + layout.

## Known scaling limits (acceptable for this case study, called out for honesty)

- Single Postgres instance, no read replicas / caching layer — fine at the
  scale of an internal ops tool for one distribution company.
- `sync({ alter: true })` re-diffs the whole schema on every boot; harmless at
  this size but not how you'd manage schema drift at larger scale.
- No background job queue — PDF generation and stock updates happen inline in
  the request. Acceptable given the tiny document sizes involved here.
