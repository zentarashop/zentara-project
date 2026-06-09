import { useEffect, useState, useRef, Fragment } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { IMGS } from '../assets/images';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { zentaraAI, SEGMENT_META, DEFAULT_CONFIG } from '../utils/bizAI';
import './AdminPage.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const SIZE_ORDER = ['S','M','L','XL','2XL','3XL'];
const sortSizes  = (sizes) => [...(sizes || [])].sort((a, b) => {
  const ai = SIZE_ORDER.indexOf(a.size);
  const bi = SIZE_ORDER.indexOf(b.size);
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
});

const ORDER_STATUSES = ['pending_payment','paid','preparing','shipped','delivered','cancelled'];
const STATUS_LABELS  = {
  pending_payment: 'รอชำระ',
  paid:            'ชำระแล้ว',
  preparing:       'เตรียมสินค้า',
  shipped:         'จัดส่งแล้ว',
  delivered:       'ได้รับแล้ว',
  cancelled:       'ยกเลิก',
};
const STATUS_CLASS = {
  pending_payment: 'badge-yellow',
  paid:            'badge-blue',
  preparing:       'badge-blue',
  shipped:         'badge-blue',
  delivered:       'badge-green',
  cancelled:       'badge-red',
};

const PIE_COLORS = {
  pending_payment: '#f5c518',
  paid:            '#3b82f6',
  preparing:       '#8b5cf6',
  shipped:         '#06b6d4',
  delivered:       '#2dff7a',
  cancelled:       '#ff3b3b',
};

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill, fontSize: 12 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ── Health gauge SVG ──────────────────────────────────────────────────────────
function HealthGauge({ score }) {
  const r = 68, cx = 90, cy = 90;
  const circ   = Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circ;
  const color  = score >= 70 ? '#2dff7a' : score >= 40 ? '#f5c518' : '#ff3b3b';
  const label  = score >= 70 ? 'HEALTHY' : score >= 40 ? 'MODERATE' : 'AT RISK';
  return (
    <svg width="180" height="108" viewBox="0 0 180 108" className="health-gauge">
      {/* Track */}
      <path d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke="#1a1a1a" strokeWidth="14" strokeLinecap="round" />
      {/* Fill */}
      <path d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      {/* Score */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill={color}
        fontSize="30" fontWeight="900" fontFamily="monospace">{score}</text>
      {/* Label */}
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#666"
        fontSize="9" fontWeight="700" letterSpacing="2">{label}</text>
    </svg>
  );
}

// ── Segment badge ─────────────────────────────────────────────────────────────
function SegBadge({ segment }) {
  const m = SEGMENT_META[segment] || { label: segment, color: '#666', icon: '•' };
  return (
    <span className="seg-badge" style={{ borderColor: m.color + '44', color: m.color, background: m.color + '14' }}>
      {m.icon} {m.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate    = useNavigate();
  const { addToast } = useToast();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [tab, setTab]           = useState('dashboard');
  const [stats, setStats]       = useState(null);
  const [orders, setOrders]     = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews]   = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]   = useState(false);

  // ── AI state ─────────────────────────────────────────────────────────────────
  const [aiResult, setAiResult]     = useState(null);
  const [aiConfig, setAiConfig]     = useState({ ...DEFAULT_CONFIG });
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [aiRunning, setAiRunning]   = useState(false);

  // ── Customers state ──────────────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch]       = useState('');
  const [customerSegFilter, setCustomerSegFilter] = useState('all');

  // ── Orders/UI state ──────────────────────────────────────────────────────────
  const [newDiscount, setNewDiscount] = useState({ code: '', type: 'percent', value: 0, max_uses: '' });
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [sizeEdits, setSizeEdits]         = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderSearch, setOrderSearch]     = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingSelectValues, setPendingSelectValues] = useState({});
  const [newOrderCount, setNewOrderCount] = useState(0);
  const prevOrderCount = useRef(0);
  const [dateFilter, setDateFilter] = useState('all');

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/member'); return; }
    if (user.role !== 'admin') { navigate('/'); return; }
    loadData();
  }, [user, authLoading]);

  // ── Auto-refresh ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const interval = setInterval(async () => {
      try {
        const [s, o] = await Promise.all([adminApi.getStats(), adminApi.getOrders()]);
        setStats(s);
        if (o.length > prevOrderCount.current) {
          setNewOrderCount(o.length - prevOrderCount.current);
          setTimeout(() => setNewOrderCount(0), 5000);
        }
        prevOrderCount.current = o.length;
        setOrders(o);
      } catch {}
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Load all data + run AI ────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [s, o, p, r, d, c] = await Promise.all([
        adminApi.getStats(),
        adminApi.getOrders(),
        adminApi.getProducts(),
        adminApi.getReviews(),
        adminApi.getDiscounts(),
        adminApi.getCustomers().catch(() => []),  // ไม่ให้ crash ทั้งก้อน
      ]);
      setStats(s); setOrders(o); setProducts(p); setReviews(r); setDiscounts(d); setCustomers(c);
      prevOrderCount.current = o.length;
      runAI(o, p, c);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const runAI = (o = orders, p = products, c = customers) => {
    try {
      setAiRunning(true);
      const result = zentaraAI.analyze(o, p, c);
      setAiResult(result);
      setAiConfig({ ...zentaraAI.config });
    } catch (e) {
      console.error('AI error:', e);
    } finally {
      setAiRunning(false);
    }
  };

  const saveAiConfig = () => {
    zentaraAI.updateConfig(aiConfig);
    runAI();
    addToast('บันทึก AI Config แล้ว และวิเคราะห์ใหม่', 'success');
  };

  const resetAiConfig = () => {
    zentaraAI.reset();
    setAiConfig({ ...DEFAULT_CONFIG });
    runAI();
    addToast('รีเซ็ต AI Model แล้ว', 'success');
  };

  // ── Existing CRUD functions ──────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [['ORDER #','ชื่อ','เบอร์','อีเมล','ที่อยู่','ยอด','สถานะ','วันที่']];
    orders.forEach(o => rows.push([
      o.order_number, o.customer_name, o.customer_phone, o.customer_email,
      `"${o.customer_address}"`, o.total, STATUS_LABELS[o.status] || o.status,
      new Date(o.created_at).toLocaleDateString('th-TH'),
    ]));
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `zentara_orders_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await adminApi.updateOrder(id, { status });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      setPendingSelectValues(prev => { const n = { ...prev }; delete n[id]; return n; });
      addToast('อัปเดตสถานะแล้ว', 'success');
    } catch (e) {
      setPendingSelectValues(prev => { const n = { ...prev }; delete n[id]; return n; });
      addToast(e.message, 'error');
    }
  };

  const toggleReview = async (id, approved) => {
    try {
      await adminApi.updateReview(id, { approved });
      setReviews(prev => prev.map(r => r.id === id ? { ...r, approved } : r));
      addToast(approved ? 'อนุมัติรีวิวแล้ว' : 'ซ่อนรีวิวแล้ว', 'success');
    } catch (e) { addToast(e.message, 'error'); }
  };

  const deleteReview = async (id) => {
    try {
      await adminApi.deleteReview(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      addToast('ลบรีวิวแล้ว', 'success');
    } catch (e) { addToast(e.message, 'error'); }
  };

  const deleteDiscount = async (id) => {
    try {
      await adminApi.deleteDiscount(id);
      setDiscounts(prev => prev.filter(d => d.id !== id));
      addToast('ลบโค้ดแล้ว', 'success');
    } catch (e) { addToast(e.message, 'error'); }
  };

  const toggleDiscount = async (id, active) => {
    try {
      await adminApi.toggleDiscount(id, active);
      setDiscounts(prev => prev.map(d => d.id === id ? { ...d, active } : d));
      addToast(active ? 'เปิดโค้ดแล้ว' : 'ปิดโค้ดแล้ว', 'success');
    } catch (e) { addToast(e.message, 'error'); }
  };

  const createDiscount = async () => {
    if (!newDiscount.code) { addToast('กรุณากรอกโค้ด', 'error'); return; }
    try {
      const d = await adminApi.createDiscount({
        ...newDiscount,
        max_uses: newDiscount.max_uses ? Number(newDiscount.max_uses) : null,
      });
      setDiscounts(prev => [...prev, d]);
      setNewDiscount({ code: '', type: 'percent', value: 0, max_uses: '' });
      addToast('สร้างโค้ดแล้ว', 'success');
    } catch (e) {
      const msg = e.message?.includes('duplicate') || e.message?.includes('unique')
        ? `โค้ด "${newDiscount.code}" มีอยู่แล้ว กรุณาใช้ชื่ออื่น`
        : e.message;
      addToast(msg, 'error');
    }
  };

  // ── Derived chart data ────────────────────────────────────────────────────────
  const statusPieData = ORDER_STATUSES
    .map(s => ({ name: STATUS_LABELS[s], value: orders.filter(o => o.status === s).length, key: s }))
    .filter(d => d.value > 0);

  const revenueChartData = (aiResult?.revenueByDay || []).slice(-14).map(d => ({
    date: d.date.slice(5), // "MM-DD"
    revenue: d.revenue,
    orders:  d.orders,
  }));

  const filteredCustomers = customers
    .filter(c => customerSegFilter === 'all' || (aiResult?.segments || []).find(s => s.id === c.id)?.segment === customerSegFilter)
    .filter(c => !customerSearch || [c.name, c.email, c.phone].some(v => v?.toLowerCase().includes(customerSearch.toLowerCase())));

  const segmentedCustomers = aiResult?.segments || customers.map(c => ({ ...c, segment: 'new', orderCount: c.order_count || 0, totalSpent: c.total_spent || 0, daysSince: 9999 }));

  const segCounts = Object.keys(SEGMENT_META).reduce((acc, k) => {
    acc[k] = segmentedCustomers.filter(s => s.segment === k).length;
    return acc;
  }, {});

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'dashboard', label: '📊 DASHBOARD' },
    { key: 'orders',    label: `📦 ORDERS${orders.filter(o => o.status === 'pending_payment').length ? ` (${orders.filter(o => o.status === 'pending_payment').length})` : ''}` },
    { key: 'products',  label: '👕 PRODUCTS' },
    { key: 'reviews',   label: `💬 REVIEWS${reviews.filter(r => !r.approved).length ? ` (${reviews.filter(r => !r.approved).length})` : ''}` },
    { key: 'discounts', label: '🏷 DISCOUNTS' },
    { key: 'customers', label: `👥 CUSTOMERS${customers.length ? ` (${customers.length})` : ''}` },
    { key: 'ai',        label: '🤖 AI INSIGHTS' },
  ];

  if (loading && !stats) return (
    <div className="page flex-center" style={{ minHeight: '80vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div className="page admin-page">
      <div className="container">

        {/* ── Global Confirm Delete Dialog ── */}
        {pendingDelete && (
          <div className="confirm-overlay" onClick={() => setPendingDelete(null)}>
            <div className="confirm-box card" onClick={e => e.stopPropagation()}>
              <p className="fw-bold" style={{ marginBottom: 8 }}>
                ยืนยันลบ{pendingDelete.type === 'review' ? 'รีวิว' : 'โค้ดส่วนลด'}?
              </p>
              <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>การกระทำนี้ไม่สามารถยกเลิกได้</p>
              <div className="flex gap-8">
                <button className="btn btn-danger btn-sm" onClick={() => {
                  if (pendingDelete.type === 'review') deleteReview(pendingDelete.id);
                  else deleteDiscount(pendingDelete.id);
                  setPendingDelete(null);
                }}>ลบเลย</button>
                <button className="btn btn-outline btn-sm" onClick={() => setPendingDelete(null)}>ยกเลิก</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="admin-header animate-in">
          <div>
            <span className="section-label">ZENTARA</span>
            <h1 className="section-title">ADMIN DASHBOARD</h1>
          </div>
          <div className="flex gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {newOrderCount > 0 && <span className="badge badge-green" style={{ animation: 'pulse 1s infinite' }}>🔔 ออเดอร์ใหม่ {newOrderCount} รายการ!</span>}
            {tab === 'orders' && <button className="btn btn-outline btn-sm" onClick={exportCSV}>📥 EXPORT CSV</button>}
            <button className="btn btn-ghost btn-sm" onClick={loadData} disabled={loading}>↻ REFRESH</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`admin-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════ DASHBOARD ══════════════════════════════ */}
        {tab === 'dashboard' && stats && (() => {
          const now      = new Date();
          const filtered = orders.filter(o => {
            const d = new Date(o.created_at);
            if (dateFilter === 'today') return d.toDateString() === now.toDateString();
            if (dateFilter === 'week')  return (now - d) < 7 * 86400000;
            if (dateFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            return true;
          });
          const revenue = filtered.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
          const pending = filtered.filter(o => o.status === 'pending_payment').length;
          const today   = orders.filter(o => new Date(o.created_at).toDateString() === now.toDateString()).length;

          return (
            <div className="admin-section animate-in">
              {/* Date filter */}
              <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
                {[['all','ทั้งหมด'],['today','วันนี้'],['week','7 วัน'],['month','เดือนนี้']].map(([v,l]) => (
                  <button key={v} className={`btn btn-sm ${dateFilter === v ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDateFilter(v)}>{l}</button>
                ))}
              </div>

              {/* KPI cards */}
              <div className="stats-grid">
                <div className="stat-card card">
                  <span className="stat-icon">📦</span>
                  <span className="stat-num font-display">{filtered.length}</span>
                  <span className="stat-label">ORDERS</span>
                </div>
                <div className="stat-card card">
                  <span className="stat-icon">⏳</span>
                  <span className="stat-num font-display text-yellow">{pending}</span>
                  <span className="stat-label">PENDING PAYMENT</span>
                </div>
                <div className="stat-card card">
                  <span className="stat-icon">💰</span>
                  <span className="stat-num font-display text-accent">{revenue.toLocaleString()}</span>
                  <span className="stat-label">REVENUE (THB)</span>
                </div>
                <div className="stat-card card">
                  <span className="stat-icon">🔥</span>
                  <span className="stat-num font-display">{today}</span>
                  <span className="stat-label">TODAY</span>
                </div>
              </div>

              {/* ── Charts ── */}
              {revenueChartData.length > 0 && (
                <div className="charts-grid mt-24">
                  {/* Revenue trend */}
                  <div className="chart-card card">
                    <div className="chart-header">
                      <span className="chart-title">REVENUE TREND</span>
                      <span className="chart-sub">14 วันล่าสุด (฿)</span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#2dff7a" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2dff7a" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="revenue" name="รายได้ ฿" stroke="#2dff7a" strokeWidth={2} fill="url(#gradRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Orders per day */}
                  <div className="chart-card card">
                    <div className="chart-header">
                      <span className="chart-title">ORDERS / DAY</span>
                      <span className="chart-sub">14 วันล่าสุด</span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="orders" name="ออเดอร์" fill="#3b82f6" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Order status pie */}
                  {statusPieData.length > 0 && (
                    <div className="chart-card card">
                      <div className="chart-header">
                        <span className="chart-title">ORDER STATUS</span>
                        <span className="chart-sub">สัดส่วนสถานะ</span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={statusPieData} cx="50%" cy="45%" innerRadius={48} outerRadius={72}
                            paddingAngle={3} dataKey="value" nameKey="name">
                            {statusPieData.map((entry, i) => (
                              <Cell key={i} fill={PIE_COLORS[entry.key] || '#666'} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Top products */}
                  {aiResult?.topProducts?.length > 0 && (
                    <div className="chart-card card">
                      <div className="chart-header">
                        <span className="chart-title">TOP PRODUCTS</span>
                        <span className="chart-sub">รายได้สูงสุด (฿)</span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={aiResult.topProducts} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                          <XAxis type="number" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="revenue" name="รายได้ ฿" fill="#8b5cf6" radius={[0,3,3,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══════════════════════════════ ORDERS ══════════════════════════════ */}
        {tab === 'orders' && (
          <div className="admin-section animate-in">
            {pendingStatus && (
              <div className="confirm-overlay" onClick={() => {
                setPendingSelectValues(prev => { const n = { ...prev }; delete n[pendingStatus.id]; return n; });
                setPendingStatus(null);
              }}>
                <div className="confirm-box card" onClick={e => e.stopPropagation()}>
                  <p className="fw-bold" style={{ marginBottom: 8 }}>ยืนยันเปลี่ยนสถานะ?</p>
                  <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
                    เปลี่ยนเป็น <strong>{STATUS_LABELS[pendingStatus.status]}</strong>
                  </p>
                  <div className="flex gap-8">
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      updateOrderStatus(pendingStatus.id, pendingStatus.status);
                      setPendingStatus(null);
                    }}>ยืนยัน</button>
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      setPendingSelectValues(prev => { const n = { ...prev }; delete n[pendingStatus.id]; return n; });
                      setPendingStatus(null);
                    }}>ยกเลิก</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <input className="input" placeholder="ค้นหา เลขออเดอร์ / ชื่อลูกค้า / เบอร์โทร..."
                value={orderSearch} onChange={e => setOrderSearch(e.target.value)} style={{ maxWidth: 360 }} />
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ORDER #</th><th>ลูกค้า</th><th>วันที่</th><th>ยอด</th><th>สลิป</th><th>สถานะ</th><th>อัปเดต</th>
                  </tr>
                </thead>
                <tbody>
                  {orders
                    .filter(o => !orderSearch || [o.order_number, o.customer_name, o.customer_phone].some(v => v?.toLowerCase().includes(orderSearch.toLowerCase())))
                    .map(o => (
                    <Fragment key={o.id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                        <td className="font-display fw-bold text-accent">{expandedOrder === o.id ? '▼' : '▶'} {o.order_number}</td>
                        <td>
                          <div style={{ fontSize: 13 }}>{o.customer_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.customer_phone}</div>
                        </td>
                        <td className="text-muted" style={{ fontSize: 12 }}>
                          {new Date(o.created_at).toLocaleDateString('th-TH')}
                        </td>
                        <td className="fw-bold">{o.total.toLocaleString()} ฿</td>
                        <td onClick={e => e.stopPropagation()}>
                          {o.slip_url
                            ? <a href={o.slip_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm text-accent">ดูสลิป ↗</a>
                            : <span className="text-dim" style={{ fontSize: 11 }}>—</span>}
                        </td>
                        <td><span className={`badge ${STATUS_CLASS[o.status] || 'badge-gray'}`}>{STATUS_LABELS[o.status] || o.status}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex gap-8" style={{ alignItems: 'center' }}>
                            <select className="input" style={{ width: 'auto', fontSize: 11, padding: '6px 10px' }}
                              value={pendingSelectValues[o.id] ?? o.status}
                              onChange={e => {
                                const newStatus = e.target.value;
                                setPendingSelectValues(prev => ({ ...prev, [o.id]: newStatus }));
                                setPendingStatus({ id: o.id, status: newStatus });
                              }}>
                              {ORDER_STATUSES.map(s => (<option key={s} value={s}>{STATUS_LABELS[s]}</option>))}
                            </select>
                            {o.status !== 'cancelled' && o.status !== 'delivered' && (
                              <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '4px 8px' }}
                                onClick={() => setPendingStatus({ id: o.id, status: 'cancelled' })}>✕</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedOrder === o.id && (
                        <tr>
                          <td colSpan={7} style={{ background: 'var(--bg-elevated)', padding: '12px 24px' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>รายการสินค้า:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {o.order_items?.map((item, i) => (
                                <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                                  <span className="fw-bold">{item.product_name}</span>
                                  <span className="text-muted"> · {item.size} × {item.quantity} · {(item.price * item.quantity).toLocaleString()} ฿</span>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                              ที่อยู่: {o.customer_address} | ชำระ: {o.payment_method === 'promptpay' ? 'PromptPay' : 'โอนธนาคาร'}
                              {o.discount_code && ` | โค้ด: ${o.discount_code}`}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ PRODUCTS ══════════════════════════════ */}
        {tab === 'products' && (
          <div className="admin-section animate-in">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>สินค้า</th><th>ราคา</th><th>Stock by Size</th><th>สถานะ</th></tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <Fragment key={p.id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => {
                        if (expandedProduct === p.id) { setExpandedProduct(null); return; }
                        setExpandedProduct(p.id);
                        const edits = {};
                        sortSizes(p.product_sizes).forEach(s => { edits[s.size] = { stock: s.stock, is_preorder: s.is_preorder }; });
                        setSizeEdits(edits);
                      }}>
                        <td className="font-display fw-bold" style={{ fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>{expandedProduct === p.id ? '▼' : '▶'}</span>
                            {IMGS[p.img_key] && <img src={IMGS[p.img_key]} alt={p.name} style={{ width: 36, height: 48, objectFit: 'cover', borderRadius: 4 }} />}
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td className="text-accent fw-bold">{p.price.toLocaleString()} ฿</td>
                        <td>
                          <div className="size-stock-list">
                            {sortSizes(p.product_sizes).map(s => (
                              <span key={s.size} className={`size-stock-badge${s.is_preorder ? ' pre' : s.stock === 0 ? ' zero' : ''}`}>
                                {s.size}: {s.is_preorder ? 'PRE' : s.stock}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <label className="toggle-wrap">
                            <input type="checkbox" checked={p.active}
                              onChange={e => {
                                const val = e.target.checked;
                                setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: val } : x));
                                adminApi.updateProduct(p.id, { active: val }).catch(err => {
                                  setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !val } : x));
                                  addToast(err.message || 'อัปเดตไม่สำเร็จ', 'error');
                                });
                              }} />
                            <span className="toggle" />
                            <span className="text-muted" style={{ fontSize: 12 }}>{p.active ? 'Active' : 'Hidden'}</span>
                          </label>
                        </td>
                      </tr>
                      {expandedProduct === p.id && (
                        <tr>
                          <td colSpan={4} style={{ background: 'var(--bg-elevated)', padding: '16px 24px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                              {sortSizes(p.product_sizes).map(s => (
                                <div key={s.size} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 16px', minWidth: 130 }}>
                                  <div className="font-display fw-bold" style={{ fontSize: 12, marginBottom: 10 }}>SIZE {s.size}</div>
                                  <div style={{ marginBottom: 8 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>STOCK</label>
                                    <input type="number" min="0" className="input" style={{ width: '80px', padding: '4px 8px', fontSize: 13 }}
                                      value={sizeEdits[s.size]?.stock ?? s.stock}
                                      onChange={e => setSizeEdits(prev => ({ ...prev, [s.size]: { ...prev[s.size], stock: parseInt(e.target.value) || 0 } }))} />
                                  </div>
                                  <label className="toggle-wrap" style={{ marginBottom: 10 }}>
                                    <input type="checkbox" checked={sizeEdits[s.size]?.is_preorder ?? s.is_preorder}
                                      onChange={e => setSizeEdits(prev => ({ ...prev, [s.size]: { ...prev[s.size], is_preorder: e.target.checked } }))} />
                                    <span className="toggle" />
                                    <span style={{ fontSize: 11 }}>Preorder</span>
                                  </label>
                                  <button className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: 11 }}
                                    onClick={() => adminApi.updateSize(p.id, s.size, sizeEdits[s.size])
                                      .then(() => {
                                        setProducts(prev => prev.map(x => x.id === p.id ? {
                                          ...x, product_sizes: x.product_sizes.map(z => z.size === s.size ? { ...z, ...sizeEdits[s.size] } : z)
                                        } : x));
                                        addToast(`บันทึก ${s.size} แล้ว`, 'success');
                                      }).catch(() => addToast('เกิดข้อผิดพลาด', 'error'))
                                    }>SAVE</button>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ REVIEWS ══════════════════════════════ */}
        {tab === 'reviews' && (
          <div className="admin-section animate-in">
            <div className="reviews-admin-list">
              {reviews.map(r => (
                <div key={r.id} className={`review-admin-card card${!r.approved ? ' pending' : ''}`}>
                  <div className="review-admin-header">
                    <div>
                      <span className="fw-bold" style={{ fontSize: 13 }}>{r.user_name}</span>
                      <span className="text-muted" style={{ fontSize: 11, marginLeft: 8 }}>{r.products?.name}</span>
                    </div>
                    <div className="flex gap-8">
                      <span className="stars" style={{ fontSize: 13 }}>{'★'.repeat(r.stars)}</span>
                      {!r.approved && <span className="badge badge-yellow">รออนุมัติ</span>}
                    </div>
                  </div>
                  <p className="text-muted" style={{ fontSize: 13, margin: '8px 0' }}>{r.body}</p>
                  <div className="flex gap-8">
                    <button className={`btn btn-sm ${r.approved ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleReview(r.id, !r.approved)}>
                      {r.approved ? 'HIDE' : 'APPROVE'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setPendingDelete({ type: 'review', id: r.id })}>DELETE</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════ DISCOUNTS ══════════════════════════════ */}
        {tab === 'discounts' && (
          <div className="admin-section animate-in">
            <div className="card new-discount-form">
              <h4 className="font-display mb-16" style={{ fontSize: 13, letterSpacing: '0.1em' }}>CREATE NEW CODE</h4>
              <div className="discount-form-row">
                <div className="input-group">
                  <label>CODE</label>
                  <input className="input" placeholder="SUMMER25" value={newDiscount.code}
                    onChange={e => setNewDiscount(d => ({ ...d, code: e.target.value.toUpperCase() }))} />
                </div>
                <div className="input-group">
                  <label>TYPE</label>
                  <select className="input" value={newDiscount.type}
                    onChange={e => setNewDiscount(d => ({ ...d, type: e.target.value }))}>
                    <option value="percent">Percent (%)</option>
                    <option value="baht">Baht (฿)</option>
                    <option value="freeship">Free Shipping</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>VALUE</label>
                  <input className="input" type="number" placeholder="10" value={newDiscount.value}
                    onChange={e => setNewDiscount(d => ({ ...d, value: Number(e.target.value) }))}
                    disabled={newDiscount.type === 'freeship'} />
                </div>
                <div className="input-group">
                  <label>MAX USES</label>
                  <input className="input" type="number" placeholder="∞" value={newDiscount.max_uses}
                    onChange={e => setNewDiscount(d => ({ ...d, max_uses: e.target.value }))} />
                </div>
                <button className="btn btn-primary" onClick={createDiscount} style={{ alignSelf: 'flex-end' }}>CREATE</button>
              </div>
            </div>

            <div className="admin-table-wrap mt-24">
              <table className="admin-table">
                <thead>
                  <tr><th>CODE</th><th>TYPE</th><th>VALUE</th><th>USED / MAX</th><th>STATUS</th><th></th></tr>
                </thead>
                <tbody>
                  {discounts.map(d => (
                    <tr key={d.id}>
                      <td className="font-display fw-bold">{d.code}</td>
                      <td className="text-muted">{d.type}</td>
                      <td>{d.type === 'percent' ? `${d.value}%` : d.type === 'freeship' ? 'Free Ship' : `${d.value} ฿`}</td>
                      <td className="text-muted">{d.used_count} / {d.max_uses ?? '∞'}</td>
                      <td>
                        <label className="toggle-wrap">
                          <input type="checkbox" checked={d.active} onChange={e => toggleDiscount(d.id, e.target.checked)} />
                          <span className="toggle" />
                          <span className={`badge ${d.active ? 'badge-green' : 'badge-gray'}`} style={{ marginLeft: 8 }}>
                            {d.active ? 'ACTIVE' : 'OFF'}
                          </span>
                        </label>
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '4px 10px' }}
                          onClick={() => setPendingDelete({ type: 'discount', id: d.id })}>DELETE</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ CUSTOMERS ══════════════════════════════ */}
        {tab === 'customers' && (
          <div className="admin-section animate-in">
            {/* Segment summary */}
            <div className="seg-summary-grid mb-24">
              {Object.entries(SEGMENT_META).map(([key, meta]) => (
                <button key={key}
                  className={`seg-summary-card card${customerSegFilter === key ? ' active' : ''}`}
                  onClick={() => setCustomerSegFilter(customerSegFilter === key ? 'all' : key)}
                  style={{ borderColor: customerSegFilter === key ? meta.color : undefined }}>
                  <span className="seg-summary-icon">{meta.icon}</span>
                  <span className="seg-summary-count" style={{ color: meta.color }}>{segCounts[key] || 0}</span>
                  <span className="seg-summary-label">{meta.label}</span>
                </button>
              ))}
              <button className={`seg-summary-card card${customerSegFilter === 'all' ? ' active' : ''}`}
                onClick={() => setCustomerSegFilter('all')}
                style={{ borderColor: customerSegFilter === 'all' ? 'var(--accent)' : undefined }}>
                <span className="seg-summary-icon">👤</span>
                <span className="seg-summary-count text-accent">{customers.length}</span>
                <span className="seg-summary-label">ทั้งหมด</span>
              </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <input className="input" placeholder="ค้นหา ชื่อ / อีเมล / เบอร์..."
                value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} style={{ maxWidth: 320 }} />
            </div>

            {/* Table */}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>ลูกค้า</th><th>SEGMENT</th><th>ออเดอร์</th><th>ยอดรวม</th><th>สั่งล่าสุด</th><th>ไม่ได้สั่ง (วัน)</th></tr>
                </thead>
                <tbody>
                  {(() => {
                    const segMap = {};
                    segmentedCustomers.forEach(s => { segMap[s.id] = s; });
                    return filteredCustomers.map(c => {
                      const seg = segMap[c.id] || c;
                      return (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name || '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                          </td>
                          <td><SegBadge segment={seg.segment || 'new'} /></td>
                          <td className="fw-bold">{seg.orderCount ?? c.order_count ?? 0}</td>
                          <td className="text-accent fw-bold">{(seg.totalSpent ?? c.total_spent ?? 0).toLocaleString()} ฿</td>
                          <td className="text-muted" style={{ fontSize: 12 }}>
                            {c.last_order ? new Date(c.last_order).toLocaleDateString('th-TH') : '—'}
                          </td>
                          <td>
                            {seg.daysSince === 9999 ? <span className="text-dim">—</span> :
                              <span style={{ color: seg.daysSince > 30 ? '#ff3b3b' : seg.daysSince > 14 ? '#f5c518' : '#2dff7a', fontWeight: 700 }}>
                                {seg.daysSince}
                              </span>}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ AI INSIGHTS ══════════════════════════════ */}
        {tab === 'ai' && (
          <div className="admin-section animate-in">
            {!aiResult ? (
              <div className="flex-center" style={{ minHeight: 200 }}>
                <button className="btn btn-primary" onClick={() => runAI()} disabled={aiRunning}>
                  {aiRunning ? '⏳ กำลังวิเคราะห์...' : '🤖 เริ่มวิเคราะห์'}
                </button>
              </div>
            ) : (
              <>
                {/* ── Top row: Health + Trend + Model stats ── */}
                <div className="ai-top-row mb-24">
                  {/* Health gauge */}
                  <div className="card ai-health-card">
                    <div className="chart-header">
                      <span className="chart-title">BUSINESS HEALTH</span>
                    </div>
                    <div className="flex-center">
                      <HealthGauge score={aiResult.healthScore} />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 11, color: '#555', marginTop: 4 }}>คะแนนสุขภาพธุรกิจ (0–100)</div>
                  </div>

                  {/* Trend */}
                  <div className="card ai-trend-card">
                    <div className="chart-header">
                      <span className="chart-title">WEEKLY TREND</span>
                    </div>
                    <div className="ai-trend-body">
                      <span className={`ai-trend-arrow ${aiResult.trend.dir}`}>
                        {aiResult.trend.dir === 'up' ? '▲' : aiResult.trend.dir === 'down' ? '▼' : '→'}
                      </span>
                      <span className={`ai-trend-pct ${aiResult.trend.dir}`}>
                        {aiResult.trend.pct > 0 ? '+' : ''}{aiResult.trend.pct}%
                      </span>
                      <span className="text-muted" style={{ fontSize: 11 }}>เทียบสัปดาห์ก่อน</span>
                    </div>
                  </div>

                  {/* Model stats */}
                  <div className="card ai-model-card">
                    <div className="chart-header">
                      <span className="chart-title">RL MODEL</span>
                    </div>
                    <div className="ai-model-stats">
                      <div className="ai-model-stat">
                        <span className="ai-model-key">Episodes</span>
                        <span className="ai-model-val">{aiResult.modelState.episodes}</span>
                      </div>
                      <div className="ai-model-stat">
                        <span className="ai-model-key">Avg MAPE</span>
                        <span className="ai-model-val">{aiResult.modelState.avg_mape != null ? `${aiResult.modelState.avg_mape}%` : 'N/A'}</span>
                      </div>
                      <div className="ai-model-stat">
                        <span className="ai-model-key">EMA α</span>
                        <span className="ai-model-val">{aiResult.config.ema_alpha.toFixed(3)}</span>
                      </div>
                      <div className="ai-model-stat">
                        <span className="ai-model-key">Last Run</span>
                        <span className="ai-model-val">{aiResult.modelState.last_run ? new Date(aiResult.modelState.last_run).toLocaleTimeString('th-TH') : '—'}</span>
                      </div>
                    </div>
                    <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 12, fontSize: 11 }} onClick={() => runAI()}>
                      {aiRunning ? '⏳' : '↻'} RE-ANALYZE
                    </button>
                  </div>
                </div>

                {/* ── Revenue forecast chart ── */}
                {aiResult.combined?.length > 0 && (
                  <div className="chart-card card mb-24">
                    <div className="chart-header">
                      <span className="chart-title">REVENUE FORECAST</span>
                      <span className="chart-sub">
                        ● จริง
                        <span style={{ color: '#8b5cf6', marginLeft: 12 }}>● พยากรณ์ {aiResult.config.forecast_days} วัน</span>
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={aiResult.combined.map(d => ({
                        date: d.date.slice(5),
                        actual:   !d.forecast ? d.revenue : undefined,
                        forecast: d.forecast  ? d.revenue : undefined,
                      }))} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="actual" name="รายได้จริง ฿" stroke="#2dff7a" strokeWidth={2} dot={false} connectNulls={false} />
                        <Line type="monotone" dataKey="forecast" name="พยากรณ์ ฿" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── Insights + Alerts ── */}
                <div className="ai-insights-alerts-row mb-24">
                  {/* Insights */}
                  <div>
                    <div className="chart-title mb-12">💡 INSIGHTS</div>
                    <div className="insight-list">
                      {aiResult.insights.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>ยังไม่มีข้อมูลเพียงพอสำหรับ insight</div>}
                      {aiResult.insights.map((ins, i) => (
                        <div key={i} className={`insight-card card insight-${ins.type}`}>
                          <div className="insight-icon">{ins.icon}</div>
                          <div>
                            <div className="insight-title">{ins.title}</div>
                            <div className="insight-body">{ins.body}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alerts */}
                  <div>
                    <div className="chart-title mb-12">🚨 ALERTS</div>
                    <div className="alert-list">
                      {aiResult.alerts.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>ไม่มี alert — ทุกอย่างปกติดี 👍</div>}
                      {aiResult.alerts.map((a, i) => (
                        <div key={i} className={`alert-item alert-${a.level}`}>
                          <span className="alert-dot" />
                          <span>{a.msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── AI Config panel ── */}
                <div className="card ai-config-card">
                  <button className="ai-config-toggle" onClick={() => setAiConfigOpen(v => !v)}>
                    <span className="chart-title">⚙️ AI CONFIG &amp; PARAMETERS</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>{aiConfigOpen ? '▲ ซ่อน' : '▼ แสดง'}</span>
                  </button>

                  {aiConfigOpen && (
                    <div className="ai-config-body">
                      <div className="ai-config-section">
                        <div className="ai-config-section-title">📈 FORECASTING</div>
                        <div className="ai-config-grid">
                          <ConfigField label="EMA Alpha" hint="0.1–0.9 (RL auto-tunes)" min={0.1} max={0.9} step={0.01}
                            value={aiConfig.ema_alpha} onChange={v => setAiConfig(c => ({ ...c, ema_alpha: v }))} />
                          <ConfigField label="Seasonality Weight" hint="ผล day-of-week" min={0} max={1} step={0.05}
                            value={aiConfig.seasonality_weight} onChange={v => setAiConfig(c => ({ ...c, seasonality_weight: v }))} />
                          <ConfigField label="Forecast Days" hint="วันที่พยากรณ์ล่วงหน้า" min={1} max={30} step={1} integer
                            value={aiConfig.forecast_days} onChange={v => setAiConfig(c => ({ ...c, forecast_days: v }))} />
                        </div>
                      </div>

                      <div className="ai-config-section">
                        <div className="ai-config-section-title">👥 SEGMENTATION</div>
                        <div className="ai-config-grid">
                          <ConfigField label="VIP Min Orders" hint="จำนวนออเดอร์ขั้นต่ำ VIP" min={1} max={20} step={1} integer
                            value={aiConfig.vip_orders} onChange={v => setAiConfig(c => ({ ...c, vip_orders: v }))} />
                          <ConfigField label="VIP Min Spend (฿)" hint="ยอดสะสมขั้นต่ำ VIP" min={100} max={50000} step={100} integer
                            value={aiConfig.vip_spend} onChange={v => setAiConfig(c => ({ ...c, vip_spend: v }))} />
                          <ConfigField label="At-Risk Days" hint="วันที่ไม่ได้สั่ง → At Risk" min={7} max={180} step={1} integer
                            value={aiConfig.at_risk_days} onChange={v => setAiConfig(c => ({ ...c, at_risk_days: v }))} />
                        </div>
                      </div>

                      <div className="ai-config-section">
                        <div className="ai-config-section-title">🎯 BUSINESS TARGETS</div>
                        <div className="ai-config-grid">
                          <ConfigField label="Growth Target" hint="เป้ายอดขายรายสัปดาห์" min={0} max={2} step={0.01}
                            value={aiConfig.growth_target} onChange={v => setAiConfig(c => ({ ...c, growth_target: v }))} />
                          <ConfigField label="Restock Alert" hint="แจ้งเตือนเมื่อ stock ≤" min={0} max={20} step={1} integer
                            value={aiConfig.restock_alert} onChange={v => setAiConfig(c => ({ ...c, restock_alert: v }))} />
                        </div>
                      </div>

                      <div className="ai-config-section">
                        <div className="ai-config-section-title">🧠 RL HYPERPARAMETERS</div>
                        <div className="ai-config-grid">
                          <ConfigField label="Learning Rate" hint="ขนาด weight update" min={0.001} max={0.5} step={0.001}
                            value={aiConfig.learning_rate} onChange={v => setAiConfig(c => ({ ...c, learning_rate: v }))} />
                          <ConfigField label="Exploration (ε)" hint="สัดส่วน random explore" min={0} max={0.5} step={0.01}
                            value={aiConfig.exploration} onChange={v => setAiConfig(c => ({ ...c, exploration: v }))} />
                        </div>
                      </div>

                      <div className="flex gap-12 mt-16">
                        <button className="btn btn-primary" onClick={saveAiConfig}>💾 SAVE &amp; RE-ANALYZE</button>
                        <button className="btn btn-outline" onClick={resetAiConfig}>🔄 RESET MODEL</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Config field component ─────────────────────────────────────────────────────
function ConfigField({ label, hint, min, max, step, value, onChange, integer }) {
  const display = integer ? Math.round(value) : value;
  return (
    <div className="config-field">
      <div className="config-field-header">
        <span className="config-field-label">{label}</span>
        <span className="config-field-val">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(integer ? parseInt(e.target.value) : parseFloat(e.target.value))}
        className="config-slider" />
      <div className="config-field-hint">{hint}</div>
    </div>
  );
}
