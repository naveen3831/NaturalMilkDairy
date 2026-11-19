import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';

const NotificationContext = createContext(null);

const isSameId = (n, id) => {
  if (!n || !id) return false;
  const target = String(id);
  return String(n.id) === target || String(n._id) === target;
};

export function NotificationProvider({ children }) {
  const { user, token, getAuthHeaders } = useAuth();
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

  // Register Firebase Service Worker and setup Web Push Notifications
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((reg) => {
        // SW registered
      })
      .catch((err) => {
        console.warn('Firebase Service Worker registration notice:', err.message);
      });

    // Request notification permission if user is logged in and not yet prompted
    if ('Notification' in window && Notification.permission === 'default' && token) {
      Notification.requestPermission().catch(() => {});
    }
  }, [token]);

  // Play pleasant notification sound chime via Web Audio API (zero external assets required)
  const playNotificationChime = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  }, []);

  // Display native OS browser push notification via ServiceWorker or Notification API
  const showNativeNotification = useCallback((title, body) => {
    playNotificationChime();
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const trigger = () => {
      const options = {
        body: body || 'New update from Natural Milk Dairy',
        icon: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1794545619/natural-milk-dairy/assets/logo.jpg',
        badge: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1794545619/natural-milk-dairy/assets/logo.jpg',
        vibrate: [200, 100, 200],
      };
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification(title, options).catch(() => {
              try { new Notification(title, options); } catch (_) {}
            });
          })
          .catch(() => {
            try { new Notification(title, options); } catch (_) {}
          });
      } else {
        try {
          new Notification(title, options);
        } catch (_) {}
      }
    };

    if (Notification.permission === 'granted') {
      trigger();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') trigger();
      }).catch(() => {});
    }
  }, [playNotificationChime]);

  // Auto-dismiss floating push toast after 7 seconds
  useEffect(() => {
    if (!latestToast) return;
    const timer = setTimeout(() => {
      setLatestToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [latestToast]);

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
      // Customer: newly created customer accounts have an empty inbox until notifications are specifically addressed to them
      return [];
    }
  }, []);

  // Auto-dismiss floating push toast after 7 seconds
  useEffect(() => {
    if (!latestToast) return;
    const timer = setTimeout(() => {
      setLatestToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [latestToast]);

  // Compute user-scoped storage key so Customer A never inherits Customer B's notifications
  const getStorageKey = useCallback(() => {
    const uid = user?.id || user?._id || user?.customerId || user?.mobile || '';
    return uid ? `nmd_notifs_${currentRole}_${uid}` : `nmd_notifs_${currentRole}`;
  }, [user, currentRole]);

  // When active user changes (e.g. login/logout or account switch), reset notifications immediately
  const prevUserRef = useRef(user?.id || user?.customerId || null);
  useEffect(() => {
    const currentId = user?.id || user?.customerId || null;
    if (prevUserRef.current !== currentId) {
      prevUserRef.current = currentId;
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Strict client-side validator to guarantee notifications for other users are never displayed
  const isNotificationForUser = useCallback((n) => {
    if (!n) return false;
    const recipRole = (n.recipientRole || '').toLowerCase().trim();
    if (recipRole === 'all') return true;

    if (currentRole === 'customer') {
      if (recipRole !== 'customer') return false;
      const recipId = String(n.recipientId || '').toLowerCase().trim();
      if (!recipId) return true; // General customer broadcast
      const myIds = new Set(
        [
          user?.id,
          user?._id,
          user?.customerId,
          user?.mobile,
          user?.email,
          currentUserId,
        ]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase().trim())
      );
      if (myIds.size === 0) return true; // If user profile is still hydrating, don't drop
      return myIds.has(recipId);
    }

    if (currentRole === 'delivery_boy') {
      if (recipRole !== 'delivery_boy') return false;
      const recipId = String(n.recipientId || '').toLowerCase().trim();
      if (!recipId) return true; // General driver broadcast
      const myIds = new Set(
        [
          user?.id,
          user?._id,
          user?.boyId,
          user?.mobile,
          currentUserId,
        ]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase().trim())
      );
      return myIds.has(recipId);
    }

    if (currentRole === 'admin') {
      return recipRole === 'admin' || !recipRole || recipRole === 'all';
    }

    return false;
  }, [currentRole, user, currentUserId]);

  // Fetch notifications for active user role
  const fetchNotifications = useCallback(async () => {
    const activeToken = token || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('nmd_jwt_token') : null);
    if (!activeToken) return;
    try {
      const res = await fetch(`/api/notifications?role=${currentRole}&userId=${currentUserId}`, {
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        const filtered = data.notifications.filter(isNotificationForUser);
        setNotifications(filtered);
        setUnreadCount(filtered.filter((n) => !n.isRead).length);
        try {
          localStorage.setItem(getStorageKey(), JSON.stringify(filtered));
        } catch (_) {}
        return;
      }
    } catch (err) {
      console.warn('Notification fetch warning:', err);
    }

    // Local fallback if no data from API
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filteredSaved = parsed.filter(isNotificationForUser);
          setNotifications(filteredSaved);
          setUnreadCount(filteredSaved.filter((n) => !n.isRead).length);
          return;
        }
      }
    } catch (e) {}

    const initial = getInitialFallbackNotifications(currentRole).filter(isNotificationForUser);
    setNotifications(initial);
    setUnreadCount(initial.filter((n) => !n.isRead).length);
  }, [currentRole, currentUserId, getInitialFallbackNotifications, getAuthHeaders, getStorageKey, isNotificationForUser, token]);

  useEffect(() => {
    fetchNotifications();
    if (!wsSubscribe) return;

    const unsubCreated = wsSubscribe('NOTIFICATION_CREATED', (payload) => {
      fetchNotifications();
      if (payload && payload.title && isNotificationForUser(payload)) {
        setLatestToast(payload);
        showNativeNotification(payload.title, payload.message);
      }
    });
    const unsubUpdated = wsSubscribe('NOTIFICATION_UPDATED', () => {
      fetchNotifications();
    });
    const unsubDeleted = wsSubscribe('NOTIFICATION_DELETED', (payload) => {
      if (payload?.id) {
        setNotifications((prev) => prev.filter((n) => !isSameId(n, payload.id)));
      }
      fetchNotifications();
    });
    const unsubCleared = wsSubscribe('NOTIFICATIONS_CLEARED', () => {
      setNotifications([]);
      setUnreadCount(0);
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify([]));
      } catch (_) {}
      fetchNotifications();
    });
    const unsubDelivery = wsSubscribe('DELIVERY_UPDATED', (payload) => {
      fetchNotifications();
      if (payload && (payload.status === 'delivered' || payload.type === 'DELIVERY_COMPLETED')) {
        const title = payload.title || '🥛 Delivery Completed!';
        const msg = payload.message || 'Fresh morning milk delivered to doorstep. Photo proof verified.';
        setLatestToast({ title, message: msg, type: 'delivery_completed', ...payload });
        showNativeNotification(title, msg);
      }
    });
    const unsubCompleted = wsSubscribe('DELIVERY_COMPLETED', (payload) => {
      fetchNotifications();
      if (payload) {
        const title = payload.title || '🥛 Delivery Completed!';
        const msg = payload.message || 'Fresh morning milk delivered to doorstep. Photo proof verified.';
        setLatestToast({ title, message: msg, type: 'delivery_completed', ...payload });
        showNativeNotification(title, msg);
      }
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
      if (unsubCreated) unsubCreated();
      if (unsubUpdated) unsubUpdated();
      if (unsubDeleted) unsubDeleted();
      if (unsubCleared) unsubCleared();
      if (unsubDelivery) unsubDelivery();
      if (unsubCompleted) unsubCompleted();
      if (unsubStatus) unsubStatus();
      if (unsubOrder) unsubOrder();
      if (unsubSub) unsubSub();
    };
  }, [fetchNotifications, wsSubscribe, currentRole, getStorageKey]);

  // Persist to user-scoped local storage
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(notifications));
    } catch (_) {}
    setUnreadCount(notifications.filter((n) => !n.isRead).length);
  }, [notifications, getStorageKey]);

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
        isSameId(n, id) ? { ...n, isRead: true } : n
      );
      setUnreadCount(updated.filter((n) => !n.isRead).length);
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
      } catch (_) {}
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
    if (!id) return;
    setNotifications((prev) => {
      const updated = prev.filter((n) => !isSameId(n, id));
      setUnreadCount(updated.filter((n) => !n.isRead).length);
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
      } catch (_) {}
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
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify([]));
    } catch (_) {}
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

      {/* Real-time Push Notification Floating Banner */}
      {latestToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            maxWidth: '380px',
            width: 'calc(100% - 40px)',
            zIndex: 999999,
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 16px 40px rgba(5, 150, 105, 0.22), 0 4px 14px rgba(0,0,0,0.08)',
            border: '2px solid #059669',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'fadeIn 0.25s ease-out',
            cursor: 'pointer',
          }}
          onClick={() => {
            setIsNotificationOpen(true);
            setLatestToast(null);
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={20} color="#059669" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                {latestToast.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLatestToast(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '2px',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
              {latestToast.message}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: '6px' }}>
              Tap to view details →
            </div>
          </div>
        </div>
      )}
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
