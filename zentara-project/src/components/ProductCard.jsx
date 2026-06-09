import { useNavigate } from 'react-router-dom';
import { IMGS } from '../assets/images';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const inStock  = product.product_sizes?.some(s => s.stock > 0 && !s.is_preorder);
  const hasPreorder = product.product_sizes?.some(s => s.is_preorder);

  return (
    <div className="product-card" onClick={() => navigate(`/product/${product.id}`)}>
      <div className="product-card-img-wrap">
        <img
          src={IMGS[product.img_key] || IMGS.logo}
          alt={product.name}
          className="product-card-img"
          loading="lazy"
        />
        <div className="product-card-overlay">
          <span className="btn btn-primary btn-sm">VIEW ITEM</span>
        </div>
        <div className="product-card-badges">
          {!inStock && !hasPreorder && (
            <span className="badge badge-gray">SOLD OUT</span>
          )}
          {hasPreorder && inStock && (
            <span className="badge badge-yellow">PRE-ORDER AVAIL.</span>
          )}
          {inStock && (
            <span className="badge badge-green">IN STOCK</span>
          )}
        </div>
      </div>

      <div className="product-card-body">
        <p className="product-card-collection text-dim text-upper" style={{ fontSize: 10, letterSpacing: '0.15em' }}>
          {product.collection}
        </p>
        <h3 className="product-card-name font-display">{product.name}</h3>
        <div className="product-card-footer">
          <span className="product-card-price">{product.price.toLocaleString()} THB</span>
          <span className="product-card-sizes text-dim">
            {product.product_sizes?.filter(s => s.stock > 0 || s.is_preorder).map(s => s.size).join(' · ')}
          </span>
        </div>
      </div>
    </div>
  );
}
