const router = require('express').Router();
const { supabase } = require('../db/supabase');
const { authenticate } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸„à¸£à¸š' });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) return res.status(400).json({ error: authError.message });

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: authData.user.id, email, name, phone }, { onConflict: 'id' });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return res.status(400).json({ error: profileError.message });
  }

  res.json({ message: 'à¸ªà¸¡à¸±à¸„à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸à¸ªà¸³à¹€à¸£à¹‡à¸ˆ' });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸­à¸µà¹€à¸¡à¸¥à¹à¸¥à¸°à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'à¸­à¸µà¹€à¸¡à¸¥à¸«à¸£à¸·à¸­à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  res.json({
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name,
      phone: profile?.phone,
      role: profile?.role || 'customer',
    },
  });
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  res.json({ ...data, email: req.user.email });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸­à¸µà¹€à¸¡à¸¥' });
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'à¸ªà¹ˆà¸‡à¸¥à¸´à¸‡à¸à¹Œà¸£à¸µà¹€à¸‹à¹‡à¸•à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹à¸¥à¹‰à¸§' });
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req, res) => {
  const { name, phone } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...(name && { name }), ...(phone && { phone }) })
    .eq('id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
