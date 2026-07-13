import { useState, useEffect } from 'react';
import { collection, doc, updateDoc, query, orderBy, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Package, CheckCircle, Clock, Bell, Users, AlertCircle, Search, ChevronDown, ChevronUp, SlidersHorizontal, Truck, Link as LinkIcon, Copy } from 'lucide-react';
import { shipOrder } from '../../utils/orderTrackingService';

function fmt(n) {
  return '₦' + Math.ceil(n).toLocaleString('en-NG');
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [newlyCompleted, setNewlyCompleted] = useState(new Set());
  const [userCache, setUserCache] = useState({});

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders(ordersData);

        // Update user cache for any new users
        const uniqueUserIds = [...new Set(ordersData.map(o => o.userId).filter(Boolean))];
        const newCache = { ...userCache };
        let cacheUpdated = false;

        await Promise.all(
          uniqueUserIds.map(async (uid) => {
            if (!newCache[uid]) {
              try {
                const userSnap = await getDoc(doc(db, "users", uid));
                if (userSnap.exists()) {
                  newCache[uid] = userSnap.data();
                  cacheUpdated = true;
                }
              } catch {
                // silently skip if user doc missing
              }
            }
          })
        );
        
        if (cacheUpdated) {
          setUserCache(newCache);
        }
        setError('');
      } catch (err) {
        console.error(err);
        setError("Failed to process orders data");
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes('offline')) {
        setError("Please check your internet connection and try again.");
      } else {
        setError("Failed to sync orders");
      }
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateAmountPaid = async (orderId, newAmount, totalAmount) => {
    setUpdating(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      const updates = { amountPaid: Number(newAmount) };

      const wasComplete = Number(newAmount) >= totalAmount;
      if (wasComplete) {
        updates.status = 'Completed';
        setNewlyCompleted(prev => new Set([...prev, orderId]));
      } else if (Number(newAmount) > 0) {
        updates.status = 'Processing (Installments)';
      }

      await updateDoc(orderRef, updates);
      // Local setOrders update removed since onSnapshot handles it
    } catch (err) {
      console.error(err);
      alert("Failed to update payment amount");
    } finally {
      setUpdating(false);
    }
  };

  const handleReceiptStatus = async (orderId, status) => {
    if (updating) return;

    if (status === 'Rejected') {
      const reason = prompt('Enter reason for rejection (e.g. "Amount too low", "Receipt unclear", "Wrong account"):');
      if (!reason || !reason.trim()) return;
      setUpdating(true);
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          initialPaymentStatus: 'Rejected',
          initialPaymentRejectReason: reason.trim(),
        });
        alert('Initial payment rejected. Customer will be notified.');
      } catch (e) {
        alert('Failed to reject payment.');
      } finally {
        setUpdating(false);
      }
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        initialPaymentStatus: 'Approved',
        initialPaymentRejectReason: null,
      });
      alert('Initial payment approved successfully!');
    } catch (e) {
      alert('Failed to approve payment.');
    } finally {
      setUpdating(false);
    }
  };

  const handleInstallmentReceiptStatus = async (orderId, order, receiptIdx, status) => {
    if (updating) return;

    if (status === 'Rejected') {
      const reason = prompt('Enter rejection reason (e.g. "Amount wrong", "Unclear image"):');
      if (!reason || !reason.trim()) return;
      setUpdating(true);
      try {
        const updatedReceipts = [...(order.installmentReceipts || [])];
        updatedReceipts[receiptIdx] = { ...updatedReceipts[receiptIdx], status: 'Rejected', rejectReason: reason.trim() };
        await updateDoc(doc(db, 'orders', orderId), {
          installmentReceipts: updatedReceipts,
          status: 'Processing (Installments)'
        });
        alert('Installment receipt rejected.');
      } catch (e) {
        alert('Failed to reject installment receipt.');
      } finally {
        setUpdating(false);
      }
      return;
    }

    setUpdating(true);
    try {
      const receipt = order.installmentReceipts[receiptIdx];
      const approvedAmount = Number(receipt.amount) || 0;
      const newAmountPaid = (order.amountPaid || 0) + approvedAmount;
      const newStatus = newAmountPaid >= order.totalAmount ? 'Completed' : 'Processing (Installments)';

      const updatedReceipts = [...(order.installmentReceipts || [])];
      updatedReceipts[receiptIdx] = { ...updatedReceipts[receiptIdx], status: 'Approved' };

      await updateDoc(doc(db, 'orders', orderId), {
        installmentReceipts: updatedReceipts,
        amountPaid: newAmountPaid,
        status: newStatus
      });

      if (newAmountPaid >= order.totalAmount) {
        setNewlyCompleted(prev => new Set([...prev, orderId]));
      }

      alert(`Installment approved! ${fmt(approvedAmount)} added. New total paid: ${fmt(newAmountPaid)}.`);
    } catch (e) {
      alert('Failed to approve installment receipt.');
    } finally {
      setUpdating(false);
    }
  };

  const handleShipOrder = async (orderId, customerEmail) => {
    if (!window.confirm("Are you sure you want to mark this order as Shipped? This will generate a rider token and start the delivery timer.")) return;
    setUpdating(true);
    try {
      const { tracking_status, delivery_token } = await shipOrder(orderId, customerEmail);
      // Local setOrders update removed since onSnapshot handles it
      alert("Order marked as Shipped! Rider token generated.");
    } catch (err) {
      console.error(err);
      alert("Failed to ship order: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;
  const pendingOrders = orders.filter(o => o.status !== 'Completed').length;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Orders');
  const [sortBy, setSortBy] = useState('Date (Newest First)');
  const [expandedOrders, setExpandedOrders] = useState(new Set());

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
      const customer = userCache[o.userId];
      if (customer) {
        if (`${customer.firstName} ${customer.lastName}`.toLowerCase().includes(term)) return true;
        if (customer.email?.toLowerCase().includes(term)) return true;
        if (customer.phone?.includes(term)) return true;
      }
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <Clock size={40} className="mb-4 animate-pulse text-zeal-blue" />
      <h2 className="text-xl font-bold font-display uppercase tracking-widest text-gray-500">Loading Orders...</h2>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-8 font-medium flex items-center gap-2">
      <AlertCircle size={20} /> {error}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-black font-display uppercase tracking-wider text-gray-900 mb-6">Customer Orders</h1>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Orders', value: totalOrders, icon: <Package size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Pending Payment', value: pendingOrders, icon: <AlertCircle size={20} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Completed', value: completedOrders, icon: <CheckCircle size={20} />, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white rounded-sm border ${stat.border} p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className={`${stat.bg} ${stat.color} p-3 rounded-full flex-shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</div>
              <div className="font-black text-2xl text-gray-900 font-display">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Newly completed notifications */}
      {newlyCompleted.size > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-sm mb-6 flex items-center gap-3 font-bold text-sm shadow-sm animate-pulse">
          <Bell size={20} className="text-green-600" />
          🎉 {newlyCompleted.size} order{newlyCompleted.size > 1 ? 's' : ''} just marked as fully paid and ready to ship!
        </div>
      )}

      {orders.length > 0 && (
        <div className="bg-white border border-gray-200 p-4 rounded-sm mb-6 flex flex-col md:flex-row gap-4 items-center shadow-sm">
          <div className="relative flex-grow w-full md:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Name, Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-sm font-medium focus:border-zeal-blue outline-none transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto bg-gray-50 border border-gray-200 rounded-sm px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-zeal-blue transition-colors"
          >
            <option>All Orders</option>
            <option>Completed</option>
            <option>Processing (Installments)</option>
          </select>
          <div className="flex items-center gap-2 w-full md:w-auto bg-gray-50 border border-gray-200 rounded-sm px-3 py-2 focus-within:border-zeal-blue transition-colors">
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

      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-gray-200 p-12 rounded-sm text-center shadow-sm">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No orders match your criteria.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredOrders.map((order) => {
            const customer = userCache[order.userId];
            const isNewlyComplete = newlyCompleted.has(order.id);

            const isComplete = order.amountPaid >= order.totalAmount;
            const combinedPeriodPayment = order.items?.reduce((acc, i) => acc + (i.paymentChoice === 'installment' ? (i.periodPayment || i.monthlyPayment) * i.quantity : 0), 0) || 0;
            const isWeekly = order.items?.some(i => i.paymentFrequency === 'weekly');
            const periodsPaid = combinedPeriodPayment > 0 ? Math.floor(order.amountPaid / combinedPeriodPayment) : 0;
            const excessPaid = combinedPeriodPayment > 0 ? (order.amountPaid % combinedPeriodPayment) : 0;
            
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

            return (
              <div key={order.id} className={`bg-white rounded-sm border overflow-hidden shadow-sm transition-all ${isNewlyComplete ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'}`}>
                
                {isNewlyComplete && (
                  <div className="bg-green-50 text-green-800 px-5 py-2 text-xs font-bold flex items-center gap-2 border-b border-green-100">
                    <Bell size={14} className="text-green-600" /> Payment complete — ready to ship!
                  </div>
                )}

                <div 
                  className={`flex flex-wrap justify-between items-center gap-4 p-5 cursor-pointer select-none transition-colors ${expandedOrders.has(order.id) ? 'border-b border-gray-100 bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => toggleOrderExpand(order.id)}
                >
                  <div className="min-w-[120px]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Order ID</span>
                    <strong className="font-mono text-sm text-gray-800">#{order.id.slice(0, 12)}</strong>
                  </div>
                  <div className="min-w-[100px]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Date</span>
                    <strong className="text-sm text-gray-800">{order.createdAt?.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </div>
                  
                  <div className="flex items-center gap-3 min-w-[200px] flex-grow">
                    <div className="w-10 h-10 rounded-full bg-zeal-dark text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                      {customer ? customer.firstName?.[0]?.toUpperCase() : <Users size={16} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-gray-900 truncate">
                        {customer ? `${customer.firstName} ${customer.lastName}` : 'Customer'}
                      </div>
                      <div className="text-xs font-medium text-gray-500 truncate">{customer?.email || order.userId}</div>
                      {customer?.phone && <div className="text-[11px] text-gray-400 mt-0.5">{customer.phone}</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 min-w-[150px] justify-end flex-grow">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
                      <div className="flex gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {order.status === 'Completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {order.status}
                        </span>
                        {order.tracking_status && order.tracking_status !== 'Pending' && (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${order.tracking_status === 'Delivered' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            <Truck size={12} />
                            {order.tracking_status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-gray-200 text-gray-500 shadow-sm">
                      {expandedOrders.has(order.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {expandedOrders.has(order.id) && (
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 bg-white">
                    
                    {/* Items */}
                    <div className="xl:col-span-1">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Items Ordered</h3>
                      <div className="flex flex-col gap-4">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className={`flex gap-4 pb-4 ${idx < order.items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded flex items-center justify-center flex-shrink-0 p-1">
                              <img src={item.img} alt={item.name} loading="lazy" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-gray-800 mb-1 leading-snug line-clamp-2">{item.name} <span className="text-gray-400 font-medium">×{item.quantity}</span></div>
                              <div className="text-xs font-medium text-gray-500 mb-2">Length: {item.length}</div>
                              <span className={`inline-block text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-wider ${item.paymentChoice === 'installment' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                {item.paymentChoice === 'installment' ? `${item.paymentFrequency === 'weekly' ? item.installments * 4 + ' Weekly Payments' : item.installments + ' Monthly Payments'}` : 'Full Payment'}
                              </span>
                              <div className="text-xs font-bold mt-2">
                                {item.paymentChoice === 'installment' && (item.periodPayment || item.monthlyPayment) ? (
                                  <span className="text-gray-600">{fmt((item.periodPayment || item.monthlyPayment) * item.quantity)}<span className="text-gray-400 font-medium">/{item.paymentFrequency === 'weekly' ? 'wk' : 'mo'}</span></span>
                                ) : item.paymentChoice === 'full' ? (
                                  <span className="text-gray-900">{fmt(item.price * item.quantity)}</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Info */}
                    {order.deliveryInfo && (
                      <div className="xl:col-span-1 bg-gray-50 p-5 rounded-sm border border-gray-200">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Delivery Info</h3>
                        <div className="text-sm text-gray-700 leading-relaxed">
                          <p className="font-bold mb-1">{order.deliveryInfo.address}</p>
                          <p className="mb-2">{order.deliveryInfo.city}, {order.deliveryInfo.state}</p>
                          <p className="flex items-center gap-2 mb-4 font-medium"><i className="fas fa-phone text-gray-400"></i> {order.deliveryInfo.phone}</p>
                          {order.deliveryInfo.instructions && (
                            <div className="bg-white border border-gray-200 p-3 rounded-sm text-xs text-gray-500 italic shadow-sm">
                              "{order.deliveryInfo.instructions}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment Tracker */}
                    <div className="xl:col-span-1 bg-white border border-gray-200 p-5 rounded-sm shadow-sm">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Payment Tracker</h3>

                      <div className="flex justify-between items-center mb-3 text-sm">
                        <span className="font-medium text-gray-500">Total Required:</span>
                        <strong className="text-gray-900 font-display">{fmt(order.totalAmount)}</strong>
                      </div>

                      <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-medium text-gray-500">Amount Paid:</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₦</span>
                          <input
                            type="number"
                            defaultValue={order.amountPaid}
                            onBlur={(e) => {
                              if (e.target.value !== String(order.amountPaid)) {
                                handleUpdateAmountPaid(order.id, e.target.value, order.totalAmount);
                              }
                            }}
                            disabled={updating}
                            className="w-36 pl-8 pr-3 py-2 bg-white border-2 border-gray-200 rounded-sm text-sm font-black text-zeal-blue focus:border-zeal-blue outline-none transition-colors text-right disabled:opacity-50"
                          />
                        </div>
                      </div>
                      
                      {order.receiptUrl && (
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-sm text-center mb-5">
                          <div className="flex justify-between items-center mb-3">
                            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Initial Payment Receipt</div>
                            {order.initialPaymentStatus && (
                              <span className={`text-[11px] font-bold ${order.initialPaymentStatus === 'Approved' ? 'text-green-600' : order.initialPaymentStatus === 'Rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                                {order.initialPaymentStatus}
                              </span>
                            )}
                          </div>
                          <div className="w-full h-32 bg-gray-100 rounded-sm overflow-hidden mb-3 border border-gray-200">
                            <img src={order.receiptUrl} alt="Receipt Thumbnail" className="w-full h-full object-cover" />
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-[11px] font-bold text-white bg-zeal-dark hover:bg-black px-4 py-2 rounded-full transition-colors w-full">
                              View Full Receipt
                            </a>
                            
                            {(!order.initialPaymentStatus || order.initialPaymentStatus === 'Pending') && (
                              <div className="flex gap-2">
                                <button onClick={() => handleReceiptStatus(order.id, 'Approved')} disabled={updating} className="flex-1 text-[11px] font-bold text-black bg-green-400 hover:bg-green-500 px-4 py-2 rounded-full transition-colors disabled:opacity-50">Approve</button>
                                <button onClick={() => handleReceiptStatus(order.id, 'Rejected')} disabled={updating} className="flex-1 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full transition-colors disabled:opacity-50">Reject</button>
                              </div>
                            )}
                            
                            {order.initialPaymentStatus === 'Rejected' && order.initialPaymentRejectReason && (
                              <div className="text-[10px] text-red-500 font-medium italic text-left mt-1">Reason: {order.initialPaymentRejectReason}</div>
                            )}
                          </div>
                        </div>
                      )}

      {/* Installment Receipts */}
      {order.installmentReceipts && order.installmentReceipts.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-sm mb-5">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">
            Installment Receipts ({order.installmentReceipts.length})
          </div>
          <div className="flex flex-col gap-3">
            {order.installmentReceipts.map((rec, rIdx) => (
              <div key={rIdx} className={`bg-white border rounded-sm p-3 ${rec.status === 'Approved' ? 'border-green-200' : rec.status === 'Rejected' ? 'border-red-200' : 'border-amber-200'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-700">Payment #{rIdx + 1} — {fmt(rec.amount || 0)}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider ${
                    rec.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    rec.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{rec.status || 'Pending'}</span>
                </div>
                <div className="w-full h-24 bg-gray-100 rounded-sm overflow-hidden mb-2 border border-gray-200">
                  <img src={rec.receiptUrl} alt={`Installment receipt ${rIdx + 1}`} className="w-full h-full object-cover" />
                </div>
                <a href={rec.receiptUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-[10px] font-bold text-white bg-zeal-dark hover:bg-black px-3 py-1.5 rounded-sm transition-colors mb-2 w-full">
                  View Full Receipt
                </a>
                {(!rec.status || rec.status === 'Pending') && (
                  <div className="flex gap-2">
                    <button onClick={() => handleInstallmentReceiptStatus(order.id, order, rIdx, 'Approved')} disabled={updating} className="flex-1 text-[10px] font-bold text-black bg-green-400 hover:bg-green-500 px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50">Approve + Add to Paid</button>
                    <button onClick={() => handleInstallmentReceiptStatus(order.id, order, rIdx, 'Rejected')} disabled={updating} className="flex-1 text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50">Reject</button>
                  </div>
                )}
                {rec.status === 'Rejected' && rec.rejectReason && (
                  <div className="text-[10px] text-red-500 font-medium italic mt-1">Reason: {rec.rejectReason}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

                      {!isComplete && nextPaymentDate && (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-sm text-center mb-5">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Next Payment Due</div>
                          <div className="font-black text-zeal-blue mb-2">{nextPaymentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-3 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {timerText}
                          </span>
                          <div className="text-xs font-bold text-gray-700 bg-white py-1.5 px-3 rounded-sm border border-blue-200 inline-block shadow-sm">
                            Expected: {fmt(defaultCustomAmount)}
                          </div>
                          {excessPaid > 0 && <div className="text-[10px] text-blue-500 font-medium mt-2">(Customer has {fmt(excessPaid)} credit towards this period)</div>}
                        </div>
                      )}

                      <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mb-2">
                        <div 
                          className={`h-full transition-all duration-1000 ${order.amountPaid >= order.totalAmount ? 'bg-green-500' : 'bg-zeal-blue'}`}
                          style={{ width: `${Math.min(100, (order.amountPaid / order.totalAmount) * 100)}%` }} 
                        />
                      </div>
                      <div className="text-xs font-bold text-center text-gray-500 uppercase tracking-wider mb-4">
                        {Math.round((order.amountPaid / order.totalAmount) * 100)}% Paid
                        {order.amountPaid < order.totalAmount && (
                          <span className="mx-1">• Balance: <span className="text-zeal-red">{fmt(order.totalAmount - order.amountPaid)}</span></span>
                        )}
                      </div>

                      {order.amountPaid >= order.totalAmount && (
                        <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-sm text-xs font-bold flex flex-col items-center justify-center gap-2 uppercase tracking-wider mb-4">
                          <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Payment Complete</div>
                          
                          {(!order.tracking_status || order.tracking_status === 'Pending') && (
                            <button 
                              onClick={() => handleShipOrder(order.id, customer?.email || order.userId)}
                              disabled={updating}
                              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-sm transition-colors flex justify-center items-center gap-2"
                            >
                              <Truck size={14} /> Mark as Shipped
                            </button>
                          )}
                        </div>
                      )}

                      {order.tracking_status === 'Shipped' && order.delivery_token && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-sm mt-4">
                          <div className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-1 flex items-center gap-1"><LinkIcon size={12}/> Rider Delivery Link</div>
                          <div className="flex items-center gap-2 bg-white border border-blue-100 p-2 rounded-sm">
                            <input 
                              type="text" 
                              readOnly 
                              value={`${window.location.origin}/delivery?order=${order.id}&token=${order.delivery_token}`}
                              className="text-xs text-gray-600 w-full outline-none bg-transparent"
                            />
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/delivery?order=${order.id}&token=${order.delivery_token}`);
                                alert('Link copied to clipboard!');
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Copy Link"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <div className="text-[10px] text-blue-600 mt-1 font-medium">Share this link securely with the delivery rider.</div>
                        </div>
                      )}

                      {order.paymentRef && (
                        <div className="mt-4 pt-4 border-t border-gray-100 text-[10px] font-mono text-gray-400 break-all text-center">
                          Ref: {order.paymentRef}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
