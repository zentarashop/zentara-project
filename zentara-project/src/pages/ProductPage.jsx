import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { IMGS } from '../assets/images';
import './ProductPage.css';

const SIZE_CHART = {
  luv_size: {
    cols: ['M','L','XL','2XL'],
    rows: { 'รอบอก (นิ้ว)': [40,44,48,52], 'ความยาวตัว (นิ้ว)': [29,30,31,32] },
    fabric: 'Cotton Comb 20',
  },
  angle_size: {
    cols: ['M','L','XL','2XL'],
    rows: { 'รอบอก (นิ้ว)': [40,44,48,52], 'ความยาวตัว (นิ้ว)': [29,30,31,32] },
    fabric: 'Cotton Comb 20',
  },
  tshirt_size: {
    cols: ['M','L','XL','2XL'],
    rows: { 'รอบอก (นิ้ว)': [40,44,48,52], 'ความยาวตัว (นิ้ว)': [29,30,31,32] },
    fabric: 'Cotton Comb 20',
  },
  lunar_size: {
    cols: ['S','M','L','XL','2XL'],
    rows: { 'รอบอก (นิ้ว)': [42,44,46,48,52], 'ความยาวตัว (นิ้ว)': [28,29,30,31,32] },
    fabric: 'Cotton 24 Comb USA',
  },
  fake_size: {
    cols: ['M','L','XL','2XL'],
    rows: { 'รอบอก (นิ้ว)': [44,46,48,52], 'ความยาวตัว (นิ้ว)': [29,30,31,32] },
    fabric: 'Cotton 24 Comb USA',
  },
  hoodie_size: {
    cols: ['S','M','L','XL','2XL','3XL'],
    rows: { 'กว้าง (นิ้ว)': [38,42,46,50,54,58], 'ยาว (นิ้ว)': [26,27,28,29,30,31] },
    fabric: 'French Terry 360gsm',
  },
};

const STARS = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function ProductPage() {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { addItem }   = useCart();
  const { addToast }  = useToast();
  const { user }      = useAuth();

  const [product, setProduct]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [selSize, setSelSize]     = useState(null);
  const [qty, setQty]             = useState(1);
  const [showChart, setShowChart] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    setLoading(true);
    productsApi.getOne(id)
      .then(p => { setProduct(p); setSelSize(null); setQty(1); })
      .catch(() => navigate('/shop'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="page flex-center" style={{ minHeight: '80vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (!product) return null;

  const sizeMap    = {};
  product.product_sizes?.forEach(s => { sizeMap[s.size] = s; });
  const selSizeObj = selSize ? sizeMap[selSize] : null;
  const maxQty     = selSizeObj?.is_preorder ? 5 : (selSizeObj?.stock || 0);
  const chart      = SIZE_CHART[product.size_chart_key] || SIZE_CHART.tshirt_size;
  const avgRating  = product.reviews?.length
    ? (product.reviews.reduce((s, r) => s + r.stars, 0) / product.reviews.length).toFixed(1)
    : null;

  const handleAdd = () => {
    if (!selSize) { addToast('กรุณาเลือกไซส์', 'error'); return; }
    if (!selSizeObj?.is_preorder && selSizeObj?.stock <= 0) { addToast('ไซส์นี้หมด', 'error'); return; }
    addItem(product, selSize, qty);
    addToast(`เพิ่ม ${product.name} × ${qty} ลงตะกร้าแล้ว`, 'success');
  };

  const handleBuyNow = () => {
    if (!selSize) { addToast('กรุณาเลือกไซส์', 'error'); return; }
    addItem(product, selSize, qty);
    navigate('/cart');
  };

  return (
    <div className="page product-page">
      <div className="container">
        <button className="btn btn-ghost btn-sm mb-24 gap-8" onClick={() => navigate(-1)}>
          ← BACK
        </button>

        <div className="product-layout">
          {/* Image */}
          <div className="product-img-wrap animate-in">
            <img
              src={IMGS[product.img_key] || IMGS.logo}
              alt={product.name}
              className="product-img"
            />
            <div className="product-img-tag font-display">
              {product.tag}
            </div>
          </div>

          {/* Info */}
          <div className="product-info animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="product-meta">
              <span className="section-label">{product.collection}</span>
              {avgRating && (
                <span className="product-rating">
                  <span className="stars">{STARS(Math.round(Number(avgRating)))}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    {avgRating} ({product.reviews.length})
                  </span>
                </span>
              )}
            </div>

            <h1 className="product-name font-display">{product.name}</h1>
            <p className="product-price font-display">{product.price.toLocaleString()} THB</p>

            {/* Size select */}
            <div className="product-sizes-section">
              <div className="flex-between mb-8">
                <span className="input-group-label">SIZE</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowChart(v => !v)}
                  style={{ fontSize: 10, letterSpacing: '0.1em', padding: '4px 8px' }}
                >
                  SIZE GUIDE ↗
                </button>
              </div>

              <div className="size-grid">
                {product.product_sizes?.map(s => {
                  const unavailable = !s.is_preorder && s.stock <= 0;
                  return (
                    <button
                      key={s.size}
                      className={`size-btn${selSize === s.size ? ' active' : ''}${unavailable ? ' soldout' : ''}${s.is_preorder ? ' preorder' : ''}`}
                      onClick={() => { if (!unavailable) { setSelSize(s.size); setQty(1); } }}
                      disabled={unavailable}
                      title={s.is_preorder ? 'Pre-Order' : unavailable ? 'Sold Out' : `Stock: ${s.stock}`}
                    >
                      {s.size}
                      {s.is_preorder && <span className="size-badge">PRE</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size chart modal */}
            {showChart && (
              <div className="size-chart-box animate-in">
                <div className="flex-between mb-16">
                  <span className="text-upper fw-bold" style={{ fontSize: 11 }}>SIZE CHART — {chart.fabric}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowChart(false)}>✕</button>
                </div>
                <div className="size-chart-img-wrap">
                  <img src={IMGS[product.size_chart_key]} alt="Size Chart" className="size-chart-img" />
                </div>
                <table className="size-table">
                  <thead>
                    <tr>
                      <th>SIZE</th>
                      {chart.cols.map(c => <th key={c}>{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(chart.rows).map(([label, vals]) => (
                      <tr key={label}>
                        <td className="text-muted" style={{ fontSize: 11 }}>{label}</td>
                        {vals.map((v, i) => <td key={i}>{v}"</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Qty */}
            <div className="product-qty-section">
              <span className="input-group-label">QTY</span>
              <div className="qty-control">
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
                <span className="qty-value">{qty}</span>
                <button className="qty-btn" onClick={() => setQty(q => Math.min(maxQty || 10, q + 1))} disabled={qty >= (maxQty || 10)}>+</button>
              </div>
              {selSizeObj?.is_preorder && (
                <span className="badge badge-yellow ml-auto" style={{ marginLeft: 'auto' }}>PRE-ORDER</span>
              )}
            </div>

            {/* CTA */}
            <div className="product-cta">
              <button className="btn btn-primary btn-lg btn-full" onClick={handleAdd}>
                ADD TO CART
              </button>
              <button className="btn btn-outline btn-lg btn-full" onClick={handleBuyNow}>
                BUY NOW
              </button>
            </div>

            {/* Tabs */}
            <div className="product-tabs">
              <div className="tab-headers">
                {['details', 'fabric', 'shipping'].map(t => (
                  <button
                    key={t}
                    className={`tab-header${activeTab === t ? ' active' : ''}`}
                    onClick={() => setActiveTab(t)}
                  >
                    {t === 'details' ? 'DETAILS' : t === 'fabric' ? 'FABRIC' : 'SHIPPING'}
                  </button>
                ))}
              </div>
              <div className="tab-body">
                {activeTab === 'details' && (
                  <p className="text-muted" style={{ lineHeight: 1.8 }}>{product.description}</p>
                )}
                {activeTab === 'fabric' && (
                  <p className="text-muted" style={{ lineHeight: 1.8 }}>
                    วัสดุ: {product.fabric}<br />
                    แนะนำ: ซักมือหรือซักเย็น แขวนตาก ไม่ซักร้อน
                  </p>
                )}
                {activeTab === 'shipping' && (
                  <p className="text-muted" style={{ lineHeight: 1.8 }}>
                    จัดส่งทั่วประเทศ ค่าส่ง 50 บาท<br />
                    ระยะเวลา: 3-7 วันทำการ<br />
                    Pre-order รอ 2-3 สัปดาห์
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {product.reviews?.length > 0 && (
          <div className="reviews-section mt-48">
            <div className="section-header mb-24">
              <span className="section-label">COMMUNITY</span>
              <h2 className="section-title" style={{ fontSize: 28 }}>
                REVIEWS ({product.reviews.length})
              </h2>
            </div>
            <div className="reviews-grid">
              {product.reviews.map(r => (
                <div key={r.id} className="review-card card">
                  <div className="review-header">
                    <div>
                      <p className="review-user fw-bold">{r.user_name}</p>
                      {r.verified && (
                        <span className="badge badge-green" style={{ fontSize: 9, padding: '2px 7px' }}>✓ VERIFIED</span>
                      )}
                    </div>
                    <span className="stars" style={{ fontSize: 14 }}>{STARS(r.stars)}</span>
                  </div>
                  <p className="review-body text-muted">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
