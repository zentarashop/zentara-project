import { useEffect, useState } from 'react';
import { productsApi } from '../services/api';
import ProductCard from '../components/ProductCard';
import './ShopPage.css';

const FILTERS = ['ALL', 'T-SHIRTS', 'HOODIES'];

export default function ShopPage() {
  const [products, setProducts]  = useState([]);
  const [loading, setLoading]    = useState(true);
  const [filter, setFilter]      = useState('ALL');
  const [sort, setSort]          = useState('default');

  useEffect(() => {
    productsApi.getAll()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = products
    .filter(p => {
      if (filter === 'ALL') return true;
      if (filter === 'T-SHIRTS') return ['LUV','ANGLE','LUNAR','FAKE LOVE'].includes(p.collection);
      if (filter === 'HOODIES')  return p.collection === 'BASIC';
      return true;
    })
    .sort((a, b) => {
      if (sort === 'price-asc')  return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      return a.id - b.id;
    });

  return (
    <div className="page shop-page">
      <div className="container">
        {/* Header */}
        <div className="shop-header animate-in">
          <div>
            <span className="section-label">ZENTARA</span>
            <h1 className="section-title">ALL PRODUCTS</h1>
          </div>
          <p className="text-muted" style={{ fontSize: 13 }}>
            {filtered.length} ITEMS
          </p>
        </div>

        {/* Controls */}
        <div className="shop-controls">
          <div className="filter-tabs">
            {FILTERS.map(f => (
              <button
                key={f}
                className={`filter-tab${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <select
            className="input sort-select"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="default">SORT: DEFAULT</option>
            <option value="price-asc">PRICE: LOW TO HIGH</option>
            <option value="price-desc">PRICE: HIGH TO LOW</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="shop-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 14 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">ไม่พบสินค้าในหมวดนี้</p>
          </div>
        ) : (
          <div className="shop-grid">
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
