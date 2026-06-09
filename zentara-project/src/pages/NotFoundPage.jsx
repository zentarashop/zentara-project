import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="page flex-center" style={{ flexDirection: 'column', gap: 24, minHeight: '80vh', textAlign: 'center' }}>
      <p className="font-display fw-black text-accent" style={{ fontSize: 80, lineHeight: 1 }}>404</p>
      <p className="font-display fw-black" style={{ fontSize: 28 }}>PAGE NOT FOUND</p>
      <p className="text-muted">หน้าที่คุณค้นหาไม่มีอยู่</p>
      <div className="flex gap-8">
        <button className="btn btn-primary" onClick={() => navigate('/')}>HOME</button>
        <button className="btn btn-outline" onClick={() => navigate('/shop')}>SHOP</button>
      </div>
    </div>
  );
}
