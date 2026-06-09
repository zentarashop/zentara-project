const router = require('express').Router();
const { supabase } = require('../db/supabase');
const { requireAdmin } = require('../middleware/auth');

// GET /api/discounts — admin: ดูโค้ดทั้งหมด
router.get('/', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/discounts — admin: สร้างโค้ดใหม่
router.post('/', requireAdmin, async (req, res) => {
  const { code, type, value, max_uses } = req.body;
  if (!code || !type) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });

  const { data, error } = await supabase
    .from('discount_codes')
    .insert([{
      code: code.toUpperCase().trim(),
      type,
      value: value || 0,
      max_uses: max_uses || null,
      used_count: 0,
      active: false,
    }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/discounts/:id — admin: toggle active
router.patch('/:id', requireAdmin, async (req, res) => {
  const { active } = req.body;
  const { data, error } = await supabase
    .from('discount_codes')
    .update({ active })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/discounts/:id — admin: ลบโค้ด
router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('discount_codes')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/discounts/verify — public: ตรวจสอบโค้ด
router.post('/verify', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'กรุณาระบุโค้ด' });

  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('active', true)
    .single();

  if (error || !data) return res.status(404).json({ error: 'โค้ดส่วนลดไม่ถูกต้อง' });

  if (data.max_uses && data.used_count >= data.max_uses) {
    return res.status(400).json({ error: 'โค้ดนี้ถูกใช้งานหมดแล้ว' });
  }

  res.json({ code: data.code, type: data.type, value: data.value });
});

module.exports = router;
