import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ordersApi } from '../services/api';
import { IMGS } from '../assets/images';
import './CheckoutPage.css';

const STEPS = ['CUSTOMER INFO', 'PAYMENT', 'CONFIRM'];

const validate = (form) => {
  const errors = {};
  if (!form.name.trim())    errors.name    = 'กรุณากรอกชื่อ';
  if (!form.phone.trim())   errors.phone   = 'กรุณากรอกเบอร์โทร';
  const cleanPhone = form.phone.replace(/[-\s]/g, '');
  if (!/^(06|08|09)\d{8}$/.test(cleanPhone)) errors.phone = 'เบอร์โทรไม่ถูกต้อง (ต้องขึ้นต้นด้วย 06/08/09)';
  if (!form.email.trim())   errors.email   = 'กรุณากรอกอีเมล';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'อีเมลไม่ถูกต้อง';
  if (!form.address.trim()) errors.address = 'กรุณากรอกที่อยู่';
  return errors;
};

export default function CheckoutPage() {
  const navigate       = useNavigate();
  const { state }      = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { addToast }   = useToast();

  const discount    = state?.discount || null;
  const discountAmt = state?.discountAmt || 0;
  const shipping    = state?.shipping ?? 50;
  const total       = state?.total ?? (subtotal + 50);

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [slip, setSlip]       = useState(null);
  const [form, setForm]       = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: '',
    payment: 'promptpay',
  });
  const [errors, setErrors] = useState({});
  const [orderId, setOrderId] = useState(null);

  if (authLoading) {
    return (
      <div className="page flex-center" style={{ minHeight: '80vh' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page flex-center" style={{ flexDirection: 'column', gap: 24, minHeight: '80vh' }}>
        <p className="font-display fw-black" style={{ fontSize: 28 }}>LOGIN REQUIRED</p>
        <p className="text-muted">กรุณาเข้าสู่ระบบก่อน Checkout</p>
        <button className="btn btn-primary" onClick={() => navigate('/member', { state: { redirect: '/checkout' } })}>
          LOGIN / REGISTER
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const nextStep = () => {
    if (step === 0) {
      const errs = validate(form);
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({});
    }
    setStep(s => s + 1);
  };

  const placeOrder = async () => {
    setLoading(true);
    try {
      const { order_number, id } = await ordersApi.create({
        customer_name:    form.name,
        customer_phone:   form.phone,
        customer_email:   form.email,
        customer_address: form.address,
        payment_method:   form.payment,
        items: items.map(i => ({
          product_id: i.product_id,
          name:       i.name,
          size:       i.size,
          qty:        i.qty,
          price:      i.price,
        })),
        discount_code:  discount?.code || null,
        subtotal,
        discount_amount: discountAmt,
        shipping_fee:   shipping,
        total,
      });

      // Upload slip if provided
      if (slip && id) {
        try {
          await ordersApi.uploadSlip(id, slip);
        } catch {
          addToast('สร้างออเดอร์สำเร็จ แต่อัปโหลดสลิปไม่สำเร็จ — กรุณาส่งสลิปมาที่ IG: @zentara_shop / TikTok: @zentara_shop / Facebook: Zentara', 'error');
        }
      }

      clearCart();
      navigate('/success', { state: { order_number } });
    } catch (e) {
      addToast(e.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page checkout-page">
      <div className="container">
        {/* Stepper */}
        <div className="stepper animate-in">
          {STEPS.map((s, i) => (
            <div key={s} className={`step${i <= step ? ' active' : ''}${i < step ? ' done' : ''}`}>
              <div className="step-circle">
                {i < step ? '✓' : i + 1}
              </div>
              <span className="step-label">{s}</span>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="checkout-layout">
          {/* Left: Form */}
          <div className="checkout-form-wrap animate-in">
            {/* STEP 0: Customer Info */}
            {step === 0 && (
              <div className="checkout-section">
                <h2 className="checkout-section-title font-display">CUSTOMER INFO</h2>
                <div className="form-grid">
                  <div className="input-group">
                    <label>ชื่อ-นามสกุล *</label>
                    <input
                      className={`input${errors.name ? ' error' : ''}`}
                      placeholder="สมชาย ใจดี"
                      value={form.name}
                      onChange={e => setField('name', e.target.value)}
                    />
                    {errors.name && <span className="field-error">{errors.name}</span>}
                  </div>

                  <div className="input-group">
                    <label>เบอร์โทรศัพท์ *</label>
                    <input
                      className={`input${errors.phone ? ' error' : ''}`}
                      placeholder="0812345678"
                      value={form.phone}
                      onChange={e => setField('phone', e.target.value)}
                    />
                    {errors.phone && <span className="field-error">{errors.phone}</span>}
                  </div>

                  <div className="input-group span-2">
                    <label>อีเมล *</label>
                    <input
                      className={`input${errors.email ? ' error' : ''}`}
                      placeholder="email@example.com"
                      type="email"
                      value={form.email}
                      onChange={e => setField('email', e.target.value)}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>

                  <div className="input-group span-2">
                    <label>ที่อยู่จัดส่ง *</label>
                    <textarea
                      className={`input${errors.address ? ' error' : ''}`}
                      placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                      rows={4}
                      value={form.address}
                      onChange={e => setField('address', e.target.value)}
                    />
                    {errors.address && <span className="field-error">{errors.address}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: Payment */}
            {step === 1 && (
              <div className="checkout-section">
                <h2 className="checkout-section-title font-display">PAYMENT METHOD</h2>

                <div className="payment-methods">
                  {/* PromptPay */}
                  <label className={`payment-card${form.payment === 'promptpay' ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value="promptpay"
                      checked={form.payment === 'promptpay'}
                      onChange={() => setField('payment', 'promptpay')}
                    />
                    <div className="payment-card-inner">
                      <div className="payment-card-header">
                        <span className="payment-icon">📱</span>
                        <div>
                          <p className="payment-name font-display">PROMPTPAY</p>
                          <p className="text-muted" style={{ fontSize: 11 }}>โอนผ่าน QR Code</p>
                        </div>
                      </div>
                      {form.payment === 'promptpay' && (
                        <div className="payment-detail animate-in">
                          <div className="qr-wrap">
                            <img src={IMGS.qr_promptpay} alt="PromptPay QR" className="qr-img" />
                          </div>
                          <p className="text-muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                            โอน <span className="text-accent fw-bold">{total.toLocaleString()} THB</span><br />
                            แล้วอัปโหลดสลิปด้านล่าง
                          </p>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Bank Transfer */}
                  <label className={`payment-card${form.payment === 'bank' ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value="bank"
                      checked={form.payment === 'bank'}
                      onChange={() => setField('payment', 'bank')}
                    />
                    <div className="payment-card-inner">
                      <div className="payment-card-header">
                        <span className="payment-icon">🏦</span>
                        <div>
                          <p className="payment-name font-display">BANK TRANSFER</p>
                          <p className="text-muted" style={{ fontSize: 11 }}>โอนผ่านธนาคาร</p>
                        </div>
                      </div>
                      {form.payment === 'bank' && (
                        <div className="payment-detail animate-in">
                          <div className="bank-info">
                            <div className="bank-row">
                              <span className="text-muted">ธนาคาร</span>
                              <span className="fw-bold">KBANK (กสิกรไทย)</span>
                            </div>
                            <div className="bank-row">
                              <span className="text-muted">เลขบัญชี</span>
                              <span className="fw-bold text-accent">XXX-X-XXXXX-X</span>
                            </div>
                            <div className="bank-row">
                              <span className="text-muted">ชื่อบัญชี</span>
                              <span className="fw-bold">ZENTARA CO., LTD.</span>
                            </div>
                            <div className="bank-row">
                              <span className="text-muted">ยอดโอน</span>
                              <span className="fw-bold text-accent">{total.toLocaleString()} THB</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Slip upload */}
                <div className="slip-upload mt-24">
                  <label className="input-group-label">อัปโหลดสลิปการโอนเงิน</label>
                  <label className={`slip-drop${slip ? ' has-file' : ''}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setSlip(e.target.files[0] || null)}
                      hidden
                    />
                    {slip ? (
                      <div className="slip-preview">
                        <img src={URL.createObjectURL(slip)} alt="Slip preview" className="slip-img" />
                        <span className="text-accent" style={{ fontSize: 12 }}>✓ {slip.name}</span>
                      </div>
                    ) : (
                      <div className="slip-placeholder">
                        <span style={{ fontSize: 28 }}>📎</span>
                        <span className="text-muted" style={{ fontSize: 13 }}>คลิกเพื่อเลือกไฟล์</span>
                        <span className="text-dim" style={{ fontSize: 11 }}>JPG, PNG ขนาดไม่เกิน 5MB</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Confirm */}
            {step === 2 && (
              <div className="checkout-section">
                <h2 className="checkout-section-title font-display">CONFIRM ORDER</h2>

                <div className="confirm-section">
                  <h4 className="confirm-label">ข้อมูลลูกค้า</h4>
                  <div className="confirm-info">
                    <div className="confirm-row"><span className="text-muted">ชื่อ</span><span>{form.name}</span></div>
                    <div className="confirm-row"><span className="text-muted">เบอร์</span><span>{form.phone}</span></div>
                    <div className="confirm-row"><span className="text-muted">อีเมล</span><span>{form.email}</span></div>
                    <div className="confirm-row"><span className="text-muted">ที่อยู่</span><span style={{ textAlign: 'right', maxWidth: 240 }}>{form.address}</span></div>
                    <div className="confirm-row"><span className="text-muted">ชำระเงิน</span><span className="text-upper">{form.payment}</span></div>
                    {slip && <div className="confirm-row"><span className="text-muted">สลิป</span><span className="text-accent">✓ อัปโหลดแล้ว</span></div>}
                  </div>
                </div>

                <div className="confirm-items mt-24">
                  {items.map(i => (
                    <div key={`${i.product_id}-${i.size}`} className="confirm-item">
                      <span>{i.name} (SIZE {i.size})</span>
                      <span>× {i.qty} = {(i.price * i.qty).toLocaleString()} THB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="checkout-nav">
              {step > 0 && (
                <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>
                  ← BACK
                </button>
              )}
              {step < 2 ? (
                <button className="btn btn-primary btn-lg" style={{ marginLeft: 'auto' }} onClick={nextStep}>
                  NEXT STEP →
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-lg"
                  style={{ marginLeft: 'auto' }}
                  onClick={placeOrder}
                  disabled={loading}
                >
                  {loading ? <><span className="spinner" /> PLACING ORDER...</> : 'PLACE ORDER ✓'}
                </button>
              )}
            </div>
          </div>

          {/* Right: Mini summary */}
          <div className="checkout-summary-wrap animate-in" style={{ animationDelay: '0.15s' }}>
            <div className="card checkout-summary">
              <h4 className="font-display mb-16" style={{ fontSize: 12, letterSpacing: '0.1em' }}>YOUR ORDER</h4>
              {items.map(i => (
                <div key={`${i.product_id}-${i.size}`} className="co-item">
                  <span className="co-item-name">{i.name} (SIZE {i.size}) × {i.qty}</span>
                  <span className="co-item-price">{(i.price * i.qty).toLocaleString()}</span>
                </div>
              ))}
              <div className="divider" />
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
                <span className="text-muted" style={{ fontSize: 12 }}>TOTAL</span>
                <span className="font-display text-accent" style={{ fontSize: 20, fontWeight: 900 }}>
                  {total.toLocaleString()} THB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
