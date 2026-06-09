import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ordersApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './TrackingPage.css';

const STATUS_STEPS = [
  { key: 'pending_payment', label: 'รอชำระเงิน', icon: '💳' },
  { key: 'paid',            label: 'ชำระแล้ว',   icon: '✓' },
  { key: 'preparing',       label: 'เตรียมสินค้า', icon: '📦' },
  { key: 'shipped',         label: 'จัดส่งแล้ว',  icon: '🚚' },
  { key: 'delivered',       label: 'ได้รับแล้ว',  icon: '🎉' },
];

const STATUS_LABELS = {
  pending_payment: { label: 'รอชำระ',      class: 'badge-yellow' },
  paid:            { label: 'ชำระแล้ว',    class: 'badge-blue'   },
  preparing:       { label: 'เตรียมสินค้า', class: 'badge-blue'   },
  shipped:         { label: 'จัดส่งแล้ว',  class: 'badge-blue'   },
  delivered:       { label: 'ได้รับแล้ว',  class: 'badge-green'  },
  cancelled:       { label: 'ยกเลิก',      class: 'badge-red'    },
};

const stepIndex = (status) => STATUS_STEPS.findIndex(s => s.key === status);

export default function TrackingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate   = useNavigate();
  const { addToast } = useToast();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [uploadingSlip, setUploadingSlip] = useState(null); // orderId being uploaded
  const slipInputRef = useRef({});

  const handleSlipUpload = async (orderId, file) => {
    if (!file) return;
    setUploadingSlip(orderId);
    try {
      await ordersApi.uploadSlip(orderId, file);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, slip_url: 'uploaded' } : o));
      addToast('อัปโหลดสลิปสำเร็จ', 'success');
    } catch (e) {
      addToast(e.message || 'อัปโหลดสลิปไม่สำเร็จ', 'error');
    } finally {
      setUploadingSlip(null);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    ordersApi.getAll()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading) return (
    <div className="page flex-center" style={{ minHeight: '80vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (!user) return (
    <div className="page flex-center" style={{ flexDirection: 'column', gap: 24, minHeight: '80vh' }}>
      <p className="font-display fw-black" style={{ fontSize: 28 }}>LOGIN REQUIRED</p>
      <p className="text-muted">กรุณาเข้าสู่ระบบเพื่อดูออเดอร์</p>
      <button className="btn btn-primary" onClick={() => navigate('/member')}>LOGIN</button>
    </div>
  );

  return (
    <div className="page track-page">
      <div className="container">
        <div className="animate-in">
          <span className="section-label">MY ORDERS</span>
          <h1 className="section-title">TRACK ORDER</h1>
        </div>

        {loading ? (
          <div className="flex-center mt-48"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state mt-48">
            <p className="text-muted">ยังไม่มีออเดอร์</p>
            <button className="btn btn-primary mt-16" onClick={() => navigate('/shop')}>SHOP NOW</button>
          </div>
        ) : (
          <div className="orders-list mt-32">
            {orders.map(order => {
              const sIdx   = stepIndex(order.status);
              const badge  = STATUS_LABELS[order.status] || { label: order.status, class: 'badge-gray' };
              const isOpen = expanded === order.id;
              return (
                <div key={order.id} className="order-card card animate-in">
                  {/* Header */}
                  <button
                    className="order-card-header"
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                  >
                    <div className="order-card-left">
                      <span className="font-display fw-bold text-upper" style={{ fontSize: 14 }}>
                        {order.order_number}
                      </span>
                      <span className={`badge ${badge.class}`}>{badge.label}</span>
                    </div>
                    <div className="order-card-right">
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {new Date(order.created_at).toLocaleDateString('th-TH')}
                      </span>
                      <span className="font-display text-accent fw-bold">
                        {order.total.toLocaleString()} THB
                      </span>
                      <span className="text-muted" style={{ fontSize: 18 }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div className="order-card-body animate-in">
                      {/* Progress bar */}
                      {order.status !== 'cancelled' && (
                        <div className="order-progress">
                          {STATUS_STEPS.map((s, i) => (
                            <div key={s.key} className="progress-step">
                              <div className={`progress-circle${i <= sIdx ? ' active' : ''}${i < sIdx ? ' done' : ''}`}>
                                {i < sIdx ? '✓' : s.icon}
                              </div>
                              <span className={`progress-label${i <= sIdx ? ' active' : ''}`}>{s.label}</span>
                              {i < STATUS_STEPS.length - 1 && (
                                <div className={`progress-line${i < sIdx ? ' done' : ''}`} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {order.status === 'cancelled' && (
                        <div className="badge badge-red" style={{ marginBottom: 16 }}>ออเดอร์นี้ถูกยกเลิก</div>
                      )}

                      {/* Items */}
                      <div className="order-items-list">
                        {order.order_items?.map(item => (
                          <div key={item.id} className="order-item-row">
                            <span>{item.product_name} (SIZE {item.size})</span>
                            <span>× {item.quantity} = {(item.price * item.quantity).toLocaleString()} THB</span>
                          </div>
                        ))}
                      </div>

                      {/* Slip status */}
                      {order.slip_url ? (
                        <div className="slip-status">
                          <span className="text-accent">✓ อัปโหลดสลิปแล้ว</span>
                          {order.slip_url !== 'uploaded' && (
                            <a href={order.slip_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">ดูสลิป ↗</a>
                          )}
                        </div>
                      ) : order.status === 'pending_payment' ? (
                        <div className="slip-status-pending">
                          <span className="text-muted" style={{ fontSize: 12 }}>⚠ ยังไม่ได้อัปโหลดสลิป</span>
                          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                            {uploadingSlip === order.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '📎 อัปโหลดสลิป'}
                            <input
                              type="file" accept="image/*" hidden
                              ref={el => { slipInputRef.current[order.id] = el; }}
                              onChange={e => handleSlipUpload(order.id, e.target.files[0])}
                              disabled={uploadingSlip === order.id}
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
