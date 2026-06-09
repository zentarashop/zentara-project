const router = require('express').Router();
const { supabase } = require('../db/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

// â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/stats', async (req, res) => {
  const { data: orders } = await supabase
    .from('orders')
    .select('total, status, created_at');

  const today = new Date().toISOString().split('T')[0];
  res.json({
    total_orders:   orders?.length || 0,
    pending_orders: orders?.filter(o => o.status === 'pending_payment').length || 0,
    total_revenue:  orders?.filter(o => !['cancelled'].includes(o.status)).reduce((s, o) => s + o.total, 0) || 0,
    today_orders:   orders?.filter(o => o.created_at.startsWith(today)).length || 0,
  });
});

// â”€â”€ ORDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/orders', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/orders/:id', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending_payment','paid','preparing','shipped','delivered','cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// â”€â”€ PRODUCTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/products', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_sizes(*)')
    .order('id');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/products/:id', async (req, res) => {
  const { active, price } = req.body;
  const { data, error } = await supabase
    .from('products')
    .update({ ...(active !== undefined && { active }), ...(price && { price }) })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/products/:id/sizes/:size', async (req, res) => {
  const { stock, is_preorder } = req.body;
  const { data, error } = await supabase
    .from('product_sizes')
    .update({ ...(stock !== undefined && { stock }), ...(is_preorder !== undefined && { is_preorder }) })
    .eq('product_id', req.params.id)
    .eq('size', req.params.size)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// â”€â”€ REVIEWS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/reviews', async (req, res) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, products(name)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/reviews/:id', async (req, res) => {
  const { approved } = req.body;
  const { data, error } = await supabase
    .from('reviews')
    .update({ approved })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/reviews/:id', async (req, res) => {
  const { error } = await supabase.from('reviews').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'à¸¥à¸šà¸£à¸µà¸§à¸´à¸§à¹à¸¥à¹‰à¸§' });
});

// â”€â”€ DISCOUNT CODES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/discounts', async (req, res) => {
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .order('id');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/discounts', async (req, res) => {
  const { code, type, value, max_uses } = req.body;
  if (!code || !type) return res.status(400).json({ error: 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸„à¸£à¸š' });

  const { data, error } = await supabase
    .from('discount_codes')
    .insert({ code: code.toUpperCase().trim(), type, value: value || 0, max_uses: max_uses || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/discounts/:id', async (req, res) => {
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

// ── CUSTOMERS ──────────────────────────────────────────────────────────────
router.get('/customers', async (req, res) => {
  const [{ data: profiles, error }, { data: orderStats }] = await Promise.all([
    supabase.from('profiles').select('id, email, name, phone, role, created_at').eq('role', 'customer').order('created_at', { ascending: false }),
    supabase.from('orders').select('user_id, total, status, created_at'),
  ]);

  if (error) return res.status(500).json({ error: error.message });

  const customers = (profiles || []).map(p => {
    const orders = (orderStats || []).filter(o => o.user_id === p.id && o.status !== 'cancelled');
    const allOrders = (orderStats || []).filter(o => o.user_id === p.id);
    const sorted = [...allOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return {
      ...p,
      order_count:  orders.length,
      total_spent:  orders.reduce((s, o) => s + o.total, 0),
      last_order:   sorted[0]?.created_at || null,
    };
  });

  res.json(customers);
});

router.delete('/discounts/:id', async (req, res) => {
  const { error } = await supabase
    .from('discount_codes')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'ลบโค้ดแล้ว' });
});

module.exports = router;
