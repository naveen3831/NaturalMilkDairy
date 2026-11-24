import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

const DairyContext = createContext();

export const DairyProvider = ({ children }) => {
  const { isConnected: wsConnected, subscribe: wsSubscribe } = useWebSocket();
  const { getAuthHeaders, user, token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [deliverySummary, setDeliverySummary] = useState({ total: 0, delivered: 0, pending: 0, notDelivered: 0 });
  const [products, setProducts] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [payments, setPayments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [pendingCredit, setPendingCredit] = useState({ totalOutstanding: 0, customers: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [contactInfo, setContactInfo] = useState({
    companyName: 'NATURAL MILK DAIRY PRIVATE LIMITED',
    tagline: 'Natural • Pure • Healthy',
    description:
      'Delivering pure farm-fresh unpasteurized milk and authentic dairy products directly to your doorstep across Mumbai.',
    address:
      'Natural Milk Dairy, Unit 12/B, Knowledge Park Rd, Near WEH, Andheri West, Mumbai, Maharashtra 400053',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400053',
    phone: '+91 98765 43210',
    cleanPhone: '919876543210',
    email: 'care@naturalmilkdairy.com',
    whatsapp: '+91 98765 43210',
    workingHours: '5:00 AM – 9:00 PM Daily (365 Days)',
    deliveryHours: '5:00 AM – 6:30 AM Doorstep Drop',
    socialLinks: {
      facebook: 'https://facebook.com',
      twitter: 'https://twitter.com',
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
    },
    footerBgImage: CLOUDINARY_MEDIA.footerFarmBg,
    footerLogo: CLOUDINARY_MEDIA.logo,
    footerFarmLandscape: CLOUDINARY_MEDIA.footerFarmLandscape,
    logoUrl: CLOUDINARY_MEDIA.logo,
  });
  const [mediaAssets, setMediaAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Cache & deduplication ref to prevent redundant duplicate re-fetches (< 2.5s)
  const lastFetchedRef = useRef({});
  const shouldSkipFetch = useCallback((key, cooldownMs = 2500) => {
    const now = Date.now();
    const last = lastFetchedRef.current[key] || 0;
    if (now - last < cooldownMs) return true;
    lastFetchedRef.current[key] = now;
    return false;
  }, []);

  // Offline support (PRD Section 34)
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    const saved = localStorage.getItem('nmd_offline_queue');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('nmd_offline_queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  // Report Analytics State (Today, Weekly, Monthly, All, Custom)
  const [reportPeriod, setReportPeriod] = useState('today');
  const [customDateRange, setCustomDateRange] = useState(() => {
    const d = new Date(Date.now() - 7 * 86400000);
    return {
      startDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d),
      endDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
    };
  });
  const [reportAnalytics, setReportAnalytics] = useState(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const fetchReportAnalytics = useCallback(async (period = reportPeriod, extraParams = {}) => {
    if (!token) return null;
    setIsLoadingReports(true);
    try {
      const q = new URLSearchParams({
        period,
        ...(period === 'custom' && customDateRange ? customDateRange : {}),
        ...extraParams,
      });
      const res = await fetch(`/api/reports/analytics?${q.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setReportAnalytics(data);
        return data;
      }
    } catch (err) {
      console.warn('Report analytics fetch error:', err);
    } finally {
      setIsLoadingReports(false);
    }
    return null;
  }, [reportPeriod, customDateRange, getAuthHeaders, token]);

  // Fetch Dashboard Summary (Admin Only - Supports period: 'today', 'weekly', 'monthly', 'all', 'custom' + startDate & endDate)
  const fetchDashboard = useCallback(async (date = selectedDate, period = reportPeriod, customRange = customDateRange) => {
    if (!token || user?.role !== 'admin') return;
    try {
      const q = new URLSearchParams({
        date,
        period,
      });
      if (customRange?.startDate) q.set('startDate', customRange.startDate);
      if (customRange?.endDate) q.set('endDate', customRange.endDate);
      const res = await fetch(`/api/reports/dashboard?${q.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDashboardSummary(data.summary);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    }
  }, [selectedDate, reportPeriod, customDateRange, getAuthHeaders, token, user?.role]);

  // Fetch Deliveries
  const fetchDeliveries = useCallback(async (date = selectedDate, status = 'all', boyId = 'all', range = 'today', customRange = customDateRange) => {
    if (!token) return;
    try {
      const params = new URLSearchParams({
        status,
        deliveryBoyId: boyId,
      });
      const activeRange = range === 'custom' || reportPeriod === 'custom' ? 'custom' : range;
      if (activeRange === 'custom') {
        params.set('range', 'custom');
        const s = customRange?.startDate || customDateRange?.startDate;
        const e = customRange?.endDate || customDateRange?.endDate;
        if (s) params.set('startDate', s);
        if (e) params.set('endDate', e);
      } else if (activeRange === 'all') {
        params.set('range', 'all');
      } else if (activeRange === 'weekly') {
        params.set('range', 'weekly');
      } else if (activeRange === 'monthly') {
        params.set('range', 'monthly');
      } else {
        params.set('range', 'today');
        params.set('date', date || selectedDate);
      }
      const res = await fetch(`/api/deliveries?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDeliveries(data.deliveries);
        setDeliverySummary(data.summary);
      }
    } catch (err) {
      console.warn('Deliveries fetch error:', err);
    }
  }, [selectedDate, reportPeriod, customDateRange, getAuthHeaders, token]);

  // Fetch Customers
  const fetchCustomers = useCallback(async (search = '', status = 'all') => {
    if (!token || user?.role === 'customer' || user?.role === 'user') return;
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}&status=${status}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.warn('Customers fetch error:', err);
    }
  }, [getAuthHeaders, token, user?.role]);

  // Fetch Products
  const fetchProducts = useCallback(async (force = false) => {
    if (!force && shouldSkipFetch('products')) return;
    try {
      const res = await fetch('/api/products', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.warn('Products fetch error:', err);
    }
  }, [getAuthHeaders, shouldSkipFetch]);

  // Fetch Delivery Boys
  const fetchDeliveryBoys = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/delivery-boys?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.deliveryBoys)) {
        setDeliveryBoys(data.deliveryBoys);
      }
    } catch (err) {
      console.warn('Delivery boys fetch error:', err);
    }
  }, [getAuthHeaders, token]);

  // Fetch Pending Credit Report (Admin Only)
  const fetchPendingCredit = useCallback(async (sortBy = 'highest') => {
    if (!token || user?.role !== 'admin') return;
    try {
      const res = await fetch(`/api/reports/pending-credit?sortBy=${sortBy}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setPendingCredit({ totalOutstanding: data.totalOutstanding, customers: data.customers });
      }
    } catch (err) {
      console.warn('Pending credit fetch error:', err);
    }
  }, [getAuthHeaders, token, user?.role]);

  // Fetch Audit Logs (Admin Only)
  const fetchAuditLogs = useCallback(async () => {
    if (!token || user?.role !== 'admin') return;
    try {
      const res = await fetch('/api/reports/audit-logs', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.warn('Audit logs fetch error:', err);
    }
  }, [getAuthHeaders, token, user?.role]);

  // Fetch Payments
  const fetchPayments = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/payments', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.payments)) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.warn('Payments fetch error:', err);
    }
  }, [getAuthHeaders, token]);

  // Fetch Service Locations
  const fetchLocations = useCallback(async (force = false) => {
    if (!force && shouldSkipFetch('locations')) return;
    try {
      const res = await fetch('/api/locations', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.locations)) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.warn('Locations fetch error:', err);
    }
  }, [getAuthHeaders, shouldSkipFetch]);

  // Real-time synchronization notifier (broadcasts to all open tabs and windows)
  const notifyRealtimeSync = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nmd_realtime_sync');
        bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
        bc.close();
      }
      localStorage.setItem('nmd_last_sync_timestamp', Date.now().toString());
    } catch (e) {
      // ignore
    }
  }, []);

  // Fetch Contact Details & Social Links
  const fetchContactInfo = useCallback(async (force = false) => {
    if (!force && shouldSkipFetch('contact-info')) return;
    try {
      const res = await fetch('/api/contact-info');
      const data = await res.json();
      if (data.success && data.contactInfo) {
        setContactInfo(data.contactInfo);
      }
    } catch (err) {
      console.warn('Contact info fetch error:', err);
    }
  }, [shouldSkipFetch]);

  // Update Contact Details & Social Links (Admin)
  const updateContactInfo = useCallback(
    async (payload) => {
      try {
        const res = await fetch('/api/contact-info', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.contactInfo) {
          setContactInfo(data.contactInfo);
          notifyRealtimeSync();
          return { success: true, contactInfo: data.contactInfo, message: data.message };
        }
        return { success: false, message: data.message || 'Failed to update contact info' };
      } catch (err) {
        console.error('updateContactInfo error:', err);
        return { success: false, message: err.message || 'Network error updating contact info' };
      }
    },
    [getAuthHeaders, notifyRealtimeSync]
  );

  // Reset Contact Details & Social Links (Admin)
  const resetContactInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/contact-info/reset', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.contactInfo) {
        setContactInfo(data.contactInfo);
        notifyRealtimeSync();
        return { success: true, contactInfo: data.contactInfo, message: data.message };
      }
      return { success: false, message: data.message || 'Failed to reset contact info' };
    } catch (err) {
      console.error('resetContactInfo error:', err);
      return { success: false, message: err.message || 'Network error resetting contact info' };
    }
  }, [getAuthHeaders, notifyRealtimeSync]);

  const fetchMediaAssets = useCallback(async (force = false) => {
    if (!force && shouldSkipFetch('media')) return;
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      if (data.success && Array.isArray(data.assets)) {
        setMediaAssets(data.assets);
      }
    } catch (err) {
      console.warn('Media assets fetch error:', err);
    }
  }, [shouldSkipFetch]);

  // Reload everything
  const refreshAll = useCallback(() => {
    fetchProducts();
    fetchLocations();
    fetchContactInfo();
    fetchMediaAssets();

    if (!token) return;

    if (user?.role === 'admin') {
      fetchDashboard();
      fetchPendingCredit();
      fetchAuditLogs();
    }

    if (user?.role === 'admin' || user?.role === 'delivery_boy') {
      fetchDeliveries();
      fetchCustomers();
      fetchDeliveryBoys();
      fetchPayments();
    }
  }, [
    token,
    user?.role,
    fetchDashboard,
    fetchDeliveries,
    fetchCustomers,
    fetchProducts,
    fetchDeliveryBoys,
    fetchPayments,
    fetchLocations,
    fetchPendingCredit,
    fetchAuditLogs,
    fetchContactInfo,
    fetchMediaAssets,
  ]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Background interval polling for guaranteed multi-device real-time sync
  useEffect(() => {
    if (!token || (user?.role !== 'admin' && user?.role !== 'delivery_boy')) return;
    const interval = setInterval(() => {
      fetchDeliveryBoys();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchDeliveryBoys, token, user?.role]);

  // Listen for real-time updates from other tabs or windows (Customer, Driver, Admin)
  useEffect(() => {
    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('nmd_realtime_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
          refreshAll();
        }
      };
    }

    const handleStorageChange = (e) => {
      if (e.key === 'nmd_last_sync_timestamp') {
        refreshAll();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshAll]);

  // Real-time WebSocket synchronization across the entire project
  useEffect(() => {
    const unsubDelivery = wsSubscribe('DELIVERY_UPDATED', () => {
      fetchDeliveries();
      fetchDashboard();
      fetchReportAnalytics();
      fetchPendingCredit();
      fetchDeliveryBoys();
      fetchPayments();
    });

    const unsubCustomer = wsSubscribe('CUSTOMER_UPDATED', () => {
      fetchCustomers();
      fetchDashboard();
      fetchReportAnalytics();
      fetchPendingCredit();
    });

    const syncPaymentUpdate = () => {
      fetchDeliveries();
      fetchPendingCredit();
      fetchDashboard();
      fetchReportAnalytics();
      fetchCustomers();
      fetchDeliveryBoys();
      fetchPayments();
    };
    const unsubPayment = wsSubscribe('PAYMENT_RECORDED', syncPaymentUpdate);
    const unsubPaymentUpdated = wsSubscribe('PAYMENT_UPDATED', syncPaymentUpdate);

    const unsubReport = wsSubscribe('REPORT_UPDATED', () => {
      fetchDashboard();
      fetchReportAnalytics();
    });

    const unsubHandover = wsSubscribe('CASH_HANDOVER_UPDATED', () => {
      fetchDashboard();
      fetchReportAnalytics();
    });

    const unsubProduct = wsSubscribe('PRODUCT_UPDATED', () => {
      fetchProducts();
    });

    const applyDutyPayload = (payload) => {
      if (!payload || typeof payload.isOnline !== 'boolean') return;
      const pId = String(payload.id || payload.boyId || payload.targetId || '');
      const pMob = payload.mobile ? String(payload.mobile).replace(/[^0-9]/g, '').slice(-10) : '';
      const pName = (payload.name || payload.boyName || '').trim().toLowerCase();

      setDeliveryBoys((prev) => {
        let matched = false;
        const updated = prev.map((b) => {
          const bId = String(b.id || b._id || '');
          const bMob = b.mobile ? String(b.mobile).replace(/[^0-9]/g, '').slice(-10) : '';
          const bName = (b.name || '').trim().toLowerCase();

          const matches =
            (pId && bId && pId === bId) ||
            (pMob && bMob && pMob === bMob) ||
            (pName && bName && pName === bName);

          if (matches) {
            matched = true;
            return {
              ...b,
              isOnline: payload.isOnline,
              lastOnlineAt: payload.lastOnlineAt || b.lastOnlineAt,
              lastOfflineAt: payload.lastOfflineAt || b.lastOfflineAt,
              dutyLogs: payload.dutyLogs || b.dutyLogs,
            };
          }
          return b;
        });

        if (!matched && (pName || pMob)) {
          setTimeout(() => fetchDeliveryBoys(), 100);
        }
        return updated;
      });
      notifyRealtimeSync();
    };

    const unsubDriver = wsSubscribe('DELIVERY_BOY_UPDATED', (data) => {
      const payload = data?.payload || data;
      applyDutyPayload(payload);
      fetchDeliveryBoys();
    });

    const unsubDuty = wsSubscribe('DRIVER_DUTY_UPDATED', (data) => {
      const payload = data?.payload || data;
      applyDutyPayload(payload);
      fetchDeliveryBoys();
    });

    const unsubLocation = wsSubscribe('LOCATION_UPDATED', () => {
      fetchLocations();
    });

    const unsubContactInfo = wsSubscribe('CONTACT_INFO_UPDATED', (data) => {
      if (data?.contactInfo) {
        setContactInfo(data.contactInfo);
      } else {
        fetchContactInfo();
      }
    });

    return () => {
      unsubDelivery();
      unsubCustomer();
      unsubPayment();
      unsubPaymentUpdated();
      unsubProduct();
      unsubDriver();
      unsubDuty();
      unsubLocation();
      unsubContactInfo();
    };
  }, [wsSubscribe, fetchDeliveries, fetchDashboard, fetchPendingCredit, fetchCustomers, fetchProducts, fetchDeliveryBoys, fetchPayments, fetchLocations, fetchContactInfo]);

  // Mark Delivery as Delivered
  const markDelivered = async (id, payload) => {
    // If offline, save action to queue
    if (!navigator.onLine) {
      setOfflineQueue((prev) => [...prev, { type: 'delivered', id, data: payload, timestamp: new Date().toISOString() }]);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'delivered', ...payload, deliveredAt: new Date().toISOString() } : d))
      );
      return { success: true, offline: true, message: 'Saved on phone (Offline mode). Will sync automatically!' };
    }

    try {
      const res = await fetch(`/api/deliveries/${id}/delivered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        notifyRealtimeSync();
        return data;
      }
      return { success: false, message: data.message || 'Could not save delivery.' };
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message || 'Could not reach the delivery service.' };
    }
  };

  // Mark Delivery as Not Delivered
  const markNotDelivered = async (id, payload) => {
    if (!navigator.onLine) {
      setOfflineQueue((prev) => [...prev, { type: 'not_delivered', id, data: payload, timestamp: new Date().toISOString() }]);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'not_delivered', ...payload, deliveredAt: new Date().toISOString() } : d))
      );
      return { success: true, offline: true, message: 'Saved on phone (Offline mode).' };
    }

    try {
      const res = await fetch(`/api/deliveries/${id}/not-delivered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        notifyRealtimeSync();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Assign Delivery to Delivery Partner
  const assignDelivery = async (id, payload) => {
    try {
      const res = await fetch(`/api/deliveries/${id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        notifyRealtimeSync();
        return data;
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  };

  // Delete Delivery from Admin & Driver Dashboards (preserves customer history)
  const deleteDelivery = async (id) => {
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      const data = await res.json();
      if (data.success) {
        setDeliveries((prev) => prev.filter((d) => d.id !== id && d._id !== id));
        refreshAll();
        notifyRealtimeSync();
        return data;
      }
      return { success: false, message: data.message || 'Could not delete delivery.' };
    } catch (err) {
      console.error('Delete delivery error:', err);
      return { success: false, message: err.message || 'Could not reach server.' };
    }
  };

  // Sync offline queue
  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    try {
      const res = await fetch('/api/deliveries/offline-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ offlineActions: offlineQueue }),
      });
      const data = await res.json();
      if (data.success) {
        setOfflineQueue([]);
        refreshAll();
      }
    } catch (err) {
      console.warn('Sync failed, will retry later:', err);
    }
  };

  // Record Payment
  const recordPayment = async (payload) => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Customer
  const addCustomer = async (payload) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        notifyRealtimeSync();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message || 'Network error connecting to server.' };
    }
  };

  // Update Customer
  const updateCustomer = async (id, payload) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        notifyRealtimeSync();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message || 'Network error connecting to server.' };
    }
  };

  // Assign Partner to Customer
  const assignPartnerToCustomer = async (customerId, payload) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/assign-partner`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        notifyRealtimeSync();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message || 'Network error connecting to server.' };
    }
  };

  // Pause Delivery
  const pauseDelivery = async (id, payload) => {
    try {
      const res = await fetch(`/api/customers/${id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        notifyRealtimeSync();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resume Delivery
  const resumeDelivery = async (id, payload) => {
    try {
      const res = await fetch(`/api/customers/${id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload || {}),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        notifyRealtimeSync();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Set Temporary Qty
  const setTemporaryQty = async (id, payload) => {
    try {
      const res = await fetch(`/api/customers/${id}/temp-qty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        notifyRealtimeSync();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Product Price
  const updateProductPrice = async (id, price, actor) => {
    try {
      const res = await fetch(`/api/products/${id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ price, actor }),
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
        fetchAuditLogs();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Product
  const addProduct = async (payload) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Product (all fields including image, status, etc.)
  const updateProduct = async (id, payload) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Product
  const deleteProduct = async (id, actor = 'Admin') => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ actor }),
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
        fetchAuditLogs();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Upload image to Cloudinary
  const uploadImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'natural-milk-dairy');

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });
      return await res.json();
    } catch (err) {
      console.error('Image upload error:', err);
      return { success: false, message: err.message };
    }
  };

  // Add Delivery Boy
  const addDeliveryBoy = async (payload) => {
    try {
      const res = await fetch('/api/delivery-boys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchDeliveryBoys();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message || 'Network error connecting to server.' };
    }
  };

  // Update Delivery Boy
  const updateDeliveryBoy = async (boyId, payload) => {
    try {
      const res = await fetch(`/api/delivery-boys/${boyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchDeliveryBoys();
        fetchAuditLogs();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message || 'Network error connecting to server.' };
    }
  };

  // Delete Delivery Boy
  const deleteDeliveryBoy = async (boyId, actor = 'Admin', force = false) => {
    try {
      const res = await fetch(`/api/delivery-boys/${boyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ actor, force }),
      });
      const data = await res.json();
      if (data.success) {
        setDeliveryBoys((prev) => prev.filter((b) => b.id !== boyId && b._id !== boyId && b.mobile !== boyId));
        fetchDeliveryBoys();
        fetchAuditLogs();
        notifyRealtimeSync();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message || 'Network error connecting to server.' };
    }
  };

  // Toggle Partner Shift Duty Status (Online / Offline)
  const toggleDeliveryBoyDuty = async (boyOrId, explicitOnlineState = null) => {
    try {
      const boyObj = typeof boyOrId === 'object' && boyOrId !== null
        ? boyOrId
        : (deliveryBoys.find((b) => (b.id || b._id) === boyOrId) || {});
      const targetId = typeof boyOrId === 'object' && boyOrId !== null
        ? (boyOrId.id || boyOrId._id)
        : boyOrId;
      const currentState = boyObj.isOnline === true;
      const nextState = typeof explicitOnlineState === 'boolean' ? explicitOnlineState : !currentState;
      const now = new Date().toISOString();

      // Optimistic state update
      setDeliveryBoys((prev) =>
        prev.map((b) =>
          (b.id === targetId || b._id === targetId || (boyObj?.mobile && b.mobile === boyObj.mobile))
            ? {
                ...b,
                isOnline: nextState,
                ...(nextState ? { lastOnlineAt: now } : { lastOfflineAt: now }),
              }
            : b
        )
      );

      const res = await fetch(`/api/delivery-boys/${targetId}/duty-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          isOnline: nextState,
          boyId: targetId,
          mobile: boyObj?.mobile,
          name: boyObj?.name,
          area: boyObj?.assignedArea,
        }),
      });
      const data = await res.json();
      notifyRealtimeSync();
      fetchDeliveryBoys();
      return data;
    } catch (err) {
      console.error('Toggle duty error:', err);
      fetchDeliveryBoys();
      return { success: false, message: err.message };
    }
  };

  // Delete Customer Permanently
  const deleteCustomer = async (customerId, actor = 'Customer') => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ actor }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCustomers();
        fetchDeliveries();
        fetchAuditLogs();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message || 'Network error connecting to server.' };
    }
  };

  // Reconcile Cash
  const reconcileCash = async (boyId, payload) => {
    try {
      const res = await fetch(`/api/delivery-boys/${boyId}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Customer Ledger
  const getCustomerLedger = async (customerId) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/ledger`, {
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Fetch Monthly Statement
  const getCustomerStatement = async (customerId, month) => {
    try {
      const res = await fetch(`/api/reports/statement?customerId=${customerId}&month=${month || '2026-10'}`, {
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Send Delivery Boy Credentials Email
  const sendDeliveryBoyCredentials = async (boyId, actor = 'Admin') => {
    try {
      const res = await fetch(`/api/delivery-boys/${boyId}/send-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ actor }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAuditLogs();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  };

  // Send Customer Credentials Email
  const sendCustomerCredentials = async (customerId, actor = 'Admin') => {
    try {
      const res = await fetch(`/api/customers/${customerId}/send-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ actor }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAuditLogs();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  };

  // Add Service Location
  const addLocation = async (locData) => {
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(locData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchLocations();
        notifyRealtimeSync();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  };

  // Update Service Location
  const updateLocation = async (id, locData) => {
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(locData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchLocations();
        notifyRealtimeSync();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  };

  // Delete / Deactivate Service Location
  const deleteLocation = async (id) => {
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await fetchLocations();
        notifyRealtimeSync();
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  };

  return (
    <DairyContext.Provider
      value={{
        customers,
        deliveries,
        deliverySummary,
        products,
        deliveryBoys,
        payments,
        dashboardSummary,
        pendingCredit,
        auditLogs,
        loading,
        selectedDate,
        setSelectedDate,
        wsConnected,
        isOnline,
        offlineQueue,
        syncOfflineQueue,
        refreshAll,
        notifyRealtimeSync,
        fetchDashboard,
        fetchDeliveries,
        fetchCustomers,
        fetchProducts,
        fetchDeliveryBoys,
        fetchPayments,
        fetchPendingCredit,
        fetchAuditLogs,
        markDelivered,
        markNotDelivered,
        assignDelivery,
        deleteDelivery,
        recordPayment,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        assignPartnerToCustomer,
        pauseDelivery,
        resumeDelivery,
        setTemporaryQty,
        updateProductPrice,
        addProduct,
        updateProduct,
        deleteProduct,
        uploadImage,
        addDeliveryBoy,
        updateDeliveryBoy,
        deleteDeliveryBoy,
        toggleDeliveryBoyDuty,
        reconcileCash,
        sendDeliveryBoyCredentials,
        sendCustomerCredentials,
        getCustomerLedger,
        getCustomerStatement,
        reportAnalytics,
        fetchReportAnalytics,
        reportPeriod,
        setReportPeriod,
        customDateRange,
        setCustomDateRange,
        isLoadingReports,
        locations,
        fetchLocations,
        addLocation,
        updateLocation,
        deleteLocation,
        contactInfo,
        fetchContactInfo,
        updateContactInfo,
        resetContactInfo,
        mediaAssets,
        fetchMediaAssets,
      }}
    >
      {children}
    </DairyContext.Provider>
  );
};

export const useDairy = () => useContext(DairyContext);
