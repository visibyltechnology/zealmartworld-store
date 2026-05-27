import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Footer from '../components/Footer';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (email === 'zealmart.ng@gmail.com') {
        toast.success('Welcome back, Admin!');
        navigate('/admin');
        return;
      }

      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.isEmailVerified === false) {
          await auth.signOut();
          setError('Please verify your email before logging in.');
          toast.error('Please verify your email.');
          setLoading(false);
          navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
          return;
        }
      }

      toast.success('Successfully logged in!');
      navigate('/shop');
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
        toast.error('Invalid email or password.');
      } else if (err.message && err.message.toLowerCase().includes('offline')) {
        setError('Please check your internet connection and try again.');
        toast.error('Check your internet connection.');
      } else {
        setError('Failed to sign in. Please try again later.');
        toast.error('Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Page Body */}
      <div className="flex-grow bg-gray-50 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <div className="font-display text-4xl font-black tracking-tighter">
                <span className="text-zeal-blue">ZEAL</span><span className="text-zeal-red">MART</span>
              </div>
            </Link>
            <p className="text-gray-500 text-sm mt-2 font-medium">Marketplace of the Nation</p>
          </div>

          {/* Card */}
          <div className="bg-white border border-gray-200 shadow-lg rounded-sm overflow-hidden">
            {/* Card Header */}
            <div className="bg-zeal-dark px-8 py-6 text-white">
              <h1 className="text-2xl font-black uppercase tracking-wide font-display">Welcome Back</h1>
              <p className="text-gray-400 text-sm font-medium mt-1">Sign in to your Zealmart account</p>
            </div>

            {/* Card Body */}
            <div className="px-8 py-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-sm mb-6 flex items-center gap-2">
                  <i className="fas fa-exclamation-circle text-red-500"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:border-zeal-blue outline-none text-sm font-medium transition-colors rounded-sm bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-xs text-zeal-blue font-bold hover:text-zeal-red transition-colors">Forgot Password?</Link>
                  </div>
                  <div className="relative">
                    <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 focus:border-zeal-blue outline-none text-sm font-medium transition-colors rounded-sm bg-gray-50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-zeal-red hover:bg-red-800 disabled:opacity-60 text-white font-black py-4 rounded-sm uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} /> Sign In to Account
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600 font-medium">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-zeal-blue font-black hover:text-zeal-red transition-colors">
                    Create Account
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex justify-center gap-8 text-xs text-gray-400 font-medium">
            <span><i className="fas fa-lock mr-1 text-green-500"></i> Secure Login</span>
            <span><i className="fas fa-shield-alt mr-1 text-blue-500"></i> 100% Safe</span>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
