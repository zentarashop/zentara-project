import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SuccessPage.css';

export default function SuccessPage() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const orderNum   = state?.order_number;

  useEffect(() => {
    if (!orderNum) navigate('/', { replace: true });
  }, []);

  if (!orderNum) return null;

  return (
    <div className="page success-page flex-center">
      <div className="success-card animate-in">
        <div className="success-icon">✓</div>
        <h1 className="font-display success-title">ORDER PLACED!</h1>
        <p className="text-muted text-center" style={{ lineHeight: 1.8, maxWidth: 340 }}>
          ขอบคุณสำหรับการสั่งซื้อ 🙏<br />
          ทีมงานจะตรวจสอบการชำระเงินและ<br />
          เตรียมจัดส่งสินค้าให้เร็วที่สุด
        </p>
        <div className="order-num-box">
          <span className="text-dim" style={{ fontSize: 10, letterSpacing: '0.15em' }}>ORDER NUMBER</span>
          <span className="font-display text-accent" style={{ fontSize: 24, fontWeight: 900 }}>{orderNum}</span>
          <span className="text-dim" style={{ fontSize: 11 }}>กรุณาบันทึกเลขนี้ไว้ หรือดูได้ที่เมนู TRACK</span>
        </div>
        <div className="success-steps">
          <div className="success-step"><span className="success-step-num">01</span><div><p className="fw-bold" style={{fontSize:13}}>รอตรวจสอบสลิป</p><p className="text-muted" style={{fontSize:11}}>Admin จะยืนยันภายใน 1-2 ชั่วโมง</p></div></div>
          <div className="success-step"><span className="success-step-num">02</span><div><p className="fw-bold" style={{fontSize:13}}>เตรียมจัดส่ง</p><p className="text-muted" style={{fontSize:11}}>1-2 วันทำการหลังยืนยัน</p></div></div>
          <div className="success-step"><span className="success-step-num">03</span><div><p className="fw-bold" style={{fontSize:13}}>จัดส่งถึงมือ</p><p className="text-muted" style={{fontSize:11}}>3-5 วันทำการ (Kerry / Flash)</p></div></div>
        </div>
        <div className="success-btns">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/track')}>TRACK ORDER</button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate('/shop')}>SHOP MORE</button>
        </div>
      </div>
    </div>
  );
}
