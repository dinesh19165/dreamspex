import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import LuxuryLoader from './components/ui/LuxuryLoader';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import MembershipPage from './pages/MembershipPage';
import MembershipCheckoutPage from './pages/MembershipCheckoutPage';
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
import ScrollToTop from './components/ui/ScrollToTop';
import WhatsAppSupport from './components/ui/WhatsAppSupport';
import { AfterSalesPage, OrderConfirmationPage, OrderTrackingPage, PaymentPage } from './pages/CustomerFlowPages';
import VirtualTryOnPage from './pages/VirtualTryOnPage';
import PrescriptionPage from './pages/PrescriptionPage';
import AuthPage from './pages/AuthPage';
import AuthExpirationHandler from './components/auth/AuthExpirationHandler';
import { useAuth } from './context/useAuth';
import { AccountPage, DashboardPage, OrdersPage, WalletPage, WishlistPage } from './pages/AccountPages';
import { AdminLoginPage, CustomerLoginPage, FranchiseLoginPage } from './pages/RoleLoginPages';
import {
  AddFranchisePage,
  AddFranchiseProductPage,
  FranchiseDashboardPage,
  FranchiseDetailPage,
  FranchiseManagementPage,
  FranchiseOrderDetailPage,
  FranchiseOrdersPage,
  FranchiseProductsPage,
  FranchiseUsersPage,
  FranchiseCustomersPage,
  FranchiseInventoryPage,
  FranchiseProfilePage,
  SuperAdminInventoryPage,
  SuperAdminProfilePage,
  SuperAdminUsersPage,
  ReportsPage,
  StoresPage,
  SuperAdminProductsPage,
  SuperAdminSettingsPage,
  SuperAdminGstSettingsPage,
} from './pages/FranchiseSystemPages';
import HomepageBuilderPage from './pages/HomepageBuilderPage';
import MainCategoryManagementPage from './pages/MainCategoryManagementPage';
import { AdminCustomersPage, AdminDashboardPage, AdminLensManagementPage, AdminOrdersPage } from './pages/AdminPages';
import AdminOffersPage from './pages/AdminOffersPage';
import AdminMembershipPage from './pages/AdminMembershipPage';
import { AdminReturnsPage, CustomerReturnsPage, ReturnRequestPage } from './pages/ReturnPages';
import DeliveryBatchPage from './pages/DeliveryBatchPage';
import LoyaltyPage from './pages/LoyaltyPage';
import { AdminLoyaltyReportsPage, AdminLoyaltySettingsPage } from './pages/AdminLoyaltyPage';

function RootEntry() {
  return <HomePage />;
}

function CustomerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role !== 'CUSTOMER') return <Navigate to={role === 'FRANCHISE_ADMIN' ? '/franchise/dashboard' : role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/login'} replace />;
  return <>{children}</>;
}

function FranchiseRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/franchise/login" replace state={{ from: location }} />;
  if (role !== 'FRANCHISE_ADMIN') return <Navigate to={role === 'CUSTOMER' ? '/' : role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/franchise/login'} replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  if (role !== 'SUPER_ADMIN') return <Navigate to={role === 'CUSTOMER' ? '/' : role === 'FRANCHISE_ADMIN' ? '/franchise/dashboard' : '/admin/login'} replace />;
  return <>{children}</>;
}

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
        <AuthExpirationHandler />
        <ScrollToTop />
        <div className="relative">
          <AnimatePresence>{loading ? <LuxuryLoader /> : null}</AnimatePresence>
          <ScrollProgressBar />
          <AnimatePresence>
            {showBackToTop ? (
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="back-to-top-button fixed bottom-6 right-6 z-[120] rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 p-3 text-[var(--text-primary)] shadow-lg shadow-cyan-500/20"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Back to top"
              >
                <ArrowUp className="h-5 w-5" />
              </motion.button>
            ) : null}
          </AnimatePresence>
          <WhatsAppSupport />
          <Routes>
            <Route path="/" element={<RootEntry />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/products" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/membership/checkout" element={<MembershipCheckoutPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/referral" element={<CustomerRoute><ReferralPage /></CustomerRoute>} />
            <Route path="/franchise" element={<FranchisePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<OtherPages />} />
            <Route path="/privacy-policy" element={<OtherPages />} />
            <Route path="/terms" element={<OtherPages />} />
            <Route path="/shipping-policy" element={<OtherPages />} />
            <Route path="/return-policy" element={<OtherPages />} />
            <Route path="/login" element={<CustomerLoginPage />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/delivery/batch/:token" element={<DeliveryBatchPage />} />
            <Route path="/virtual-try-on" element={<VirtualTryOnPage />} />
            <Route path="/prescription/:productId" element={<CustomerRoute><PrescriptionPage /></CustomerRoute>} />
            <Route path="/order-success" element={<CustomerRoute><OrderConfirmationPage /></CustomerRoute>} />
            <Route path="/orders/success" element={<CustomerRoute><OrderConfirmationPage /></CustomerRoute>} />
            <Route path="/order-tracking" element={<CustomerRoute><OrderTrackingPage /></CustomerRoute>} />
            <Route path="/orders/:id" element={<CustomerRoute><OrderTrackingPage /></CustomerRoute>} />
            <Route path="/after-sales" element={<AfterSalesPage />} />
            <Route path="/dashboard" element={<CustomerRoute><DashboardPage /></CustomerRoute>} />
            <Route path="/wallet" element={<CustomerRoute><WalletPage /></CustomerRoute>} />
            <Route path="/loyalty" element={<CustomerRoute><LoyaltyPage /></CustomerRoute>} />
            <Route path="/orders" element={<CustomerRoute><OrdersPage /></CustomerRoute>} />
            <Route path="/my-orders" element={<CustomerRoute><OrdersPage /></CustomerRoute>} />
            <Route path="/returns/new" element={<CustomerRoute><ReturnRequestPage /></CustomerRoute>} />
            <Route path="/returns" element={<CustomerRoute><CustomerReturnsPage /></CustomerRoute>} />
            <Route path="/wishlist" element={<CustomerRoute><WishlistPage /></CustomerRoute>} />
            <Route path="/account" element={<CustomerRoute><AccountPage /></CustomerRoute>} />
            <Route path="/profile" element={<CustomerRoute><AccountPage /></CustomerRoute>} />
            <Route path="/franchise/login" element={<FranchiseLoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<SuperAdminRoute><AdminDashboardPage /></SuperAdminRoute>} />
            <Route path="/admin/franchises" element={<SuperAdminRoute><FranchiseManagementPage /></SuperAdminRoute>} />
            <Route path="/admin/franchises/new" element={<SuperAdminRoute><AddFranchisePage /></SuperAdminRoute>} />
            <Route path="/admin/franchises/:id" element={<SuperAdminRoute><FranchiseDetailPage /></SuperAdminRoute>} />
            <Route path="/admin/franchises/:id/users" element={<SuperAdminRoute><FranchiseUsersPage /></SuperAdminRoute>} />
            <Route path="/admin/inventory" element={<SuperAdminRoute><SuperAdminInventoryPage /></SuperAdminRoute>} />
            <Route path="/admin/orders" element={<SuperAdminRoute><AdminOrdersPage /></SuperAdminRoute>} />
            <Route path="/admin/returns" element={<SuperAdminRoute><AdminReturnsPage /></SuperAdminRoute>} />
            <Route path="/admin/lenses" element={<SuperAdminRoute><AdminLensManagementPage /></SuperAdminRoute>} />
            <Route path="/admin/products" element={<SuperAdminRoute><SuperAdminProductsPage /></SuperAdminRoute>} />
            <Route path="/admin/categories" element={<SuperAdminRoute><MainCategoryManagementPage /></SuperAdminRoute>} />
            <Route path="/admin/customers" element={<SuperAdminRoute><AdminCustomersPage /></SuperAdminRoute>} />
            <Route path="/admin/offers" element={<SuperAdminRoute><AdminOffersPage /></SuperAdminRoute>} />
            <Route path="/admin/membership" element={<SuperAdminRoute><AdminMembershipPage /></SuperAdminRoute>} />
            <Route path="/admin/loyalty-settings" element={<SuperAdminRoute><AdminLoyaltySettingsPage /></SuperAdminRoute>} />
            <Route path="/admin/loyalty" element={<SuperAdminRoute><AdminLoyaltyReportsPage /></SuperAdminRoute>} />
            <Route path="/admin/reports" element={<SuperAdminRoute><ReportsPage scope="super-admin" /></SuperAdminRoute>} />
            <Route path="/admin/users" element={<SuperAdminRoute><SuperAdminUsersPage /></SuperAdminRoute>} />
            <Route path="/admin/profile" element={<SuperAdminRoute><SuperAdminProfilePage /></SuperAdminRoute>} />
            <Route path="/admin/settings" element={<SuperAdminRoute><SuperAdminSettingsPage /></SuperAdminRoute>} />
            <Route path="/admin/settings/gst" element={<SuperAdminRoute><SuperAdminGstSettingsPage /></SuperAdminRoute>} />
            <Route path="/admin/content" element={<SuperAdminRoute><HomepageBuilderPage /></SuperAdminRoute>} />
            <Route path="/franchise/dashboard" element={<FranchiseRoute><FranchiseDashboardPage /></FranchiseRoute>} />
            <Route path="/franchise/products" element={<FranchiseRoute><FranchiseProductsPage /></FranchiseRoute>} />
            <Route path="/franchise/products/new" element={<FranchiseRoute><AddFranchiseProductPage /></FranchiseRoute>} />
            <Route path="/franchise/orders" element={<FranchiseRoute><FranchiseOrdersPage /></FranchiseRoute>} />
            <Route path="/franchise/orders/:id" element={<FranchiseRoute><FranchiseOrderDetailPage /></FranchiseRoute>} />
            <Route path="/franchise/customers" element={<FranchiseRoute><FranchiseCustomersPage /></FranchiseRoute>} />
            <Route path="/franchise/inventory" element={<FranchiseRoute><FranchiseInventoryPage /></FranchiseRoute>} />
            <Route path="/franchise/reports" element={<FranchiseRoute><ReportsPage scope="franchise-admin" /></FranchiseRoute>} />
            <Route path="/franchise/profile" element={<FranchiseRoute><FranchiseProfilePage /></FranchiseRoute>} />
            <Route path="/stores" element={<StoresPage />} />
            <Route path="*" element={<OtherPages />} />
          </Routes>
        </div>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
