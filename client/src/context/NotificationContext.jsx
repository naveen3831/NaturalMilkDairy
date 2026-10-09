import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const currentRole = user?.role || 'delivery_boy';
  const currentUserId = user?.id || '';

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
    } else {
      return [
        {
          id: 'seed-drv-1',
          recipientRole: 'delivery_boy',
          title: '📦 New Shift Deliveries Assigned',
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
    }
  }, []);

  // Fetch notifications for active user role
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?role=${currentRole}&userId=${currentUserId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications) && data.notifications.length > 0) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || data.notifications.filter((n) => !n.isRead).length);
        return;
      }
    } catch (err) {
      console.warn('Notification fetch warning:', err);
    }

    // Local fallback if no data from API
    const saved = localStorage.getItem(`nmd_notifs_${currentRole}`);
    if (saved) {
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
  }, [currentRole, currentUserId, getInitialFallbackNotifications]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000); // 8-second real-time poll
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Persist to local storage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem(`nmd_notifs_${currentRole}`, JSON.stringify(notifications));
      setUnreadCount(notifications.filter((n) => !n.isRead).length);
    }
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

    // Trigger visual toast
    setLatestToast(newNotif);
    setTimeout(() => setLatestToast(null), 5000);

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotif),
      });
    } catch (e) {
      console.warn('Error sending notification to API:', e);
    }
  };

  // Mark single as read
  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    } catch (e) {}
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: currentRole, userId: currentUserId }),
      });
    } catch (e) {}
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem(`nmd_notifs_${currentRole}`);
    try {
      await fetch(`/api/notifications/clear-all?role=${currentRole}&userId=${currentUserId}`, {
        method: 'DELETE',
      });
    } catch (e) {}
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
