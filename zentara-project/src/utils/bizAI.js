/**
 * ZENTARA Business Intelligence AI
 * ─────────────────────────────────────────────────────────────────────────────
 * A lightweight BI engine with online reinforcement learning.
 *
 * Architecture:
 *   State  : model weights (EMA alpha, seasonality bias, segment thresholds)
 *   Actions: produce forecasts, insights, segment labels, alerts
 *   Reward : -MAPE (mean absolute percentage error) of revenue forecast
 *   Update : gradient-free EMA weight adjustment (ε-greedy exploration)
 *
 * Persistence: localStorage key "zentara_ai_v2"
 */

const STORAGE_KEY = 'zentara_ai_v2';

// ── Default hyperparameters ─────────────────────────────────────────────────
export const DEFAULT_CONFIG = {
  // Forecasting
  ema_alpha:          0.35,   // EMA smoothing factor (0.1 = smooth, 0.9 = reactive)
  seasonality_weight: 0.25,   // Day-of-week seasonality importance
  forecast_days:      7,      // How many days to forecast ahead

  // Customer segmentation
  vip_orders:         3,      // Min orders to be classified VIP
  vip_spend:          2000,   // Min total spend (THB) for VIP
  at_risk_days:       30,     // Days inactive → "At Risk"

  // Business targets
  growth_target:      0.10,   // 10% weekly revenue growth target
  restock_alert:      3,      // Alert when stock ≤ this value

  // RL hyperparameters
  learning_rate:      0.05,   // Weight update step size
  exploration:        0.08,   // ε-greedy exploration rate
  max_episodes:       200,    // Cap episodes before reset
};

// ── Customer segment metadata ───────────────────────────────────────────────
export const SEGMENT_META = {
  vip:      { label: 'VIP',      color: '#2dff7a', icon: '⭐' },
  loyal:    { label: 'Loyal',    color: '#3b82f6', icon: '💙' },
  new:      { label: 'New',      color: '#a78bfa', icon: '🆕' },
  at_risk:  { label: 'At Risk',  color: '#f59e0b', icon: '⚠️' },
  inactive: { label: 'Inactive', color: '#666',    icon: '💤' },
};

// ────────────────────────────────────────────────────────────────────────────

class ZentaraAI {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.state = {
      episodes:        0,
      predictions:     [],   // { date, predicted, actual?, mape? }
      accuracy_history:[],   // { episode, mape }
      last_run:        null,
      avg_mape:        null,
    };
    this._load();
  }

  // ── Persistence ────────────────────────────────────────────────────────
  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { config, state } = JSON.parse(raw);
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.state  = { ...this.state, ...state };
    } catch { /* ignore corrupt data */ }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      config: this.config,
      state:  this.state,
    }));
  }

  reset() {
    this.config = { ...DEFAULT_CONFIG };
    this.state  = { episodes: 0, predictions: [], accuracy_history: [], last_run: null, avg_mape: null };
    localStorage.removeItem(STORAGE_KEY);
  }

  updateConfig(patch) {
    this.config = { ...this.config, ...patch };
    this._save();
  }

  // ── Main analysis entry point ───────────────────────────────────────────
  analyze(orders, products, customers) {
    const activeOrders = orders.filter(o => o.status !== 'cancelled');

    const revenueByDay  = this._groupByDay(activeOrders, 30);
    const forecast      = this._forecast(revenueByDay);
    const segments      = this._segmentCustomers(customers, orders);
    const productPerf   = this._productPerformance(orders);
    const insights      = this._generateInsights(orders, revenueByDay, segments);
    const alerts        = this._generateAlerts(orders, products, revenueByDay);
    const healthScore   = this._calcHealthScore(orders, segments, alerts);
    const trend         = this._detectTrend(revenueByDay);
    const topProducts   = [...productPerf].slice(0, 5);

    // RL update
    this._reinforceUpdate(revenueByDay, forecast);

    this.state.last_run = new Date().toISOString();
    this.state.episodes = Math.min(this.state.episodes + 1, this.config.max_episodes);
    this._save();

    return {
      revenueByDay,
      forecast,
      combined: [
        ...revenueByDay.slice(-14),
        ...forecast,
      ],
      segments,
      productPerf,
      topProducts,
      insights,
      alerts,
      healthScore,
      trend,
      config:     this.config,
      modelState: {
        episodes:        this.state.episodes,
        avg_mape:        this.state.avg_mape,
        last_run:        this.state.last_run,
        accuracy_history: this.state.accuracy_history.slice(-10),
      },
    };
  }

  // ── Revenue grouping by day ────────────────────────────────────────────
  _groupByDay(orders, days = 30) {
    const map = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map[key] = { date: key, revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const key = o.created_at?.split('T')[0];
      if (key && map[key]) {
        map[key].revenue += o.total;
        map[key].orders++;
      }
    });
    return Object.values(map);
  }

  // ── EMA + trend + seasonality forecasting ─────────────────────────────
  _forecast(series) {
    const alpha  = this.config.ema_alpha;
    const days   = this.config.forecast_days;
    const values = series.map(d => d.revenue);
    if (!values.length) return [];

    // EMA
    let ema = values[0];
    for (const v of values) ema = alpha * v + (1 - alpha) * ema;

    // Linear slope (last 7 days)
    const recent = values.slice(-7);
    const n      = recent.length;
    const meanX  = (n - 1) / 2;
    const meanY  = recent.reduce((s, v) => s + v, 0) / n;
    let   num = 0, den = 0;
    recent.forEach((v, i) => { num += (i - meanX) * (v - meanY); den += (i - meanX) ** 2; });
    const slope = den > 0 ? num / den : 0;

    // Day-of-week seasonality index
    const dowSums   = new Array(7).fill(0);
    const dowCounts = new Array(7).fill(0);
    series.forEach(d => {
      const dow = new Date(d.date).getDay();
      dowSums[dow]   += d.revenue;
      dowCounts[dow] += 1;
    });
    const globalAvg = meanY || 1;
    const seasonal  = dowSums.map((s, i) => dowCounts[i] ? (s / dowCounts[i]) / globalAvg : 1);

    const lastDate = new Date(series[series.length - 1].date);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i + 1);
      const dow  = d.getDay();
      const sw   = this.config.seasonality_weight;
      const base = Math.max(0, ema + slope * (i + 1));
      const pred = Math.round(base * (1 - sw + sw * (seasonal[dow] || 1)));
      return { date: d.toISOString().split('T')[0], revenue: pred, forecast: true };
    });
  }

  // ── RFM-lite customer segmentation ────────────────────────────────────
  _segmentCustomers(customers, orders) {
    const now = Date.now();
    return (customers || []).map(c => {
      const cOrders = orders.filter(o => o.user_id === c.id && o.status !== 'cancelled');
      const totalSpent  = cOrders.reduce((s, o) => s + o.total, 0);
      const orderCount  = cOrders.length;
      const lastTs      = cOrders.length
        ? Math.max(...cOrders.map(o => new Date(o.created_at).getTime()))
        : 0;
      const daysSince   = lastTs ? Math.floor((now - lastTs) / 86400000) : 9999;

      let segment;
      if (orderCount === 0)                                                    segment = 'inactive';
      else if (orderCount >= this.config.vip_orders && totalSpent >= this.config.vip_spend) segment = 'vip';
      else if (daysSince > this.config.at_risk_days && orderCount >= 1)       segment = 'at_risk';
      else if (orderCount >= 2)                                                segment = 'loyal';
      else                                                                     segment = 'new';

      return { ...c, orderCount, totalSpent, daysSince, segment };
    });
  }

  // ── Product performance matrix ─────────────────────────────────────────
  _productPerformance(orders) {
    const map = {};
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      (o.order_items || []).forEach(item => {
        if (!map[item.product_id]) {
          map[item.product_id] = {
            id: item.product_id, name: item.product_name,
            units: 0, revenue: 0,
          };
        }
        map[item.product_id].units   += item.quantity;
        map[item.product_id].revenue += item.price * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }

  // ── Trend detection ───────────────────────────────────────────────────
  _detectTrend(series) {
    const recent = series.slice(-7).reduce((s, d) => s + d.revenue, 0);
    const prev   = series.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
    if (!prev) return { dir: 'neutral', pct: 0 };
    const pct = (recent - prev) / prev;
    return {
      dir: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'neutral',
      pct: Math.round(pct * 100),
    };
  }

  // ── Business insights generation ──────────────────────────────────────
  _generateInsights(orders, revenueByDay, segments) {
    const insights = [];
    const trend    = this._detectTrend(revenueByDay);

    if (trend.dir === 'up') {
      insights.push({ type: 'positive', icon: '📈', title: 'ยอดขายเติบโต',
        body: `รายได้ 7 วันล่าสุดเพิ่มขึ้น ${trend.pct}% เทียบกับสัปดาห์ก่อน — กำลังดี!` });
    } else if (trend.dir === 'down') {
      insights.push({ type: 'warning', icon: '📉', title: 'ยอดขายลดลง',
        body: `รายได้ 7 วันล่าสุดลดลง ${Math.abs(trend.pct)}% ควรกระตุ้นด้วยโปรโมชั่นหรือ content` });
    }

    const vipCount    = segments.filter(s => s.segment === 'vip').length;
    const atRiskCount = segments.filter(s => s.segment === 'at_risk').length;
    const total       = segments.length;

    if (vipCount > 0) {
      insights.push({ type: 'positive', icon: '👑', title: `VIP ${vipCount} คน`,
        body: `${((vipCount / Math.max(1, total)) * 100).toFixed(0)}% ของลูกค้าเป็น VIP — รักษาความสัมพันธ์ด้วย exclusive offers` });
    }
    if (atRiskCount > 0) {
      insights.push({ type: 'warning', icon: '⚠️', title: `${atRiskCount} คนเสี่ยงหาย`,
        body: `ไม่ได้สั่งซื้อนานกว่า ${this.config.at_risk_days} วัน — ส่ง retargeting campaign ทันที` });
    }

    const today  = new Date().toISOString().split('T')[0];
    const todayD = revenueByDay.find(d => d.date === today);
    const peak   = [...revenueByDay].sort((a, b) => b.revenue - a.revenue)[0];
    if (peak && peak.revenue > 0) {
      const dow = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][new Date(peak.date).getDay()];
      insights.push({ type: 'info', icon: '🏆', title: 'วันขายดีสุด',
        body: `${peak.date} (${dow}) ยอด ${peak.revenue.toLocaleString()} ฿ — วิเคราะห์ว่าอะไรทำให้วันนั้นขายดี` });
    }

    const cancelRate = orders.filter(o => o.status === 'cancelled').length / Math.max(1, orders.length);
    if (cancelRate > 0.15) {
      insights.push({ type: 'warning', icon: '🚫', title: `Cancel Rate ${(cancelRate * 100).toFixed(0)}%`,
        body: 'มีออเดอร์ถูกยกเลิกสูง — ตรวจสอบปัญหาการชำระเงินหรือ stock' });
    }

    return insights;
  }

  // ── Alert generation ──────────────────────────────────────────────────
  _generateAlerts(orders, products, revenueByDay) {
    const alerts = [];

    // Low stock
    (products || []).forEach(p => {
      (p.product_sizes || []).forEach(s => {
        if (!s.is_preorder && s.stock <= this.config.restock_alert) {
          alerts.push({
            level: s.stock === 0 ? 'danger' : 'warning',
            msg:   `${p.name} SIZE ${s.size} — เหลือ ${s.stock} ชิ้น${s.stock === 0 ? ' (หมด)' : ''}`,
          });
        }
      });
    });

    // Pending payment
    const pending = orders.filter(o => o.status === 'pending_payment').length;
    if (pending > 0) alerts.push({ level: 'warning', msg: `มีออเดอร์รอชำระเงิน ${pending} รายการ` });

    // No sales today
    const todayKey  = new Date().toISOString().split('T')[0];
    const todayData = revenueByDay.find(d => d.date === todayKey);
    if (!todayData || todayData.orders === 0) {
      alerts.push({ level: 'info', msg: 'ยังไม่มียอดขายวันนี้ — พิจารณาโพสต์ content หรือส่งโปรโมชั่น' });
    }

    return alerts;
  }

  // ── Business health score (0–100) ─────────────────────────────────────
  _calcHealthScore(orders, segments, alerts) {
    let score = 50;
    const now = Date.now();

    const active  = orders.filter(o => o.status !== 'cancelled');
    const week1   = active.filter(o => now - new Date(o.created_at) < 7 * 86400000);
    const week2   = active.filter(o => {
      const age = now - new Date(o.created_at);
      return age >= 7 * 86400000 && age < 14 * 86400000;
    });
    const r1 = week1.reduce((s, o) => s + o.total, 0);
    const r2 = week2.reduce((s, o) => s + o.total, 0);

    if (r2 > 0) score += Math.max(-20, Math.min(20, ((r1 - r2) / r2) * 80));
    else if (r1 > 0) score += 10;

    const total     = Math.max(1, segments.length);
    const vipRatio  = segments.filter(s => s.segment === 'vip').length    / total;
    const loyalRatio= segments.filter(s => s.segment === 'loyal').length  / total;
    score += vipRatio * 12 + loyalRatio * 8;

    score -= alerts.filter(a => a.level === 'danger').length  * 10;
    score -= alerts.filter(a => a.level === 'warning').length *  4;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ── Reinforcement update (ε-greedy EMA alpha adjustment) ──────────────
  _reinforceUpdate(revenueByDay, newForecast) {
    const todayKey = new Date().toISOString().split('T')[0];

    // Score past predictions
    let totalMAPE = 0, count = 0;
    this.state.predictions = this.state.predictions.map(pred => {
      if (pred.date < todayKey && pred.actual == null) {
        const actual = revenueByDay.find(d => d.date === pred.date);
        if (actual) {
          const mape = actual.revenue > 0
            ? Math.abs(pred.predicted - actual.revenue) / actual.revenue
            : pred.predicted > 0 ? 1 : 0;
          totalMAPE += mape;
          count++;
          return { ...pred, actual: actual.revenue, mape };
        }
      }
      return pred;
    });

    if (count > 0) {
      const avgMAPE = totalMAPE / count;
      this.state.avg_mape = Math.round(avgMAPE * 100);
      this.state.accuracy_history.push({ ep: this.state.episodes, mape: avgMAPE });

      // ε-greedy: explore or exploit
      const lr = this.config.learning_rate;
      if (Math.random() < this.config.exploration) {
        // Explore: random small perturbation
        this.config.ema_alpha = Math.max(0.1, Math.min(0.9,
          this.config.ema_alpha + (Math.random() - 0.5) * 0.1
        ));
      } else {
        // Exploit: gradient step based on error direction
        if (avgMAPE > 0.25) {
          this.config.ema_alpha = Math.min(0.8, this.config.ema_alpha + lr);
        } else if (avgMAPE < 0.08) {
          this.config.ema_alpha = Math.max(0.15, this.config.ema_alpha - lr * 0.5);
        }
      }
    }

    // Store next 7-day predictions (only new dates)
    newForecast.forEach(f => {
      if (!this.state.predictions.find(p => p.date === f.date)) {
        this.state.predictions.push({ date: f.date, predicted: f.revenue });
      }
    });

    // Trim to last 60 predictions + 10 accuracy history entries
    this.state.predictions     = this.state.predictions.slice(-60);
    this.state.accuracy_history= this.state.accuracy_history.slice(-20);
  }
}

// Singleton instance
export const zentaraAI = new ZentaraAI();
