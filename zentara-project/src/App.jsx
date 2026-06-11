import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider }  from './context/ToastContext';
import { AuthProvider }   from './context/AuthContext';
import { CartProvider }   from './context/CartContext';
import Navbar             from './components/Navbar';
import Footer             from './components/Footer';
import Toast              from './components/Toast';
import HomePage           from './pages/HomePage';
import ShopPage           from './pages/ShopPage';
import ProductPage        from './pages/ProductPage';
import CartPage           from './pages/CartPage';
import CheckoutPage       from './pages/CheckoutPage';
import SuccessPage        from './pages/SuccessPage';
import TrackingPage       from './pages/TrackingPage';
import MemberPage         from './pages/MemberPage';
import AdminPage          from './pages/AdminPage';
import TermsPage          from './pages/TermsPage';
import PrivacyPage        from './pages/PrivacyPage';
import TikTokCallbackPage from './pages/TikTokCallbackPage';
import NotFoundPage       from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <Routes>
              <Route path="/"              element={<HomePage />}     />
              <Route path="/shop"          element={<ShopPage />}     />
              <Route path="/product/:id"   element={<ProductPage />}  />
              <Route path="/cart"          element={<CartPage />}     />
              <Route path="/checkout"      element={<CheckoutPage />} />
              <Route path="/success"       element={<SuccessPage />}  />
              <Route path="/track"         element={<TrackingPage />} />
              <Route path="/member"        element={<MemberPage />}   />
              <Route path="/admin"         element={<AdminPage />}    />
              <Route path="/terms"         element={<TermsPage />}    />
              <Route path="/privacy"       element={<PrivacyPage />}  />
              <Route path="/tiktok-callback" element={<TikTokCallbackPage />} />
              <Route path="*"              element={<NotFoundPage />} />
            </Routes>
            <Footer />
            <Toast />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
