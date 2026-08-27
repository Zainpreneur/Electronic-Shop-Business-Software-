# ElectroShop — Electronic Shop Business Software

A full-stack business management system for an electronics retail shop: point-of-sale
checkout, inventory & stock tracking, purchasing, customer & supplier management,
device repair/service job tracking, a live dashboard, and sales/inventory reports —
with role-based access for Admins, Managers, and Staff.

## Tech stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React 19 + TypeScript, Vite, Tailwind CSS v4, React Router, Recharts, Axios |
| Backend   | Node.js + Express + TypeScript, JWT auth, Zod validation |
| Database  | Prisma ORM, SQLite for local dev (schema is Postgres-ready — see below) |

## Project structure

```
.
├── server/     Express REST API
│   ├── prisma/schema.prisma   Data model
│   ├── prisma/seed.ts         Demo data (users, products, customers…)
│   └── src/
│       ├── routes/            One file per resource (auth, products, sales, …)
│       ├── middleware/        JWT auth, role guards, error handling
│       └── index.ts           App entrypoint
└── client/     React SPA
    └── src/
        ├── pages/              One screen per route (Dashboard, POS, Products, …)
        ├── components/         Shared UI (Layout, Modal, form inputs, badges)
        ├── context/AuthContext Login/session state
        └── api/client.ts       Axios instance with JWT + 401 handling
```

## Features

- **Auth & roles** — JWT login; ADMIN / MANAGER / STAFF permissions enforced server-side.
- **Dashboard** — today's & month's revenue, low-stock alerts, open repair count, a
  7-day sales trend chart, and recent sales.
- **Products & Inventory** — SKU, brand, category, cost/selling price, stock levels,
  reorder thresholds; every stock change (sale, purchase, adjustment) is written to an
  immutable `StockMovement` audit trail.
- **Point of Sale (POS)** — a product-picker checkout screen: add items to a cart,
  apply discount/tax, pick a customer or sell to a walk-in, choose a payment method,
  and check out — stock is deducted atomically in one DB transaction.
- **Sales history** — invoice list & detail view; completed sales can be cancelled,
  which restocks the items.
- **Purchases** — create purchase orders against a supplier, either receive stock
  immediately or mark an order as `ORDERED` and receive it later.
- **Suppliers & Customers** — simple CRUD with search.
- **Repair / service jobs** — track device repairs (device type, issue, diagnosis,
  status pipeline: Received → Diagnosing → In Progress → Waiting for Parts →
  Completed → Delivered) — the piece most electronics shops need beyond generic
  retail POS software.
- **Reports** — date-ranged sales summary, top-selling products, and (for
  Admin/Manager) full inventory valuation (cost vs. retail value, potential profit).
- **User management** (Admin only) — create staff accounts, change roles, deactivate.

## Getting started

Requires Node.js 18+.

### 1. Backend

```bash
cd server
cp .env.example .env      # defaults work out of the box for local dev
npm install                # also runs `prisma generate`
npm run prisma:migrate     # creates dev.db (SQLite) and applies the schema
npm run prisma:seed        # demo users, products, customers, a sample sale & repair
npm run dev                # starts the API on http://localhost:4000
```

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev                # starts the app on http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:4000`, so no extra config is needed. Open
http://localhost:5173 and sign in.

### Demo accounts (from the seed script)

| Role  | Email                       | Password |
|-------|-----------------------------|----------|
| Admin | admin@electroshop.local     | admin123 |
| Staff | staff@electroshop.local     | staff123 |

If you skip seeding, `POST /api/auth/bootstrap` creates the first ADMIN account
(only works while the `User` table is empty).

## Moving to production

- **Database**: switch `server/prisma/schema.prisma`'s `datasource` provider from
  `sqlite` to `postgresql`, point `DATABASE_URL` at a real Postgres instance, and
  re-run `prisma migrate deploy`. The models were written to be Postgres-compatible
  (enum-like fields are plain validated strings because SQLite has no native enum
  type).
- **Secrets**: set a strong random `JWT_SECRET` and restrict `CLIENT_ORIGIN` to your
  deployed frontend's origin.
- **Build**: `npm run build` in both `server/` (emits `dist/`, run with
  `npm start`) and `client/` (emits `dist/`, serve as static files behind your
  reverse proxy / CDN of choice).

## API overview

All endpoints are under `/api` and (aside from `/api/health` and `/api/auth/*`)
require `Authorization: Bearer <token>`.

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/bootstrap`
- `GET/POST/PUT/DELETE /api/users` (Admin)
- `GET/POST/PUT/DELETE /api/categories`
- `GET/POST/PUT/DELETE /api/products`, `POST /api/products/:id/adjust-stock`
- `GET/POST/PUT/DELETE /api/customers`
- `GET/POST/PUT/DELETE /api/suppliers`
- `GET/POST /api/purchases`, `PUT /api/purchases/:id/receive`, `PUT /api/purchases/:id/cancel`
- `GET/POST /api/sales`, `PUT /api/sales/:id/cancel`
- `GET/POST/PUT/DELETE /api/repairs`
- `GET /api/dashboard/stats`
- `GET /api/reports/sales`, `GET /api/reports/top-products`, `GET /api/reports/inventory`
