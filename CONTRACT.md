# Mini ERP + CRM Portal — Shared Contract

This is the single source of truth for both backend and frontend. Do not deviate
from field names, routes, or response envelopes below without updating this file.

Language: **plain JavaScript everywhere** (backend and frontend). No TypeScript.

## 1. Roles

`admin`, `sales`, `warehouse`, `accounts`

Permission matrix (enforced server-side via middleware, and used client-side to
show/hide UI):

| Module              | admin | sales | warehouse | accounts |
|---------------------|-------|-------|-----------|----------|
| Users (manage)      | CRUD  | -     | -         | -        |
| Customers           | CRUD  | CRUD  | read      | read     |
| Follow-ups          | CRUD  | CRUD  | read      | read     |
| Products            | CRUD  | read  | CRUD      | read     |
| Stock movements     | CRUD  | read  | CRUD      | read     |
| Challans (create/edit draft) | CRUD | CRUD | read | read |
| Challans (confirm/cancel)    | yes  | yes  | -    | -    |
| Challan PDF (view/download)  | yes  | yes  | yes  | yes  |

## 2. Response envelope

Success:
```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```
`meta` only present on paginated list endpoints.

Error:
```json
{ "success": false, "message": "Human readable summary", "errors": [ { "field": "mobile", "message": "Mobile number is required" } ] }
```
`errors` array only present for validation failures (400).

HTTP status codes used: 200, 201, 400 (validation/business rule), 401 (no/invalid
token), 403 (role not permitted), 404 (not found), 409 (unique constraint conflict,
e.g. duplicate SKU/email).

## 3. Auth

- `POST /api/auth/login` — body `{ email, password }` → `{ token, user: { id, name, email, role } }`
- `GET /api/auth/me` — protected, returns current user from token
- `POST /api/auth/users` — admin only, create a user `{ name, email, password, role }`
- `GET /api/auth/users` — admin only, list users (id, name, email, role, createdAt)

JWT payload: `{ id, role }`. Sent as `Authorization: Bearer <token>`.
Env: `JWT_SECRET`, `JWT_EXPIRES_IN` (default `8h`).

## 4. Data models (Sequelize, Postgres)

### User
| field | type | notes |
|---|---|---|
| id | INTEGER PK autoincrement | |
| name | STRING | required |
| email | STRING | required, unique |
| passwordHash | STRING | bcrypt hash, never returned in API responses |
| role | ENUM('admin','sales','warehouse','accounts') | required |
| createdAt/updatedAt | timestamps | |

### Customer
| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| name | STRING | required |
| mobile | STRING | required |
| email | STRING | optional |
| businessName | STRING | optional |
| gstNumber | STRING | optional |
| customerType | ENUM('Retail','Wholesale','Distributor') | default 'Retail' |
| address | TEXT | optional |
| status | ENUM('Lead','Active','Inactive') | default 'Lead' |
| nextFollowUpDate | DATEONLY | optional |
| notes | TEXT | optional, general notes |
| createdBy | INTEGER FK -> User.id | |
| createdAt/updatedAt | timestamps | |

### FollowUp
| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| customerId | INTEGER FK -> Customer.id | required |
| note | TEXT | required |
| followUpDate | DATEONLY | optional — next scheduled date; if set, update Customer.nextFollowUpDate to this value |
| createdBy | INTEGER FK -> User.id | |
| createdAt | timestamp | |

### Product
| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| name | STRING | required |
| sku | STRING | required, unique |
| category | STRING | optional |
| unitPrice | DECIMAL(10,2) | required, >= 0 |
| currentStock | INTEGER | default 0, never allowed negative |
| minStockAlert | INTEGER | default 0 |
| location | STRING | optional (warehouse/location name) |
| createdAt/updatedAt | timestamps | |

### StockMovement
| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| productId | INTEGER FK -> Product.id | required |
| quantityChanged | INTEGER | required, > 0 (always positive magnitude) |
| movementType | ENUM('IN','OUT') | required |
| reason | STRING | required |
| createdBy | INTEGER FK -> User.id | |
| createdAt | timestamp | |

### Challan
| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| challanNumber | STRING | unique, generated after insert as `CH-` + id zero-padded to 6, e.g. `CH-000001` |
| customerId | INTEGER FK -> Customer.id | required |
| customerSnapshot | JSONB | `{ name, mobile, businessName, address }` captured at creation |
| totalQuantity | INTEGER | sum of item quantities, computed server-side |
| status | ENUM('Draft','Confirmed','Cancelled') | default 'Draft' |
| createdBy | INTEGER FK -> User.id | |
| createdAt/updatedAt | timestamps | |

### ChallanItem
| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| challanId | INTEGER FK -> Challan.id | required |
| productId | INTEGER FK -> Product.id | required |
| productSnapshot | JSONB | `{ name, sku, unitPrice }` captured when item added |
| quantity | INTEGER | required, > 0 |
| lineTotal | DECIMAL(10,2) | quantity * snapshot unitPrice |
| createdAt | timestamp | |

## 5. Business rules (must be enforced server-side, in a DB transaction where noted)

1. Confirming a challan (`POST /api/challans/:id/confirm`) must, in a single transaction:
   - Lock the involved product rows.
   - Verify `currentStock >= quantity` for every item. If any item fails, return
     `400` with `errors` listing `{ field: "productId", message: "Insufficient stock for <name>: available X, requested Y" }` for each shortfall — do not partially apply.
   - Decrement `currentStock` per item and insert a `StockMovement` row
     (`movementType: 'OUT'`, `reason: "Challan <challanNumber> confirmed"`, `createdBy` = confirming user).
   - Set challan `status = 'Confirmed'`.
   - Only a `Draft` challan can be confirmed (409 otherwise).
2. Cancelling a challan (`POST /api/challans/:id/cancel`):
   - From `Draft` → `Cancelled`: no stock impact.
   - From `Confirmed` → `Cancelled`: restock — insert `StockMovement` (`IN`, reason `"Challan <no> cancelled — stock reverted"`) and increment `currentStock` back, in a transaction.
   - `Cancelled` challans cannot be edited or re-confirmed.
3. Editing a challan's items (`PUT /api/challans/:id`) only allowed while `Draft`.
4. Manual stock adjustment (`POST /api/products/:id/stock-adjust`) must not let `currentStock` go below 0 for an `OUT` adjustment; return 400 if it would.
5. Challan line items always store a product snapshot; the UI must render challan detail from the snapshot, not by re-fetching current product data (so historical challans stay accurate even if price changes later).
6. Passwords are always bcrypt-hashed (min 10 rounds); `passwordHash` must never appear in any API response.

## 6. REST endpoints

Base path: `/api`

### Customers
- `GET /customers?search=&status=&customerType=&page=&limit=` — search matches name/mobile/email/businessName
- `GET /customers/:id` — includes recent follow-ups
- `POST /customers` — create
- `PUT /customers/:id` — update
- `GET /customers/:id/followups`
- `POST /customers/:id/followups` — `{ note, followUpDate }`

### Products
- `GET /products?search=&category=&lowStock=true&page=&limit=` — `lowStock=true` filters `currentStock <= minStockAlert`
- `GET /products/:id`
- `POST /products`
- `PUT /products/:id`
- `GET /products/:id/stock-movements?page=&limit=`
- `POST /products/:id/stock-adjust` — `{ quantityChanged, movementType, reason }`

### Challans
- `GET /challans?status=&customerId=&page=&limit=`
- `GET /challans/:id` — includes items + customer snapshot
- `POST /challans` — `{ customerId, items: [{ productId, quantity }] }` → created as `Draft`
- `PUT /challans/:id` — replace items (Draft only) — `{ customerId, items: [...] }`
- `POST /challans/:id/confirm`
- `POST /challans/:id/cancel`
- `GET /challans/:id/pdf` — returns a PDF (invoice-style) of the challan

### Misc
- `GET /health` — no auth, `{ status: "ok" }`

## 7. Env vars (both apps read via `.env`, never hardcode secrets)

Backend `.env`:
```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgres://user:pass@host:5432/dbname
DB_SSL=false
JWT_SECRET=change-me
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```
`DB_SSL=true` is required for hosted Postgres providers (Neon/Supabase/Render
Postgres); leave `false` for a local docker-compose Postgres.

Frontend `.env`:
```
VITE_API_BASE_URL=http://localhost:4000/api
```

## 8. Seed data (backend must provide a seed script)

Create one user per role, all password `Password@123`:
- admin@erp.test / admin
- sales@erp.test / sales
- warehouse@erp.test / warehouse
- accounts@erp.test / accounts

Plus a handful of sample customers and products so the UI isn't empty on first run.
