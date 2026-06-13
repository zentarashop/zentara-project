const express = require('express');
const router  = express.Router();
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Email helper ──────────────────────────────────────────────────────────────

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

async function sendEmail(subject, html) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  const transporter = getTransporter();
  return transporter.sendMail({
    from: `"ZENTARA Team" <${process.env.GMAIL_USER}>`,
    to: process.env.GM_EMAIL || process.env.GMAIL_USER,
    subject,
    html,
  });
}

// ── routes ───────────────────────────────────────────────────────────────────

// POST /api/team/tasks — agent โพสต์งานเข้า inbox
router.post('/tasks', async (req, res) => {
  try {
    const { from_agent, to_agent, task_type, title, content, urgency } = req.body;
    if (!from_agent || !to_agent || !task_type || !title)
      return res.status(400).json({ error: 'from_agent, to_agent, task_type, title required' });

    const { data, error } = await supabase
      .from('team_tasks')
      .insert({ from_agent, to_agent, task_type, title, content: content || {}, urgency: urgency || 'normal' })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // ส่ง email ถ้า urgency = urgent หรือ to_agent = gm
    if (urgency === 'urgent' || to_agent === 'gm') {
      await sendEmail(
        `🔔 ZENTARA [${urgency === 'urgent' ? '🔴 ด่วน' : 'แจ้งเตือน'}] ${title}`,
        `<h2>${title}</h2><p><b>จาก:</b> ${from_agent}</p><p><b>ประเภท:</b> ${task_type}</p><pre>${JSON.stringify(content, null, 2)}</pre>`
      ).catch(() => {}); // ไม่ให้ email error หยุด response
    }

    res.json({ success: true, task: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team/tasks — ดึง tasks (filter by to_agent, status)
router.get('/tasks', async (req, res) => {
  try {
    const { to_agent, from_agent, status, urgency, limit = 50 } = req.query;
    let query = supabase
      .from('team_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (to_agent)   query = query.eq('to_agent', to_agent);
    if (from_agent) query = query.eq('from_agent', from_agent);
    if (status)     query = query.eq('status', status);
    if (urgency)    query = query.eq('urgency', urgency);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    res.json({ data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team/inbox/:agent — inbox ของ agent นั้น (pending tasks)
router.get('/inbox/:agent', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('team_tasks')
      .select('*')
      .in('to_agent', [req.params.agent, 'all'])
      .eq('status', 'pending')
      .order('urgency', { ascending: true })  // urgent ขึ้นก่อน
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    res.json({ agent: req.params.agent, pending: data.length, tasks: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/team/tasks/:id — อัพเดทสถานะ (GM approve/reject หรือ agent update)
router.patch('/tasks/:id', async (req, res) => {
  try {
    const { status, gm_note } = req.body;
    const update = { status };
    if (gm_note) update.gm_note = gm_note;
    if (['approved', 'rejected', 'done'].includes(status)) update.resolved_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('team_tasks')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json({ success: true, task: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team/summary — Tsuki ใช้ดึง summary ทั้งทีม
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('team_tasks')
      .select('*')
      .eq('status', 'pending')
      .order('urgency', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    const urgent   = data.filter(t => t.urgency === 'urgent');
    const forGM    = data.filter(t => t.to_agent === 'gm');
    const byAgent  = {};
    data.forEach(t => {
      byAgent[t.from_agent] = (byAgent[t.from_agent] || 0) + 1;
    });

    res.json({
      total_pending: data.length,
      urgent_count:  urgent.length,
      for_gm_count:  forGM.length,
      by_agent:      byAgent,
      urgent_tasks:  urgent,
      all_pending:   data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team/collections — รายการคอลเลกชันทั้งหมด (สำหรับ Poduch)
router.get('/collections', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team/notify-gm — Tsuki ส่ง email สรุปให้ GM
router.post('/notify-gm', async (req, res) => {
  try {
    const { subject, html_body } = req.body;
    if (!subject || !html_body)
      return res.status(400).json({ error: 'subject and html_body required' });

    await sendEmail(subject, html_body);
    res.json({ success: true, message: 'Email sent to GM' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
