-- ============================================================
-- ZENTARA DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES (extends Supabase auth.users) ──────────────────
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  phone text,
  role text default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz default now() not null
);

-- ── PRODUCTS ─────────────────────────────────────────────────
create table products (
  id serial primary key,
  name text not null,
  price integer not null,
  collection text,
  tag text,
  description text,
  fabric text,
  img_key text,
  size_chart_key text,
  active boolean default true,
  created_at timestamptz default now() not null
);

-- ── PRODUCT SIZES / STOCK ────────────────────────────────────
create table product_sizes (
  id serial primary key,
  product_id integer references products(id) on delete cascade,
  size text not null,
  stock integer default 0,
  is_preorder boolean default false,
  unique(product_id, size)
);

-- ── ORDERS ───────────────────────────────────────────────────
create table orders (
  id uuid default uuid_generate_v4() primary key,
  order_number text unique not null,
  user_id uuid references profiles(id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  customer_address text not null,
  payment_method text not null check (payment_method in ('promptpay', 'bank')),
  subtotal integer not null,
  discount_amount integer default 0,
  shipping_fee integer default 50,
  total integer not null,
  discount_code text,
  status text default 'pending_payment' check (
    status in ('pending_payment','paid','preparing','shipped','delivered','cancelled')
  ),
  slip_url text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ── ORDER ITEMS ───────────────────────────────────────────────
create table order_items (
  id serial primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id integer references products(id),
  product_name text not null,
  size text not null,
  quantity integer not null,
  price integer not null
);

-- ── DISCOUNT CODES ────────────────────────────────────────────
create table discount_codes (
  id serial primary key,
  code text unique not null,
  type text not null check (type in ('percent', 'baht', 'freeship')),
  value integer default 0,
  max_uses integer,
  used_count integer default 0,
  active boolean default true,
  created_at timestamptz default now() not null
);

-- ── REVIEWS ───────────────────────────────────────────────────
create table reviews (
  id serial primary key,
  product_id integer references products(id) on delete cascade,
  user_id uuid references profiles(id),
  user_name text not null,
  stars integer not null check (stars between 1 and 5),
  body text not null,
  verified boolean default false,
  approved boolean default false,
  created_at timestamptz default now() not null
);

-- ── FUNCTION: reduce stock ────────────────────────────────────
create or replace function reduce_stock(p_product_id integer, p_size text, p_qty integer)
returns void language plpgsql as $$
begin
  update product_sizes
  set stock = greatest(stock - p_qty, 0)
  where product_id = p_product_id and size = p_size;
end;
$$;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table profiles enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table reviews enable row level security;

-- Profiles
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Orders
create policy "Users read own orders" on orders for select using (auth.uid() = user_id);
create policy "Users create orders" on orders for insert with check (auth.uid() = user_id);

-- Order items
create policy "Users read own order items" on order_items for select
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));

-- Reviews (public read if approved)
create policy "Public read approved reviews" on reviews for select using (approved = true);
create policy "Users submit reviews" on reviews for insert with check (auth.uid() = user_id);

-- ── SEED: DISCOUNT CODES ──────────────────────────────────────
insert into discount_codes (code, type, value) values
  ('WELCOME10', 'percent', 10),
  ('ZENTARA50', 'baht', 50),
  ('FREESHIP', 'freeship', 0);

-- ── SEED: PRODUCTS ────────────────────────────────────────────
insert into products (name, price, collection, tag, description, fabric, img_key, size_chart_key) values
  ('ZENTARA LUV',              690,  'LUV',       'YOU ARE LOVED',             'Oversized drop-shoulder tee. Heavy cotton 260gsm. Washed black finish. Print: YOU ARE LOVED — back graphic.',                          'Cotton Comb 20',       'luv_product',    'tshirt_size'),
  ('ZENTARA ANGLE',            690,  'ANGLE',     'NEVER GIVE UP',             'Oversized tee with angel graphic. NEVER GIVE UP back print. Cotton Comb 20.',                                                            'Cotton Comb 20',       'angle_product',  'tshirt_size'),
  ('ZENTARA LUNAR',            990,  'LUNAR',     'MOON & STARS',              'Oversized tee. Lunar crescent & stars back print. Cotton 24 Comb USA.',                                                                   'Cotton 24 Comb USA',   'lunar_product',  'lunar_size'),
  ('ZENTARA FAKE LOVE ALL A LIE', 790, 'FAKE LOVE', 'FAKE LOVE ALL A LIE',    'Rib cage graphic tee. Chromatic skeleton print with floral & butterflies. Cotton 24 Comb USA.',                                           'Cotton 24 Comb USA',   'fake_product',   'lunar_size'),
  ('ZENTARA BASIC HOODIE',     1290, 'BASIC',     'I HOPE YOU HAVE A GOOD TIME', 'Premium fleece hoodie. Reflective embroidered logo. Unisex oversized fit. Kangaroo pocket.',                                           'Fleece Premium',       'hoodie_product', 'hoodie_size');

-- ── SEED: PRODUCT SIZES ───────────────────────────────────────
insert into product_sizes (product_id, size, stock, is_preorder) values
  -- LUV
  (1,'S',0,true),(1,'M',1,false),(1,'L',2,false),(1,'XL',1,false),(1,'2XL',0,true),
  -- ANGLE
  (2,'M',1,false),(2,'L',1,false),(2,'XL',1,false),
  -- LUNAR
  (3,'S',1,false),(3,'M',1,false),(3,'L',1,false),(3,'XL',1,false),(3,'2XL',1,false),
  -- FAKE LOVE
  (4,'M',1,false),(4,'L',1,false),(4,'XL',1,false),
  -- HOODIE
  (5,'S',2,false),(5,'M',3,false),(5,'L',2,false),(5,'XL',1,false),(5,'2XL',1,false),(5,'3XL',0,true);

-- ── SEED: SAMPLE REVIEWS (approved) ──────────────────────────
insert into reviews (product_id, user_id, user_name, stars, body, verified, approved) values
  (1, null, 'NAPAT_S', 5, 'ผ้าหนาดีมากครับ ทรงสวยมาก ตามรูปเลย', true, true),
  (5, null, 'MINK_T',  5, 'Hoodie ผ้านุ่มมากๆ ใส่แล้วอบอุ่น reflective logo สวยมาก', true, true),
  (2, null, 'PLOY_K',  4, 'ANGLE ลายสวยมาก print คมชัด ชอบมากเลย', true, true);

-- ── Supabase Storage bucket for slips ────────────────────────
-- Run this manually in Supabase dashboard: Storage → New Bucket → "slips" → Public
