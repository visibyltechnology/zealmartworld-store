import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import Footer from '../components/Footer';
import { Eye, EyeOff, CheckCircle, UserPlus } from 'lucide-react';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await auth.signOut();

      await setDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        isEmailVerified: false,
        otpCode: otpCode,
        otpExpiresAt: otpExpiresAt,
        createdAt: new Date()
      });

      if (formData.email === 'mayjayconcepts@gmail.com') {
        navigate('/admin');
      } else {
        try {
          await emailjs.send(
            'service_4qwypyf',
            'template_o17qzmm',
            {
              email: formData.email,
              name: formData.firstName,
              otp: otpCode,
              code: otpCode
            },
            'A7Sq--0D6K2sijujF'
          );
        } catch (emailErr) {
          console.error("EmailJS error:", emailErr);
        }

        navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
      }
    } catch (err) {
      console.error("Registration error full details:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
        toast.error('This email is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
        toast.error('Password is too weak.');
      } else if (err.message && err.message.toLowerCase().includes('offline')) {
        setError('Please check your internet connection and try again.');
        toast.error('Check your internet connection.');
      } else {
        setError(`Failed to register: ${err.message}`);
        toast.error(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
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
            <div className="bg-zeal-dark px-8 py-6 text-white">
              <h1 className="text-2xl font-black uppercase tracking-wide font-display">Create Account</h1>
              <p className="text-gray-400 text-sm font-medium mt-1">Join Zealmart — Nigeria's Electronics Marketplace</p>
            </div>

            {/* Card Body */}
            <div className="px-8 py-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-sm mb-6 flex items-center gap-2">
                  <i className="fas fa-exclamation-circle text-red-500"></i> {error}
                </div>
              )}

              {successMessage ? (
                <div className="text-center py-6">
                  <div className="flex flex-col items-center gap-4 bg-green-50 border border-green-200 rounded-sm p-8">
                    <CheckCircle size={52} className="text-green-500" strokeWidth={1.5} />
                    <div>
                      <h3 className="text-green-800 font-black text-xl uppercase mb-2">Account Created!</h3>
                      <p className="text-green-700 text-sm font-medium">{successMessage}</p>
                      <p className="text-green-600 text-sm mt-2">A verification OTP has been sent to your email.<br />Please check your inbox and spam folder.</p>
                    </div>
                  </div>
                  <Link to="/login" className="inline-block mt-6 bg-zeal-red text-white font-black py-3 px-10 uppercase tracking-wider text-sm rounded-sm hover:bg-red-800 transition">
                    Go to Login →
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-5">
                  {/* Name Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">First Name</label>
                      <div className="relative">
                        <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input
                          type="text" name="firstName" value={formData.firstName}
                          placeholder="John" required onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:border-zeal-blue outline-none text-sm font-medium transition-colors rounded-sm bg-gray-50 focus:bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Last Name</label>
                      <div className="relative">
                        <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input
                          type="text" name="lastName" value={formData.lastName}
                          placeholder="Doe" required onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:border-zeal-blue outline-none text-sm font-medium transition-colors rounded-sm bg-gray-50 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phone Number</label>
                    <div className="relative">
                      <i className="fas fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                      <input
                        type="tel" name="phone" value={formData.phone}
                        placeholder="+234 800 000 0000" required onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:border-zeal-blue outline-none text-sm font-medium transition-colors rounded-sm bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                      <input
                        type="email" name="email" value={formData.email}
                        placeholder="you@example.com" required onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:border-zeal-blue outline-none text-sm font-medium transition-colors rounded-sm bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password" value={formData.password}
                        placeholder="Create a strong password" minLength="6" required onChange={handleChange}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 focus:border-zeal-blue outline-none text-sm font-medium transition-colors rounded-sm bg-gray-50 focus:bg-white"
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Confirm Password</label>
                    <div className="relative">
                      <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword" value={formData.confirmPassword}
                        placeholder="Repeat your password" minLength="6" required onChange={handleChange}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 focus:border-zeal-blue outline-none text-sm font-medium transition-colors rounded-sm bg-gray-50 focus:bg-white"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-red-500 text-xs font-medium mt-1.5">
                        <i className="fas fa-times-circle mr-1"></i> Passwords do not match
                      </p>
                    )}
                    {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
                      <p className="text-green-500 text-xs font-medium mt-1.5">
                        <i className="fas fa-check-circle mr-1"></i> Passwords match
                      </p>
                    )}
                  </div>

                  {/* Terms note */}
                  <p className="text-xs text-gray-500 font-medium">
                    By registering, you agree to our <a href="#" className="text-zeal-blue hover:underline">Terms of Service</a> and <a href="#" className="text-zeal-blue hover:underline">Privacy Policy</a>.
                  </p>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-zeal-red hover:bg-red-800 disabled:opacity-60 text-white font-black py-4 rounded-sm uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin"></i> Creating Account...</>
                    ) : (
                      <><UserPlus size={16} /> Create My Account</>
                    )}
                  </button>

                  <div className="pt-4 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-600 font-medium">
                      Already have an account?{' '}
                      <Link to="/login" className="text-zeal-blue font-black hover:text-zeal-red transition-colors">
                        Sign In
                      </Link>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex justify-center gap-8 text-xs text-gray-400 font-medium">
            <span><i className="fas fa-lock mr-1 text-green-500"></i> Secure Registration</span>
            <span><i className="fas fa-shield-alt mr-1 text-blue-500"></i> 100% Safe</span>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
