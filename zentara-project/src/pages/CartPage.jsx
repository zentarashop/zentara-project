import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { discountsApi } from '../services/api';
import { IMGS } from '../assets/images';
import './CartPage.css';

const SHIP_FEE = 50;

export default function CartPage() {
  const navigate     = useNavigate();
  const { items, removeItem, updateQty, subtotal } = useCart();
  const { addToast } = useToast();

  const [code, setCode]         = useState('');
  const [discount, setDiscount] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');

  const shipping = discount?.type === 'freeship' ? 0 : SHIP_FEE;
  let discountAmt = 0;
  if (discount?.type === 'percent') discountAmt = Math.round(subtotal * discount.value / 100);
  if (discount?.type === 'baht')    discountAmt = Math.min(discount.value, subtotal);
  const total = subtotal - discountAmt + shipping;

  const applyCode = async () => {
    if (!code.trim()) return;
    setCodeLoading(true);
    setCodeError('');
    try {
      const data = await discountsApi.verify(code);
      setDiscount(data);
      addToast(`ใช้โค้ด ${data.code} แล้ว!`, 'success');
    } catch (e) {
      setCodeError(e.message);
      setDiscount(null);
    } finally {
      setCodeLoading(false);
    }
  };

  if (items.length === 0) return (
    <div className="page flex-center" style={{ flexDirection: 'column', gap: 24, minHeight: '80vh' }}>
      <p className="font-display fw-black text-center" style={{ fontSize: 32 }}>CART EMPTY</p>
      <p className="text-muted">ยังไม่มีสินค้าในตะกร้า</p>
      <button className="btn btn-primary" onClick={() => navigate('/shop')}>SHOP NOW</button>
    </div>
  );

  return (
    <div className="page cart-page">
      <div className="container">
        <div className="cart-header animate-in">
          <span className="section-label">YOUR ORDER</span>
          <h1 className="section-title">CART ({items.length})</h1>
        </div>

        <div className="cart-layout">
          {/* Items */}
          <div className="cart-items">
            {items.map(item => (
              <div key={`${item.product_id}-${item.size}`} className="cart-item animate-in">
                <div className="cart-item-img-wrap">
                  <img
                    src={IMGS[item.img_key] || IMGS.logo}
                    alt={item.name}
                    className="cart-item-img"
                  />
                </div>

                <div className="cart-item-info">
                  <div className="cart-item-header">
                    <div>
                      <p className="cart-item-name font-display">{item.name}</p>
                      <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>SIZE: {item.size}</p>
                    </div>
                    <button
                      className="cart-item-remove"
                      onClick={() => removeItem(item.product_id, item.size)}
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="cart-item-footer">
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => updateQty(item.product_id, item.size, item.qty - 1)} disabled={item.qty <= 1}>−</button>
                      <span className="qty-value">{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.product_id, item.size, item.qty + 1)} disabled={item.qty >= 10}>+</button>
                    </div>
                    <span className="cart-item-price font-display">
                      {(item.price * item.qty).toLocaleString()} THB
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="cart-summary-wrap">
            <div className="cart-summary card animate-in" style={{ animationDelay: '0.1s' }}>
              <h3 className="font-display mb-24" style={{ fontSize: 14, letterSpacing: '0.1em' }}>ORDER SUMMARY</h3>

              {/* Discount code */}
              <div className="discount-section mb-16">
                <label className="input-group-label">DISCOUNT CODE</label>
                <div className="discount-input-row">
                  <input
                    className={`input${codeError ? ' error' : ''}`}
                    placeholder="WELCOME10"
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError(''); }}
                    onKeyDown={e => e.key === 'Enter' && applyCode()}
                    disabled={!!discount}
                  />
                  {discount ? (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => { setDiscount(null); setCode(''); }}
                    >REMOVE</button>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={applyCode} disabled={codeLoading}>
                      {codeLoading ? <span className="spinner" /> : 'APPLY'}
                    </button>
                  )}
                </div>
                {codeError && <p className="text-red mt-4" style={{ fontSize: 12 }}>{codeError}</p>}
                {discount && (
                  <p className="text-accent mt-4" style={{ fontSize: 12 }}>
                    ✓ {discount.code} — {discount.type === 'percent' ? `${discount.value}% off` : discount.type === 'freeship' ? 'Free shipping' : `${discount.value} THB off`}
                  </p>
                )}
              </div>

              <div className="divider" />

              {/* Price breakdown */}
              <div className="summary-lines">
                <div className="summary-line">
                  <span className="text-muted">Subtotal</span>
                  <span>{subtotal.toLocaleString()} THB</span>
                </div>
                {discountAmt > 0 && (
                  <div className="summary-line">
                    <span className="text-muted">Discount</span>
                    <span className="text-accent">−{discountAmt.toLocaleString()} THB</span>
                  </div>
                )}
                <div className="summary-line">
                  <span className="text-muted">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-accent">FREE</span> : `${shipping} THB`}</span>
                </div>
              </div>

              <div className="divider" />

              <div className="summary-total">
                <span className="font-display fw-bold text-upper" style={{ fontSize: 12, letterSpacing: '0.1em' }}>Total</span>
                <span className="font-display text-accent" style={{ fontSize: 22, fontWeight: 900 }}>
                  {total.toLocaleString()} THB
                </span>
              </div>

              <button
                className="btn btn-primary btn-lg btn-full mt-24"
                onClick={() => navigate('/checkout', { state: { discount, shipping, discountAmt, total } })}
              >
                CHECKOUT →
              </button>

              <button className="btn btn-ghost btn-full mt-8" onClick={() => navigate('/shop')}>
                CONTINUE SHOPPING
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
