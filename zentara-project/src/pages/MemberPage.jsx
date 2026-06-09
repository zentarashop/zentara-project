import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../services/api';
import './MemberPage.css';

export default function MemberPage() {
  const [tab, setTab]       = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm]     = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});

  const { login, register, user, logout } = useAuth();
  const { addToast }  = useToast();
  const navigate      = useNavigate();
  const { state }     = useLocation();

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validateLogin = () => {
    const e = {};
    if (!form.email.trim())    e.email    = 'กรุณากรอกอีเมล';
    if (!form.password.trim()) e.password = 'กรุณากรอกรหัสผ่าน';
    return e;
  };

  const validateRegister = () => {
    const e = {};
    if (!form.name.trim())     e.name     = 'กรุณากรอกชื่อ';
    if (!form.email.trim())    e.email    = 'กรุณากรอกอีเมล';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'อีเมลไม่ถูกต้อง';
    if (!form.password)        e.password = 'กรุณากรอกรหัสผ่าน';
    if (form.password.length < 6) e.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    if (form.password !== form.confirm) e.confirm = 'รหัสผ่านไม่ตรงกัน';
    return e;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = validateLogin();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      addToast(`ยินดีต้อนรับ ${user.name || user.email}! 👋`, 'success');
      navigate(state?.redirect || '/');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = validateRegister();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      addToast('สมัครสมาชิกสำเร็จ! กรุณา Login', 'success');
      setTab('login');
      setForm(f => ({ ...f, password: '', confirm: '' }));
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const updated = await authApi.updateProfile(editForm);
      // Update auth context without reload
      const freshUser = await authApi.me();
      localStorage.setItem('zentara_user', JSON.stringify(freshUser));
      window.dispatchEvent(new Event('zentara_profile_updated'));
      addToast('อัปเดตข้อมูลแล้ว', 'success');
      setEditMode(false);
    } catch (err) { addToast(err.message, 'error'); }
    finally { setEditLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { addToast('กรุณากรอกอีเมล', 'error'); return; }
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      addToast('ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว', 'success');
      setForgotMode(false);
    } catch (err) { addToast(err.message, 'error'); }
    finally { setForgotLoading(false); }
  };

  if (user) return (
    <div className="page flex-center" style={{ flexDirection: 'column', gap: 24, minHeight: '80vh' }}>
      <div className="member-welcome animate-in">
        <div className="member-avatar font-display">
          {(user.name || user.email)[0].toUpperCase()}
        </div>
        <h2 className="font-display" style={{ fontSize: 24, fontWeight: 900 }}>WELCOME BACK</h2>
        <p className="text-accent fw-bold" style={{ fontSize: 14 }}>{user.name || user.email}</p>
        <p className="text-muted" style={{ fontSize: 12 }}>{user.email}</p>

        {!editMode ? (
          <div className="member-actions">
            <button className="btn btn-primary" onClick={() => navigate('/track')}>MY ORDERS</button>
            <button className="btn btn-outline" onClick={() => { setEditMode(true); setEditForm({ name: user.name || '', phone: user.phone || '' }); }}>แก้ไขข้อมูล</button>
            <button className="btn btn-outline" onClick={() => navigate('/shop')}>SHOP</button>
            <button className="btn btn-ghost btn-sm" onClick={logout}>LOGOUT</button>
          </div>
        ) : (
          <form onSubmit={handleEditProfile} className="auth-form" style={{ width: '100%', marginTop: 16 }}>
            <div className="input-group">
              <label>ชื่อ-นามสกุล</label>
              <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>เบอร์โทร</label>
              <input className="input" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="flex gap-8">
              <button type="submit" className="btn btn-primary btn-full" disabled={editLoading}>{editLoading ? <span className="spinner" /> : 'บันทึก'}</button>
              <button type="button" className="btn btn-outline btn-full" onClick={() => setEditMode(false)}>ยกเลิก</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="page member-page flex-center">
      <div className="member-card animate-in">
        <div className="member-logo-wrap">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.08em' }}>
            ZENTARA MEMBER
          </h2>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
            {tab === 'login' ? 'เข้าสู่ระบบเพื่อสั่งซื้อและติดตามออเดอร์' : 'สมัครสมาชิกเพื่อรับสิทธิพิเศษ'}
          </p>
        </div>

        {/* Tabs */}
        <div className="member-tabs">
          <button className={`member-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setErrors({}); }}>LOGIN</button>
          <button className={`member-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); setErrors({}); }}>REGISTER</button>
        </div>

        {/* Login form */}
        {tab === 'login' && !forgotMode && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="input-group">
              <label>อีเมล</label>
              <input className={`input${errors.email ? ' error' : ''}`} type="email" placeholder="email@example.com"
                value={form.email} onChange={e => setField('email', e.target.value)} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="input-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                รหัสผ่าน
                <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: 0, height: 'auto' }}
                  onClick={() => { setForgotMode(true); setForgotEmail(form.email); }}>
                  ลืมรหัสผ่าน?
                </button>
              </label>
              <input className={`input${errors.password ? ' error' : ''}`} type="password" placeholder="••••••••"
                value={form.password} onChange={e => setField('password', e.target.value)} />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <span className="spinner" /> : 'LOGIN'}
            </button>
          </form>
        )}

        {/* Forgot Password */}
        {tab === 'login' && forgotMode && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
              กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
            </p>
            <div className="input-group">
              <label>อีเมล</label>
              <input className="input" type="email" placeholder="email@example.com"
                value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={forgotLoading}>
              {forgotLoading ? <span className="spinner" /> : 'ส่งลิงก์รีเซ็ต'}
            </button>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => setForgotMode(false)}>← กลับ</button>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="input-group">
              <label>ชื่อ-นามสกุล *</label>
              <input className={`input${errors.name ? ' error' : ''}`} placeholder="สมชาย ใจดี"
                value={form.name} onChange={e => setField('name', e.target.value)} />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="input-group">
              <label>อีเมล *</label>
              <input className={`input${errors.email ? ' error' : ''}`} type="email" placeholder="email@example.com"
                value={form.email} onChange={e => setField('email', e.target.value)} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="input-group">
              <label>เบอร์โทร</label>
              <input className="input" placeholder="0812345678"
                value={form.phone} onChange={e => setField('phone', e.target.value)} />
            </div>
            <div className="input-group">
              <label>รหัสผ่าน *</label>
              <input className={`input${errors.password ? ' error' : ''}`} type="password" placeholder="อย่างน้อย 6 ตัวอักษร"
                value={form.password} onChange={e => setField('password', e.target.value)} />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <div className="input-group">
              <label>ยืนยันรหัสผ่าน *</label>
              <input className={`input${errors.confirm ? ' error' : ''}`} type="password" placeholder="••••••••"
                value={form.confirm} onChange={e => setField('confirm', e.target.value)} />
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <span className="spinner" /> : 'REGISTER'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
