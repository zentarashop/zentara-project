const express = require('express');
const router  = express.Router();

const IG_API = 'https://graph.instagram.com/v21.0';

// ── helpers ──────────────────────────────────────────────────────────────────

function token() { return process.env.IG_ACCESS_TOKEN; }
function igId()  { return process.env.IG_BUSINESS_ACCOUNT_ID; }

async function igFetch(url) {
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data;
}

// ── routes ───────────────────────────────────────────────────────────────────

// GET /api/instagram/media — โพสต์ล่าสุด พร้อม like/comment
router.get('/media', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 12, 50);
    const fields = 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink';
    const data = await igFetch(
      `${IG_API}/${igId()}/media?fields=${fields}&limit=${limit}&access_token=${token()}`
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/media/:id/insights — insights ของโพสต์เดียว
router.get('/media/:id/insights', async (req, res) => {
  try {
    const data = await igFetch(
      `${IG_API}/${req.params.id}/insights?metric=engagement,impressions,reach,saved&access_token=${token()}`
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/performance — weekly summary สำหรับ MAGRACE
router.get('/performance', async (req, res) => {
  try {
    const fields = 'id,caption,media_type,timestamp,like_count,comments_count,permalink';
    const mediaData = await igFetch(
      `${IG_API}/${igId()}/media?fields=${fields}&limit=10&access_token=${token()}`
    );

    const posts = await Promise.all(
      (mediaData.data || []).map(async (post) => {
        try {
          const insight = await igFetch(
            `${IG_API}/${post.id}/insights?metric=engagement,impressions,reach,saved&access_token=${token()}`
          );
          const metrics = {};
          (insight.data || []).forEach(m => { metrics[m.name] = m.values?.[0]?.value ?? 0; });
          return { ...post, ...metrics };
        } catch {
          return post;
        }
      })
    );

    posts.sort((a, b) => (b.engagement || 0) - (a.engagement || 0));

    const total = posts.length || 1;
    res.json({
      top3:    posts.slice(0, 3),
      bottom3: posts.slice(-3).reverse(),
      all:     posts,
      summary: {
        total_posts:   posts.length,
        avg_likes:     Math.round(posts.reduce((s, p) => s + (p.like_count    || 0), 0) / total),
        avg_comments:  Math.round(posts.reduce((s, p) => s + (p.comments_count|| 0), 0) / total),
        avg_reach:     Math.round(posts.reduce((s, p) => s + (p.reach         || 0), 0) / total),
        avg_engagement:Math.round(posts.reduce((s, p) => s + (p.engagement    || 0), 0) / total),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/account — ข้อมูล account (followers, profile)
router.get('/account', async (req, res) => {
  try {
    const data = await igFetch(
      `${IG_API}/${igId()}?fields=id,username,followers_count,media_count,profile_picture_url&access_token=${token()}`
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/instagram/refresh-token — แปลง short-lived → long-lived (60 วัน)
router.post('/refresh-token', async (req, res) => {
  try {
    const data = await igFetch(
      `${IG_API}/access_token?grant_type=ig_exchange_token&client_secret=${process.env.META_APP_SECRET}&access_token=${token()}`
    );
    res.json({
      access_token: data.access_token,
      expires_in_days: Math.round((data.expires_in || 0) / 86400),
      message: 'Copy access_token แล้วอัพเดทใน .env → IG_ACCESS_TOKEN',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/dm — สรุป DM ใหม่สำหรับโอเพิล
router.get('/dm', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const data = await igFetch(
      `${IG_API}/${igId()}/conversations?fields=id,updated_time,messages{message,from,created_time}&limit=${limit}&access_token=${token()}`
    );

    const convos = (data.data || []).map(convo => {
      const msgs   = convo.messages?.data || [];
      const latest = msgs[0] || {};
      const isFromCustomer = latest.from?.id !== igId();
      return {
        conversation_id: convo.id,
        updated_time:    convo.updated_time,
        latest_message:  latest.message || '',
        from:            latest.from?.username || latest.from?.name || 'unknown',
        from_id:         latest.from?.id,
        is_unread:       isFromCustomer,
        message_count:   msgs.length,
      };
    });

    const unread = convos.filter(c => c.is_unread);

    res.json({
      total_conversations: convos.length,
      unread_count:        unread.length,
      unread:              unread,
      all:                 convos,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/instagram/dm/:conversation_id/reply — draft reply (ไม่ auto-send)
router.get('/dm/:conversation_id/messages', async (req, res) => {
  try {
    const data = await igFetch(
      `${IG_API}/${req.params.conversation_id}/messages?fields=message,from,created_time&access_token=${token()}`
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
