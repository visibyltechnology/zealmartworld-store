import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import useAuthStore from '../store/useAuthStore';
import Footer from '../components/Footer';
import { Package, Clock, CheckCircle, ShoppingBag, Search, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPaymentSuccessNotification } from '../utils/notificationService';

function fmt(n) {
  return '₦' + Math.ceil(n).toLocaleString('en-NG');
}

function PaymentBadge({ paymentChoice, installments, paymentFrequency }) {
  const isInstallment = paymentChoice === 'installment';
  return (
    <span className={`inline-block text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-wider ${isInstallment ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
      {isInstallment ? `${paymentFrequency === 'weekly' ? installments * 4 + ' Wkly' : installments + ' Mthly'}` : 'Full Payment'}
    </span>
  );
}

export default function Profile() {
  const { user, isAdmin, loading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customAmounts, setCustomAmounts] = useState({});

  // Filtering, Sorting & Collapse State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Orders');
  const [sortBy, setSortBy] = useState('Date (Newest First)');
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setProfileData(docSnap.data());

        const q = query(collection(db, "orders"), where("userId", "==", user.uid));
        const orderSnap = await getDocs(q);
        const ordersData = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        ordersData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        setOrders(ordersData);
      } catch (err) {
        console.error("Profile load error:", err);
        if (err.message && err.message.toLowerCase().includes('offline')) {
          setError('Please check your internet connection and try again.');
        } else {
          setError(`We encountered an issue loading your profile: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleContinuePayment = async (order, amountToPay) => {
    if (!user) return;
    setLoading(true);

    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        amountPaid: order.amountPaid + amountToPay,
        status: (order.amountPaid + amountToPay >= order.totalAmount) ? 'Completed' : 'Processing (Installments)'
      });
      
      setOrders(orders.map(o => {
        if (o.id === order.id) {
          return {
            ...o,
            amountPaid: o.amountPaid + amountToPay,
            status: (o.amountPaid + amountToPay >= o.totalAmount) ? 'Completed' : 'Processing (Installments)'
          };
        }
        return o;
      }));
      
      // Create a payment success notification for the user
      try {
        if (user?.uid) await createPaymentSuccessNotification(user.uid, order.id, amountToPay);
      } catch (notifErr) {
        console.error('Failed to create payment success notification:', notifErr);
      }

      toast.success('Payment recorded successfully!');
      
      setCustomAmounts(prev => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
    } catch (err) {
      console.error("Error updating order:", err);
      toast.error("Payment successful but failed to update order record.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
          <Clock size={40} className="mb-4 animate-pulse text-zeal-blue" />
          <h2 className="text-xl font-bold font-display uppercase tracking-widest text-gray-500">Loading Profile...</h2>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const totalSpent = orders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
  const pendingBalance = orders.reduce((sum, o) => sum + Math.max(0, (o.totalAmount || 0) - (o.amountPaid || 0)), 0);

  const toggleOrderExpand = (id) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'Completed' && o.status !== 'Completed') return false;
    if (statusFilter === 'Processing (Installments)' && o.status === 'Completed') return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (o.id.toLowerCase().includes(term)) return true;
      if (o.items?.some(i => i.name.toLowerCase().includes(term))) return true;
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'Date (Newest First)') return b.createdAt?.toMillis() - a.createdAt?.toMillis();
    if (sortBy === 'Date (Oldest First)') return a.createdAt?.toMillis() - b.createdAt?.toMillis();
    if (sortBy === 'Total Amount (High to Low)') return b.totalAmount - a.totalAmount;
    if (sortBy === 'Total Amount (Low to High)') return a.totalAmount - b.totalAmount;
    return 0;
  });

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-black text-gray-900 uppercase tracking-tight mb-2">My Account</h1>
          <p className="text-gray-500 font-medium text-sm">
            Welcome back{profileData ? `, ${profileData.firstName}` : ''}!
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-8 text-center font-medium text-sm flex items-center justify-center gap-2">
            <i className="fas fa-exclamation-circle text-red-500"></i> {error}
          </div>
        )}

        <div className="flex flex-col gap-8">

          {/* Stats Overview */}
          {!isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Orders', value: orders.length, icon: <Package size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                { label: 'Amount Paid', value: fmt(totalSpent), icon: <CheckCircle size={20} />, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                { label: 'Pending Balance', value: fmt(pendingBalance), icon: <Clock size={20} />, color: pendingBalance > 0 ? 'text-amber-600' : 'text-green-600', bg: pendingBalance > 0 ? 'bg-amber-50' : 'bg-green-50', border: pendingBalance > 0 ? 'border-amber-100' : 'border-green-100' },
              ].map(stat => (
                <div key={stat.label} className={`bg-white rounded-sm border ${stat.border} p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}>
                  <div className={`${stat.bg} ${stat.color} p-3 rounded-full flex-shrink-0`}>
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</div>
                    <div className="font-black text-xl text-gray-900 font-display">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Personal Info */}
          <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-zeal-dark px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-black text-white uppercase tracking-wider font-display">
                Personal Information
              </h2>
            </div>
            <div className="p-6">
              {profileData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Full Name', value: `${profileData.firstName || 'Admin'} ${profileData.lastName || ''}`, icon: 'fa-user' },
                    { label: 'Email Address', value: profileData.email || user.email, icon: 'fa-envelope' },
                    { label: 'Phone Number', value: profileData.phone || 'Not provided', icon: 'fa-phone' },
                    !isAdmin ? { label: 'Account Status', value: profileData.isEmailVerified ? 'Verified' : 'Unverified', icon: 'fa-shield-alt', special: !profileData.isEmailVerified } : null,
                  ].filter(Boolean).map(field => (
                    <div key={field.label} className="flex flex-col">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        <i className={`fas ${field.icon}`}></i> {field.label}
                      </div>
                      <div className={`font-bold text-sm ${field.special ? 'text-amber-500' : 'text-gray-800'}`}>
                        {field.value} {field.special === false && <i className="fas fa-check-circle text-green-500 ml-1"></i>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm font-medium">No profile details found.</p>
              )}
            </div>
          </div>

          {/* Orders Section */}
          {!isAdmin && (
            <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-white border-b border-gray-200 px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-wider font-display m-0">
                  Order History & Payment Tracking
                </h2>
                {orders.length > 0 && (
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-sm font-medium focus:border-zeal-blue outline-none transition-colors"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-sm px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-zeal-blue transition-colors flex-grow md:flex-grow-0"
                    >
                      <option>All Orders</option>
                      <option>Completed</option>
                      <option>Processing (Installments)</option>
                    </select>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-sm px-3 py-2 flex-grow md:flex-grow-0 focus-within:border-zeal-blue transition-colors">
                      <SlidersHorizontal size={14} className="text-gray-400" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none w-full"
                      >
                        <option>Date (Newest First)</option>
                        <option>Date (Oldest First)</option>
                        <option>Total Amount (High to Low)</option>
                        <option>Total Amount (Low to High)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium mb-6">You haven't placed any orders matching these criteria.</p>
                    <Link to="/products" className="inline-block bg-zeal-red text-white font-bold py-3 px-8 rounded-sm uppercase tracking-wider text-sm hover:bg-red-800 transition-colors shadow-md">
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {filteredOrders.map(order => {
                      const pct = Math.min(100, Math.round((order.amountPaid / order.totalAmount) * 100));
                      const isComplete = order.amountPaid >= order.totalAmount;
                      
                      const combinedPeriodPayment = order.items?.reduce((acc, i) => acc + (i.paymentChoice === 'installment' ? (i.periodPayment || i.monthlyPayment) * i.quantity : 0), 0) || 0;
                      const isWeekly = order.items?.some(i => i.paymentFrequency === 'weekly');
                      const maxPeriods = Math.max(...(order.items?.map(i => i.paymentChoice === 'installment' ? (isWeekly ? i.installments * 4 : i.installments) : 0) || [0]));
                      
                      // Calculate how much of the paid amount was for installments vs full payments
                      const totalFullPayments = order.items?.reduce((acc, i) => acc + (i.paymentChoice === 'full' ? i.price * i.quantity : 0), 0) || 0;
                      const amountPaidTowardsInstallments = Math.max(0, order.amountPaid - totalFullPayments);

                      const periodsPaid = combinedPeriodPayment > 0 ? Math.floor(amountPaidTowardsInstallments / combinedPeriodPayment) : 0;
                      const excessPaid = combinedPeriodPayment > 0 ? (amountPaidTowardsInstallments % combinedPeriodPayment) : 0;
                      
                      let nextPaymentDate = null;
                      let timerText = '';
                      let isOverdue = false;

                      if (!isComplete && order.createdAt) {
                        nextPaymentDate = new Date(order.createdAt.toMillis());
                        if (isWeekly) {
                          nextPaymentDate.setDate(nextPaymentDate.getDate() + (periodsPaid + 1) * 7);
                        } else {
                          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + (periodsPaid + 1));
                        }

                        const diffTime = nextPaymentDate.getTime() - new Date().getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) {
                          isOverdue = true;
                          timerText = `Overdue by ${Math.abs(diffDays)} days`;
                        } else if (diffDays === 0) {
                          timerText = `Due today!`;
                          isOverdue = true;
                        } else {
                          timerText = `Due in ${diffDays} days`;
                        }
                      }
                      
                      const balance = order.totalAmount - order.amountPaid;
                      
                      let defaultCustomAmount = combinedPeriodPayment;
                      if (excessPaid > 0 && combinedPeriodPayment > 0) {
                        defaultCustomAmount = combinedPeriodPayment - excessPaid;
                      }
                      defaultCustomAmount = Math.min(balance, defaultCustomAmount);
                      
                      const currentCustomAmount = customAmounts[order.id] !== undefined ? customAmounts[order.id] : defaultCustomAmount;

                      return (
                        <div key={order.id} className={`border rounded-sm overflow-hidden bg-white transition-all ${isComplete ? 'border-green-200' : 'border-gray-200 hover:border-gray-300'}`}>
                          
                          {/* Order Header */}
                          <div 
                            className={`flex flex-wrap justify-between items-center gap-2 px-5 py-4 cursor-pointer select-none transition-colors ${isComplete ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'} ${expandedOrders.has(order.id) ? 'border-b border-gray-200' : ''}`}
                            onClick={() => toggleOrderExpand(order.id)}
                          >
                            <div>
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                {order.createdAt?.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                              <strong className="font-mono text-sm text-gray-800">#{order.id.slice(0, 14)}</strong>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${isComplete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {isComplete ? <CheckCircle size={14} /> : <Clock size={14} />}
                                {order.status}
                              </span>
                              <div className="bg-white p-1 rounded border border-gray-200 text-gray-500 shadow-sm">
                                {expandedOrders.has(order.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>
                          </div>

                          {/* Order Body */}
                          {expandedOrders.has(order.id) && (
                            <div className="p-0">
                              <div className="flex flex-col lg:flex-row border-b border-gray-100">
                                {/* Items List */}
                                <div className="flex-grow p-5 border-r border-gray-100">
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Items in Order</h3>
                                  <div className="flex flex-col gap-4">
                                    {order.items?.map((item, idx) => (
                                      <div key={idx} className={`flex gap-4 pb-4 ${idx < order.items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                        <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded flex items-center justify-center flex-shrink-0 p-1">
                                          <img src={item.img} alt={item.name} loading="lazy" className="max-w-full max-h-full object-contain" />
                                        </div>
                                        <div className="flex-grow">
                                          <div className="font-bold text-sm text-gray-800 mb-1 leading-snug line-clamp-2">{item.name}</div>
                                          <div className="text-xs font-medium text-gray-500 mb-2">
                                            Qty: {item.quantity} {item.length && <span className="mx-1">•</span>} {item.length && `Length: ${item.length}`}
                                          </div>
                                          <PaymentBadge paymentChoice={item.paymentChoice} installments={item.installments} paymentFrequency={item.paymentFrequency} />
                                          {item.paymentChoice === 'installment' && (item.periodPayment || item.monthlyPayment) ? (
                                            <div className="text-xs font-bold text-gray-600 mt-2">
                                              {fmt((item.periodPayment || item.monthlyPayment) * item.quantity)}<span className="text-gray-400 font-medium">/{item.paymentFrequency === 'weekly' ? 'wk' : 'mo'}</span>
                                            </div>
                                          ) : item.paymentChoice === 'full' ? (
                                            <div className="text-xs font-bold text-gray-900 mt-2">
                                              {fmt(item.price * item.quantity)}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Payment Summary Panel */}
                                <div className="w-full lg:w-80 bg-gray-50 p-6 flex-shrink-0">
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Payment Summary</h3>
                                  
                                  <div className="flex justify-between items-center mb-2 text-sm">
                                    <span className="font-medium text-gray-500">Order Total:</span>
                                    <strong className="text-gray-900 font-display">{fmt(order.totalAmount)}</strong>
                                  </div>
                                  <div className="flex justify-between items-center mb-4 text-sm">
                                    <span className="font-medium text-gray-500">Paid So Far:</span>
                                    <strong className="text-zeal-blue font-display">{fmt(order.amountPaid)}</strong>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-2">
                                    <div className={`h-full transition-all duration-1000 ${isComplete ? 'bg-green-500' : 'bg-zeal-blue'}`} style={{ width: `${pct}%` }}></div>
                                  </div>
                                  
                                  <div className="text-[11px] font-bold text-center uppercase tracking-wider mb-6">
                                    {isComplete ? (
                                      <span className="text-green-600"><i className="fas fa-check-circle mr-1"></i> Fully paid</span>
                                    ) : (
                                      <span className="text-gray-500">{pct}% paid <span className="mx-1">•</span> Balance: <span className="text-zeal-red">{fmt(balance)}</span></span>
                                    )}
                                  </div>

                                  {!isComplete && nextPaymentDate && (
                                    <div className="bg-white border border-gray-200 rounded p-3 text-center mb-6 shadow-sm">
                                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Next Payment Due</div>
                                      <div className="font-black text-gray-900 mb-2">{nextPaymentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                      <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {timerText}
                                      </span>
                                    </div>
                                  )}

                                  {!isComplete && (
                                    <div className="flex flex-col gap-3">
                                      <button
                                        onClick={() => handleContinuePayment(order, defaultCustomAmount)}
                                        disabled={loading}
                                        className="w-full bg-zeal-blue hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-sm text-sm uppercase tracking-wider transition-colors disabled:opacity-70 shadow-md flex items-center justify-center gap-2"
                                      >
                                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-credit-card"></i>}
                                        Pay {fmt(defaultCustomAmount)}
                                      </button>
                                      
                                      <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-gray-200"></div>
                                        <span className="flex-shrink-0 mx-4 text-xs font-bold text-gray-400 uppercase">OR CUSTOM</span>
                                        <div className="flex-grow border-t border-gray-200"></div>
                                      </div>

                                      <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₦</span>
                                          <input
                                            type="number"
                                            value={currentCustomAmount}
                                            onChange={(e) => setCustomAmounts(prev => ({ ...prev, [order.id]: Number(e.target.value) }))}
                                            max={balance}
                                            min={1}
                                            className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-300 rounded-sm text-sm font-bold focus:border-zeal-blue outline-none transition-colors"
                                          />
                                        </div>
                                        <button
                                          onClick={() => handleContinuePayment(order, currentCustomAmount)}
                                          disabled={loading || currentCustomAmount <= 0 || currentCustomAmount > balance}
                                          className="bg-gray-800 hover:bg-black text-white px-4 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                                        >
                                          Pay
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Order Status Section */}
                              <div className="p-5 bg-white border-t border-gray-100">
                                <div className="mb-4">
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Delivery Status</h3>
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider ${isComplete ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                      {isComplete ? (
                                        <>
                                          <i className="fas fa-box text-sm"></i> Ready for Delivery
                                        </>
                                      ) : (
                                        <>
                                          <i className="fas fa-hourglass-half text-sm animate-pulse"></i> Processing
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  {isComplete && (
                                    <div className="mt-3">
                                      <Link to="/delivery" className="inline-flex items-center gap-2 bg-zeal-blue text-white font-bold py-2 px-4 rounded-sm text-sm uppercase tracking-wider hover:bg-blue-900 transition-colors shadow-md">
                                        <i className="fas fa-map-location-dot"></i> Track Delivery
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Installment Schedule Breakdown */}
                              {combinedPeriodPayment > 0 && (
                                <div className="p-5 bg-white">
                                  <div className="border border-gray-200 rounded-sm overflow-hidden">
                                    <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Payment Schedule <span className="mx-1">—</span> {maxPeriods} {isWeekly ? 'Weeks' : 'Months'}
                                      </span>
                                      <span className="text-[11px] font-bold text-gray-500 bg-white px-2 py-1 border border-gray-200 rounded">
                                        {periodsPaid} of {maxPeriods} paid <span className="mx-1">•</span> {fmt(combinedPeriodPayment)}/{isWeekly ? 'wk' : 'mo'}
                                      </span>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                      {Array.from({ length: maxPeriods }).map((_, idx) => {
                                        const periodNum = idx + 1;
                                        let status = 'unpaid';
                                        if (periodsPaid >= periodNum) status = 'paid';
                                        else if (periodsPaid + 1 === periodNum && excessPaid > 0) status = 'partial';

                                        let periodDate = null;
                                        if (order.createdAt) {
                                          periodDate = new Date(order.createdAt.toMillis());
                                          if (isWeekly) periodDate.setDate(periodDate.getDate() + periodNum * 7);
                                          else periodDate.setMonth(periodDate.getMonth() + periodNum);
                                        }

                                        const rowBg = status === 'paid' ? 'bg-green-50/50' : status === 'partial' ? 'bg-amber-50/50' : 'bg-white';
                                        const dotColor = status === 'paid' ? 'bg-green-500' : status === 'partial' ? 'bg-amber-500' : 'bg-gray-200';
                                        const statusLabel = status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Pending';
                                        const statusColor = status === 'paid' ? 'text-green-700 bg-green-100' : status === 'partial' ? 'text-amber-700 bg-amber-100' : 'text-gray-500 bg-gray-100';
                                        const statusIcon = status === 'paid' ? 'fa-check' : status === 'partial' ? 'fa-hourglass-half' : 'fa-circle';

                                        return (
                                          <div key={idx} className={`flex items-center gap-4 px-5 py-3 ${rowBg} hover:bg-gray-50 transition-colors`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${dotColor} ${status === 'unpaid' ? 'text-gray-500' : 'text-white'}`}>
                                              {periodNum}
                                            </div>
                                            <div className="flex-grow">
                                              <div className="font-bold text-sm text-gray-800">
                                                {isWeekly ? 'Week' : 'Month'} {periodNum}
                                                {status === 'partial' && <span className="ml-2 text-[11px] text-amber-600 font-medium">Remaining: {fmt(combinedPeriodPayment - excessPaid)}</span>}
                                              </div>
                                              <div className="text-[11px] font-medium text-gray-500 mt-0.5">
                                                Due: {periodDate ? periodDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="font-bold text-sm text-gray-900">
                                                {status === 'paid' ? fmt(combinedPeriodPayment) : status === 'partial' ? <span><span className="text-amber-600">{fmt(excessPaid)}</span> <span className="text-xs text-gray-400 font-medium">of {fmt(combinedPeriodPayment)}</span></span> : fmt(combinedPeriodPayment)}
                                              </div>
                                              <div className="mt-1">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${statusColor}`}>
                                                  <i className={`fas ${statusIcon} text-[8px]`}></i> {statusLabel}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </main>
  );
}
