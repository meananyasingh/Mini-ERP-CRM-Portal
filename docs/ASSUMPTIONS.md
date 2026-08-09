# Assumptions, Known Limitations & Incomplete Parts

## Assumptions made

1. **Role permission matrix.** The case study says "a sales user should be
   able to create challans" but doesn't specify exactly which role can do
   what for every module. The matrix implemented (and enforced server-side)
   is:

   | Module                        | admin | sales | warehouse | accounts |
   |-------------------------------|-------|-------|-----------|----------|
   | Users (create/list)           | CRUD  | –     | –         | –        |
   | Customers & follow-ups        | CRUD  | CRUD  | read      | read     |
   | Products & stock movements    | CRUD  | read  | CRUD      | read     |
   | Challan create/edit (Draft)   | CRUD  | CRUD  | read      | read     |
   | Challan confirm/cancel        | yes   | yes   | –         | –        |
   | Challan PDF                   | yes   | yes   | yes       | yes      |

   Rationale: sales owns the customer relationship and the sales document
   (challan); warehouse owns physical stock; accounts is a read-only
   reporting/reconciliation role across everything (closest real-world
   equivalent to what an accounts team needs without a dedicated invoicing
   module); admin can do everything including managing users.

2. **User management.** The case study doesn't ask for a signup flow — users
   are provisioned by an admin (`POST /api/auth/users`) or via the seed
   script. There's no self-service registration, and no "forgot password"
   flow — out of scope for an internal tool with 4 seeded test accounts.

3. **Challan numbering.** Generated as `CH-000001`, `CH-000002`, ... derived
   from the row's own auto-increment id (assigned right after insert, inside
   the same transaction). Simple, globally unique, and avoids a race-prone
   separate counter table.

4. **Cancelling a Confirmed challan restocks it.** The spec only explicitly
   requires stock to decrease on confirm; it doesn't say what happens to
   stock on cancellation. Assumption: cancelling a *Draft* has no stock
   effect (nothing was ever deducted); cancelling a *Confirmed* challan
   reverses the deduction (an `IN` stock movement) so inventory stays
   accurate. This seemed like the only business-sensible behavior.

5. **Editing a challan.** Only allowed while `Draft` — once `Confirmed` the
   stock impact has already happened, so line items become immutable (you'd
   cancel and create a new one instead). This matches how paper challans
   work in the real business flow the case study describes.

6. **Stock movement `quantityChanged`** is always stored as a positive
   magnitude; direction comes from `movementType` (`IN`/`OUT`). This keeps
   the audit log readable ("moved 50 units OUT") rather than relying on sign.

7. **"Accounts" module.** The case study lists accounts as a team but the
   core modules section doesn't define an accounts-specific screen/entity
   beyond invoices (which overlaps heavily with challans as specified).
   Assumption: accounts gets read access across customers/products/challans
   for reconciliation purposes; a dedicated invoicing module (separate from
   challans, with GST/tax lines) was treated as out of scope for the 48-hour
   window — see "Known limitations" below.

## Known limitations / intentionally not built

- **No formal database migrations** — schema is managed via
  `sequelize.sync({ alter: true })`. Fine for this exercise; a real project
  would use versioned migrations (see `docs/ARCHITECTURE.md`).
- **No automated test suite** (unit/integration tests) — given the 48-hour
  window, effort went into correct business logic, a working end-to-end flow,
  and documentation instead. The Postman collection doubles as a manual
  regression checklist.
- **No dedicated "Invoice" entity separate from Challan** — the case study's
  own module list only defines Sales Challan in detail; invoicing was
  interpreted as the challan + its PDF export, not a second parallel
  document type with tax/GST calculation.
- **No password reset / email notifications** — no email service wired up;
  out of scope for an internal tool provisioned by an admin.
- **No file/image upload** — product image upload to S3 was offered as a
  bonus and intentionally not built in this pass to keep the core modules
  solid within the deadline.
- **Docker packaging of the app itself** was not done (a docker-compose file
  is included, but only to run a local Postgres for development — not a full
  containerized deploy of backend+frontend).
- **No rate limiting / audit logging beyond stock movements** — acceptable
  for an internal-only tool behind auth.
