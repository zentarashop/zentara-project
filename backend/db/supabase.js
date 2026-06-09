const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabaseOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
};

// ── DB client: service_role — ใช้สำหรับ DB operations ทั้งหมด
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  supabaseOptions
);

// ── Auth client: แยกออกมาสำหรับ JWT verification
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  supabaseOptions
);

module.exports = { supabase, supabaseAuth };
