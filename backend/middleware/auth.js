const { supabase, supabaseAuth } = require('../db/supabase');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Session หมดอายุ กรุณา login ใหม่' });

  req.user = user;
  next();
};

const requireAdmin = async (req, res, next) => {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', req.user.id)
    .single();

  if (data?.role !== 'admin') return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
  next();
};

module.exports = { authenticate, requireAdmin };
