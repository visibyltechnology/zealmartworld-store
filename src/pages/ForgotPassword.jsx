import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Footer from '../components/Footer';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendForgotPasswordOTPEmail } from '../utils/email';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Check if user exists in Firestore
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No account found with this email address.');
        toast.error('No account found.');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // 2. Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // 3. Save OTP to Firestore
      await updateDoc(doc(db, 'users', userDoc.id), {
        resetOtp: otpCode,
        resetOtpExpiresAt: otpExpiresAt
      });

      // 4. Send via WhatsApp/SMS (if phone exists)
      if (userData.phone) {
        try {
          await addDoc(collection(db, 'otp_requests'), {
            phone: userData.phone,
            otpCode: otpCode,
            status: 'pending',
            createdAt: new Date()
          });
        } catch (waErr) {
          console.error('WhatsApp OTP error:', waErr);
        }
      }

      // 5. Send via EmailJS using our centralized service
      try {
        await sendForgotPasswordOTPEmail(
          email,
          userData.firstName || 'Customer',
          otpCode
        );
      } catch (emailErr) {
        console.error('EmailJS error:', emailErr);
        // We continue even if EmailJS fails, because WhatsApp might have succeeded
      }

      // Redirect to Verify Reset OTP page
      toast.success('Password reset code sent!');
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);

    } catch (err) {
      console.error(err);
      setError('Failed to process reset request. Please try again.');
      toast.error('Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

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
