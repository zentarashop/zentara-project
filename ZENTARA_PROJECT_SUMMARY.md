# ZENTARA — Project Summary

> เว็บไซต์ e-commerce streetwear ไทย | React + Node.js + Supabase

---

## 🔑 Credentials & Config

| รายการ | ค่า |
|---|---|
| Supabase Project ID | `wqfoubfjzzpzkraiyqbb` |
| Supabase URL | `https://wqfoubfjzzpzkraiyqbb.supabase.co` |
| Supabase Dashboard | https://supabase.com/dashboard/project/wqfoubfjzzpzkraiyqbb |
| Admin Account | อีเมลที่ลงทะเบียนไว้ (role = admin ใน profiles table) |
| Social — IG | https://www.instagram.com/zentara_shop/ |
| Social — TikTok | https://www.tiktok.com/@zentara_shop |
| Social — Facebook | Zentara |

> ⚠️ **อย่า commit ไฟล์ `backend/.env` ขึ้น GitHub** เด็ดขาด

---

## 📁 โครงสร้างโปรเจ็ก

```
zentara-project/
├── backend/                    ← Node.js / Express API
│   ├── .env                    ← Supabase keys (ห้ามขึ้น Git)
│   ├── server.js               ← Entry point + rate limiting
│   ├── db/
│   │   ├── supabase.js         ← Supabase client
│   │   └── schema.sql          ← SQL schema ทั้งหมด
│   ├── middleware/
│   │   └── auth.js             ← JWT authentication
│   └── routes/
│       ├── auth.js             ← register / login / forgot-password / profile
│       ├── products.js         ← ดึงสินค้า
│       ├── orders.js           ← สร้างออเดอร์ + upload slip
│       ├── discounts.js        ← ตรวจโค้ดส่วนลด
│       ├── reviews.js          ← รีวิวสินค้า
│       └── admin.js            ← admin-only endpoints
│
└── zentara-project/            ← React (Vite) Frontend
    ├── public/
    │   ├── Dashley.ttf         ← Custom font
    │   └── imgs/               ← รูปสินค้าทั้งหมด (13 ไฟล์)
    │       ├── hero_bg.jpg
    │       ├── angle_product.jpg / angle_size.jpg
    │       ├── luv_product.jpg / luv_size.jpg
    │       ├── fake_product.jpg / fake_size.jpg
    │       ├── lunar_product.jpg / lunar_size.jpg
    │       ├── hoodie_product.jpg / hoodie_size.jpg
    │       ├── wear_truth.jpg
    │       └── logo_placeholder.jpg
    ├── vite.config.js          ← proxy /api → localhost:5000
    └── src/
        ├── App.jsx             ← Routes (+ 404 page)
        ├── assets/images.js    ← Map ชื่อ → path รูป
        ├── services/api.js     ← API calls ทั้งหมด
        ├── context/
        │   ├── AuthContext.jsx ← Login state + auto-logout on 401
        │   └── CartContext.jsx ← Cart (จำกัด qty ตาม stock)
        ├── components/
        │   ├── Navbar.jsx      ← โลโก้ Dashley font
        │   ├── Footer.jsx
        │   ├── ProductCard.jsx
        │   └── Toast.jsx
        └── pages/
            ├── HomePage.jsx    ← Hero + scroll dark effect
            ├── ShopPage.jsx    ← รายการสินค้า
            ├── ProductPage.jsx ← ไซส์ชาร์ต + preorder max 5
            ├── CartPage.jsx
            ├── CheckoutPage.jsx ← phone validation + slip upload
            ├── SuccessPage.jsx ← redirect ถ้าไม่มี order_number
            ├── TrackingPage.jsx
            ├── MemberPage.jsx  ← forgot password + edit profile
            ├── AdminPage.jsx   ← dashboard ครบ
            └── NotFoundPage.jsx
```

---

## ✅ Features ที่พัฒนาเสร็จแล้ว

### Frontend
- Hero section — Dashley font, scroll darkening effect
- Shop + Product page — size chart แยกรายสินค้า, preorder badge (สีเหลือง)
- Cart — จำกัด qty ตาม stock จริง (preorder max 5)
- Checkout — phone validation (06/08/09), slip upload พร้อม fallback social
- SuccessPage — กัน refresh แสดง ZTR-????
- MemberPage — forgot password + edit name/phone
- AdminPage — dashboard, order expand, search/filter, CSV export, date filter, auto-refresh 60s, new order badge, cancel order, product thumbnail, PRE badge สีเหลือง
- 404 NotFoundPage

### Backend
- Rate limiting: auth 20 req/15min, others 100 req/15min
- Stock validation ก่อนสร้างออเดอร์
- Price คำนวณ server-side (ป้องกัน price tampering)
- Discount used_count increment ถูกต้อง
- Order number format: ZTR-{timestamp}
- Forgot password email
- Profile update (name, phone)
- Auto logout เมื่อ token หมดอายุ (401 → event → AuthContext)

### Security
- Service role key (JWT) — ไม่ใช้ anon key
- RLS policies ครบ
- `/api/_save-image` ถูกลบออก (endpoint ไม่ปลอดภัย)
- .env ไม่อยู่ใน version control

---

## 🗄️ Database (Supabase)

Tables: `profiles`, `products`, `product_sizes`, `orders`, `order_items`, `discount_codes`, `reviews`

Storage bucket: `slips` — เก็บสลิปการโอนเงิน

RLS policies: ครบทุก table

Trigger: `handle_new_user()` — auto-create profile เมื่อสมัครสมาชิก

---

## 🚀 ขั้นตอน Deploy ไปใช้งานจริง

### ขั้นที่ 1 — อัปโหลดโค้ดขึ้น GitHub

```bash
# ใน folder zentara-project/
git init
git add .
git commit -m "Initial commit"
```

สร้าง repo ใหม่ที่ https://github.com/new แล้วรัน:

```bash
git remote add origin https://github.com/USERNAME/zentara-project.git
git push -u origin main
```

> ⚠️ ตรวจสอบว่า `.gitignore` มีบรรทัดเหล่านี้:
> ```
> backend/.env
> node_modules/
> dist/
> ```

---

### ขั้นที่ 2 — Deploy Backend บน Railway

1. ไปที่ https://railway.app → **New Project → Deploy from GitHub**
2. เลือก repo → เลือก folder `backend`
3. ตั้ง Environment Variables:
   ```
   SUPABASE_URL=https://wqfoubfjzzpzkraiyqbb.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   FRONTEND_URL=https://zentara.vercel.app  (ใส่ URL จริงหลัง deploy frontend)
   PORT=5000
   ```
4. Railway จะ deploy อัตโนมัติ → ได้ URL เช่น `https://zentara-api.up.railway.app`

---

### ขั้นที่ 3 — Deploy Frontend บน Vercel

1. ไปที่ https://vercel.com → **New Project → Import Git Repository**
2. เลือก repo → **Root Directory: `zentara-project`** (folder frontend)
3. ตั้ง Environment Variables:
   ```
   VITE_API_URL=https://zentara-api.up.railway.app/api
   ```
4. Deploy → ได้ URL เช่น `https://zentara.vercel.app`

---

### ขั้นที่ 4 — อัปเดต Supabase Auth Settings

1. ไปที่ Supabase Dashboard → **Authentication → URL Configuration**
2. **Site URL**: `https://zentara.vercel.app`
3. **Redirect URLs**: เพิ่ม `https://zentara.vercel.app/reset-password`

---

### ขั้นที่ 5 — อัปเดต Backend FRONTEND_URL

กลับไป Railway → ตั้งค่า `FRONTEND_URL=https://zentara.vercel.app` (URL จริงจาก Vercel)

---

### ขั้นที่ 6 — ทดสอบก่อน Live

| ทดสอบ | วิธี |
|---|---|
| สมัครสมาชิก + login | เข้า /member |
| ดูสินค้า + เพิ่มตะกร้า | เข้า /shop |
| Checkout + upload slip | ทดสอบด้วยของจริง |
| Admin dashboard | เข้า /admin |
| ลืมรหัสผ่าน | ทดสอบส่งอีเมล |

---

## 📋 สิ่งที่ควรทำเพิ่มในอนาคต (Optional)

| รายการ | ความสำคัญ |
|---|---|
| เพิ่มภาพโลโก้จริงแทน logo_placeholder.jpg | สูง |
| ตั้ง custom domain (เช่น zentara.co.th) | สูง |
| เชื่อม PromptPay QR code จริง (via Omise/GB Prime Pay) | กลาง |
| Email notification เมื่อออเดอร์เปลี่ยนสถานะ | กลาง |
| เพิ่มระบบ tracking เลข Kerry/Flash | กลาง |
| Google Analytics / Facebook Pixel | กลาง |
| หน้า Terms & Privacy Policy | ต่ำ |

---

## 🛠️ วิธีรันบนเครื่องตัวเอง (Local Development)

```bash
# Terminal 1 — Backend
cd zentara-project/backend
npm install
node server.js
# → http://localhost:5000

# Terminal 2 — Frontend
cd zentara-project/zentara-project
npm install
npm run dev
# → http://localhost:3000
```

---

*สร้างโดย Claude · อัปเดต: มิถุนายน 2569*
