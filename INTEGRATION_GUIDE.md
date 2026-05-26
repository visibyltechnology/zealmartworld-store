# Quick Integration Guide

## Adding Components to Your Existing Pages

### 1. Add OrderTrackingStepper to Profile or Order Detail Page

**In your Profile.jsx or order detail component:**

```jsx
import OrderTrackingStepper from '../components/OrderTrackingStepper';
import { getOrderStatusConfig } from '../utils/orderStatusHelper';

function OrderDetailCard({ order }) {
  return (
    <div className="bg-white rounded-lg p-6 mb-6">
      {/* Order Header */}
      <h3 className="text-xl font-bold mb-4">Order Status</h3>
      
      {/* Status Stepper */}
      <OrderTrackingStepper status={order.status} showDescription={true} />
      
      {/* Additional order info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="font-bold text-lg">{order.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-bold text-lg">₦{Number(order.totalAmount).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2. Add NotificationBell to Navbar (Already Integrated)

The NotificationBell is already added to Navbar.jsx. Just ensure:

```jsx
// In Navbar.jsx - already included!
import NotificationBell from './NotificationBell';

{user && <NotificationBell userId={user.uid} />}
```

### 3. Add Notifications Page Route

**In your main App.jsx or router:**

```jsx
import Notifications from './pages/Notifications';

const routes = [
  // ... other routes
  { path: '/notifications', element: <Notifications /> },
];
```

Or if using React Router v6:

```jsx
<Route path="/notifications" element={<Notifications />} />
```

### 4. Create a complete Order Card Component

Here's a ready-to-use order card component that combines everything:

```jsx
// OrderCard.jsx
import { Link } from 'react-router-dom';
import OrderTrackingStepper from './OrderTrackingStepper';
import { formatCurrency, formatTimestamp } from '../utils/orderStatusHelper';
import { Copy, Eye } from 'lucide-react';
import { useState } from 'react';

function OrderCard({ order, showOTP = false }) {
  const [showOTPCode, setShowOTPCode] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header with Order ID and Status */}
      <div className="px-6 py-4 bg-gradient-to-r from-zeal-blue to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-90 uppercase tracking-wide">Order ID</p>
            <p className="text-2xl font-black">{order.id?.substring(0, 8).toUpperCase()}</p>
          </div>
          <p className="text-right">
            <p className="text-xs opacity-90">Placed on</p>
            <p className="font-bold">{formatTimestamp(order.createdAt)}</p>
          </p>
        </div>
      </div>

      {/* Status Stepper */}
      <div className="px-6 py-6 border-b border-gray-100">
        <OrderTrackingStepper status={order.status} showDescription={false} />
      </div>

      {/* Order Details */}
      <div className="px-6 py-4">
        <h4 className="font-bold text-lg mb-3">Order Summary</h4>
        
        {/* Items */}
        <div className="space-y-2 mb-4">
          {order.items?.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.name}</span>
              <span className="font-bold">{item.quantity}x {formatCurrency(item.price)}</span>
            </div>
          ))}
          {order.items?.length > 3 && (
            <p className="text-sm text-gray-500">+{order.items.length - 3} more items</p>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span className="text-zeal-red">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>

      {/* OTP Section (if applicable) */}
      {showOTP && order.otp_code && order.status === 'out_for_delivery' && (
        <div className="px-6 py-4 bg-amber-50 border-t border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase">Delivery OTP</p>
              <p className="text-2xl font-black tracking-widest">
                {showOTPCode ? order.otp_code : '••••'}
              </p>
            </div>
            <button
              onClick={() => setShowOTPCode(!showOTPCode)}
              className="text-amber-700 hover:text-amber-900"
            >
              <Eye size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 flex gap-3 border-t border-gray-100">
        <Link
          to={`/order/${order.id}`}
          className="flex-1 bg-zeal-blue text-white font-bold py-2 rounded text-center hover:bg-blue-900 transition-colors text-sm uppercase tracking-wide"
        >
          View Details
        </Link>
        {order.status === 'out_for_delivery' && order.otp_code && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(order.otp_code);
              alert('OTP copied!');
            }}
            className="flex-1 border-2 border-zeal-blue text-zeal-blue font-bold py-2 rounded hover:bg-blue-50 transition-colors text-sm uppercase tracking-wide flex items-center justify-center gap-2"
          >
            <Copy size={14} /> Copy OTP
          </button>
        )}
      </div>
    </div>
  );
}

export default OrderCard;
```

### 5. Using OrderCard in Your Profile Page

```jsx
// In Profile.jsx
import OrderCard from '../components/OrderCard';

function Profile() {
  const [orders, setOrders] = useState([]);
  
  // ... fetch orders
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Orders</h2>
      
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet</p>
      ) : (
        <div className="grid gap-6">
          {orders.map(order => (
            <OrderCard key={order.id} order={order} showOTP={true} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Database Setup

Make sure your Firestore has:

1. **orders collection** with status field:
   ```
   pending_payment | payment_received | dispatched | out_for_delivery | completed
   ```

2. **notifications collection** (will be created automatically)

## Key Features Summary

✅ **Real-time Notifications**
- Bell icon with unread count badge
- Dropdown preview
- Full notifications page

✅ **Order Tracking**
- Visual 5-step stepper
- Color-coded statuses
- Live status updates

✅ **OTP Management**
- Secure code display
- Hide/reveal toggle
- Copy to clipboard
- Available when order is out for delivery

✅ **Status Mapping**
All mapped to user-friendly descriptions and colors

## Common Patterns

### Listen to order status changes:
```jsx
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'orders', orderId),
    (doc) => {
      setOrder({ id: doc.id, ...doc.data() });
    }
  );
  
  return unsubscribe;
}, [orderId]);
```

### Update order status (Admin):
```jsx
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { createTrackingUpdateNotification } from '../utils/notificationService';

const updateOrderStatus = async (orderId, newStatus) => {
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  const order = orderSnap.data();
  
  await updateDoc(orderRef, {
    status: newStatus,
    updated_at: Timestamp.now()
  });
  
  // Create notification
  await createTrackingUpdateNotification(
    order.userId,
    orderId,
    newStatus,
    'Package update'
  );
};
```

## Styling Customization

All components use inline styles for easy customization. Colors are pulled from:
- Primary: `#0284c7` (zeal-blue)
- Accent: `#dc2626` (zeal-red)
- Success: `#059669` (green)
- Warning: `#d97706` (amber)

Modify in `orderStatusHelper.js` → `ORDER_STATUS_CONFIG`

---

**Happy coding! 🚀**
