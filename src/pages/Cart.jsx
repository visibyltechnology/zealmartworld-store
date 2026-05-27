import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowLeft, CreditCard, ShoppingBag } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { checkCartAccess } from '../utils/rbac';
import { initializeOrderTracking } from '../utils/orderTrackingService';
import { decreaseInventory } from '../utils/inventoryService';
import {
  createOrderPlacedNotification,
  createPaymentSuccessNotification
} from '../utils/notificationService';

function fmt(n) {
  return '₦' + Math.ceil(n).toLocaleString('en-NG');
}

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, _hydrated, removeFromCart, updateQuantity, getInitialPaymentTotal, clearCart } = useCartStore();

  // RBAC: Check if user is admin - admins cannot access cart
  useEffect(() => {
    if (user && user.email === 'zealmart.ng@gmail.com') {
      toast.error('Admin accounts cannot access the shopping cart');
      navigate('/admin');
      return;
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: '',
    city: '',
    state: '',
    phone: '',
    instructions: ''
  });
  const [showPreview, setShowPreview] = useState(false);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [expandedItems, setExpandedItems] = useState([]);
  const [itemGroups, setItemGroups] = useState({});

  const getPaymentSignature = (item) => {
    if (item.paymentChoice === 'full') return 'full';
    return `${item.paymentFrequency}-${item.installments}`;
  };

  const getGroupConflicts = (groups) => {
    const conflicts = {};
    Object.entries(groups).forEach(([gId, groupItems]) => {
      const installmentSigs = groupItems
        .filter(i => i.paymentChoice !== 'full')
        .map(i => getPaymentSignature(i));
      const uniqueSigs = new Set(installmentSigs);
      if (uniqueSigs.size > 1) conflicts[gId] = [...uniqueSigs];
    });
    return conflicts;
  };

  const buildGroupMap = (expItems) => {
    return expItems.reduce((acc, item) => {
      const gId = itemGroups[item.splitId] || 1;
      if (!acc[gId]) acc[gId] = [];
      acc[gId].push(item);
      return acc;
    }, {});
  };

  const enterSplitMode = () => {
    const expanded = [];
    let sigToGroup = {};
    let groupCounter = 1;
    items.forEach(item => {
      const sig = getPaymentSignature(item);
      if (!sigToGroup[sig]) sigToGroup[sig] = groupCounter++;
      for (let i = 0; i < item.quantity; i++) {
        expanded.push({ ...item, quantity: 1, splitId: `${item.cartItemId}_${i}` });
      }
    });
    setExpandedItems(expanded);
    const newGroups = {};
    sigToGroup = {};
    groupCounter = 1;
    expanded.forEach(unit => {
      const sig = getPaymentSignature(unit);
      if (!sigToGroup[sig]) sigToGroup[sig] = groupCounter++;
      newGroups[unit.splitId] = sigToGroup[sig];
    });
    setItemGroups(newGroups);
    setSplitMode(true);
  };

  const exitSplitMode = () => {
    setSplitMode(false);
    setExpandedItems([]);
    setItemGroups({});
  };

  const recalcPeriodPayment = (item, targetFreq, targetDur) => {
    const INTEREST = { 2: 0, 3: 0.1, 4: 0.1, 5: 0.2, 6: 0.2 };
    const rate = INTEREST[targetDur] ?? 0.2;
    const fullAmount = item.price * (1 + rate);
    if (targetFreq === 'weekly') {
      return fullAmount / (targetDur * 4);
    }
    return fullAmount / targetDur;
  };

  if (!_hydrated) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
          <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-zeal-blue"></i>
          <h2 className="text-xl font-bold font-display uppercase tracking-widest text-gray-500">Loading Cart...</h2>
        </div>
      </main>
    );
  }

  const totalToPayNow = getInitialPaymentTotal();

  const loadKorapayScript = () => new Promise((resolve, reject) => {
    if (window.Korapay) { resolve(); return; }

    // Remove any previously-failed script tag so we can inject a fresh one
    const existing = document.querySelector('script[data-korapay]');
    if (existing) existing.remove();

    const s = document.createElement('script');
    s.src = 'https://korablobstorage.blob.core.windows.net/modal/korapay.js';
    s.setAttribute('data-korapay', 'true');
    s.onload = () => resolve();
    s.onerror = () => {
      s.remove(); // clean up so the next attempt starts fresh too
      reject(new Error('Korapay script failed to load'));
    };
    document.head.appendChild(s);
  });

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (items.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const koraKey = import.meta.env.VITE_KORA_PUBLIC_KEY;
      if (!koraKey) {
        toast.error('Payment key is missing. Please contact support.');
        setLoading(false);
        return;
      }

      // Ensure Korapay script is loaded (handles race-condition on first load)
      try {
        await loadKorapayScript();
      } catch {
        toast.error('Could not load payment gateway. Check your connection and try again.');
        setLoading(false);
        return;
      }

      if (!window.Korapay) {
        toast.error('Payment gateway failed to initialise. Please refresh and try again.');
        setLoading(false);
        return;
      }

      window.Korapay.initialize({
        key: koraKey,
        reference: `ZEAL_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        amount: totalToPayNow,
        currency: "NGN",
        customer: {
            name: user.displayName || user.email.split('@')[0],
            email: user.email
        },
        onSuccess: async function(response) {
            toast.success("Payment verified! Processing order...");
            try {
              if (splitMode) {
                const groups = buildGroupMap(expandedItems);
                for (const [gId, groupUnits] of Object.entries(groups)) {
                  if (groupUnits.length === 0) continue;
                  const merged = {};
                  groupUnits.forEach(unit => {
                    if (!merged[unit.cartItemId]) merged[unit.cartItemId] = { ...unit, quantity: 0 };
                    merged[unit.cartItemId].quantity += 1;
                  });
                  const groupItems = Object.values(merged);
                  const groupTotalAmount = groupItems.reduce((acc, i) => acc + (i.paymentChoice === 'full' ? i.price * i.quantity : (i.price * (1 + (i.installments === 3 || i.installments === 4 ? 0.1 : i.installments > 4 ? 0.2 : 0))) * i.quantity), 0);
                  const groupTotalToPayNow = groupItems.reduce((acc, i) => acc + (i.paymentChoice === 'full' ? i.price * i.quantity : (i.periodPayment || i.monthlyPayment || 0) * i.quantity), 0);

                  for (const item of groupItems) {
                    try {
                      await decreaseInventory(item.id, Number(item.quantity));
                    } catch (inventoryErr) {
                      console.error('Error updating inventory for item:', item.id, inventoryErr);
                    }
                  }

                  const orderRef = await addDoc(collection(db, "orders"), initializeOrderTracking({
                    userId: user.uid,
                    items: groupItems,
                    deliveryInfo: deliveryInfo,
                    totalAmount: groupTotalAmount,
                    amountPaid: groupTotalToPayNow,
                    status: 'Processing',
                    paymentRef: response.reference || `REF_${Date.now()}_G${gId}`,
                    createdAt: new Date(),
                  }));

                  try {
                    await createOrderPlacedNotification(user.uid, orderRef.id, groupItems.length);
                    await createPaymentSuccessNotification(user.uid, orderRef.id, groupTotalToPayNow);
                  } catch (notifErr) {
                    console.error('Error creating notifications:', notifErr);
                  }
                }
              } else {
                for (const item of items) {
                  try {
                    await decreaseInventory(item.id, Number(item.quantity));
                  } catch (inventoryErr) {
                    console.error('Error updating inventory for item:', item.id, inventoryErr);
                  }
                }

                const orderTotalAmount = items.reduce((acc, i) => acc + (i.paymentChoice === 'full' ? i.price * i.quantity : (i.price * (1 + (i.installments === 3 || i.installments === 4 ? 0.1 : i.installments > 4 ? 0.2 : 0))) * i.quantity), 0);
                const orderRef = await addDoc(collection(db, "orders"), initializeOrderTracking({
                  userId: user.uid,
                  items: items,
                  deliveryInfo: deliveryInfo,
                  totalAmount: orderTotalAmount,
                  amountPaid: totalToPayNow,
                  status: 'Processing',
                  paymentRef: response.reference || `REF_${Date.now()}`,
                  createdAt: new Date(),
                }));

                try {
                  await createOrderPlacedNotification(user.uid, orderRef.id, items.length);
                  await createPaymentSuccessNotification(user.uid, orderRef.id, totalToPayNow);
                } catch (notifErr) {
                  console.error('Error creating notifications:', notifErr);
                }
              }

              clearCart();
              toast.success('Order placed successfully!');
              setShowPreview(false);
              setLoading(false);
              navigate('/profile');
            } catch (err) {
              console.error("Error saving order:", err);
              setError("Payment successful but failed to save order. Please contact support.");
              setLoading(false);
            }
        },
        onClose: function() {
            setLoading(false);
            toast.error("Payment was cancelled.");
        }
      });
    } catch (err) {
      console.error("Error initializing payment:", err);
      setError("Failed to initialize payment gateway.");
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-grow flex flex-col items-center justify-center px-4 py-12 text-center">
          <ShoppingBag size={64} className="text-gray-300 mb-6 mx-auto" />
          <h1 className="text-3xl font-display font-black uppercase tracking-wider text-gray-900 mb-4">Your Bag is Empty</h1>
          <p className="text-gray-500 font-medium mb-8">Looks like you haven't added anything yet.</p>
          <Link to="/products" className="inline-block bg-zeal-red hover:bg-red-800 text-white font-bold py-3 px-8 rounded-sm uppercase tracking-wider text-sm transition-colors shadow-md">
            Start Shopping
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-zeal-red uppercase tracking-wider transition-colors mb-8">
          <ArrowLeft size={16} /> Continue Shopping
        </Link>

        <h1 className="text-3xl font-display font-black text-gray-900 uppercase tracking-tight mb-8">Shopping Bag</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-8 text-sm font-medium flex items-center gap-2">
            <i className="fas fa-exclamation-circle text-red-500"></i> {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Items List */}
          <div className="w-full lg:flex-grow flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.cartItemId} className="bg-white border border-gray-200 rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row gap-5 hover:border-gray-300 transition-colors shadow-sm">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 border border-gray-100 rounded flex items-center justify-center flex-shrink-0 p-2 relative">
                  <img src={item.img} alt={item.name} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                </div>

                <div className="flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="pr-4">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight mb-1">{item.name}</h3>
                      <p className="text-xs font-medium text-gray-500">Length: {item.length}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-400 hover:text-red-500 transition-colors p-1" aria-label="Remove item">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-auto gap-4">
                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                      {item.paymentChoice === 'installment' ? (
                        items.filter(i => i.paymentChoice === 'installment').length > 1 ? (
                          <div className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-medium p-2 rounded max-w-xs leading-relaxed">
                            <strong className="block mb-0.5"><i className="fas fa-info-circle mr-1"></i> Multiple Installment Items Detected</strong>
                            Payments will be combined into a single schedule during order review.
                          </div>
                        ) : (
                          <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-wider w-max">
                            {item.paymentFrequency === 'weekly' ? item.installments * 4 + ' Weekly Payments' : item.installments + ' Monthly Payments'}
                          </span>
                        )
                      ) : (
                        <span className="inline-block bg-green-50 text-green-700 border border-green-100 text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-wider w-max">
                          Full Payment
                        </span>
                      )}
                      
                      <div className="flex items-center border border-gray-200 rounded-sm w-max bg-gray-50">
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="px-3 py-1 hover:bg-gray-200 text-gray-600 font-bold transition-colors">-</button>
                        <span className="px-3 py-1 font-bold text-sm bg-white border-x border-gray-200 min-w-[40px] text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="px-3 py-1 hover:bg-gray-200 text-gray-600 font-bold transition-colors">+</button>
                      </div>
                    </div>

                    <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-0 border-gray-100 pt-3 sm:pt-0">
                      {item.paymentChoice === 'installment' ? (
                        <div>
                          <div className="font-display font-black text-lg text-gray-900">{fmt((item.periodPayment || item.monthlyPayment || 0) * item.quantity)}</div>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">/ {item.paymentFrequency === 'weekly' ? 'Week' : 'Month'}</div>
                        </div>
                      ) : (
                        <div className="font-display font-black text-lg text-gray-900">{fmt(item.price * item.quantity)}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Summary Sidebar */}
          <div className="w-full lg:w-[400px] flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-sm p-6 lg:p-8 shadow-sm sticky top-8">
              
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-3">Delivery Information</h2>
              <div className="flex flex-col gap-3 mb-8">
                <input type="text" placeholder="Full Address" value={deliveryInfo.address} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-sm font-medium rounded-sm px-4 py-2.5 outline-none focus:border-zeal-blue transition-colors" />
                <div className="flex gap-3">
                  <input type="text" placeholder="City" value={deliveryInfo.city} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, city: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-sm font-medium rounded-sm px-4 py-2.5 outline-none focus:border-zeal-blue transition-colors" />
                  <input type="text" placeholder="State" value={deliveryInfo.state} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, state: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-sm font-medium rounded-sm px-4 py-2.5 outline-none focus:border-zeal-blue transition-colors" />
                </div>
                <div>
                  <input type="tel" placeholder="WhatsApp Number (e.g. +234...)" value={deliveryInfo.phone} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-sm font-medium rounded-sm px-4 py-2.5 outline-none focus:border-zeal-blue transition-colors" />
                  <span className="text-[10px] font-bold text-gray-500 mt-1 block uppercase tracking-wider">Required for WhatsApp delivery updates. Please include country code (+234).</span>
                </div>
                <textarea placeholder="Additional Instructions (Optional)" value={deliveryInfo.instructions} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, instructions: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-sm font-medium rounded-sm px-4 py-2.5 outline-none focus:border-zeal-blue transition-colors resize-y min-h-[80px]"></textarea>
              </div>

              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-3">Order Summary</h2>
              
              <div className="flex justify-between items-center text-sm font-medium text-gray-500 mb-3">
                <span>Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} items)</span>
                <span className="text-gray-900 font-bold">{fmt(totalToPayNow)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-gray-500 mb-6">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>

              <div className="flex justify-between items-end border-t border-gray-200 pt-4 mb-6">
                <span className="text-sm font-bold text-gray-800 uppercase tracking-widest">Total Due Today</span>
                <span className="text-2xl font-display font-black text-zeal-red">{fmt(totalToPayNow)}</span>
              </div>

              {!user && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-sm mb-6 text-sm font-bold flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle"></i> You must be logged in to checkout.
                </div>
              )}

              <button
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  if (items.length === 0) return;
                  if (!deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.state || !deliveryInfo.phone) {
                    toast.error('Please fill out all required delivery fields.');
                    setError('Please fill out all required delivery fields.');
                    return;
                  }
                  setError('');
                  setShowPreview(true);
                }}
                disabled={loading}
                className="w-full bg-zeal-dark hover:bg-black text-white font-black py-4 rounded-sm text-sm uppercase tracking-widest transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                Review & Confirm Order
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <i className="fas fa-lock"></i> Secure Checkout (Test Mode)
              </div>
            </div>
          </div>

        </div>
      </div>
      <Footer />

      {/* Confirm Order Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="bg-zeal-dark text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-display font-black uppercase tracking-wider m-0">Confirm Your Order</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white transition-colors">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow">
              {/* Delivery Info */}
              <div className="mb-8 border border-gray-200 rounded-sm p-4 bg-gray-50">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <i className="fas fa-map-marker-alt"></i> Delivery Info
                </h3>
                <p className="font-bold text-sm text-gray-800 mb-1">{deliveryInfo.address}</p>
                <p className="text-xs font-medium text-gray-500 mb-1">{deliveryInfo.city}, {deliveryInfo.state}</p>
                <p className="text-xs font-medium text-gray-500">Phone: {deliveryInfo.phone}</p>
              </div>

              <div className="mb-4">
                {(() => {
                  const installmentSigs = items
                    .filter(i => i.paymentChoice !== 'full')
                    .map(i => `${i.paymentFrequency}-${i.installments}`);
                  const hasSingleOrderConflict = new Set(installmentSigs).size > 1;

                  return (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-gray-100 pb-3">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-box"></i> Order Items
                      </h3>
                      <button
                        onClick={() => { splitMode ? exitSplitMode() : enterSplitMode(); }}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-colors ${splitMode ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : hasSingleOrderConflict ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                      >
                        {splitMode ? '← Merge into Single Order' : hasSingleOrderConflict ? '⚠️ Resolve Conflicting Orders' : 'Split into Multiple Orders'}
                      </button>
                    </div>
                  );
                })()}

                {splitMode ? (() => {
                  const groupMap = buildGroupMap(expandedItems);
                  const conflicts = getGroupConflicts(groupMap);
                  const hasAnyConflict = Object.keys(conflicts).length > 0;

                  return (
                    <>
                      {Object.entries(groupMap).sort(([a],[b]) => Number(a)-Number(b)).map(([gId, groupUnits]) => {
                        const conflict = conflicts[gId];
                        const hasConflict = !!conflicts[gId];
                        return (
                          <div key={gId} className={`mb-6 border rounded-sm overflow-hidden ${hasConflict ? 'border-red-300' : 'border-gray-200'}`}>
                            <div className={`px-4 py-3 flex justify-between items-center border-b ${hasConflict ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <strong className={`text-sm font-black uppercase tracking-wider ${hasConflict ? 'text-red-700' : 'text-gray-900'}`}>Order {gId}</strong>
                              {groupUnits.some(u => u.paymentChoice !== 'full') && (
                                <button
                                  onClick={() => {
                                    const firstSig = groupUnits.find(u => u.paymentChoice !== 'full');
                                    if (!firstSig) return;
                                    const targetFreq = firstSig.paymentFrequency;
                                    const targetDur = firstSig.installments;
                                    setExpandedItems(prev => prev.map(unit => {
                                      if ((itemGroups[unit.splitId] || 1) === Number(gId) && unit.paymentChoice !== 'full') {
                                        const newPeriodPayment = recalcPeriodPayment(unit, targetFreq, targetDur);
                                        return { ...unit, paymentFrequency: targetFreq, installments: targetDur, periodPayment: newPeriodPayment };
                                      }
                                      return unit;
                                    }));
                                  }}
                                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-colors ${hasConflict ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                >
                                  {hasConflict ? '⚠️ Unify Plans' : 'Unify Plans'}
                                </button>
                              )}
                            </div>
                            <div className="p-4 bg-white flex flex-col gap-2">
                            {groupUnits.map(unit => (
                              <div key={unit.splitId} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-sm">
                                
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-bold text-gray-400">1×</span>
                                  <span className="font-bold text-xs text-gray-800 truncate max-w-[150px] sm:max-w-xs">{unit.name}</span>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">({unit.paymentChoice === 'full' ? 'Full' : `${unit.installments} ${unit.paymentFrequency === 'weekly' ? 'Wks' : 'Mos'}`})</span>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                  <span className="font-bold text-sm text-gray-900 w-24 text-right pr-2 border-r border-gray-200">{fmt(unit.paymentChoice === 'full' ? unit.price : unit.periodPayment || 0)}</span>
                                  
                                  <select
                                    value={itemGroups[unit.splitId] || 1}
                                    onChange={(e) => setItemGroups(prev => ({ ...prev, [unit.splitId]: Number(e.target.value) }))}
                                    className="bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-sm px-2 py-1 outline-none focus:border-zeal-blue"
                                  >
                                    {[1,2,3,4,5].map(n => <option key={n} value={n}>Order {n}</option>)}
                                  </select>

                                  {unit.paymentChoice !== 'full' && (
                                    <>
                                      <select
                                        value={unit.paymentFrequency}
                                        onChange={(e) => {
                                          const newFreq = e.target.value;
                                          const newPP = recalcPeriodPayment(unit, newFreq, unit.installments);
                                          setExpandedItems(prev => prev.map(u => u.splitId === unit.splitId ? { ...u, paymentFrequency: newFreq, periodPayment: newPP } : u));
                                        }}
                                        className="bg-white border border-gray-200 text-[10px] uppercase tracking-wider font-bold text-gray-700 rounded-sm px-2 py-1 outline-none focus:border-zeal-blue"
                                      >
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                      </select>
                                      <select
                                        value={unit.installments}
                                        onChange={(e) => {
                                          const newDur = Number(e.target.value);
                                          const newPP = recalcPeriodPayment(unit, unit.paymentFrequency, newDur);
                                          setExpandedItems(prev => prev.map(u => u.splitId === unit.splitId ? { ...u, installments: newDur, periodPayment: newPP } : u));
                                        }}
                                        className="bg-white border border-gray-200 text-[10px] uppercase tracking-wider font-bold text-gray-700 rounded-sm px-2 py-1 outline-none focus:border-zeal-blue"
                                      >
                                        {[2,3,4,5,6].map(n => (
                                          <option key={n} value={n}>{n} {unit.paymentFrequency === 'weekly' ? 'Wks' : 'Mos'}</option>
                                        ))}
                                      </select>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                            </div>
                          </div>
                        );
                      })}

                      {hasAnyConflict && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-4 py-3 rounded-sm mb-6 flex items-center gap-2">
                          <i className="fas fa-exclamation-triangle text-amber-500"></i> Resolve all conflicts above before proceeding.
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-sm text-xs font-bold text-blue-800 uppercase tracking-widest text-center mb-6">
                        {Object.keys(groupMap).length} separate order{Object.keys(groupMap).length > 1 ? 's' : ''} will be created.
                      </div>

                      <div className="flex gap-4">
                        <button onClick={() => setShowPreview(false)} disabled={loading}
                          className="flex-1 bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-bold py-3 rounded-sm text-sm uppercase tracking-widest transition-colors">
                          Cancel
                        </button>
                        <button onClick={handleCheckout} disabled={loading || hasAnyConflict}
                          className="flex-1 bg-zeal-dark hover:bg-black text-white font-black py-3 rounded-sm text-sm uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                          <CreditCard size={18} />
                          {loading ? 'Processing...' : `Place ${Object.keys(groupMap).length} Order${Object.keys(groupMap).length > 1 ? 's' : ''}`}
                        </button>
                      </div>
                    </>
                  );
                })() : (
                  <>
                    <div className="flex flex-col gap-2 mb-6">
                      {items.map(item => (
                        <div key={item.cartItemId} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-3 min-w-0 pr-4">
                            <span className="font-black text-sm text-gray-400 flex-shrink-0">{item.quantity}×</span>
                            <span className="font-bold text-sm text-gray-800 truncate">{item.name}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-sm flex-shrink-0 whitespace-nowrap">
                              {item.paymentChoice === 'full' ? 'Full' : `${item.installments} ${item.paymentFrequency === 'weekly' ? 'Wks' : 'Mos'}`}
                            </span>
                          </div>
                          <span className="font-black text-sm text-gray-900 flex-shrink-0">{fmt((item.paymentChoice === 'full' ? item.price : item.periodPayment || item.monthlyPayment) * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-sm p-5 mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-black text-gray-500 uppercase tracking-wider">Total Due Today</span>
                        <span className="text-xl font-display font-black text-zeal-red">{fmt(totalToPayNow)}</span>
                      </div>
                      {items.some(i => i.paymentChoice === 'installment') && (
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Combined Installment</span>
                          <span className="text-sm font-bold text-zeal-blue">{fmt(items.reduce((acc, i) => acc + (i.paymentChoice === 'installment' ? (i.periodPayment || i.monthlyPayment) * i.quantity : 0), 0))} <span className="text-[10px] text-gray-400">/ {items.some(i => i.paymentFrequency === 'weekly') ? 'wk' : 'mo'}</span></span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 mt-8">
                      <button onClick={() => setShowPreview(false)} disabled={loading}
                        className="flex-1 bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-bold py-3 rounded-sm text-sm uppercase tracking-widest transition-colors">
                        Cancel
                      </button>
                      {(() => {
                        const installmentSigs = items
                          .filter(i => i.paymentChoice !== 'full')
                          .map(i => `${i.paymentFrequency}-${i.installments}`);
                        const hasSingleOrderConflict = new Set(installmentSigs).size > 1;
                        return (
                          <button onClick={hasSingleOrderConflict ? enterSplitMode : handleCheckout} disabled={loading}
                            className={`flex-1 text-white font-black py-3 rounded-sm text-sm uppercase tracking-widest transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${hasSingleOrderConflict ? 'bg-amber-600 hover:bg-amber-700' : 'bg-zeal-red hover:bg-red-800'}`}>
                            {hasSingleOrderConflict ? <i className="fas fa-exclamation-triangle"></i> : <CreditCard size={18} />}
                            {loading ? 'Processing...' : hasSingleOrderConflict ? 'Resolve Conflicts' : 'Proceed to Pay'}
                          </button>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Popup Modal */}
      {(() => {
        const uniqueSignatures = new Set(items.map(i => i.paymentChoice === 'full' ? 'full' : `${i.paymentChoice}-${i.paymentFrequency}-${i.installments}`)).size;
        const conflict = uniqueSignatures > 1;

        if (conflict && !conflictDismissed) {
          return (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-sm w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <div className="flex gap-4 items-start mb-6">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-500 text-lg">
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight mb-2">Multiple Payment Plans</h3>
                    <p className="text-sm font-medium text-gray-500 leading-relaxed">
                      Your bag contains a mix of different payment plans. During order review, you can choose to merge these into a single combined order, or split them into separate orders to maintain their distinct schedules.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setConflictDismissed(true)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-sm text-sm uppercase tracking-widest transition-colors shadow-sm"
                >
                  I Understand
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}
    </main>
  );
}
