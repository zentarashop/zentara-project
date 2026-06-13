const express = require('express');
const router  = express.Router();
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const TOKEN_FILE = path.join(__dirname, '..', 'tiktok-tokens.json');

// PKCE: เก็บ code_verifier ระหว่างขั้นตอน /login → /callback (single-account, in-memory)
let pendingCodeVerifier = null;

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── token storage (single account, local file) ─────────────────────────────

function loadTokens() {
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); }
  catch { return null; }
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

// แลก code → access_token + refresh_token แล้วเก็บลงไฟล์
async function exchangeCode(code, codeVerifier) {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  saveTokens({ ...data, obtained_at: Date.now() });
  return data;
}

// refresh access_token ด้วย refresh_token เมื่อหมดอายุ
async function refreshTokens(refresh_token) {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  saveTokens({ ...data, obtained_at: Date.now() });
  return data;
}

// คืน access_token ที่ใช้งานได้ (refresh อัตโนมัติถ้าหมดอายุ)
async function getValidAccessToken() {
  let tokens = loadTokens();
  if (!tokens) throw new Error('ยังไม่ได้เชื่อมต่อ TikTok — เปิด /api/tiktok/login ก่อน');

  const ageSec = (Date.now() - tokens.obtained_at) / 1000;
  if (ageSec > tokens.expires_in - 60) {
    tokens = await refreshTokens(tokens.refresh_token);
  }
  return tokens.access_token;
}

// ── routes ───────────────────────────────────────────────────────────────────

// GET /api/tiktok/login — เด้งไปหน้า TikTok ให้ผู้ใช้ login + อนุญาต
router.get('/login', (req, res) => {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  pendingCodeVerifier = codeVerifier;

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.profile,user.info.stats,video.list',
    redirect_uri: process.env.TIKTOK_REDIRECT_URI,
    state: 'zentara',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
});

// GET /api/tiktok/callback — TikTok redirect กลับมาพร้อม ?code=
router.get('/callback', async (req, res) => {
  try {
    const { code, error, error_description } = req.query;
    if (error) throw new Error(error_description || error);
    if (!code) throw new Error('missing code');
    if (!pendingCodeVerifier) throw new Error('missing code_verifier — กรุณาเริ่มจาก /api/tiktok/login ใหม่');

    await exchangeCode(code, pendingCodeVerifier);
    pendingCodeVerifier = null;
    res.send('<h2>เชื่อมต่อ TikTok สำเร็จ</h2><p>ปิดแท็บนี้แล้วกลับไปที่ ZENTARA Command Center ได้เลย</p>');
  } catch (err) {
    res.status(500).send(`<h2>เชื่อมต่อ TikTok ไม่สำเร็จ</h2><p>${err.message}</p>`);
  }
});

// GET /api/tiktok/account — สถิติบัญชี (followers, likes, video count)
router.get('/account', async (req, res) => {
  try {
    const access_token = await getValidAccessToken();
    const fields = 'open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count';
    const r = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const data = await r.json();
    if (data.error?.code && data.error.code !== 'ok') throw new Error(data.error.message);
    res.json(data.data?.user || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
