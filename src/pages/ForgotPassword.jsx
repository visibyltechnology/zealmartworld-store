import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import Footer from '../components/Footer';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
      });
      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
      toast.error('Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="flex-grow bg-gray-50 flex items-center justify-center py-16 px-4">
          <div className="w-full max-w-md bg-white border border-gray-200 shadow-lg rounded-sm overflow-hidden text-center py-12 px-8">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
            <h2 className="text-2xl font-black uppercase tracking-wide font-display text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600 font-medium mb-8">
              We've sent a password reset link to <strong>{email}</strong>. Please click the link in that email to create a new password.
            </p>
            <Link to="/login" className="w-full inline-block bg-zeal-red hover:bg-red-800 text-white font-black py-4 rounded-sm uppercase tracking-widest text-sm transition-all shadow-md hover:shadow-lg">
              Return to Login
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // emailSent state is no longer used since we navigate directly to /reset-password
  return (
    <main className="min-h-screen flex flex-col">
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

          <div className="bg-white border border-gray-200 shadow-lg rounded-sm overflow-hidden">
            <div className="bg-zeal-dark px-8 py-6 text-white relative">
              <Link to="/login" className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
                <ArrowLeft size={14} /> Back
              </Link>
              <h1 className="text-2xl font-black uppercase tracking-wide font-display">Reset Password</h1>
              <p className="text-gray-400 text-sm font-medium mt-1">Enter your email to receive a reset link</p>
            </div>

            <div className="px-8 py-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-sm mb-6 flex items-center gap-2">
                  <i className="fas fa-exclamation-circle text-red-500"></i>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-zeal-red hover:bg-red-800 disabled:opacity-60 text-white font-black py-4 rounded-sm uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin"></i> Sending Code...</>
                  ) : (
                    <>Send Reset Code</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
