-- ============================================================
-- Migration 002: team_tasks table
-- inbox กลางของทีม ZENTARA — ใช้เป็น coordination layer
-- รันใน Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS team_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent    TEXT NOT NULL CHECK (from_agent IN ('magrace','opal','poduch','tsuki','system')),
  to_agent      TEXT NOT NULL CHECK (to_agent   IN ('magrace','opal','poduch','tsuki','gm','all')),
  task_type     TEXT NOT NULL,          -- 'report' | 'content_approve' | 'alert' | 'decision' | 'info'
  title         TEXT NOT NULL,
  content       JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_progress','approved','rejected','done')),
  urgency       TEXT NOT NULL DEFAULT 'normal'
                  CHECK (urgency IN ('urgent','normal','low')),
  gm_note       TEXT,                   -- GM comment / feedback
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_team_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_tasks_updated_at ON team_tasks;
CREATE TRIGGER trg_team_tasks_updated_at
  BEFORE UPDATE ON team_tasks
  FOR EACH ROW EXECUTE FUNCTION update_team_tasks_updated_at();

-- Index สำหรับ query บ่อย
CREATE INDEX IF NOT EXISTS idx_team_tasks_to_agent   ON team_tasks(to_agent, status);
CREATE INDEX IF NOT EXISTS idx_team_tasks_from_agent ON team_tasks(from_agent);
CREATE INDEX IF NOT EXISTS idx_team_tasks_created_at ON team_tasks(created_at DESC);

-- RLS
ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON team_tasks FOR ALL USING (true);

-- Seed: ตัวอย่าง task แรก
INSERT INTO team_tasks (from_agent, to_agent, task_type, title, content, urgency)
VALUES (
  'system', 'tsuki', 'info', 'ระบบ team_tasks พร้อมใช้งาน',
  '{"message": "ZENTARA AI Team coordination layer is online. All agents can now post tasks here."}',
  'low'
);
