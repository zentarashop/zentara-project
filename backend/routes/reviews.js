const router = require('express').Router();
const { supabase } = require('../db/supabase');
const { authenticate } = require('../middleware/auth');

// POST /api/reviews â€” submit review (requires login)
router.post('/', authenticate, async (req, res) => {
  const { product_id, stars, body } = req.body;

  if (!product_id || !stars || !body?.trim()) {
    return res.status(400).json({ error: 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸„à¸£à¸š' });
  }
  if (stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'à¸„à¸°à¹à¸™à¸™à¸•à¹‰à¸­à¸‡à¸­à¸¢à¸¹à¹ˆà¸£à¸°à¸«à¸§à¹ˆà¸²à¸‡ 1-5' });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', req.user.id)
    .single();

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      product_id,
      user_id: req.user.id,
      user_name: profile?.name || req.user.email.split('@')[0].toUpperCase(),
      stars,
      body: body.trim(),
      approved: false,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'à¸ªà¹ˆà¸‡à¸£à¸µà¸§à¸´à¸§à¸ªà¸³à¹€à¸£à¹‡à¸ˆ à¸£à¸­à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸ˆà¸²à¸ admin', review: data });
});

module.exports = router;
