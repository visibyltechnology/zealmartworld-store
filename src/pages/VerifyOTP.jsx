import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { sendRegistrationOTPEmail } from '../utils/email';
import { hashOTP, verifyOTPHash } from '../utils/otpService';
import toast from 'react-hot-toast';
import Footer from '../components/Footer';

export default function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const navigate = useNavigate();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!email) {
      navigate('/login');
      return;
    }

    let interval;
    const fetchTimer = async () => {
      try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          if (userData.otpExpiresAt) {
            const expiresAt = userData.otpExpiresAt.toDate().getTime();
            
            const updateTimer = () => {
              const now = Date.now();
              const difference = expiresAt - now;
              if (difference > 0) {
                setTimeLeft(Math.floor(difference / 1000));
              } else {
                setTimeLeft(0);
                clearInterval(interval);
              }
            };
            
            updateTimer();
            interval = setInterval(updateTimer, 1000);
          }
        }
      } catch (err) {
        console.error("Failed to fetch timer:", err);
      }
    };

    fetchTimer();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [email, navigate]);

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    if (seconds === 0) return 'Code Expired';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value) {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && e.target.previousSibling) {
        e.target.previousSibling.focus();
      }
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    const enteredCode = otp.join('');
    if (enteredCode.length !== 6) {
      setError('Please enter the 6-digit code.');
      toast.error('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('User not found.');
        toast.error('User not found.');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      const isValid = await verifyOTPHash(enteredCode, userData.otpCodeHash);

      if (!isValid) {
        setError('Invalid OTP code.');
        toast.error('Invalid OTP code.');
        setLoading(false);
        return;
      }

      const now = new Date();
      const expiresAt = userData.otpExpiresAt?.toDate();

      if (!expiresAt || now > expiresAt) {
        setError('OTP has expired. Please request a new one.');
        toast.error('OTP has expired.');
        setLoading(false);
        return;
      }

      // Valid OTP
      await updateDoc(doc(db, 'users', userDoc.id), {
        isEmailVerified: true,
        otpCodeHash: null,
        otpExpiresAt: null
      });

      toast.success('Email successfully verified!');
      navigate('/login');

    } catch (err) {
      console.error(err);
      setError('Failed to verify OTP. Please try again.');
      toast.error('Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('User not found.');
        toast.error('User not found.');
        setResending(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.isEmailVerified) {
        toast.success('Email is already verified.');
        navigate('/login');
        return;
      }

      const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newOtpCodeHash = await hashOTP(newOtpCode);
      const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await updateDoc(doc(db, 'users', userDoc.id), {
        otpCodeHash: newOtpCodeHash,
        otpExpiresAt: newExpiresAt
      });

      // Send via WhatsApp first (if phone exists)
      if (userData.phone) {
        try {
          await addDoc(collection(db, 'otp_requests'), {
            phone: userData.phone,
            otpCode: newOtpCode,
            status: 'pending',
            createdAt: new Date()
          });
        } catch (waErr) {
          console.error('WhatsApp resend error:', waErr);
        }
      }

      // Send via EmailJS using centralised email.js
      try {
        const sent = await sendRegistrationOTPEmail(
          email,
          userData.firstName || 'Customer',
          newOtpCode
        );
        if (sent) {
          console.log('EmailJS resend success');
          toast.success('A new OTP has been sent to your email.');
        } else {
          throw new Error('Email failed to send');
        }
      } catch (emailErr) {
        console.error('EmailJS resend error:', emailErr);
        toast.error(`Email send failed: ${emailErr?.text || emailErr?.message || 'Unknown error'}`, { duration: 6000 });
        // WhatsApp fallback may still have worked
        if (userData.phone) {
          toast('Check your WhatsApp for the code.', { icon: '📱', duration: 5000 });
        }
      }

      setOtp(['', '', '', '', '', '']);
      setTimeLeft(15 * 60);
    } catch (err) {
      console.error(err);
      setError('Failed to resend OTP. Please try again later.');
      toast.error(`Resend failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-grow bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          
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
            <div className="bg-zeal-dark px-8 py-6 text-white text-center">
              <h1 className="text-2xl font-black uppercase tracking-wide font-display">Verify Your Email</h1>
              <p className="text-gray-400 text-sm font-medium mt-1">We sent a 6-digit code to <strong>{email}</strong></p>
            </div>

            <div className="px-8 py-8 text-center">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-sm mb-6 flex items-center gap-2 justify-center">
                  <i className="fas fa-exclamation-circle text-red-500"></i> {error}
                </div>
              )}

              {timeLeft !== null && (
                <div className={`mb-6 font-black text-xl tracking-wider ${timeLeft === 0 ? 'text-red-500' : 'text-zeal-blue'}`}>
                  {formatTime(timeLeft)}
                </div>
              )}

              <form onSubmit={verifyOTP}>
                <div className="flex justify-center gap-3 mb-8">
                  {otp.map((data, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      value={data}
                      onChange={(e) => handleChange(e.target, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onFocus={(e) => e.target.select()}
                      className="w-12 h-14 text-2xl text-center border-2 border-gray-200 focus:border-zeal-blue outline-none rounded-sm font-black bg-gray-50 focus:bg-white text-zeal-dark transition-all shadow-sm"
                    />
                  ))}
                </div>

                <button type="submit" disabled={loading} className="w-full bg-zeal-red hover:bg-red-800 disabled:opacity-60 text-white font-black py-4 rounded-sm uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin"></i> Verifying...</>
                  ) : (
                    <><i className="fas fa-check-circle"></i> Verify Email</>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600 font-medium">
                  Didn't receive the code?{' '}
                  <button 
                    onClick={handleResend} 
                    disabled={resending}
                    className="text-zeal-blue font-black hover:text-zeal-red transition-colors disabled:opacity-50 underline"
                  >
                    {resending ? 'Sending...' : 'Resend Code'}
                  </button>
                </p>
              </div>
            </div>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-6 flex justify-center gap-8 text-xs text-gray-400 font-medium">
            <span><i className="fas fa-shield-alt mr-1 text-blue-500"></i> Secure Verification</span>
          </div>

        </div>
      </div>
      <Footer />
    </main>
  );
}
