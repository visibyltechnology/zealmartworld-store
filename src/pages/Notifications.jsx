import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import Footer from '../components/Footer';
import useAuthStore from '../store/useAuthStore';
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  NOTIFICATION_TYPES
} from '../utils/notificationService';
import { formatTimestamp } from '../utils/orderStatusHelper';
import toast from 'react-hot-toast';

const NOTIFICATION_ICON_MAP = {
  [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: '💳',
  [NOTIFICATION_TYPES.ORDER_OTP]: '🔑',
  [NOTIFICATION_TYPES.TRACKING_UPDATE]: '📦',
  [NOTIFICATION_TYPES.ORDER_PLACED]: '✅',
  [NOTIFICATION_TYPES.GENERAL]: 'ℹ️',
  [NOTIFICATION_TYPES.CART_REMINDER]: '🛒',
  [NOTIFICATION_TYPES.STOCK_ALERT]: '⚠️'
};

const NOTIFICATION_COLOR_MAP = {
  [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: { bg: '#ecfdf5', accent: '#059669', border: '#a7f3d0' },
  [NOTIFICATION_TYPES.ORDER_OTP]: { bg: '#fffbeb', accent: '#d97706', border: '#fde68a' },
  [NOTIFICATION_TYPES.TRACKING_UPDATE]: { bg: '#eff6ff', accent: '#0284c7', border: '#bae6fd' },
  [NOTIFICATION_TYPES.ORDER_PLACED]: { bg: '#ecfdf5', accent: '#059669', border: '#a7f3d0' },
  [NOTIFICATION_TYPES.GENERAL]: { bg: '#f3f4f6', accent: '#6b7280', border: '#e5e7eb' },
  [NOTIFICATION_TYPES.CART_REMINDER]: { bg: '#fef3c7', accent: '#d97706', border: '#fde68a' },
  [NOTIFICATION_TYPES.STOCK_ALERT]: { bg: '#fee2e2', accent: '#dc2626', border: '#fca5a5' }
};

function NotificationsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOTPCode, setShowOTPCode] = useState({});
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserNotifications(user.uid, (notifs) => {
      setNotifications(notifs.filter(n => !n.is_deleted));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(notifs =>
        notifs.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications(notifs => notifs.map(n => ({ ...n, status: 'read' })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(notifs => notifs.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleCopyOTP = (otpCode) => {
    navigator.clipboard.writeText(otpCode);
    toast.success('OTP copied to clipboard!');
  };

  const toggleShowOTP = (notificationId) => {
    setShowOTPCode(prev => ({
      ...prev,
      [notificationId]: !prev[notificationId]
    }));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status === 'unread';
    if (filter === 'read') return n.status === 'read';
    return true;
  });

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const renderNotificationCard = (notification) => {
    const colors = NOTIFICATION_COLOR_MAP[notification.type] || NOTIFICATION_COLOR_MAP[NOTIFICATION_TYPES.GENERAL];
    const icon = NOTIFICATION_ICON_MAP[notification.type] || '📬';

    return (
      <div
        key={notification.id}
        onClick={() => {
          if (notification.status === 'unread') {
            handleMarkAsRead(notification.id);
          }
        }}
        className="bg-white border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer"
        style={{ borderLeft: `4px solid ${colors.accent}` }}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <span className="text-3xl">{icon}</span>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 style={{ color: colors.accent }} className="font-bold text-lg">
                {notification.title}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNotification(notification.id);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Status Badge */}
            {notification.status === 'unread' && (
              <span style={{ background: colors.accent }} className="text-white text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-2">
                New
              </span>
            )}

            {/* Message */}
            <p className="text-gray-700 text-sm mb-3">{notification.message}</p>

            {/* OTP Code Display */}
            {notification.type === NOTIFICATION_TYPES.ORDER_OTP && notification.metadata?.otp_code && (
              <div style={{ background: '#fff', border: `2px solid ${colors.accent}` }} className="p-4 rounded mb-3 inline-block">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">Delivery OTP</p>
                    <div className="text-3xl font-black tracking-widest">
                      {showOTPCode[notification.id]
                        ? notification.metadata.otp_code
                        : '••••'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShowOTP(notification.id);
                      }}
                      className="p-2 rounded border border-gray-200 hover:border-gray-400 transition-colors"
                    >
                      {showOTPCode[notification.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyOTP(notification.metadata.otp_code);
                      }}
                      className="text-xs font-bold text-white px-4 py-2 rounded"
                      style={{ background: colors.accent }}
                    >
                      <Copy size={14} className="inline mr-1" /> Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Order Link */}
            {notification.metadata?.order_id && (
              <div className="bg-gray-50 p-3 rounded mb-2">
                <p className="text-xs text-gray-600">
                  <strong>Order:</strong> {notification.metadata.order_id}
                  {notification.metadata?.amount && (
                    <>
                      <br />
                      <strong>Amount:</strong> ₦{Number(notification.metadata.amount).toLocaleString()}
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-gray-500 mt-2">
              {formatTimestamp(notification.created_at)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-zeal-red uppercase tracking-wider transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back to Profile
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-display font-black text-gray-900 mb-2">
                Notifications
              </h1>
              <p className="text-gray-600">
                {unreadCount > 0 && (
                  <>You have <strong>{unreadCount}</strong> unread notification{unreadCount !== 1 ? 's' : ''}</>
                )}
                {unreadCount === 0 && notifications.length > 0 && 'You are all caught up!'}
                {notifications.length === 0 && 'No notifications yet'}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="bg-zeal-blue text-white font-bold px-6 py-2 rounded-sm hover:bg-blue-900 transition-colors text-sm uppercase tracking-wide"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-sm p-1 w-fit border border-gray-200">
          {['all', 'unread', 'read'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded text-sm font-bold uppercase tracking-wide transition-all ${
                filter === f
                  ? 'bg-zeal-blue text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Read'}
              {f === 'all' && ` (${notifications.length})`}
              {f === 'unread' && ` (${unreadCount})`}
              {f === 'read' && ` (${notifications.filter(n => n.status === 'read').length})`}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <i className="fas fa-circle-notch fa-spin text-4xl text-zeal-blue mb-4"></i>
            <p className="text-gray-600 font-medium">Loading notifications...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredNotifications.length === 0 && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <i className="fas fa-inbox text-6xl text-gray-200 mb-4"></i>
            <h3 className="text-xl font-bold text-gray-800 mb-2 uppercase">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'unread'
                ? 'You are all caught up! Check back for new updates.'
                : 'You will receive notifications about your orders, payments, and more here.'}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-zeal-blue font-bold hover:underline"
              >
                View all notifications
              </button>
            )}
          </div>
        )}

        {/* Notifications List */}
        {!loading && filteredNotifications.length > 0 && (
          <div className="space-y-4">
            {filteredNotifications.map(renderNotificationCard)}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}

export default NotificationsPage;
