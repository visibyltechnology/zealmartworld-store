import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import useAuthStore from './store/useAuthStore';
import { Toaster } from 'react-hot-toast';
import ScrollToTop from './components/ScrollToTop';
import ReturnToTopButton from './components/ReturnToTopButton';
import './index.css';

// Lazy load pages for performance
const Home          = lazy(() => import('./pages/Home'));
const Shop          = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Login         = lazy(() => import('./pages/Login'));
const Register      = lazy(() => import('./pages/Register'));
const VerifyOTP     = lazy(() => import('./pages/VerifyOTP'));
const ForgotPassword= lazy(() => import('./pages/ForgotPassword'));

const Profile       = lazy(() => import('./pages/Profile'));
const Cart          = lazy(() => import('./pages/Cart'));
const DeliveryPortal = lazy(() => import('./pages/DeliveryPortal'));
const Notifications  = lazy(() => import('./pages/Notifications'));
const Terms          = lazy(() => import('./pages/Terms'));
const PrivacyPolicy  = lazy(() => import('./pages/PrivacyPolicy'));

// Admin pages
const AdminLayout      = lazy(() => import('./pages/Admin/AdminLayout'));
const ProductManager   = lazy(() => import('./pages/Admin/ProductManager'));
const ProductForm      = lazy(() => import('./pages/Admin/ProductForm'));
const AdminOrders      = lazy(() => import('./pages/Admin/AdminOrders'));
const SiteSettings     = lazy(() => import('./pages/Admin/SiteSettings'));

const Loader = ({ text = 'Loading...' }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    height: '60vh', gap: '1rem', color: 'var(--muted-fg)'
  }}>
    <div style={{
      width: 40, height: 40, border: '3px solid var(--border)',
      borderTopColor: 'var(--blue)', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <span style={{ fontSize: '0.875rem' }}>{text}</span>
  </div>
);

function App() {
  const { user, init, loading } = useAuthStore();

  useEffect(() => { init(); }, [init]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: 'var(--bg)', gap: '1.25rem',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700,
          letterSpacing: '0.1em', color: 'var(--foreground)'
        }}>
          ZEAL<span style={{ color: 'var(--blue)' }}>MART</span>
        </div>
        <div style={{
          width: 36, height: 36, border: '3px solid var(--border)',
          borderTopColor: 'var(--blue)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <ReturnToTopButton />
      <Navbar />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--card)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: 'var(--blue)', secondary: 'white' } },
        }}
      />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/"               element={<Home />} />
          <Route path="/products"       element={<Shop />} />
          <Route path="/products/:id"   element={<ProductDetail />} />
          <Route path="/shop"           element={<Shop />} />

          {/* Electronics category routes */}
          <Route path="/phones"         element={<Shop />} />
          <Route path="/laptops"        element={<Shop />} />
          <Route path="/gaming"         element={<Shop />} />
          <Route path="/audio"          element={<Shop />} />
          <Route path="/tvs"            element={<Shop />} />
          <Route path="/accessories"    element={<Shop />} />

          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/verify-otp"     element={<VerifyOTP />} />
          <Route path="/forgot-password"element={<ForgotPassword />} />

          <Route path="/profile"        element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/notifications"  element={user ? <Notifications /> : <Navigate to="/login" />} />
          <Route path="/cart"           element={<Cart />} />
          <Route path="/delivery"       element={<DeliveryPortal />} />
          <Route path="/terms"          element={<Terms />} />
          <Route path="/privacy"        element={<PrivacyPolicy />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index              element={<ProductManager />} />
            <Route path="new"         element={<ProductForm />} />
            <Route path="edit/:id"    element={<ProductForm />} />
            <Route path="orders"      element={<AdminOrders />} />
            <Route path="settings"    element={<SiteSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
