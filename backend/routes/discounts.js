const router = require('express').Router();
const { supabase } = require('../db/supabase');

// POST /api/discounts/verify
router.post('/verify', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¹‚à¸„à¹‰à¸”' });

  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('active', true)
    .single();

  if (error || !data) return res.status(404).json({ error: 'à¹‚à¸„à¹‰à¸”à¸ªà¹ˆà¸§à¸™à¸¥à¸”à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡' });

  if (data.max_uses && data.used_count >= data.max_uses) {
    return res.status(400).json({ error: 'à¹‚à¸„à¹‰à¸”à¸™à¸µà¹‰à¸–à¸¹à¸à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸«à¸¡à¸”à¹à¸¥à¹‰à¸§' });
  }

  res.json({ code: data.code, type: data.type, value: data.value });
});

module.exports = router;
