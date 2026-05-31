/**
 * email.js — Centralised EmailJS notification service
 *
 * Handles transactional emails for zealmart order events.
 * Multi-product orders are handled by building an `items_summary` text
 * block from the real order document, so a single template variable
 * covers any number of products.
 *
 * ─── EmailJS Dashboard IDs ──────────────────────────────────────────────────
 * Service   : service_4qwypyf
 * Public Key: CWdxDP7npAJ5fJzA1
 *
 * Template IDs — configure in your EmailJS dashboard:
 *   TEMPLATE_OTP              template_o17qzmm   (registration / forgot-password OTP)
 *   TEMPLATE_ORDER_OTP        template_order_otp       (delivery confirmation code)
 *   TEMPLATE_TRACKING_UPDATE  template_tracking_update (order shipped / status change)
 *   TEMPLATE_ORDER_DELIVERED  template_order_delivered (delivered confirmation)
 *
 * Variables your templates can use:
 *   {{to_email}}        recipient email address
 *   {{name}}            customer first name
 *   {{order_id}}        short order ID
 *   {{items_summary}}   pre-formatted bullet list of all items in the order
 *   {{item_count}}      total number of items
 *   {{delivery_code}}   6-digit delivery OTP  (ORDER_OTP template only)
 *   {{status_label}}    human-readable status  (TRACKING_UPDATE template only)
 *   {{notes}}           admin notes / location (TRACKING_UPDATE template only)
 *   {{tracking_url}}    link to /profile
 *   {{store_url}}       link to /products
 * ─────────────────────────────────────────────────────────────────────────────
 */

import emailjs from '@emailjs/browser';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ─── Constants ────────────────────────────────────────────────────────────────

// Default EmailJS credentials (used for OTPs)
const DEFAULT_SERVICE_ID = 'service_4qwypyf';
const DEFAULT_PUBLIC_KEY = 'CWdxDP7npAJ5fJzA1';

// Gmail Service credentials (used for specific order templates)
const GMAIL_SERVICE_ID = 'service_abqszhq';
const GMAIL_PUBLIC_KEY = 'iUd8NC1BGbaD1T4hq';

// Delivery OTP credentials
const DELIVERY_SERVICE_ID = 'service_nv1ch5j';
const DELIVERY_PUBLIC_KEY = '1LlDYBt_Gw6nHuICZ';

export const TEMPLATES = {
  OTP:             'template_o17qzmm',        // registration OTP
  RESET_PASSWORD:  'template_9h43d7l',        // forgot password OTP
  ORDER_OTP:       'template_6ko8h0t',        // delivery confirmation code
  TRACKING_UPDATE: 'template_1dl8gfs',        // shipped / status changed
  ORDER_DELIVERED: 'template_9ton4to',        // delivered confirmation
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Low-level EmailJS send — never throws; logs all errors.
 */
async function _send(templateId, params, serviceId = DEFAULT_SERVICE_ID, publicKey = DEFAULT_PUBLIC_KEY) {
  try {
    const result = await emailjs.send(
      serviceId,
      templateId,
      params,
      publicKey
    );
    console.log(`[email.js] ✓ Sent (${templateId}):`, result.status, result.text);
    return true;
  } catch (err) {
    console.error(`[email.js] ✗ Failed (${templateId}):`, err?.text || err?.message || err);
    return false;
  }
}

/**
 * Fetch user info (email + first name) from Firestore.
 */
async function _getUserInfo(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      const d = snap.data();
      return { email: d.email || null, name: d.firstName || 'Customer' };
    }
  } catch (err) {
    console.error('[email.js] Could not fetch user info:', err);
  }
  return { email: null, name: 'Customer' };
}

/**
 * Fetch order data (items array + deliveryInfo) from Firestore.
 * Returns null if the order does not exist or the fetch fails.
 */
async function _getOrderData(orderId) {
  try {
    const snap = await getDoc(doc(db, 'orders', orderId));
    if (snap.exists()) return snap.data();
  } catch (err) {
    console.error('[email.js] Could not fetch order data:', err);
  }
  return null;
}

/**
 * Build a plain-text bullet-list summary for all items in an order.
 *
 * Example output (used as {{items_summary}} in your EmailJS template):
 *   • Samsung 65" QLED 4K TV — Qty: 1 | ₦450,000 (Full Payment)
 *   • iPhone 15 Pro (256GB) — Qty: 2 | ₦32,500/mo × 6 months
 *
 * @param {Array} items  — order.items array from Firestore
 * @returns {string}
 */
function _buildItemsSummary(items = []) {
  if (!items.length) return 'No items found.';

  return items.map(item => {
    const qty    = item.quantity || 1;
    const name   = item.name || 'Product';

    let pricePart;
    if (item.paymentChoice === 'installment') {
      const periodAmt  = item.periodPayment || item.monthlyPayment || 0;
      const periods    = item.installments  || 0;
      const freq       = item.paymentFrequency === 'weekly' ? 'wk' : 'mo';
      const totalPds   = item.paymentFrequency === 'weekly' ? periods * 4 : periods;
      const formatted  = '₦' + Math.ceil(periodAmt * qty).toLocaleString('en-NG');
      pricePart = `${formatted}/${freq} × ${totalPds} ${freq === 'wk' ? 'weeks' : 'months'}`;
    } else {
      const total   = (item.price || 0) * qty;
      const formatted = '₦' + Math.ceil(total).toLocaleString('en-NG');
      pricePart = `${formatted} (Full Payment)`;
    }

    return `• ${name} — Qty: ${qty} | ${pricePart}`;
  }).join('\n');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send registration / email-verification OTP.
 * Called directly by Register.jsx — also exported here for consistency.
 */
export async function sendRegistrationOTPEmail(toEmail, name, otpCode) {
  return _send(TEMPLATES.OTP, {
    to_email: toEmail,
    email:    toEmail,
    name,
    otp:      otpCode,
    code:     otpCode,
  });
}

/**
 * Send forgot-password OTP email.
 * Called directly by ForgotPassword.jsx — also exported here for consistency.
 */
export async function sendForgotPasswordOTPEmail(toEmail, name, otpCode) {
  return _send(TEMPLATES.RESET_PASSWORD, {
    to_email: toEmail,
    email:    toEmail,
    name,
    otp:      otpCode,
    code:     otpCode,
  });
}

/**
 * Send "Your Package is Out for Delivery" email with the 6-digit delivery OTP.
 * Fetches the real order to build a full items summary for the email.
 *
 * Template variables available:
 *   {{name}}, {{order_id}}, {{delivery_code}}, {{items_summary}},
 *   {{item_count}}, {{delivery_address}}
 *
 * @param {string} userId
 * @param {string} orderId
 * @param {string} otpCode  — 6-digit delivery confirmation code
 */
export async function sendOrderOTPEmail(userId, orderId, otpCode) {
  const { email, name } = await _getUserInfo(userId);
  if (!email) return false;

  // Fetch order to get items + delivery address
  const orderData     = await _getOrderData(orderId);
  const items         = orderData?.items || [];
  const itemsSummary  = _buildItemsSummary(items);
  const itemCount     = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const deliveryAddr  = orderData?.deliveryInfo
    ? `${orderData.deliveryInfo.address || ''}, ${orderData.deliveryInfo.city || ''}, ${orderData.deliveryInfo.state || ''}`.replace(/^,\s*|,\s*$/g, '')
    : '';

  const sent = await _send(
    TEMPLATES.ORDER_OTP,
    {
      to_email:         email,
      email,
      name,
      order_id:         orderId,
      delivery_code:    otpCode,
      otp:              otpCode,
      code:             otpCode,
      items_summary:    itemsSummary,
      item_count:       itemCount,
      delivery_address: deliveryAddr,
      message:          `Your order is out for delivery. When the courier arrives, give them this code: ${otpCode}`,
    },
    DELIVERY_SERVICE_ID,
    DELIVERY_PUBLIC_KEY
  );

  // Fallback to the OTP template (supports {{otp}} / {{code}}) if dedicated template fails
  if (!sent) {
    return _send(TEMPLATES.OTP, {
      to_email: email,
      email,
      name,
      otp:  otpCode,
      code: otpCode,
      message: `🚚 Delivery code for order #${orderId}: ${otpCode}\n\nItems:\n${itemsSummary}`,
    });
  }
  return sent;
}

/**
 * Send an order status update email (Shipped, Delivered, Cancelled, etc.).
 * Fetches the real order to build a full items summary for the email.
 *
 * Template variables available:
 *   {{name}}, {{order_id}}, {{status_label}}, {{notes}},
 *   {{items_summary}}, {{item_count}}, {{delivery_address}},
 *   {{estimated_delivery}}, {{tracking_url}}, {{store_url}}
 *
 * @param {string} userId
 * @param {string} orderId
 * @param {string} status   — e.g. 'Shipped', 'Delivered', 'Cancelled'
 * @param {string} [notes]  — optional admin notes shown in the email
 */
export async function sendTrackingUpdateEmail(userId, orderId, status, notes = '') {
  const { email, name } = await _getUserInfo(userId);
  if (!email) return false;

  // Use dedicated delivered template for final status
  const templateId = status === 'Delivered'
    ? TEMPLATES.ORDER_DELIVERED
    : TEMPLATES.TRACKING_UPDATE;

  const STATUS_LABELS = {
    Pending:    'Order Placed',
    Paid:       'Payment Confirmed',
    Processing: 'Being Processed',
    Shipped:    'Package Shipped',
    Delivered:  'Delivered',
    Cancelled:  'Cancelled',
    Returned:   'Returned',
  };
  const statusLabel = STATUS_LABELS[status] || status;

  // Fetch order to build items summary
  const orderData    = await _getOrderData(orderId);
  const items        = orderData?.items || [];
  const itemsSummary = _buildItemsSummary(items);
  const itemCount    = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const deliveryAddr = orderData?.deliveryInfo
    ? `${orderData.deliveryInfo.address || ''}, ${orderData.deliveryInfo.city || ''}, ${orderData.deliveryInfo.state || ''}`.replace(/^,\s*|,\s*$/g, '')
    : '';

  const sent = await _send(
    templateId,
    {
      to_email:           email,
      email,
      name,
      order_id:           orderId,
      tracking_status:    status,
      status_label:       statusLabel,
      notes:              notes || `Your order status has been updated to: ${statusLabel}`,
      items_summary:      itemsSummary,
      item_count:         itemCount,
      delivery_address:   deliveryAddr,
      estimated_delivery: status === 'Shipped' ? 'Within 1–3 business days' : '',
      tracking_url:       `${window.location.origin}/profile`,
      store_url:          `${window.location.origin}/products`,
      message:            notes || `Your order status has been updated to: ${statusLabel}`,
    },
    GMAIL_SERVICE_ID,
    GMAIL_PUBLIC_KEY
  );

  if (!sent) {
    return _send(TEMPLATES.OTP, {
      to_email: email,
      email,
      name,
      otp:  '',
      code: '',
      message: `📦 Order #${orderId} — ${statusLabel}${notes ? '\n' + notes : ''}\n\nItems:\n${itemsSummary}`,
    });
  }
  return sent;
}

/**
 * Convenience wrapper: send a "Delivered" email.
 */
export async function sendOrderDeliveredEmail(userId, orderId) {
  return sendTrackingUpdateEmail(userId, orderId, 'Delivered');
}

// ─── Default export ───────────────────────────────────────────────────────────

export default {
  TEMPLATES,
  sendRegistrationOTPEmail,
  sendForgotPasswordOTPEmail,
  sendOrderOTPEmail,
  sendTrackingUpdateEmail,
  sendOrderDeliveredEmail,
};
