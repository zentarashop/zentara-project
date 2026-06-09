const router = require('express').Router();
const { supabase } = require('../db/supabase');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('à¹„à¸Ÿà¸¥à¹Œà¸•à¹‰à¸­à¸‡à¹€à¸›à¹‡à¸™ JPG, PNG à¸«à¸£à¸·à¸­ WebP à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™'));
  },
});

const generateOrderNumber = () => `ZTR-${Date.now().toString().slice(-6)}${String(Math.floor(Math.random() * 100)).padStart(2,'0')}`;

// POST /api/orders â€” create order
router.post('/', authenticate, async (req, res) => {
  const {
    customer_name, customer_phone, customer_email, customer_address,
    payment_method, items, discount_code,
    subtotal, discount_amount, shipping_fee, total,
  } = req.body;

  if (!customer_name || !customer_phone || !customer_address || !items?.length) {
    return res.status(400).json({ error: 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸„à¸£à¸š' });
  }

  // â”€â”€ Validate stock before creating order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const item of items) {
    const { data: sizeData } = await supabase
      .from('product_sizes')
      .select('stock, is_preorder')
      .eq('product_id', item.product_id)
      .eq('size', item.size)
      .single();

    if (!sizeData) return res.status(400).json({ error: `à¹„à¸¡à¹ˆà¸žà¸šà¸ªà¸´à¸™à¸„à¹‰à¸² ${item.name} à¹„à¸‹à¸ªà¹Œ ${item.size}` });
    if (!sizeData.is_preorder && sizeData.stock < item.qty) {
      return res.status(400).json({ error: `${item.name} à¹„à¸‹à¸ªà¹Œ ${item.size} à¸ªà¸´à¸™à¸„à¹‰à¸²à¹„à¸¡à¹ˆà¹€à¸žà¸µà¸¢à¸‡à¸žà¸­ (à¹€à¸«à¸¥à¸·à¸­ ${sizeData.stock} à¸Šà¸´à¹‰à¸™)` });
    }
  }

  // â”€â”€ Validate discount & recalculate total server-side â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let validatedDiscountAmt = 0;
  let validatedShipping = 50;

  if (discount_code) {
    const { data: dc } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', discount_code.toUpperCase().trim())
      .eq('active', true)
      .single();

    if (!dc) return res.status(400).json({ error: 'à¹‚à¸„à¹‰à¸”à¸ªà¹ˆà¸§à¸™à¸¥à¸”à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡' });
    if (dc.max_uses && dc.used_count >= dc.max_uses) {
      return res.status(400).json({ error: 'à¹‚à¸„à¹‰à¸”à¸™à¸µà¹‰à¸–à¸¹à¸à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸«à¸¡à¸”à¹à¸¥à¹‰à¸§' });
    }

    if (dc.type === 'percent')  validatedDiscountAmt = Math.floor(subtotal * dc.value / 100);
    if (dc.type === 'baht')     validatedDiscountAmt = dc.value;
    if (dc.type === 'freeship') validatedShipping = 0;
  }

  const validatedTotal = subtotal - validatedDiscountAmt + validatedShipping;

  // â”€â”€ Generate unique order number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let order_number = generateOrderNumber();
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.from('orders').select('id').eq('order_number', order_number).single();
    if (!data) break;
    order_number = generateOrderNumber();
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      order_number, user_id: req.user.id,
      customer_name, customer_phone, customer_email, customer_address,
      payment_method, discount_code: discount_code || null,
      subtotal,
      discount_amount: validatedDiscountAmt,
      shipping_fee: validatedShipping,
      total: validatedTotal,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // â”€â”€ Insert order items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.name,
    size: item.size,
    quantity: item.qty,
    price: item.price,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) return res.status(500).json({ error: itemsError.message });

  // â”€â”€ Reduce stock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const item of items) {
    await supabase.rpc('reduce_stock', {
      p_product_id: item.product_id,
      p_size: item.size,
      p_qty: item.qty,
    });
  }

  // â”€â”€ Increment discount usage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (discount_code) {
    const code = discount_code.toUpperCase().trim();
    const { data: dc } = await supabase
      .from('discount_codes')
      .select('used_count')
      .eq('code', code)
      .single();
    if (dc) {
      await supabase
        .from('discount_codes')
        .update({ used_count: (dc.used_count || 0) + 1 })
        .eq('code', code);
    }
  }

  res.json({ order_number: order.order_number, id: order.id });
});

// GET /api/orders â€” my orders
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/orders/:id â€” single order
router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'à¹„à¸¡à¹ˆà¸žà¸šà¸­à¸­à¹€à¸”à¸­à¸£à¹Œ' });
  res.json(data);
});

// POST /api/orders/:id/slip â€” upload payment slip
router.post('/:id/slip', authenticate, upload.single('slip'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'à¸à¸£à¸¸à¸“à¸²à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸ªà¸¥à¸´à¸›' });

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!order) return res.status(404).json({ error: 'à¹„à¸¡à¹ˆà¸žà¸šà¸­à¸­à¹€à¸”à¸­à¸£à¹Œ' });

  const ext = req.file.originalname.split('.').pop();
  const fileName = `${req.params.id}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('slips')
    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

  if (uploadError) return res.status(500).json({ error: 'à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ' + uploadError.message });

  const { data: { publicUrl } } = supabase.storage.from('slips').getPublicUrl(fileName);

  await supabase.from('orders').update({ slip_url: publicUrl }).eq('id', req.params.id);

  res.json({ slip_url: publicUrl });
});

module.exports = router;
