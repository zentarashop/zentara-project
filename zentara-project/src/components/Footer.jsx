import { Link } from 'react-router-dom';
import { IMGS } from '../assets/images';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src={IMGS.logo} alt="ZENTARA" className="footer-logo" />
            <p className="footer-tagline">NOT MADE TO FIT IN</p>
            <div className="footer-socials">
              <a href="https://www.tiktok.com/@zentara.th" target="_blank" rel="noopener noreferrer" className="social-link">TikTok</a>
              <a href="https://www.instagram.com/zentara.th" target="_blank" rel="noopener noreferrer" className="social-link">Instagram</a>
              <a href="https://www.facebook.com/zentara.th" target="_blank" rel="noopener noreferrer" className="social-link">Facebook</a>
            </div>
          </div>

          <div className="footer-links-group">
            <h4>SHOP</h4>
            <ul>
              <li><Link to="/shop">All Products</Link></li>
              <li><Link to="/shop">T-Shirts</Link></li>
              <li><Link to="/shop">Hoodies</Link></li>
              <li><Link to="/shop">Sweatshirts</Link></li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h4>ACCOUNT</h4>
            <ul>
              <li><Link to="/member">Login / Register</Link></li>
              <li><Link to="/track">Track Order</Link></li>
              <li><Link to="/cart">Cart</Link></li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h4>INFO</h4>
            <ul>
              <li><a href="#sizing">Size Guide</a></li>
              <li><a href="#shipping">Shipping Policy</a></li>
              <li><a href="#return">Return Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="text-dim" style={{ fontSize: 12 }}>
            © {new Date().getFullYear()} ZENTARA. ALL RIGHTS RESERVED.
          </p>
          <p className="text-dim" style={{ fontSize: 12 }}>
            MADE IN THAILAND 🇹🇭
          </p>
        </div>
      </div>
    </footer>
  );
}
