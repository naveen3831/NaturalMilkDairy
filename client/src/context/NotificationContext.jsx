import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, getAuthHeaders } = useAuth();
  const { subscribe: wsSubscribe } = useWebSocket();
  // Intelligently identify current active portal / role
  const currentRole = (() => {
    if (user?.role) return user.role;
    if (typeof window === 'undefined') return 'admin';
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (path.startsWith('/delivery') || search.includes('delivery')) return 'delivery_boy';
    if (
      path.startsWith('/admin') ||
      path === '/dashboard' ||
      path === '/deliveries' ||
      path === '/customers' ||
      path === '/subscriptions' ||
      path === '/payments' ||
      path === '/ledger' ||
      path === '/outstanding' ||
      path === '/pricing' ||
      path === '/delivery-boys' ||
      path === '/locations' ||
      path === '/audit-logs' ||
      path === '/supports' ||
      search.includes('portal=admin') ||
      search.includes('tab=dashboard')
    ) {
      return 'admin';
    }
    if (path.startsWith('/customer') || search.includes('portal=customer')) return 'customer';
    return 'admin';
  })();
  const currentUserId = user?.id || user?.customerId || '';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [latestToast, setLatestToast] = useState(null);

  // Initial seed fallback if backend is offline or empty
  const getInitialFallbackNotifications = useCallback((role) => {
    if (role === 'admin') {
      return [
        {
          id: 'seed-adm-1',
          recipientRole: 'admin',
          title: '✅ Delivery Completed',
          message: 'Naveen Kumar delivered 2L Farm Fresh Cow Milk to K. Rajesh Varma in Madhapur. Collected ₹150 cash.',
          type: 'delivery_completed',
          isRead: false,
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: 'seed-adm-2',
          recipientRole: 'admin',
          title: '✅ Delivery Completed',
          message: 'Naveen Kumar delivered 1.5L Milk to Dr. Sunita Reddy in Kavuri Hills. Paid via UPI: ₹90.',
          type: 'delivery_completed',
          isRead: false,
          createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        },
        {
          id: 'seed-adm-3',
          recipientRole: 'admin',
          title: '📦 Daily Routes Generated',
          message: '5 doorstep delivery stops generated for morning shift across Madhapur depot.',
          type: 'route_update',
          isRead: true,
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
      ];
    } else if (role === 'delivery_boy') {
      return [
        {
          id: 'seed-drv-1',
          recipientRole: 'delivery_boy',
          title: '📦 Shift Route Assigned',
          message: 'Dispatch Admin assigned your morning route with 5 customer doorstep deliveries in Madhapur.',
          type: 'delivery_assigned',
          isRead: false,
          createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        },
        {
          id: 'seed-drv-2',
          recipientRole: 'delivery_boy',
          title: '⏰ Route Departure Window',
          message: 'Morning delivery window begins at 04:30 AM. Vehicle TS 09 EA 4812 battery at 85%.',
          type: 'system',
          isRead: false,
          createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        },
        {
          id: 'seed-drv-3',
          recipientRole: 'delivery_boy',
          title: '🥛 Cold Chain Quality Verification',
          message: 'Batch milk temperature verified at 3.8°C at Madhapur chilling center.',
          type: 'system',
          isRead: true,
          createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        },
      ];
    } else {
      // Customer
      return [
        {
          id: 'seed-cust-1',
          recipientRole: 'customer',
          title: '🥛 Morning Milk Dispatched',
          message: 'Your 1.5L Farm Fresh Cow Milk pouch is on the way with delivery partner Naveen Kumar.',
          type: 'delivery_assigned',
          isRead: false,
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
        {
          id: 'seed-cust-2',
          recipientRole: 'customer',
          title: '✅ Doorstep Delivery Completed',
          message: 'Your fresh milk delivery was placed safely at your doorstep at 06:15 AM. Enjoy the purity!',
          type: 'delivery_completed',
          isRead: false,
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        },
        {
          id: 'seed-cust-3',
          recipientRole: 'customer',
          title: '🌿 100% Raw & Chilled Farm Milk',
          message: 'Today\'s batch arrived at 3.8°C with uncompromised natural freshness and zero adulteration.',
          type: 'system',
          isRead: false,
          createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
        },
        {
          id: 'seed-cust-4',
          recipientRole: 'customer',
          title: '📅 Subscription Active',
          message: 'Your daily doorstep milk delivery schedule is active and running smoothly.',
          type: 'route_update',
          isRead: true,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
    }
  }, []);

  // Fetch notifications for active user role
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?role=${currentRole}&userId=${currentUserId}`, {
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount ?? data.notifications.filter((n) => !n.isRead).length);
        localStorage.setItem(`nmd_notifs_${currentRole}`, JSON.stringify(data.notifications));
        return;
      }
    } catch (err) {
      console.warn('Notification fetch warning:', err);
    }

    // Local fallback if no data from API
    const saved = localStorage.getItem(`nmd_notifs_${currentRole}`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n) => !n.isRead).length);
        return;
      } catch (e) {}
    }

    const initial = getInitialFallbackNotifications(currentRole);
    setNotifications(initial);
    setUnreadCount(initial.filter((n) => !n.isRead).length);
  }, [currentRole, currentUserId, getInitialFallbackNotifications, getAuthHeaders]);

  useEffect(() => {
    fetchNotifications();
    if (!wsSubscribe) return;

    const unsubCreated = wsSubscribe('NOTIFICATION_CREATED', (payload) => {
      fetchNotifications();
      if (payload && payload.title) {
        setLatestToast(payload);
      }
    });
    const unsubUpdated = wsSubscribe('NOTIFICATION_UPDATED', () => {
      fetchNotifications();
    });
    const unsubDelivery = wsSubscribe('DELIVERY_UPDATED', () => {
      fetchNotifications();
    });
    const unsubCompleted = wsSubscribe('DELIVERY_COMPLETED', () => {
      fetchNotifications();
    });
    const unsubStatus = wsSubscribe('STATUS_CHANGED', () => {
      fetchNotifications();
    });
    const unsubOrder = wsSubscribe('ORDER_UPDATED', () => {
      fetchNotifications();
    });
    const unsubSub = wsSubscribe('SUBSCRIPTION_UPDATED', () => {
      fetchNotifications();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDelivery();
      unsubCompleted();
      unsubStatus();
      unsubOrder();
      unsubSub();
    };
  }, [fetchNotifications, wsSubscribe]);

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem(`nmd_notifs_${currentRole}`, JSON.stringify(notifications));
    setUnreadCount(notifications.filter((n) => !n.isRead).length);
  }, [notifications, currentRole]);

  // Send a new notification (dispatches to server and updates local state)
  const sendNotification = async ({ recipientRole, recipientId, title, message, type, data }) => {
    const newNotif = {
      id: 'notif_' + Date.now(),
      recipientRole: recipientRole || 'all',
      recipientId: recipientId || '',
      title,
      message,
      type: type || 'system',
      data: data || {},
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // If matches active view, prepend
    if (!recipientRole || recipientRole === currentRole || recipientRole === 'all') {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }

    // Also update admin local cache if sent for admin
    if (recipientRole === 'admin' || recipientRole === 'all') {
      try {
        const savedAdm = JSON.parse(localStorage.getItem('nmd_notifs_admin') || '[]');
        if (!savedAdm.some((n) => n.id === newNotif.id)) {
          localStorage.setItem('nmd_notifs_admin', JSON.stringify([newNotif, ...savedAdm].slice(0, 50)));
        }
      } catch (e) {}
    }

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders ? getAuthHeaders() : {}) },
        body: JSON.stringify(newNotif),
      });
    } catch (e) {
      console.warn('Error sending notification to API:', e);
    }

    // Automatically create Support Ticket record if partner or customer message
    if (type === 'partner_message' || type === 'customer_message' || type === 'ticket') {
      try {
        await fetch('/api/supports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(getAuthHeaders ? getAuthHeaders() : {}) },
          body: JSON.stringify({
            senderRole: type === 'partner_message' ? 'delivery_boy' : 'customer',
            senderId: data?.senderId || data?.customerId || '',
            senderName: data?.senderName || data?.customerName || (type === 'partner_message' ? 'Delivery Partner' : 'Customer'),
            senderPhone: data?.senderPhone || data?.customerPhone || '',
            senderArea: data?.area || data?.customerArea || 'Madhapur',
            senderAddress: data?.address || '',
            category: data?.category || 'Support Request',
            priority: data?.priority || 'normal',
            subject: title,
            message: data?.rawMessage || data?.text || message,
          }),
        });
      } catch (e) {
        console.warn('Support ticket API creation warning:', e);
      }
    }
  };

  // Mark single as read
  const markAsRead = async (id) => {
    if (!id) return;
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id || n._id === id || String(n.id) === String(id) || String(n._id) === String(id)
          ? { ...n, isRead: true }
          : n
      );
      setUnreadCount(updated.filter((n) => !n.isRead).length);
      localStorage.setItem(`nmd_notifs_${currentRole}`, JSON.stringify(updated));
      return updated;
    });
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
    } catch (e) {}
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders ? getAuthHeaders() : {}) },
        body: JSON.stringify({ role: currentRole, userId: currentUserId }),
      });
    } catch (e) {}
  };

  // Delete single notification
  const deleteNotification = async (id) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      setUnreadCount(updated.filter((n) => !n.isRead).length);
      localStorage.setItem(`nmd_notifs_${currentRole}`, JSON.stringify(updated));
      return updated;
    });
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
    } catch (e) {}
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.setItem(`nmd_notifs_${currentRole}`, JSON.stringify([]));
    try {
      await fetch(`/api/notifications/clear-all?role=${currentRole}&userId=${currentUserId}`, {
        method: 'DELETE',
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
    } catch (e) {
      console.warn('Clear notifications error:', e);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isNotificationOpen,
        setIsNotificationOpen,
        latestToast,
        setLatestToast,
        sendNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        fetchNotifications,
        currentRole,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
