const router = require('express').Router();
const { supabase } = require('../db/supabase');

// GET /api/products â€” all active products with sizes
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_sizes(*)')
    .eq('active', true)
    .order('id');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/products/:id â€” single product with sizes + approved reviews
router.get('/:id', async (req, res) => {
  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_sizes(*)')
    .eq('id', req.params.id)
    .eq('active', true)
    .single();

  if (error) return res.status(404).json({ error: 'à¹„à¸¡à¹ˆà¸žà¸šà¸ªà¸´à¸™à¸„à¹‰à¸²' });

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, user_name, stars, body, verified, created_at')
    .eq('product_id', req.params.id)
    .eq('approved', true)
    .order('created_at', { ascending: false });

  res.json({ ...product, reviews: reviews || [] });
});

module.exports = router;
