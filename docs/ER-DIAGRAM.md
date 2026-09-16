# ER Diagram — Industrial Sales ERP

```mermaid
erDiagram
    USER {
        string id PK
        string name
        string email UK
        string password_hash
        enum role "ADMIN | SALES"
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    CUSTOMER {
        string id PK
        string company_name
        string contact_person
        string mobile
        string email
        string city
        datetime created_at
    }

    PRODUCT {
        string id PK
        string code UK
        string name
        string category
        string unit
        decimal base_price
    }

    INVENTORY {
        string id PK
        string product_id FK UK
        int physical_qty
        int reserved_qty
    }

    DOCUMENT_COUNTER {
        string doc_type PK
        int value
        datetime updated_at
    }

    ENQUIRY {
        string id PK
        string enquiry_no UK
        string customer_id FK
        string required_date
        text notes
        enum status "NEW | QUOTED | WON | LOST"
        string created_by FK
    }

    ENQUIRY_ITEM {
        string id PK
        string enquiry_id FK
        string product_id FK
        int quantity
    }

    QUOTATION {
        string id PK
        string quotation_no UK
        string enquiry_id FK
        string customer_id FK
        datetime valid_until
        decimal total_amount
        enum status "DRAFT | SENT | ACCEPTED | REJECTED"
        string created_by FK
    }

    QUOTATION_ITEM {
        string id PK
        string quotation_id FK
        string product_id FK
        int quantity
        decimal unit_price
        decimal discount_pct
        decimal gst_pct
        decimal line_amount
    }

    SALES_ORDER {
        string id PK
        string order_no UK
        string quotation_id FK UK
        string customer_id FK
        datetime order_date
        decimal total_amount
        enum status "PENDING | CONFIRMED | DISPATCHED | CANCELLED"
        string created_by FK
    }

    SALES_ORDER_ITEM {
        string id PK
        string sales_order_id FK
        string product_id FK
        int quantity
        decimal unit_price
        decimal line_amount
    }

    DISPATCH {
        string id PK
        string dispatch_no UK
        string sales_order_id FK
        datetime dispatch_date
        string vehicle_number
        string driver_name
        string created_by FK
    }

    DISPATCH_ITEM {
        string id PK
        string dispatch_id FK
        string product_id FK
        int quantity
    }

    USER ||--o{ ENQUIRY : "creates"
    USER ||--o{ QUOTATION : "creates"
    USER ||--o{ SALES_ORDER : "creates"
    USER ||--o{ DISPATCH : "creates"
    USER ||--o{ CUSTOMER : "manages"

    CUSTOMER ||--o{ ENQUIRY : "receives"
    CUSTOMER ||--o{ QUOTATION : "receives"
    CUSTOMER ||--o{ SALES_ORDER : "receives"

    PRODUCT ||--o| INVENTORY : "has"
    PRODUCT ||--o{ ENQUIRY_ITEM : "appears in"
    PRODUCT ||--o{ QUOTATION_ITEM : "appears in"
    PRODUCT ||--o{ SALES_ORDER_ITEM : "appears in"
    PRODUCT ||--o{ DISPATCH_ITEM : "appears in"

    ENQUIRY ||--o{ ENQUIRY_ITEM : "contains"
    ENQUIRY ||--o{ QUOTATION : "triggers"

    QUOTATION ||--o{ QUOTATION_ITEM : "contains"
    QUOTATION ||--o| SALES_ORDER : "converts to"

    SALES_ORDER ||--o{ SALES_ORDER_ITEM : "contains"
    SALES_ORDER ||--o{ DISPATCH : "results in"

    DISPATCH ||--o{ DISPATCH_ITEM : "contains"
```

---

## Key Relationships

| From | To | Type | Notes |
|------|-----|------|-------|
| `enquiry` → `quotation` | 1 : N | An enquiry can have multiple quotations |
| `quotation` → `sales_order` | 1 : 0..1 | A quotation converts to **at most one** order (`quotation_id` is UNIQUE on `sales_orders`) |
| `sales_order` → `dispatch` | 1 : 0..1 | Enforced at application level (one dispatch per order) |
| `product` → `inventory` | 1 : 0..1 | One inventory row per product (`product_id` is UNIQUE on `inventory`) |
| `product` → `*_item` | 1 : N | Products appear in line items across enquiries, quotations, orders, dispatches |

---

## Document Numbering

All transactional documents use atomically-generated sequential numbers:

| Document | Format | Counter Row |
|----------|--------|------------|
| Enquiry | `ENQ-YYYYMMDD-XXXX` | `doc_type = 'ENQ'` |
| Quotation | `QTN-YYYYMMDD-XXXX` | `doc_type = 'QTN'` |
| Sales Order | `SO-YYYYMMDD-XXXX` | `doc_type = 'SO'` |
| Dispatch | `DSP-YYYYMMDD-XXXX` | `doc_type = 'DSP'` |

Counter rows are locked with `SELECT ... FOR UPDATE` inside the same transaction as the document insert, so concurrent document creation never produces duplicates.

---

## Inventory Concurrency Model

When a Sales Order is **confirmed**:

1. Each relevant `inventory` row is locked (`SELECT ... FOR UPDATE`).
2. `available_qty = physical_qty − reserved_qty` is checked.
3. If sufficient: `reserved_qty += ordered_qty`, order → `CONFIRMED`.
4. If insufficient: transaction rolls back → HTTP 409.

When a Sales Order is **dispatched**:

1. Each relevant `inventory` row is locked.
2. `physical_qty −= dispatched_qty` and `reserved_qty −= dispatched_qty`.
3. Guard: reserved can never go negative.

When a confirmed order is **cancelled**:

1. `reserved_qty −= ordered_qty` (stock released back to available pool).