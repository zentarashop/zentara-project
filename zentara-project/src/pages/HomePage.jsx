import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../services/api';
import { IMGS } from '../assets/images';
import ProductCard from '../components/ProductCard';
import './HomePage.css';

const PHRASES = [
  'NOT MADE TO FIT IN', 'ZENTARA WORLD', 'YOU ARE LOVED', 'NEVER GIVE UP',
  'MOON & STARS', 'FAKE LOVE ALL A LIE', 'STREETWEAR FROM THAILAND',
  'NOT MADE TO FIT IN', 'ZENTARA WORLD', 'YOU ARE LOVED', 'NEVER GIVE UP',
];

export default function HomePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [scrollDark, setScrollDark] = useState(0);

  useEffect(() => {
    productsApi.getAll().then(data => setProducts(data.slice(0, 4))).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const heroH = window.innerHeight;
      // เริ่มมืดเมื่อ scroll เกิน 20% ของ hero จนมืดสุดที่ 80%
      const ratio = Math.min(Math.max((scrollY - heroH * 0.2) / (heroH * 0.6), 0), 0.75);
      setScrollDark(ratio);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="home">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg">
          {(IMGS.hero_bg || IMGS.hoodie_product) && (
            <img src={IMGS.hero_bg || IMGS.hoodie_product} alt="ZENTARA Hero" className="hero-img" />
          )}
          <div className="hero-scroll-dark" style={{ opacity: scrollDark }} />
          <div className="hero-overlay" />
        </div>

        <div className="hero-content container">
          <div className="hero-eyebrow animate-in">
            <span className="section-label">COLLECTION 2025</span>
          </div>
          <h1 className="hero-title hero-title-dashley animate-in" style={{ animationDelay: '0.1s' }}>
            ZENTARA
          </h1>
          <p className="hero-sub animate-in" style={{ animationDelay: '0.2s' }}>
            STREETWEAR THAT SPEAKS DIFFERENT
          </p>
          <div className="hero-btns animate-in" style={{ animationDelay: '0.3s' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/shop')}>
              SHOP NOW
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/track')}>
              TRACK ORDER
            </button>
          </div>
        </div>

        <div className="hero-scroll">
          <div className="hero-scroll-line" />
          <span>SCROLL</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────── */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {PHRASES.map((p, i) => (
            <span key={i} className="marquee-item font-display">
              {p} <span className="marquee-dot">★</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURED PRODUCTS ─────────────────────────────── */}
      <section className="featured container">
        <div className="section-header">
          <span className="section-label">LATEST DROP</span>
          <h2 className="section-title">FEATURED</h2>
        </div>

        {products.length === 0 ? (
          <div className="products-skeleton">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 14 }} />
            ))}
          </div>
        ) : (
          <div className="products-grid">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        <div className="text-center mt-48">
          <button className="btn btn-outline btn-lg" onClick={() => navigate('/shop')}>
            VIEW ALL PRODUCTS →
          </button>
        </div>
      </section>

      {/* ── BRAND SECTION ─────────────────────────────────── */}
      <section className="brand-section">
        <div className="container brand-inner">
          <div className="brand-text">
            <span className="section-label">OUR STORY</span>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}>
              WEAR YOUR<br />
              <span className="text-accent">TRUTH</span>
            </h2>
            <p className="brand-desc">
              ZENTARA เกิดมาจากความเชื่อว่าเสื้อผ้าคือการแสดงออกที่ไม่ต้องพูด
              ทุก piece คือ statement — สำหรับคนที่ไม่ยอมถูกจำกัดด้วยกรอบ
            </p>
            <div className="brand-stats">
              <div className="brand-stat">
                <span className="brand-stat-num text-accent font-display">5+</span>
                <span className="brand-stat-label">COLLECTIONS</span>
              </div>
              <div className="brand-stat">
                <span className="brand-stat-num text-accent font-display">100%</span>
                <span className="brand-stat-label">PREMIUM FABRIC</span>
              </div>
              <div className="brand-stat">
                <span className="brand-stat-num text-accent font-display">🇹🇭</span>
                <span className="brand-stat-label">MADE IN THAILAND</span>
              </div>
            </div>
          </div>
          <div className="brand-img-wrap">
            <img src={IMGS.wear_truth || IMGS.luv_product} alt="ZENTARA" className="brand-img" />
          </div>
        </div>
      </section>
    </div>
  );
}
