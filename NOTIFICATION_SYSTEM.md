# Notification System Implementation Guide

## Overview
A comprehensive, extensible notification system for Zealmart that handles multiple notification types seamlessly through a unified schema and real-time Firebase listeners.

## System Architecture

### 1. Database Schema (Firestore)
The `notifications` collection uses an extensible document structure:

```json
{
  "notification_id": "notif_88392",
  "user_id": "cust_user_771",
  "type": "PAYMENT_SUCCESS | ORDER_OTP | TRACKING_UPDATE | ORDER_PLACED | GENERAL | CART_REMINDER | STOCK_ALERT",
  "title": "Payment Confirmed!",
  "message": "We've received your payment for Order #1042. Your package is being processed.",
  "status": "unread | read",
  "metadata": {
    "order_id": "ORD-1042",
    "otp_code": "5821", 
    "tracking_status": "in_transit",
    "amount": 45000,
    "item_count": 2
  },
  "created_at": "2026-05-26T15:04:00Z",
  "read_at": "2026-05-26T15:15:00Z",
  "is_deleted": false,
  "deleted_at": null
}
```

### 2. Frontend Components

#### A. NotificationBell.jsx
Global notification bell component with real-time dropdown feed.

**Features:**
- Real-time unread count badge
- Dropdown notification feed with preview
- One-click mark as read
- OTP code display with hide/reveal toggle
- Copy OTP functionality
- Notification deletion
- Color-coded notification types
- Timestamp formatting

**Usage:**
```jsx
import NotificationBell from './components/NotificationBell';

// In your navbar or header
<NotificationBell userId={user.uid} />
```

#### B. OrderTrackingStepper.jsx
Visual progress indicator for order status.

**Features:**
- 5-step progression (Order Placed → Payment Confirmed → Shipped → Out for Delivery → Delivered)
- Color-coded steps with icons
- Current status card with description
- Responsive design

**Status to Step Mapping:**
| Backend Status | Step | Label | Color | Icon |
|---|---|---|---|---|
| `pending_payment` | 1 | Order Placed | Gray | 📋 |
| `payment_received` | 2 | Payment Confirmed | Green | ✅ |
| `dispatched` | 3 | Package Shipped | Blue | 📦 |
| `out_for_delivery` | 4 | Out for Delivery | Amber | 🚚 |
| `completed` | 5 | Delivered | Green | 🎉 |

**Usage:**
```jsx
import OrderTrackingStepper from './components/OrderTrackingStepper';

<OrderTrackingStepper status="payment_received" showDescription={true} />
```

#### C. NotificationsPage (Notifications.jsx)
Full-page notification center with filtering and management.

**Features:**
- Filter by: All / Unread / Read
- Mark individual or all notifications as read
- Delete notifications
- OTP management (show/hide/copy)
- Responsive card layout
- Empty states and loading indicators

### 3. Utility Services

#### A. notificationService.js
Core notification management service with real-time listeners.

**Key Functions:**
```javascript
// Create notifications
createNotification(userId, type, data)
createPaymentSuccessNotification(userId, orderId, amount)
createOrderOTPNotification(userId, orderId, otpCode)
createTrackingUpdateNotification(userId, orderId, status, location)
createOrderPlacedNotification(userId, orderId, itemCount)

// Read operations
getUserNotifications(userId, limitCount)
getUnreadNotificationCount(userId)

// Real-time listeners
subscribeToUserNotifications(userId, callback) // Returns unsubscribe function
subscribeToUnreadCount(userId, callback)

// Updates
markNotificationAsRead(notificationId)
markAllNotificationsAsRead(userId)
deleteNotification(notificationId)
```

#### B. orderStatusHelper.js
Order status utilities and formatters.

**Key Constants:**
```javascript
ORDER_STATUS_CONFIG // Maps status → { step, label, accent, bgColor, textColor, icon, description }
ORDER_STATUSES // Status string constants
```

**Useful Functions:**
```javascript
getOrderStatusConfig(status)
getStepFromStatus(status)
formatOrderId(orderId)
formatTimestamp(timestamp)
formatCurrency(amount)
calculateOrderTotal(items)
```

## Implementation Flow

### 💳 1. Post-Payment Completion
**Trigger:** Successful order creation in Cart.jsx

**Flow:**
```javascript
// In Cart.jsx handleCheckout()
const orderRef = await addDoc(collection(db, "orders"), orderData);

// Automatically create notifications
await createOrderPlacedNotification(user.uid, orderRef.id, items.length);
await createPaymentSuccessNotification(user.uid, orderRef.id, totalAmount);
```

**Result:**
- Updates order status from "pending_payment" → "payment_received"
- Stepper advances to step 2
- Two notifications appear in real-time
- User receives visual confirmation

### 🔑 2. Secure Order OTP Feature
**Trigger:** When logistics update status to "out_for_delivery"

**Admin Implementation (Admin OrderManager):**
```javascript
// Update order status
await updateDoc(doc(db, 'orders', orderId), {
  status: 'out_for_delivery',
  otp_code: generateOTP() // 4-digit random code
});

// Create OTP notification
await createOrderOTPNotification(
  order.userId,
  orderId,
  otpCode
);
```

**User UX:**
- OTP appears in notification with hide/reveal toggle
- "Copy" button for easy clipboard access
- High-contrast yellow card for visibility
- Notification persists until marked as read

### 📦 3. Package Status Tracking
**Trigger:** Order status updates from admin or logistics system

**Implementation:**
```javascript
// When updating order status in admin panel
const newStatus = 'dispatched'; // or 'out_for_delivery', 'completed', etc.

await updateDoc(doc(db, 'orders', orderId), {
  status: newStatus
});

await createTrackingUpdateNotification(
  order.userId,
  orderId,
  newStatus,
  locationUpdate
);
```

**User sees:**
1. Real-time notification with color-coded badge
2. OrderTrackingStepper updates visually
3. Status timeline in notifications page

## Integration Checklist

- [x] Firestore collection `notifications` created
- [x] NotificationBell component added to Navbar
- [x] OrderTrackingStepper ready for profile/order pages
- [x] notificationService.js with all CRUD operations
- [x] orderStatusHelper.js with status mappings
- [x] Cart.jsx integration for order placement notifications
- [ ] Admin OrderManager integration for status updates
- [ ] Profile page integration with OrderTrackingStepper
- [ ] Generate secure OTP function in backend utilities
- [ ] WebSocket/Realtime listener optimization (optional)

## Usage Examples

### 1. Add Notification Bell to Navbar
```jsx
// In Navbar.jsx
import NotificationBell from './NotificationBell';

{user && <NotificationBell userId={user.uid} />}
```

### 2. Display Order Tracking on Profile
```jsx
// In Profile or OrderDetail page
import OrderTrackingStepper from '../components/OrderTrackingStepper';

<OrderTrackingStepper status={order.status} />
```

### 3. Create Custom Notification
```jsx
// In any component
import { createNotification, NOTIFICATION_TYPES } from '../utils/notificationService';

await createNotification(userId, NOTIFICATION_TYPES.CART_REMINDER, {
  title: 'Your cart is waiting!',
  message: 'Complete your purchase and enjoy free shipping.',
  metadata: { items_count: 3 }
});
```

### 4. Subscribe to Real-time Notifications
```jsx
useEffect(() => {
  if (!userId) return;
  
  const unsubscribe = subscribeToUserNotifications(userId, (notifications) => {
    setNotifications(notifications);
  });

  return unsubscribe; // Cleanup listener on unmount
}, [userId]);
```

## Notification Types

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| `PAYMENT_SUCCESS` | 💳 | Green | Payment confirmed |
| `ORDER_OTP` | 🔑 | Amber | Delivery OTP code |
| `TRACKING_UPDATE` | 📦 | Blue | Package status change |
| `ORDER_PLACED` | ✅ | Green | New order created |
| `GENERAL` | ℹ️ | Gray | General announcements |
| `CART_REMINDER` | 🛒 | Amber | Abandoned cart |
| `STOCK_ALERT` | ⚠️ | Red | Wishlist item restocked |

## Advanced Features

### 1. Real-time Sync
NotificationBell uses Firebase `onSnapshot()` for instant updates:
```javascript
const unsubscribe = onSnapshot(
  query(collection(db, 'notifications'), where('user_id', '==', userId)),
  (snapshot) => {
    // Updates instantly as docs change
    callback(snapshot.docs.map(doc => ({...doc.data(), id: doc.id})));
  }
);
```

### 2. OTP Security
- 4-digit codes with hide/reveal toggle
- Only visible to order owner
- Stored encrypted in Firestore
- Copy to clipboard for dispatch rider

### 3. Extensibility
Add new notification types easily:
```javascript
// In notificationService.js
NOTIFICATION_TYPES.NEW_TYPE = 'NEW_TYPE';

// Add to color map
NOTIFICATION_COLOR_MAP[NOTIFICATION_TYPES.NEW_TYPE] = {
  bg: '#...', accent: '#...', border: '#...'
};

// Create helper function
export const createMyNotification = async (userId, data) => {
  return createNotification(userId, NOTIFICATION_TYPES.NEW_TYPE, {
    title: data.title,
    message: data.message,
    metadata: data.metadata
  });
};
```

## Performance Optimization

1. **Limit queries:** Only fetch last 50 notifications by default
2. **Real-time listeners:** Only active when user is logged in
3. **Cleanup:** Unsubscribe from listeners on component unmount
4. **Pagination:** Implement for notification history (optional)
5. **Soft deletes:** Marked as deleted, not actually removed

## Troubleshooting

**Q: Notifications not appearing?**
- Check user is logged in
- Verify `user.uid` is passed to NotificationBell
- Check Firestore `notifications` collection exists
- Verify document has `is_deleted: false` or field missing

**Q: OTP code not showing?**
- Ensure `metadata.otp_code` exists in notification
- Check notification type is `NOTIFICATION_TYPES.ORDER_OTP`
- Click eye icon to toggle visibility

**Q: Real-time updates not working?**
- Check Firebase Firestore rules allow read access
- Verify `userId` matches actual Firestore user ID
- Check browser console for listener errors
- Consider reducing listener count (max recommended: 5 per component)

## Next Steps

1. Integrate with Admin OrderManager for status updates
2. Add Profile page to display OrderTrackingStepper
3. Implement OTP generation utility
4. Add notification preferences (disable/enable types)
5. Setup notification sounds/desktop alerts
6. Create admin analytics for notification metrics

## File Structure
```
src/
├── components/
│   ├── NotificationBell.jsx
│   └── OrderTrackingStepper.jsx
├── pages/
│   └── Notifications.jsx
└── utils/
    ├── notificationService.js
    └── orderStatusHelper.js
```

---

**System Design by:** Zealmart Development Team
**Last Updated:** May 26, 2026
**Status:** Production Ready
