import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { CartProvider } from './store/CartContext';
import { SettingsProvider } from './store/SettingsContext';
import { UIProvider } from './store/UIContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileTabBar } from './components/MobileTabBar';
import { CartDrawer } from './components/CartDrawer';
import { ContactModal } from './components/ContactModal';
import { Toasts } from './components/Toasts';
import { Home } from './pages/Home';
import { MenuPage } from './pages/Menu';
import { ProductPage } from './pages/ProductPage';
import { OffersPage } from './pages/Offers';
import { StoryPage } from './pages/Story';
import { ContactPage } from './pages/Contact';
import { ReservationsPage } from './pages/Reservations';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/Checkout';
import { OrderTrackingPage } from './pages/OrderTracking';
import { AccountPage } from './pages/Account';
import { PrivacyPage } from './pages/Privacy';
import { NotFoundPage } from './pages/NotFound';
import { AdminApp } from './admin/AdminApp';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function Shell() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollToTop />
      {isAdmin ? null : <Header />}
      <main id="main" className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/:slug" element={<ProductPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/story" element={<StoryPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:code" element={<OrderTrackingPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {isAdmin ? null : <Footer />}
      {isAdmin ? null : <MobileTabBar />}
      <CartDrawer />
      <ContactModal />
      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <UIProvider>
          <AuthProvider>
            <CartProvider>
              <Shell />
            </CartProvider>
          </AuthProvider>
        </UIProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
