import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

const loadCart = () => {
  try { return JSON.parse(localStorage.getItem('zentara_cart') || '[]'); }
  catch { return []; }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem('zentara_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, size, qty = 1) => {
    const sizeObj = product.product_sizes?.find(s => s.size === size);
    const maxQty = sizeObj?.is_preorder ? 5 : (sizeObj?.stock || 0);
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id && i.size === size);
      const currentQty = existing?.qty || 0;
      const newQty = Math.min(currentQty + qty, maxQty);
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id && i.size === size ? { ...i, qty: newQty } : i
        );
      }
      if (newQty < 1) return prev;
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        img_key: product.img_key,
        size,
        qty: newQty,
      }];
    });
  };

  const removeItem = (product_id, size) => {
    setItems(prev => prev.filter(i => !(i.product_id === product_id && i.size === size)));
  };

  const updateQty = (product_id, size, qty) => {
    if (qty < 1) { removeItem(product_id, size); return; }
    setItems(prev => prev.map(i =>
      i.product_id === product_id && i.size === size ? { ...i, qty } : i
    ));
  };

  const clearCart = () => setItems([]);

  const count   = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
