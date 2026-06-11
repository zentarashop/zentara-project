import { useEffect } from 'react';

// หน้านี้รับ redirect จาก TikTok (ต้องเป็น https) แล้วส่งต่อ ?code=... ไปยัง
// backend local (http://localhost:5000) เพื่อแลก token ต่อ
export default function TikTokCallbackPage() {
  useEffect(() => {
    const target = `http://localhost:5000/api/tiktok/callback${window.location.search}`;
    window.location.replace(target);
  }, []);

  return (
    <div className="page flex-center" style={{ flexDirection: 'column', gap: 16, minHeight: '80vh', textAlign: 'center' }}>
      <p className="font-display fw-black" style={{ fontSize: 24 }}>กำลังเชื่อมต่อ TikTok...</p>
      <p className="text-muted">กรุณารอสักครู่ ระบบกำลังส่งต่อไปยังเครื่อง local ของคุณ</p>
    </div>
  );
}
