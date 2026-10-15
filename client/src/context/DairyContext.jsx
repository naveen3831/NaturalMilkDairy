import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';

const DairyContext = createContext();

export const DairyProvider = ({ children }) => {
  const { isConnected: wsConnected, subscribe: wsSubscribe } = useWebSocket();
  const { getAuthHeaders } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [deliverySummary, setDeliverySummary] = useState({ total: 0, delivered: 0, pending: 0, notDelivered: 0 });
  const [products, setProducts] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [pendingCredit, setPendingCredit] = useState({ totalOutstanding: 0, customers: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

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

  // Fetch Dashboard Summary
  const fetchDashboard = useCallback(async (date = selectedDate) => {
    try {
      const res = await fetch(`/api/reports/dashboard?date=${date}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDashboardSummary(data.summary);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    }
  }, [selectedDate, getAuthHeaders]);

  // Fetch Deliveries
  const fetchDeliveries = useCallback(async (date = selectedDate, status = 'all', boyId = 'all', range = 'today') => {
    try {
      const params = new URLSearchParams({
        status,
        deliveryBoyId: boyId,
      });
      if (range === 'all') {
        params.set('range', 'all');
      } else if (range === 'weekly') {
        params.set('range', 'weekly');
      } else if (range === 'monthly') {
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
  }, [selectedDate, getAuthHeaders]);

  // Fetch Customers
  const fetchCustomers = useCallback(async (search = '', status = 'all') => {
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
  }, [getAuthHeaders]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
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
  }, [getAuthHeaders]);

  // Fetch Delivery Boys
  const fetchDeliveryBoys = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery-boys', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDeliveryBoys(data.deliveryBoys);
      }
    } catch (err) {
      console.warn('Delivery boys fetch error:', err);
    }
  }, [getAuthHeaders]);

  // Fetch Pending Credit Report
  const fetchPendingCredit = useCallback(async (sortBy = 'highest') => {
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
  }, [getAuthHeaders]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
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
  }, [getAuthHeaders]);

  // Fetch Service Locations
  const fetchLocations = useCallback(async () => {
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
  }, [getAuthHeaders]);

  // Reload everything
  const refreshAll = useCallback(() => {
    fetchDashboard();
    fetchDeliveries();
    fetchCustomers();
    fetchProducts();
    fetchDeliveryBoys();
    fetchLocations();
    fetchPendingCredit();
    fetchAuditLogs();
  }, [fetchDashboard, fetchDeliveries, fetchCustomers, fetchProducts, fetchDeliveryBoys, fetchLocations, fetchPendingCredit, fetchAuditLogs]);

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

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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
      fetchPendingCredit();
    });

    const unsubCustomer = wsSubscribe('CUSTOMER_UPDATED', () => {
      fetchCustomers();
      fetchDashboard();
      fetchPendingCredit();
    });

    const unsubPayment = wsSubscribe('PAYMENT_RECORDED', () => {
      fetchPendingCredit();
      fetchDashboard();
      fetchCustomers();
    });

    const unsubProduct = wsSubscribe('PRODUCT_UPDATED', () => {
      fetchProducts();
    });

    const unsubDriver = wsSubscribe('DELIVERY_BOY_UPDATED', () => {
      fetchDeliveryBoys();
    });

    const unsubLocation = wsSubscribe('LOCATION_UPDATED', () => {
      fetchLocations();
    });

    return () => {
      unsubDelivery();
      unsubCustomer();
      unsubPayment();
      unsubProduct();
      unsubDriver();
      unsubLocation();
    };
  }, [wsSubscribe, fetchDeliveries, fetchDashboard, fetchPendingCredit, fetchCustomers, fetchProducts, fetchDeliveryBoys, fetchLocations]);

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
        reconcileCash,
        sendDeliveryBoyCredentials,
        sendCustomerCredentials,
        getCustomerLedger,
        getCustomerStatement,
        locations,
        fetchLocations,
        addLocation,
        updateLocation,
        deleteLocation,
      }}
    >
      {children}
    </DairyContext.Provider>
  );
};

export const useDairy = () => useContext(DairyContext);
