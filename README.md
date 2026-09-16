# Industrial Sales Workflow ERP

A complete PERN-stack ERP application implementing the industrial sales workflow:

**Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

Built for a manufacturing/distribution company selling industrial products (pumps, bearings, valves, gearboxes, etc.) to business customers.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 24, Express 4, TypeScript, Prisma 5, PostgreSQL 16 |
| Auth | JWT (access token) + bcrypt password hashing |
| Validation | Zod (request body + query params, enforced on server) |
| Frontend | React 19, Vite 6, TypeScript, React Router 7 |
| Testing | Vitest + Supertest (real PostgreSQL test DB, no mocks) |
| DevOps | Docker Compose (Postgres), ts-node-dev (hot reload) |

---

## Quickstart

### Prerequisites

- Node.js ≥ 18
- PostgreSQL 16 (via Docker Compose **or** Homebrew/local install)
- Docker *(optional — for the database only)*

### 1. Start PostgreSQL

**Option A — Docker Compose (recommended):**

```bash
docker-compose up -d
```

This starts Postgres on `localhost:5432` with:
- `sales_erp` (development)
- `sales_erp_test` (test suite)
- User: `postgres` / Password: `postgres`

**Option B — Local Postgres (Homebrew):**

```bash
brew services start postgresql@16
createdb -O postgres sales_erp
createdb -O postgres sales_erp_test
```

### 2. Install & configure

```bash
cd backend
npm install
cp .env.example .env          # edit PORT if 5001 is occupied
npx prisma generate            # generate Prisma client
npx prisma db push             # create tables
npx prisma db seed             # seed users + products
```

### 3. Start the backend

```bash
npm run dev                    # http://localhost:5001
```

### 4. Start the frontend

```bash
cd ../frontend
npm install
npm run dev                    # http://localhost:5173
```

Open `http://localhost:5173` and log in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@erp.com` | `Admin@123` |
| Sales | `sales@erp.com` | `Sales@123` |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/sales_erp?schema=public` | Dev database |
| `TEST_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/sales_erp_test?schema=public` | Test database |
| `JWT_SECRET` | — | Required. Secret for signing tokens |
| `JWT_EXPIRES_IN` | `7d` | Token validity period |
| `PORT` | `5001` | Express listen port |
| `CORS_ORIGIN` | `*` | Frontend origin for CORS |

---

## Workflow & Status Transitions

### Enquiry → Quotation

```
Enquiry (NEW)          ─── create quotation ───▶  Enquiry (QUOTED)
                                                    │
                              ┌─────────────────────┘
                              ▼
                        Quotation (DRAFT)
                              │
                        send │
                              ▼
                        Quotation (SENT)
                        ┌────┴────┐
                accept  │         │  reject
                        ▼         ▼
              Quotation (ACCEPTED)  Quotation (REJECTED)
                  │                       │
                  ▼                       ▼
            Enquiry (WON)           Enquiry (LOST)
```

### Quotation → Sales Order → Dispatch

```
Quotation (ACCEPTED)
       │
  convert │   (unique: one order per quotation, enforced in DB)
       ▼
Sales Order (PENDING)
       │
  confirm │   (admin-only, reserves inventory via row-level locks)
       ▼
Sales Order (CONFIRMED)
       │
  dispatch │   (decrements physical + reserved stock)
       ▼
Sales Order (DISPATCHED)

PENDING or CONFIRMED orders may also be cancelled by an admin.
CONFIRMED → CANCELLED releases reserved stock.
```

---

## Backend Architecture

```
backend/src/
├── config/
│   ├── env.ts          # Load + validate env vars (fail fast)
│   └── db.ts           # Singleton PrismaClient
├── middleware/
│   ├── auth.ts         # authenticate (JWT) + requireRole (RBAC)
│   ├── errorHandler.ts # AppError, ZodError → JSON
│   └── validate.ts     # Zod schema validator middleware
├── modules/
│   ├── auth/           # login, me
│   ├── users/          # list users (admin)
│   ├── customers/      # CRUD with search
│   ├── products/       # CRUD + categories (admin)
│   ├── inventory/      # availability view (physical/reserved/available)
│   ├── enquiries/      # create (multi-item), list, get, status transitions
│   ├── quotations/     # create (backend-computed totals), status, convert
│   ├── sales-orders/   # list, get, confirm (reserves stock), cancel (releases)
│   └── dispatches/     # create (decrements physical+reserved), list, get
├── utils/
│   └── numbering.ts    # Atomic doc numbers (ENQ/QTN/SO/DSP-YYYYMMDD-XXXX)
├── app.ts              # Express app, mounts all routers
└── index.ts            # Entry point
```

---

## Key Design Decisions

### Backend-computed quotation totals
Every quotation's line amounts and grand total are computed entirely on the server. The API **never trusts** client-supplied `totalAmount` or `lineAmount` fields — those are rejected by strict Zod schemas. Formula:

```
lineAmount = quantity × unitPrice × (1 − discountPct/100) × (1 + gstPct/100)
totalAmount = Σ lineAmounts    (all values rounded to 2 decimals)
```

### Row-level inventory locking (concurrency protection)
When an admin confirms a Sales Order, every inventory row is locked with `SELECT ... FOR UPDATE` inside a Prisma transaction. Two simultaneous confirmations for overlapping stock are serialized:

1. First transaction locks the rows, reads available stock, increments `reserved_qty`, commits.
2. Second transaction wakes up, re-reads the now-reduced available stock, and fails with HTTP 409 if insufficient.

This is tested end-to-end in the test suite (test 7).

### Unique quotation → order mapping
A quotation can be converted into a Sales Order **exactly once**, enforced both by application logic (409 on duplicate) and a unique constraint on `sales_orders.quotation_id`.

---

## Testing

```bash
cd backend
npm test                     # runs once (test DB is reset + reseeded each run)
npm run test:watch           # runs in watch mode
```

**7 tests** covering:

| # | Test | What it proves |
|---|------|----------------|
| 1 | Wrong password → 401 | JWT auth works |
| 2 | Sales user can't confirm → 403 | Backend RBAC enforced |
| 3 | Quotation totals computed server-side | Discount+GST math; client totals rejected |
| 4 | Convert only ACCEPTED, once | Conversion guards + unique constraint |
| 5 | Confirm reserves stock | reservedQty up, availableQty down, physical unchanged |
| 6 | Dispatch decrements physical+reserved | One-time per order; stock consumed correctly |
| 7 | Concurrent confirms (bonus) | Two parallel confirms on 10-unit stock → exactly one 409 |

---

## Project Structure

```
industrial-sales-erp/
├── docker-compose.yml        # PostgreSQL (sales_erp + sales_erp_test)
├── README.md
├── docs/
│   ├── ER-DIAGRAM.md         # Mermaid ER diagram
│   └── postman_collection.json
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    ├── index.html
    └── package.json
```

---

## API Overview

All endpoints are prefixed with `/api/v1`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Login → JWT token |
| GET | `/auth/me` | JWT | Current user profile |
| GET | `/customers` | JWT | List/search customers |
| POST | `/customers` | SALES/ADMIN | Create customer |
| GET | `/products` | JWT | List products (search by name/code) |
| POST | `/products` | ADMIN | Create product (with opening inventory) |
| GET | `/inventory` | JWT | Availability matrix (physical/reserved/available) |
| POST | `/enquiries` | SALES/ADMIN | Create enquiry with product items |
| GET | `/enquiries` | JWT | List all enquiries |
| GET | `/enquiries/:id` | JWT | Enquiry detail (items, linked quotations) |
| PATCH | `/enquiries/:id/status` | SALES/ADMIN | Transition enquiry status |
| POST | `/quotations` | SALES/ADMIN | Create quotation (backend-computed totals) |
| GET | `/quotations` | JWT | List all quotations |
| GET | `/quotations/:id` | JWT | Quotation detail (items, totals) |
| PATCH | `/quotations/:id/status` | SALES/ADMIN | SENT / ACCEPTED / REJECTED |
| POST | `/quotations/:id/convert` | SALES/ADMIN | Convert → Sales Order |
| GET | `/sales-orders` | JWT | List all orders |
| GET | `/sales-orders/:id` | JWT | Order detail (items, dispatches) |
| POST | `/sales-orders/:id/confirm` | ADMIN | Reserve inventory (row locks) |
| POST | `/sales-orders/:id/cancel` | ADMIN | Cancel + release reservations |
| POST | `/dispatches/:id` | ADMIN | Dispatch order (consume stock) |
| GET | `/dispatches` | JWT | List all dispatches |
| GET | `/dispatches/:id` | JWT | Dispatch detail (items, vehicle) |

---

## Docs

- **ER Diagram:** [`docs/ER-DIAGRAM.md`](docs/ER-DIAGRAM.md) — Mermaid diagram
- **Postman Collection:** [`docs/postman_collection.json`](docs/postman_collection.json) — importable collection
- **Demo Script:** [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) — 5-minute walkthrough script

---

## License

This project is an academic assignment submission — not a production system.