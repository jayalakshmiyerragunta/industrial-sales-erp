# Demo Script — Industrial Sales ERP (≤5 minutes)

## Before recording

```bash
cd backend && npm run dev    # http://localhost:5001
cd frontend && npm run dev   # http://localhost:5173
```

Open `http://localhost:5173` in Chrome.

---

### [0:00–0:30] Login + Dashboard

- Show the login screen → narrate: *"Admin credentials are admin@erp.com / Admin@123"*
- Log in → Dashboard loads with stat cards: Enquiries, Quotations, Orders, Dispatched, Pipeline Value (₹), Inventory
- Point out: recent enquiries table, pending sales orders table

---

### [0:30–1:00] Customers & Products

- **Customers** → show the 4 seeded companies (ABC Engineering, Precision Tools, Metro Manufacturing, Steelcraft Industries)
- Click "+ New customer" → fill form → create → appears in table
- **Products** → show 6 industrial products with Physical / Reserved / Available columns
- **Inventory** → full availability matrix with utilisation percentages
  - As **admin**, click **"Adjust"** on a row → set a new physical quantity → save
  - **Narrate:** *"Only admins can manage stock. The backend locks the row and refuses to set physical quantity below what is already reserved, so available stock can never go negative."*

---

### [1:00–2:00] Enquiry → Quotation

- Navigate to **Enquiries** → click "+ New enquiry"
  - Select customer, add 2–3 products with quantities, add notes
  - Submit → enquiry appears as **NEW**
- Click **"Create quotation"** on the new enquiry → navigates to Quotations with a prefilled modal
  - Edit unit prices, discount %, GST % → point out the "Estimated total" live preview
  - Click **"Create quotation"** → backend recomputes everything, row appears with the server-calculated total
- **Narrate:** *"The totals are always computed on the server — the client preview is informational only. The API rejects any client-supplied totalAmount field."*

---

### [2:00–2:45] Quotation Lifecycle

- **DRAFT** → click **"Send"** → status changes to **SENT**
- **SENT** → click **"Accept"** → status changes to **ACCEPTED**
- Point out: the enquiry status has auto-flipped to **WON**
- Click **"Convert to order"** → Sales Order `SO-YYYYMMDD-XXXX` created in **PENDING** status
- **Narrate:** *"A quotation can only be converted into a sales order once — enforced by a unique constraint in the database."*

---

### [2:45–3:30] Confirm (Reserve Inventory) + Stock Check

- Navigate to **Sales Orders** → find the PENDING order
- Click **"Confirm & reserve"** → status changes to **CONFIRMED**
- Navigate to **Inventory** → point out: `reservedQty` increased, `availableQty` decreased, `physicalQty` unchanged
- **Narrate:** *"Confirming uses SELECT…FOR UPDATE row locks inside a transaction. Two simultaneous confirms for overlapping stock will serialize — only one succeeds, the other gets a 409 Insufficient Stock error."*

---

### [3:30–4:15] Dispatch

- Back to **Sales Orders** → click **"Dispatch"** on the confirmed order
- Show the **driver dropdown** (8 drivers with vehicle numbers) → pick e.g. Ravi Kumar → submit
  - **Narrate:** *"Each dispatch allocates a driver from the fleet. Once a driver is allocated to one order they can never be assigned to another — a UNIQUE constraint in the database is the backstop, so even simultaneous dispatches can't double-book a driver."*
- Dispatch number appears on the order; status → **DISPATCHED**
- Open a second confirmed order's dispatch modal → the used driver is greyed out as "allocated"
- Navigate to **Inventory** → physicalQty AND reservedQty both decreased; availableQty unchanged
- Navigate to **Dispatches** → dispatch record with vehicle, driver, items, timestamp

---

### [4:15–4:45] RBAC Demo

- Sign out → log in as **sales@erp.com / Sales@123**
- Navigate to **Sales Orders** → "Confirm" and "Cancel" buttons are hidden (admin-only)
- Show that sales users CAN create enquiries and quotations, but cannot confirm, cancel, or dispatch
- **Narrate:** *"Backend RBAC enforced via the requireRole middleware — the frontend hides buttons, but even direct API calls are blocked server-side."*
- Also point out: the sales user can view the **Inventory** matrix but has no **Adjust** action (admin-only).

---

### [4:45–5:00] Close

- Briefly show the full navigation: Dashboard → Customers → Products → Inventory → Enquiries → Quotations → Sales Orders → Dispatches
- **Closing line:** *"This is a full PERN-stack ERP covering the complete workflow from Customer Enquiry through Quotation, Sales Order with inventory reservation, to Dispatch with per-order driver allocation — verified by 14 passing tests including a concurrency bonus test."*
- Stop recording.