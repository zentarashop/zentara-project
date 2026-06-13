# ZENTARA E-COMMERCE — SYSTEM MANUAL

> Version 2.0 | Live: https://eclectic-sfogliatella-499d3e.netlify.app  
> Stack: React + Vite · Express · Supabase · Netlify Functions

---

## SYSTEM OVERVIEW

ZENTARA is a Thai streetwear e-commerce platform. Frontend is a React SPA served via Netlify CDN. Backend runs as a serverless Express app via Netlify Functions at `/.netlify/functions/api`. Database and auth are powered by Supabase.

---

## ROLES

| Role | Access | Email |
|------|--------|-------|
| `customer` | Shop, cart, checkout, orders, reviews | Any registered email |
| `admin` | Full dashboard + all CRUD operations | zentarashopp@gmail.com |

Role is stored in `profiles.role` column in Supabase. Default = `customer`.  
To promote to admin: `UPDATE profiles SET role = 'admin' WHERE email = 'x@x.com';`

---

## API ENDPOINTS

Base URL: `https://eclectic-sfogliatella-499d3e.netlify.app/api`

### Auth
```
POST   /auth/register        { name, email, phone, password }
POST   /auth/login           { email, password } → { token, user }
GET    /auth/me              Bearer token → user profile
POST   /auth/forgot-password { email }
```

### Products (Public)
```
GET    /products             List all active products with sizes
GET    /products/:id         Single product detail
```

### Orders
```
POST   /orders               Create order (auth required)
GET    /orders/my            Customer's own orders (auth)
GET    /orders/track/:number Public order tracking by ZTR-XXXXXX
POST   /orders/:id/slip      Upload payment slip (multipart/form-data)
```

### Discounts
```
POST   /discounts/verify     { code } → { type, value } — public
```

### Reviews
```
GET    /reviews/:productId   Approved reviews for product
POST   /reviews              Submit review (auth required)
```

### Admin (require admin JWT)
```
GET    /admin/stats          KPIs: orders, revenue, pending
GET    /admin/orders         All orders with items + slip
PATCH  /admin/orders/:id     { status } — update order status
GET    /admin/products        All products
PATCH  /admin/products/:id   Update price, stock, active
GET    /admin/reviews         All reviews pending approval
PATCH  /admin/reviews/:id    { approved: true/false }
DELETE /admin/reviews/:id    Delete review
GET    /admin/discounts       All discount codes
POST   /admin/discounts       Create { code, type, value, max_uses }
PATCH  /admin/discounts/:id  { active: true/false }
DELETE /admin/discounts/:id  Delete code
GET    /admin/customers       Customers with RFM data
```

---

## CUSTOMER FLOW

### Registration
1. `POST /api/auth/register` with name, email, phone, password
2. Returns JWT token + user object
3. Profile auto-created in `profiles` table via Supabase trigger

### Purchase Flow
1. Browse `/shop` → select product → choose size → add to cart
2. Apply discount code at cart (calls `/discounts/verify`)
3. Checkout: fill shipping info → select payment (PromptPay/Bank) → upload slip
4. Order created with status `pending_payment`, number format `ZTR-XXXXXX`
5. Track via `/track` page or `/orders/my`

### Order Status Lifecycle
```
pending_payment → paid → preparing → shipped → delivered
                ↘ cancelled (any stage)
```

---

## ADMIN FLOW

### Dashboard Tabs

| Tab | Key Actions |
|-----|-------------|
| DASHBOARD | View KPIs, charts (14d revenue, daily orders, status pie, top products) |
| ORDERS | View all orders, update status, view slip images |
| PRODUCTS | View stock by size, edit price/stock, toggle active |
| REVIEWS | Approve or delete customer reviews |
| DISCOUNTS | Create/toggle/delete discount codes |
| CUSTOMERS | View RFM segments (VIP/Loyal/New/At Risk/Inactive) |
| AI INSIGHTS | Health score, forecasts, alerts, model config |

### Discount Code Types
- `percent` — percentage off (e.g. 10 = 10% off)
- `baht` — fixed amount off (e.g. 50 = ฿50 off)
- `freeship` — free shipping (value ignored)

---

## DATABASE SCHEMA (Supabase)

```sql
profiles        -- id (uuid), email, name, phone, role, created_at
products        -- id, name, description, price, image_url, category, active
product_sizes   -- id, product_id, size, stock, is_preorder
orders          -- id, order_number, user_id, total, status, shipping_*, slip_url, discount_*
order_items     -- id, order_id, product_id, size, quantity, price
reviews         -- id, product_id, user_id, rating, comment, approved
discount_codes  -- id, code, type, value, max_uses, used_count, active
```

---

## ENVIRONMENT VARIABLES

```env
SUPABASE_URL=https://wqfoubfjzzpzkraiyqbb.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
JWT_SECRET=zentara-secret-2026-xK9mP3qL
VITE_API_URL=/api
```

---

## TECH STACK

```
Frontend:  React 18, Vite 5, React Router v6, Recharts 3
Backend:   Express 4, serverless-http 4, ws 8 (WebSocket for Supabase Realtime)
Database:  Supabase (PostgreSQL + Auth + Storage)
Deploy:    Netlify (CDN + Functions)
Auth:      JWT via Supabase Auth — service_role key server-side only
AI:        bizAI.js — EMA forecasting, ε-greedy RL, RFM segmentation (localStorage)
```

---

## KNOWN CONSTRAINTS

- Netlify Functions cold start ~200ms on first request
- Supabase free tier: 500MB DB, 1GB storage, 50MB file uploads
- Image uploads stored as base64 in Supabase (slip images)
- No email notifications (Supabase Auth confirmation emails only)
- AI model data persists in `localStorage` key `zentara_ai_v2` — browser only

---

## REPO

GitHub: https://github.com/zentarashop/zentara-project  
Branch: `main` (auto-deploys to Netlify on push)
