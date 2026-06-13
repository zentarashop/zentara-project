// ZENTARA Command Center — Live Team Data API (polling)  v1.0
// Fetches real GM Decision Queue / Activity Feed from the team-relay backend
// (backend/routes/team.js -> team_tasks table). Falls back to mock data
// (zentara-data.js) until the first successful fetch.

window.ZENTARA_API_BASE = (new URLSearchParams(location.search).get('api'))
  || localStorage.getItem('zentara_api_base')
  || 'http://localhost:5000';

const ZENTARA_AGENT_NAME = { magrace:'Magrace', opal:'Opal', poduch:'Poduch', tsuki:'Tsuki', system:'System', gm:'GM' };

function zentaraAgentColor(agent) {
  const C = window.ZC;
  return { magrace:C.purple, opal:C.orange, poduch:C.blue, tsuki:C.pink, system:C.green, gm:C.gold }[agent] || C.green;
}

function zentaraRelativeTime(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// team_tasks rows -> { decisionQueue, activityFeed } shaped like zentara-data.js mocks
window.zentaraMapTeamTasks = function (tasks) {
  const decisionQueue = tasks
    .filter(t => t.to_agent === 'gm' && t.status === 'pending')
    .map(t => ({
      id: t.id,
      title: t.title,
      from: ZENTARA_AGENT_NAME[t.from_agent] || t.from_agent,
      urgency: t.urgency,
      time: zentaraRelativeTime(t.created_at),
      status: t.status,
    }));

  const activityFeed = tasks.slice(0, 10).map(t => ({
    id: t.id,
    agent: ZENTARA_AGENT_NAME[t.from_agent] || t.from_agent,
    color: zentaraAgentColor(t.from_agent),
    action: t.title,
    time: zentaraRelativeTime(t.created_at),
  }));

  // ล่าสุดที่แต่ละ agent ทำ — ใช้แสดงสถานะ "NOW DOING" จริงบน HQ map / Tsuki Team Status
  const latestByAgent = {};
  tasks.forEach(t => {
    const cur = latestByAgent[t.from_agent];
    if (!cur || new Date(t.created_at) > new Date(cur.created_at)) {
      latestByAgent[t.from_agent] = {
        title: t.title,
        time: zentaraRelativeTime(t.created_at),
        created_at: t.created_at,
      };
    }
  });

  return { decisionQueue, activityFeed, latestByAgent };
};

window.zentaraFetchTeamTasks = async function () {
  const res = await fetch(`${window.ZENTARA_API_BASE}/api/team/tasks?limit=30`);
  if (!res.ok) throw new Error(`team/tasks ${res.status}`);
  const json = await res.json();
  return window.zentaraMapTeamTasks(json.data || []);
};

window.zentaraUpdateTaskStatus = function (id, status) {
  return fetch(`${window.ZENTARA_API_BASE}/api/team/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
};

// team_tasks (to_agent='tsuki') -> Tsuki Inbox shape
window.zentaraFetchTsukiInbox = async function () {
  const res = await fetch(`${window.ZENTARA_API_BASE}/api/team/tasks?to_agent=tsuki&limit=20`);
  if (!res.ok) throw new Error(`team/tasks ${res.status}`);
  const json = await res.json();
  return (json.data || [])
    .filter(t => t.status !== 'done' && t.status !== 'rejected')
    .map(t => ({
      id: t.id,
      from: ZENTARA_AGENT_NAME[t.from_agent] || t.from_agent,
      title: t.title,
      status: t.status,
      urgency: t.urgency,
    }));
};

// team_tasks (from_agent='magrace', task_type='report') -> latest content/market report
window.zentaraFetchMagraceLatestReport = async function () {
  const res = await fetch(`${window.ZENTARA_API_BASE}/api/team/tasks?from_agent=magrace&task_type=report&limit=10`);
  if (!res.ok) throw new Error(`team/tasks ${res.status}`);
  const json = await res.json();
  const report = (json.data || []).find(t => t.content && typeof t.content === 'object' && (t.content.weekly_report || t.content.summary));
  if (!report) return null;
  const text = report.content.weekly_report
    ? [report.content.weekly_report, report.content.market_intelligence].filter(Boolean).join('\n\n---\n\n')
    : report.content.summary;
  return { title: report.title, time: zentaraRelativeTime(report.created_at), text };
};

// ── Auth (reuses existing e-commerce admin login) ──────────────────────────
window.zentaraGetAuth = function () {
  try { return JSON.parse(localStorage.getItem('zentara_auth') || 'null'); }
  catch { return null; }
};

window.zentaraLogin = async function (email, password) {
  const res = await fetch(`${window.ZENTARA_API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `เข้าสู่ระบบไม่สำเร็จ (${res.status})`);
  if (json.user?.role !== 'admin') throw new Error('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ (admin)');
  localStorage.setItem('zentara_auth', JSON.stringify(json));
  window.dispatchEvent(new Event('zentara:auth-changed'));
  return json;
};

window.zentaraLogout = function () {
  localStorage.removeItem('zentara_auth');
  window.dispatchEvent(new Event('zentara:auth-changed'));
};

window.zentaraAuthFetch = async function (path) {
  const auth = window.zentaraGetAuth();
  if (!auth?.token) throw new Error('not authenticated');
  const res = await fetch(`${window.ZENTARA_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  if (res.status === 401 || res.status === 403) { window.zentaraLogout(); throw new Error('session expired'); }
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
};

// ── Admin data (orders / stock / KPIs) — requires admin login ──────────────
window.zentaraFetchAdminStats = () => window.zentaraAuthFetch('/api/admin/stats');

const ZENTARA_ORDER_STATUS_MAP = {
  pending_payment: 'processing', paid: 'processing', preparing: 'processing',
  shipped: 'shipped', delivered: 'shipped', cancelled: 'issue',
};

window.zentaraFetchOrders = async function () {
  const orders = await window.zentaraAuthFetch('/api/admin/orders');
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.created_at.startsWith(today));
  return {
    orders: orders.slice(0, 8).map(o => ({
      id: '#' + (o.order_number || o.id.slice(0, 8)),
      customer: o.customer_name,
      item: (o.order_items || []).map(it => `${it.product_name} / ${it.size}`).join(', ') || '-',
      status: ZENTARA_ORDER_STATUS_MAP[o.status] || 'processing',
      time: new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    })),
    summary: {
      ordersToday: todayOrders.length,
      shipped:     todayOrders.filter(o => ['shipped', 'delivered'].includes(o.status)).length,
      processing:  todayOrders.filter(o => ['pending_payment', 'paid', 'preparing'].includes(o.status)).length,
      issues:      todayOrders.filter(o => o.status === 'cancelled').length,
    },
  };
};

window.zentaraFetchStockAlerts = async function () {
  const products = await window.zentaraAuthFetch('/api/admin/products');
  const MIN_STOCK = 5;
  const alerts = [];
  products.forEach(p => {
    (p.product_sizes || []).forEach(ps => {
      if (ps.stock <= MIN_STOCK) alerts.push({ item: p.name, size: ps.size, qty: ps.stock, min: MIN_STOCK });
    });
  });
  alerts.sort((a, b) => a.qty - b.qty);
  return alerts.slice(0, 8);
};

// ── Instagram data — public, no login required ──────────────────────────────
function zentaraFmtCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n || 0}`;
}

window.zentaraFetchPerformance = async function () {
  const [account, perf] = await Promise.all([
    fetch(`${window.ZENTARA_API_BASE}/api/instagram/account`).then(r => r.json()),
    fetch(`${window.ZENTARA_API_BASE}/api/instagram/performance`).then(r => r.json()),
  ]);
  if (account.error) throw new Error(account.error);
  if (perf.error) throw new Error(perf.error);
  const followers = account.followers_count || 0;
  const avgEngagement = perf.summary?.avg_engagement || 0;
  return {
    igFollowers:  zentaraFmtCount(followers),
    igReach:      zentaraFmtCount(perf.summary?.avg_reach || 0),
    igEngagement: followers ? `${((avgEngagement / followers) * 100).toFixed(1)}%` : '—',
    ttViews:      'N/A',
  };
};

// ── Collections — public, no login required ─────────────────────────────────
const ZENTARA_COLLECTION_PROGRESS = {
  planning: 15, production: 50, qc: 75, ready: 90, shipped: 100, paused: 50,
};
const ZENTARA_COLLECTION_LABEL = {
  planning: 'planning', production: 'production', qc: 'QC', ready: 'ready', shipped: 'live', paused: 'paused',
};

window.zentaraFetchCollections = async function () {
  const res = await fetch(`${window.ZENTARA_API_BASE}/api/team/collections`);
  if (!res.ok) throw new Error(`team/collections ${res.status}`);
  const json = await res.json();
  return (json.data || []).map(c => ({
    name: c.name,
    status: ZENTARA_COLLECTION_LABEL[c.status] || c.status,
    progress: ZENTARA_COLLECTION_PROGRESS[c.status] ?? 50,
    target: c.deadline ? new Date(c.deadline).toLocaleDateString('th-TH', { year:'numeric', month:'short' }) : '—',
  }));
};

window.zentaraFetchDmInbox = async function () {
  const res = await fetch(`${window.ZENTARA_API_BASE}/api/instagram/dm`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return (json.all || []).slice(0, 6).map((c, i) => ({
    id: c.conversation_id || i,
    platform: 'IG',
    user: '@' + c.from,
    msg: c.latest_message,
    status: c.is_unread ? 'pending' : 'replied',
    time: new Date(c.updated_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  }));
};
