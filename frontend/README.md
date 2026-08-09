# Mini ERP + CRM Operations Portal — Frontend

React + Vite single-page app for the Mini ERP + CRM Operations Portal. Plain
JavaScript (no TypeScript), react-router-dom for routing, axios for HTTP. See
`../CONTRACT.md` for the authoritative API contract this app is built against.

## Setup

```bash
npm install
cp .env.example .env   # then adjust VITE_API_BASE_URL if needed
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run Oxlint

## Structure

- `src/api/` — axios instance + thin per-resource API wrappers
- `src/context/AuthContext.jsx` — auth state (token/user in localStorage), `login`/`logout`/`hasRole`
- `src/components/` — Layout, ProtectedRoute, DataTable, StatusBadge, Modal, Pagination
- `src/pages/` — Login, Dashboard, Users, and the customers/products/challans modules
- `src/utils/` — permission matrix, API error parsing, debounce hook

## Seed accounts

All seeded users use password `Password@123`:

- admin@erp.test (admin)
- sales@erp.test (sales)
- warehouse@erp.test (warehouse)
- accounts@erp.test (accounts)
