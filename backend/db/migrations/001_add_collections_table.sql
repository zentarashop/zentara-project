-- ============================================================
-- ZENTARA MIGRATION 001 — collections table
-- วิธีรัน: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'planning'
              CHECK (status IN ('planning','production','qc','ready','shipped','paused')),
  deadline    date,
  factory_note text,
  stock_note  text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collections_updated_at ON public.collections;
CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_collections_updated_at();

-- RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON public.collections
  FOR ALL USING (true) WITH CHECK (true);

-- Seed collections ปัจจุบัน (status = shipped เพราะออกแล้ว)
INSERT INTO public.collections (name, status) VALUES
  ('ANGLE',               'shipped'),
  ('LUV',                 'shipped'),
  ('FAKE LOVE ALL A LIE', 'shipped'),
  ('LUNAR',               'shipped'),
  ('BASIC HOODIE',        'shipped')
ON CONFLICT (name) DO NOTHING;
