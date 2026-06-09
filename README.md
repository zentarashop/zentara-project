# ZENTARA — Fullstack E-Commerce

Thai streetwear brand. "NOT MADE TO FIT IN"

## Stack

| Layer     | Tech                    |
|-----------|-------------------------|
| Frontend  | React 18 + Vite + React Router |
| Backend   | Node.js + Express       |
| Database  | Supabase (PostgreSQL)   |
| Auth      | Supabase Auth (JWT)     |
| Storage   | Supabase Storage (slips)|

---

## Setup

### 1. Supabase

1. สร้าง project ที่ [supabase.com](https://supabase.com)
2. ไปที่ **SQL Editor** แล้ว run ไฟล์ `backend/db/schema.sql`
3. ไปที่ **Storage** → สร้าง bucket ชื่อ `slips` (Public)
4. Copy keys จาก **Settings → API**:
   - `Project URL` → `SUPABASE_URL`
   - `service_role secret` → `SUPABASE_SERVICE_KEY`

### 2. Backend

```bash
cd backend
cp .env.example .env
# แก้ .env ใส่ Supabase URL + Service Key
npm install
npm run dev
```

Server จะรันที่ `http://localhost:5000`

### 3. Frontend

```bash
cd zentara-project
cp .env.example .env.local
# แก้ VITE_API_URL ถ้าจำเป็น
npm install
npm run dev
```

Frontend จะรันที่ `http://localhost:3000`

### 4. สร้าง Admin User

หลัง register แล้ว ไปที่ Supabase SQL Editor แล้วรัน:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

## Deploy

### Frontend → Vercel
```bash
cd zentara-project
npm run build
# push ไปที่ GitHub แล้ว connect กับ Vercel
# ตั้ง env var: VITE_API_URL=https://your-backend.railway.app/api
```

### Backend → Railway
1. สร้าง project ที่ [railway.app](https://railway.app)
2. Connect GitHub repo → เลือก folder `backend`
3. ตั้ง environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `FRONTEND_URL` (Vercel URL)
   - `PORT` (Railway จะตั้งให้อัตโนมัติ)

---

## API Endpoints

| Method | Path                        | Description          |
|--------|-----------------------------|----------------------|
| POST   | /api/auth/register          | สมัครสมาชิก         |
| POST   | /api/auth/login             | เข้าสู่ระบบ         |
| GET    | /api/auth/me                | ดูข้อมูลตัวเอง      |
| GET    | /api/products               | รายการสินค้า         |
| GET    | /api/products/:id           | สินค้า + รีวิว       |
| POST   | /api/orders                 | สร้างออเดอร์         |
| GET    | /api/orders                 | ออเดอร์ของฉัน        |
| POST   | /api/orders/:id/slip        | อัปโหลดสลิป         |
| POST   | /api/discounts/verify       | ตรวจสอบโค้ด         |
| POST   | /api/reviews                | ส่งรีวิว             |
| GET    | /api/admin/stats            | สถิติ (admin)        |
| GET    | /api/admin/orders           | ออเดอร์ทั้งหมด       |
| PATCH  | /api/admin/orders/:id       | อัปเดตสถานะ          |
| GET    | /api/admin/products         | สินค้า (admin)       |
| GET    | /api/admin/reviews          | รีวิว (admin)        |
| PATCH  | /api/admin/reviews/:id      | อนุมัติ/ซ่อนรีวิว    |
| GET    | /api/admin/discounts        | โค้ดส่วนลด          |
| POST   | /api/admin/discounts        | สร้างโค้ด           |

---

## Features

- ✅ Product catalog with stock management
- ✅ Cart (persisted to localStorage)
- ✅ Checkout with 3-step flow
- ✅ PromptPay / Bank Transfer payment
- ✅ Slip upload to Supabase Storage
- ✅ Order tracking with status timeline
- ✅ Member auth (JWT via Supabase)
- ✅ Discount codes (%, fixed, free shipping)
- ✅ Review system (with admin approval)
- ✅ Admin dashboard
- ✅ Mobile responsive
- ✅ Toast notifications
