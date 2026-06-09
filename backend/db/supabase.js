const { createClient } = require('@supabase/supabase-js');

// ── DB client: service_role — ใช้สำหรับ DB operations ทั้งหมด
// ไม่เคย call auth.getUser() ผ่าน client นี้ เพื่อป้องกัน JWT contamination
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Auth client: แยกออกมาโดยเฉพาะสำหรับ JWT verification ใน middleware
// ใช้ service_role เช่นกันแต่เป็น instance แยก ไม่กระทบ DB client
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = { supabase, supabaseAuth };
