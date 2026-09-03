import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import LuxuryLoader from './components/ui/LuxuryLoader';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import MembershipPage from './pages/MembershipPage';
import OffersPage from './pages/OffersPage';
import ReferralPage from './pages/ReferralPage';
import FranchisePage from './pages/FranchisePage';
import ServicesPage from './pages/ServicesPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import CheckoutPage from './pages/CheckoutPage';
import CartPage from './pages/CartPage';
import OtherPages from './pages/OtherPages';
import ScrollProgressBar from './components/ui/ScrollProgressBar';
import WhatsAppSupport from './components/ui/WhatsAppSupport';
import { AfterSalesPage, OrderConfirmationPage, OrderTrackingPage, PaymentPage } from './pages/CustomerFlowPages';
import VirtualTryOnPage from './pages/VirtualTryOnPage';
import PrescriptionPage from './pages/PrescriptionPage';
import AuthPage from './pages/AuthPage';

function App() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <HelmetProvider>
      <BrowserRouter>
        <div className="relative">
          <AnimatePresence>{loading ? <LuxuryLoader /> : null}</AnimatePresence>
          <ScrollProgressBar />
          <AnimatePresence>
            {showBackToTop ? (
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="fixed bottom-6 right-6 z-[120] rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 p-3 text-white shadow-lg shadow-cyan-500/20"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Back to top"
              >
                <ArrowUp className="h-5 w-5" />
              </motion.button>
            ) : null}
          </AnimatePresence>
          <WhatsAppSupport className="fixed bottom-20 right-6 z-[120] shadow-lg shadow-green-500/20" />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/products" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/referral" element={<ReferralPage />} />
            <Route path="/franchise" element={<FranchisePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<OtherPages />} />
            <Route path="/privacy-policy" element={<OtherPages />} />
            <Route path="/terms" element={<OtherPages />} />
            <Route path="/shipping-policy" element={<OtherPages />} />
            <Route path="/return-policy" element={<OtherPages />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
            <Route path="/wishlist" element={<OtherPages />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/virtual-try-on" element={<VirtualTryOnPage />} />
            <Route path="/prescription/:productId" element={<PrescriptionPage />} />
            <Route path="/order-success" element={<OrderConfirmationPage />} />
            <Route path="/orders/success" element={<OrderConfirmationPage />} />
            <Route path="/order-tracking" element={<OrderTrackingPage />} />
            <Route path="/orders/:id" element={<OrderTrackingPage />} />
            <Route path="/after-sales" element={<AfterSalesPage />} />
            <Route path="/orders" element={<OrderTrackingPage />} />
            <Route path="/my-orders" element={<OtherPages />} />
            <Route path="/profile" element={<OtherPages />} />
            <Route path="*" element={<OtherPages />} />
          </Routes>
        </div>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
