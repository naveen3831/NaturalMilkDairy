import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  CreditCard,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Plus,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  Check,
  X,
  Trash2,
  Bike,
  TrendingUp,
  Users,
  IndianRupee,
} from 'lucide-react';

const formatCurrency = (val) => `₹${(Number(val) || 0).toLocaleString('en-IN')}`;

const getDefaultDateRange = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    fromDate: `${y}-${m}-01`,
    toDate: `${y}-${m}-${d}`,
  };
};

const getBalanceMeta = (balance) => {
  const num = Number(balance) || 0;
  if (num > 0) {
    return { label: `Due ${formatCurrency(num)}`, status: 'Due', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  }
  if (num < 0) {
    return { label: `Advance ${formatCurrency(Math.abs(num))}`, status: 'Advance', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
  }
  return { label: 'Settled', status: 'Settled', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
};

export default function PaymentsManager({ onOpenPaymentModal }) {
  const { token } = useAuth();
  const { subscribe: wsSubscribe } = useWebSocket();

  const defaultRange = useMemo(() => getDefaultDateRange(), []);

  // Tabs: 'handovers' | 'customer-payments' | 'partners' | 'customers'
  const [activeTab, setActiveTab] = useState('handovers');

  // Date range for /api/payments/admin-overview & payment history filter
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);

  // Overview data
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    fullEarnings: 0,
    upiRevenue: 0,
    cashRevenue: 0,
    monthlyRevenue: 0,
    monthlyCashRevenue: 0,
    monthlyUpiRevenue: 0,
    monthlyTransactions: 0,
    rangeRevenue: 0,
    rangeCashRevenue: 0,
    rangeUpiRevenue: 0,
    rangeTransactions: 0,
    partnerCashInHand: 0,
    pendingHandoverAmount: 0,
    acceptedHandoverAmount: 0,
    customerReceivables: 0,
    totalTransactions: 0,
    totalHandovers: 0,
  });
  const [handovers, setHandovers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [partners, setPartners] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & search
  const [handoverFilter, setHandoverFilter] = useState('all');
  const [handoverSearch, setHandoverSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerBalanceFilter, setCustomerBalanceFilter] = useState('all'); // 'all' | 'due' | 'advance' | 'settled'

  // Actions & feedback
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Modals / Drawers
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Cash amount mismatch at counter');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Inline fallback Record Payment modal (used if onOpenPaymentModal is not passed, e.g., in AdminProfileView)
  const [inlinePaymentCustomer, setInlinePaymentCustomer] = useState(null);
  const [inlineAmount, setInlineAmount] = useState('');
  const [inlineMethod, setInlineMethod] = useState('cash');
  const [inlineRef, setInlineRef] = useState('');
  const [inlineNotes, setInlineNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const showFeedback = useCallback((type, text) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4500);
  }, []);

  // Unified fetch from /api/payments/admin-overview
  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/payments/admin-overview${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        if (data.summary) setSummary(data.summary);
        if (Array.isArray(data.handovers)) setHandovers(data.handovers);
        if (Array.isArray(data.payments)) setPayments(data.payments);
        if (Array.isArray(data.partners)) setPartners(data.partners);
        if (Array.isArray(data.customers)) setCustomers(data.customers);
      }
    } catch (err) {
      console.error('fetchOverview error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, fromDate, toDate]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Keep selectedPartner / selectedCustomer synced with refreshed data
  useEffect(() => {
    if (selectedPartner) {
      const pId = selectedPartner.id || selectedPartner._id;
      const updated = partners.find((p) => (p.id || p._id) === pId);
      if (updated) setSelectedPartner(updated);
    }
  }, [partners, selectedPartner]);

  useEffect(() => {
    if (selectedCustomer) {
      const cId = selectedCustomer.id || selectedCustomer._id;
      const updated = customers.find((c) => (c.id || c._id) === cId);
      if (updated) setSelectedCustomer(updated);
    }
  }, [customers, selectedCustomer]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!wsSubscribe) return;

    const unsubs = [
      wsSubscribe('CASH_HANDOVER_SUBMITTED', () => {
        fetchOverview();
        showFeedback('info', 'New driver cash handover received! Overview refreshed.');
      }),
      wsSubscribe('CASH_HANDOVER_UPDATED', fetchOverview),
      wsSubscribe('PAYMENT_RECORDED', fetchOverview),
      wsSubscribe('PAYMENT_UPDATED', fetchOverview),
      wsSubscribe('DELIVERY_UPDATED', fetchOverview),
      wsSubscribe('DELIVERY_BOY_UPDATED', fetchOverview),
      wsSubscribe('CUSTOMER_UPDATED', fetchOverview),
    ];

    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [wsSubscribe, fetchOverview, showFeedback]);

  // Handover Actions
  const handleAcceptHandover = async (item) => {
    try {
      setActionLoadingId(item.id || item._id);
      const res = await fetch(`/api/payments/handovers/${item.id || item._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'accepted' }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', `Verified & accepted ${formatCurrency(item.amount)} from driver ${item.deliveryBoyName}!`);
        await fetchOverview();
      } else {
        throw new Error(data.message || 'Failed to accept handover');
      }
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      setActionLoadingId(rejectingItem.id || rejectingItem._id);
      const res = await fetch(`/api/payments/handovers/${rejectingItem.id || rejectingItem._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: rejectionReason.trim() || 'Discrepancy at counter',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('warning', `Handover of ${formatCurrency(rejectingItem.amount)} rejected. Driver notified.`);
        setRejectingItem(null);
        await fetchOverview();
      } else {
        throw new Error(data.message || 'Failed to reject handover');
      }
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteHandover = async (item) => {
    if (!window.confirm(`Delete handover record of ${formatCurrency(item.amount)} from driver ${item.deliveryBoyName}?`)) return;
    try {
      const res = await fetch(`/api/payments/handovers/${item.id || item._id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('info', 'Handover record deleted.');
        await fetchOverview();
      } else {
        alert(data.message || 'Failed to delete handover');
      }
    } catch (e) {
      alert('Failed to delete handover: ' + e.message);
    }
  };

  const handleTriggerRecordPayment = (customerObj = null) => {
    if (typeof onOpenPaymentModal === 'function') {
      onOpenPaymentModal(customerObj);
      return;
    }
    const target = customerObj || customers[0] || null;
    setInlinePaymentCustomer(target);
    setInlineAmount(target && target.currentBalance > 0 ? String(target.currentBalance) : '');
    setInlineMethod('cash');
    setInlineRef('');
    setInlineNotes('');
  };

  const handleSubmitInlinePayment = async (e) => {
    e.preventDefault();
    if (!inlinePaymentCustomer) return;
    const amt = Number(inlineAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      showFeedback('error', 'Please enter a valid payment amount.');
      return;
    }
    try {
      setIsSubmittingPayment(true);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerId: inlinePaymentCustomer.id || inlinePaymentCustomer._id || inlinePaymentCustomer.customerId,
          amount: amt,
          paymentMethod: inlineMethod,
          referenceNumber: inlineRef.trim(),
          notes: inlineNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to record payment');
      showFeedback('success', `Recorded ${formatCurrency(amt)} payment for ${inlinePaymentCustomer.name}.`);
      setInlinePaymentCustomer(null);
      await fetchOverview();
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Derived metrics
  const pendingHandovers = useMemo(() => handovers.filter((h) => h.status === 'pending'), [handovers]);
  const acceptedHandovers = useMemo(() => handovers.filter((h) => h.status === 'accepted'), [handovers]);

  // Filtered Lists
  const displayedHandovers = useMemo(() => {
    return handovers.filter((h) => {
      if (handoverFilter !== 'all' && h.status !== handoverFilter) return false;
      if (handoverSearch.trim()) {
        const q = handoverSearch.toLowerCase();
        return (
          h.deliveryBoyName?.toLowerCase().includes(q) ||
          h.deliveryBoyMobile?.toLowerCase().includes(q) ||
          h.assignedArea?.toLowerCase().includes(q) ||
          h.notes?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [handovers, handoverFilter, handoverSearch]);

  const displayedPayments = useMemo(() => {
    const startMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const endMs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;

    return payments.filter((p) => {
      if (startMs && endMs) {
        const pMs = new Date(p.paymentDate || p.createdAt || 0).getTime();
        if (pMs < startMs || pMs > endMs) return false;
      }
      if (paymentMethodFilter !== 'all' && p.paymentMethod !== paymentMethodFilter) return false;
      if (paymentSearch.trim()) {
        const q = paymentSearch.toLowerCase();
        return (
          p.customerName?.toLowerCase().includes(q) ||
          p.referenceNumber?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [payments, paymentMethodFilter, paymentSearch, fromDate, toDate]);

  const displayedPartners = useMemo(() => {
    return partners.filter((b) => {
      if (partnerSearch.trim()) {
        const q = partnerSearch.toLowerCase();
        return (
          b.name?.toLowerCase().includes(q) ||
          b.mobile?.toLowerCase().includes(q) ||
          b.assignedArea?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [partners, partnerSearch]);

  const displayedCustomers = useMemo(() => {
    return customers.filter((c) => {
      const bal = Number(c.currentBalance) || 0;
      if (customerBalanceFilter === 'due' && bal <= 0) return false;
      if (customerBalanceFilter === 'advance' && bal >= 0) return false;
      if (customerBalanceFilter === 'settled' && bal !== 0) return false;

      if (customerSearch.trim()) {
        const q = customerSearch.toLowerCase();
        return (
          c.name?.toLowerCase().includes(q) ||
          c.mobile?.toLowerCase().includes(q) ||
          c.customerId?.toLowerCase().includes(q) ||
          c.area?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customers, customerBalanceFilter, customerSearch]);

  // Helpers for Partner & Customer Modals
  const getPartnerHandovers = useCallback(
    (partner) => {
      if (!partner) return [];
      const boyId = String(partner.id || partner._id || '');
      const boyMob = partner.mobile ? String(partner.mobile).slice(-10) : '';
      return handovers.filter((h) => {
        if (h.deliveryBoyId && boyId && String(h.deliveryBoyId) === boyId) return true;
        if (h.deliveryBoyMobile && boyMob && String(h.deliveryBoyMobile).slice(-10) === boyMob) return true;
        return false;
      });
    },
    [handovers]
  );

  const getCustomerPayments = useCallback(
    (cust) => {
      if (!cust) return [];
      const cId = String(cust.id || cust._id || '');
      const custCode = String(cust.customerId || '');
      return payments.filter(
        (p) =>
          (cId && String(p.customerId) === cId) ||
          (custCode && String(p.customerId) === custCode) ||
          (cust.name && p.customerName && p.customerName.toLowerCase() === cust.name.toLowerCase())
      );
    },
    [payments]
  );

  const totalPartnerCashInHand = Number(summary.partnerCashInHand) || 0;
  const totalPartnerUpiCollected = useMemo(
    () => partners.reduce((sum, b) => sum + (Number(b.todayUpiCollected) || 0), 0),
    [partners]
  );

  return (
    <div style={{ padding: '0 0 32px 0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 1. Header with Title & Record Payment Action */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '18px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Finance, Payments & History
            </h1>
            <span
              style={{
                background: '#ecfdf5',
                color: '#0D5C3A',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid #a7f3d0',
              }}
            >
              Real-Time Ledger
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.86rem' }}>
            Earnings overview, date-range audit, partner settlements & customer ledgers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleTriggerRecordPayment(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: '#0D5C3A',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(13, 92, 58, 0.25)',
          }}
        >
          <Plus size={16} />
          <span>Record Customer Payment</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg.text && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.86rem',
            fontWeight: 600,
            background:
              feedbackMsg.type === 'success'
                ? '#ecfdf5'
                : feedbackMsg.type === 'error'
                ? '#fef2f2'
                : feedbackMsg.type === 'warning'
                ? '#fffbeb'
                : '#eff6ff',
            color:
              feedbackMsg.type === 'success'
                ? '#065f46'
                : feedbackMsg.type === 'error'
                ? '#991b1b'
                : feedbackMsg.type === 'warning'
                ? '#92400e'
                : '#1e40af',
            border:
              feedbackMsg.type === 'success'
                ? '1px solid #a7f3d0'
                : feedbackMsg.type === 'error'
                ? '1px solid #fecaca'
                : feedbackMsg.type === 'warning'
                ? '1px solid #fde68a'
                : '1px solid #bfdbfe',
          }}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : feedbackMsg.type === 'error' ? (
            <XCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 2. Admin Earnings & Financial Performance Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px',
          marginBottom: '14px',
        }}
      >
        {/* Full Earnings (All Time) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0D5C3A 0%, #059669 100%)',
            borderRadius: '16px',
            padding: '18px 20px',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#a7f3d0' }}>
              Full Earnings (All Time)
            </span>
            <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
              {summary.totalTransactions || 0} txns
            </span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, marginTop: '6px' }}>
            {formatCurrency(summary.fullEarnings ?? summary.totalRevenue)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#d1fae5', display: 'block' }}>Cash Split</span>
              <strong style={{ fontSize: '0.98rem', fontWeight: 800 }}>{formatCurrency(summary.cashRevenue)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#d1fae5', display: 'block' }}>UPI / Digital Split</span>
              <strong style={{ fontSize: '0.98rem', fontWeight: 800 }}>{formatCurrency(summary.upiRevenue)}</strong>
            </div>
          </div>
        </div>

        {/* Monthly Earnings (Current Month) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#0D5C3A' }}>
              Monthly Earnings (This Month)
            </span>
            <span style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
              {summary.monthlyTransactions || 0} txns
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
            {formatCurrency(summary.monthlyRevenue)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Cash Split</span>
              <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>{formatCurrency(summary.monthlyCashRevenue)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>UPI / Digital Split</span>
              <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2563eb' }}>{formatCurrency(summary.monthlyUpiRevenue)}</strong>
            </div>
          </div>
        </div>

        {/* Date Range Picker & Selected Range Earnings */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #a7f3d0',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#0D5C3A', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={14} /> Selected Range Earnings
            </span>
            <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
              {summary.rangeTransactions || 0} txns
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0D5C3A' }}>
              {formatCurrency(summary.rangeRevenue)}
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '0.76rem', fontWeight: 700 }}>
              <span style={{ color: '#059669' }}>Cash: {formatCurrency(summary.rangeCashRevenue)}</span>
              <span style={{ color: '#2563eb' }}>UPI: {formatCurrency(summary.rangeUpiRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Key Financial & Ledger Summary Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Customer Receivables / Outstanding */}
        <div
          onClick={() => {
            setActiveTab('customers');
            setCustomerBalanceFilter('due');
          }}
          style={{
            background: '#ffffff',
            border: (summary.customerReceivables || 0) > 0 ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.71rem', fontWeight: 700, color: (summary.customerReceivables || 0) > 0 ? '#dc2626' : '#059669', textTransform: 'uppercase' }}>
                Customer Receivables
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {formatCurrency(summary.customerReceivables)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                {customers.filter((c) => Number(c.currentBalance) > 0).length} accounts with due
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} />
            </div>
          </div>
        </div>

        {/* Verified Handovers */}
        <div
          onClick={() => {
            setActiveTab('handovers');
            setHandoverFilter('accepted');
          }}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.71rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                Verified Handovers
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                {formatCurrency(summary.acceptedHandoverAmount)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                {acceptedHandovers.length} settled shift audits
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
        </div>

        {/* Pending Handovers */}
        <div
          onClick={() => {
            setActiveTab('handovers');
            setHandoverFilter('pending');
          }}
          style={{
            background: '#ffffff',
            border: pendingHandovers.length > 0 ? '1.5px solid #fdba74' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.71rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
                Pending Handovers
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {formatCurrency(summary.pendingHandoverAmount)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                {pendingHandovers.length} awaiting verification
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
        </div>

        {/* Driver Cash in Hand */}
        <div
          onClick={() => setActiveTab('partners')}
          style={{
            background: '#ffffff',
            border: totalPartnerCashInHand > 0 ? '1.5px solid #a7f3d0' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.71rem', fontWeight: 700, color: '#0D5C3A', textTransform: 'uppercase' }}>
                Driver Cash In Hand
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0D5C3A', marginTop: '4px' }}>
                {formatCurrency(totalPartnerCashInHand)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                {partners.filter((p) => Number(p.todayCashCollected || 0) > 0).length} drivers holding cash
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e2f1ea', color: '#0D5C3A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Navigation Tabs (Responsive horizontal scroll on mobile) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '18px',
          paddingBottom: '2px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {[
          {
            id: 'handovers',
            label: 'Driver Cash Handovers',
            icon: CreditCard,
            badge: pendingHandovers.length > 0 ? pendingHandovers.length : null,
            badgeBg: '#ea580c',
            badgeColor: '#ffffff',
          },
          {
            id: 'customer-payments',
            label: 'Customer Payment Entries',
            icon: FileText,
            badge: displayedPayments.length,
            badgeBg: '#f1f5f9',
            badgeColor: '#475569',
          },
          {
            id: 'partners',
            label: 'Partner Cash & Settlements',
            icon: Bike,
            badge: partners.length,
            badgeBg: '#f1f5f9',
            badgeColor: '#475569',
          },
          {
            id: 'customers',
            label: 'Customers & Ledgers',
            icon: Users,
            badge: customers.length,
            badgeBg: '#f1f5f9',
            badgeColor: '#475569',
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 14px',
                fontSize: '0.86rem',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2.5px solid #0D5C3A' : '2.5px solid transparent',
                color: isActive ? '#0D5C3A' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span
                  style={{
                    background: tab.badgeBg,
                    color: tab.badgeColor,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DRIVER CASH HANDOVERS                             */}
      {/* ======================================================== */}
      {activeTab === 'handovers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Handovers', count: handovers.length },
                { id: 'pending', label: 'Pending Verification', count: pendingHandovers.length, badgeColor: '#ea580c' },
                { id: 'accepted', label: 'Accepted & Verified', count: acceptedHandovers.length, badgeColor: '#059669' },
                { id: 'rejected', label: 'Rejected', count: handovers.filter((h) => h.status === 'rejected').length },
              ].map((pill) => {
                const isActive = handoverFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setHandoverFilter(pill.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 600,
                      background: isActive ? '#0D5C3A' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#475569',
                      border: isActive ? '1px solid #0D5C3A' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{pill.label}</span>
                    {pill.count > 0 && (
                      <span
                        style={{
                          background: isActive ? 'rgba(255,255,255,0.25)' : pill.badgeColor || '#e2e8f0',
                          color: isActive || pill.badgeColor ? '#ffffff' : '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '999px',
                        }}
                      >
                        {pill.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search driver, route, notes..."
                value={handoverSearch}
                onChange={(e) => setHandoverSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '9px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {isLoading && handovers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <div>Loading cash handovers...</div>
            </div>
          ) : displayedHandovers.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '44px 20px',
                textAlign: 'center',
              }}
            >
              <Wallet size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                No cash handovers found
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                {handoverFilter === 'pending'
                  ? 'There are no pending cash handovers awaiting verification right now.'
                  : 'Driver shift cash deposits will appear here.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayedHandovers.map((item) => {
                const itemId = item.id || item._id;
                const isPending = item.status === 'pending';
                const isAccepted = item.status === 'accepted';
                const isRejected = item.status === 'rejected';
                const isActionBusy = actionLoadingId === itemId;

                return (
                  <div
                    key={itemId}
                    style={{
                      background: '#ffffff',
                      border: isPending ? '1.5px solid #fdba74' : '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '16px 18px',
                      boxShadow: isPending ? '0 4px 14px rgba(234, 88, 12, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: '1 1 240px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: isPending ? '#ffedd5' : isAccepted ? '#dcfce7' : '#fee2e2',
                          color: isPending ? '#ea580c' : isAccepted ? '#059669' : '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.05rem',
                          flexShrink: 0,
                        }}
                      >
                        {item.deliveryBoyName ? item.deliveryBoyName.charAt(0).toUpperCase() : 'D'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                            {item.deliveryBoyName || 'Delivery Partner'}
                          </span>
                          {item.assignedArea && (
                            <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                              📍 {item.assignedArea}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                          {item.deliveryBoyMobile && <span>📞 {item.deliveryBoyMobile}</span>}
                          <span>
                            🕒 {new Date(item.handoverDate || item.createdAt).toLocaleDateString()} at{' '}
                            {new Date(item.handoverDate || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {item.notes && (
                          <div style={{ marginTop: '4px', fontSize: '0.76rem', color: '#475569', fontStyle: 'italic' }}>
                            “{item.notes}”
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', minWidth: '120px' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Handover Amount
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isAccepted ? '#059669' : '#0f172a', lineHeight: 1.2 }}>
                        {formatCurrency(item.amount)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {item.handoverMethod === 'dairy_counter'
                          ? '💵 Dairy Counter'
                          : item.handoverMethod === 'bank_deposit'
                          ? '🏦 Bank Deposit'
                          : item.handoverMethod === 'upi_to_admin'
                          ? '📱 UPI to Admin'
                          : '💵 Cash Handover'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {isPending && (
                        <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', padding: '5px 11px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ea580c' }} />
                          Pending Verification
                        </span>
                      )}
                      {isAccepted && (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '5px 11px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <CheckCircle2 size={14} color="#059669" /> Verified & Accepted
                          </span>
                          {item.verifiedBy && <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>By {item.verifiedBy}</div>}
                        </div>
                      )}
                      {isRejected && (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 11px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <XCircle size={14} color="#dc2626" /> Rejected
                          </span>
                          {item.rejectionReason && <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: '3px' }}>{item.rejectionReason}</div>}
                        </div>
                      )}

                      {isPending && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleAcceptHandover(item)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 13px',
                              background: '#059669',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '9px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: isActionBusy ? 'not-allowed' : 'pointer',
                              opacity: isActionBusy ? 0.7 : 1,
                            }}
                          >
                            <Check size={15} />
                            <span>{isActionBusy ? 'Verifying...' : 'Accept Cash'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => setRejectingItem(item)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '8px 11px',
                              background: '#ffffff',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '9px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: isActionBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        title="Delete Handover Record"
                        onClick={() => handleDeleteHandover(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CUSTOMER PAYMENT ENTRIES                          */}
      {/* ======================================================== */}
      {activeTab === 'customer-payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Methods' },
                { id: 'cash', label: 'Cash Only' },
                { id: 'upi', label: 'UPI / Online' },
                { id: 'card', label: 'Card' },
              ].map((m) => {
                const isActive = paymentMethodFilter === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethodFilter(m.id)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 600,
                      background: isActive ? '#0D5C3A' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#475569',
                      border: isActive ? '1px solid #0D5C3A' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
              {fromDate && toDate && (
                <span style={{ fontSize: '0.74rem', color: '#0D5C3A', background: '#ecfdf5', padding: '4px 9px', borderRadius: '8px', fontWeight: 700 }}>
                  Range: {fromDate} → {toDate}
                </span>
              )}
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search customer, reference..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '9px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {isLoading && payments.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <div>Loading payments...</div>
            </div>
          ) : displayedPayments.length === 0 ? (
            <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '44px 20px', textAlign: 'center' }}>
              <FileText size={38} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                No customer payment records in this range
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                Adjust the From/To dates above or use “+ Record Customer Payment” to log a new receipt.
              </p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>DATE & TIME</th>
                      <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>CUSTOMER</th>
                      <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>METHOD</th>
                      <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>AMOUNT</th>
                      <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>BALANCE CHANGE</th>
                      <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>COLLECTED BY</th>
                      <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>REF / NOTES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPayments.map((p, idx) => {
                      const matchedCust = customers.find(
                        (c) =>
                          String(c.id) === String(p.customerId) ||
                          (c.customerId && String(c.customerId) === String(p.customerId))
                      );
                      return (
                        <tr
                          key={p.id || p._id || idx}
                          onClick={() => matchedCust && setSelectedCustomer(matchedCust)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            cursor: matchedCust ? 'pointer' : 'default',
                          }}
                        >
                          <td style={{ padding: '13px 14px', color: '#475569', whiteSpace: 'nowrap' }}>
                            <div>{new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {new Date(p.paymentDate || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td style={{ padding: '13px 14px', fontWeight: 700, color: matchedCust ? '#0D5C3A' : '#0f172a' }}>
                            {p.customerName || p.customerId}
                          </td>
                          <td style={{ padding: '13px 14px' }}>
                            <span
                              style={{
                                background: p.paymentMethod === 'cash' ? '#f0fdf4' : '#eff6ff',
                                color: p.paymentMethod === 'cash' ? '#059669' : '#2563eb',
                                border: p.paymentMethod === 'cash' ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              {p.paymentMethod || 'cash'}
                            </span>
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.96rem' }}>
                            {formatCurrency(p.amount)}
                          </td>
                          <td style={{ padding: '13px 14px', color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {typeof p.previousBalance === 'number' && typeof p.newBalance === 'number' ? (
                              <span>
                                ₹{p.previousBalance} → <strong style={{ color: '#0f172a' }}>₹{p.newBalance}</strong>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={{ padding: '13px 14px', color: '#475569' }}>{p.collectedBy || 'Admin'}</td>
                          <td style={{ padding: '13px 14px', color: '#64748b', fontSize: '0.78rem', maxWidth: '180px' }}>
                            {p.referenceNumber && <div>Ref: {p.referenceNumber}</div>}
                            {p.notes && <div style={{ color: '#475569' }}>{p.notes}</div>}
                            {!p.referenceNumber && !p.notes && '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PARTNER CASH & SETTLEMENTS (Clickable Rows)       */}
      {/* ======================================================== */}
      {activeTab === 'partners' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                Delivery Partners ({displayedPartners.length})
              </span>
              <span style={{ background: '#e2f1ea', color: '#0D5C3A', fontSize: '0.74rem', fontWeight: 800, padding: '3px 9px', borderRadius: '20px' }}>
                Cash with Drivers: {formatCurrency(totalPartnerCashInHand)}
              </span>
              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.74rem', fontWeight: 700, padding: '3px 9px', borderRadius: '20px' }}>
                Today's UPI: {formatCurrency(totalPartnerUpiCollected)}
              </span>
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search driver by name, phone, area..."
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '9px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {displayedPartners.length === 0 ? (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '44px 20px', textAlign: 'center', color: '#64748b' }}>
              <Bike size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>No delivery partners found</div>
            </div>
          ) : (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Driver Partner</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Assigned Area</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Cash In Hand</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Today's UPI</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Pending Handover</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPartners.map((b) => {
                      const boyId = b.id || b._id;
                      const partnerHandovers = getPartnerHandovers(b);
                      const boyPendingHandover = partnerHandovers.find((h) => h.status === 'pending');
                      const cashInHand = Number(b.todayCashCollected) || 0;
                      const upiCollected = Number(b.todayUpiCollected) || 0;
                      const isActive = b.status === 'active' || b.status === 'Active' || b.isActive;

                      return (
                        <tr
                          key={boyId}
                          onClick={() => setSelectedPartner(b)}
                          style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                        >
                          <td style={{ padding: '13px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2f1ea', color: '#0D5C3A', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {(b.name || 'D').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.88rem' }}>{b.name || 'Delivery Partner'}</strong>
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{b.mobile || '—'}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '13px 14px', color: '#334155', fontWeight: 600 }}>{b.assignedArea || 'All Hubs'}</td>
                          <td style={{ padding: '13px 14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isActive ? '#ecfdf5' : '#f1f5f9',
                                color: isActive ? '#065f46' : '#64748b',
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#10b981' : '#94a3b8' }} />
                              {isActive ? 'Active Duty' : 'Off Duty'}
                            </span>
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right', fontWeight: 800, color: cashInHand > 0 ? '#0D5C3A' : '#94a3b8' }}>
                            {formatCurrency(cashInHand)}
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                            {formatCurrency(upiCollected)}
                          </td>
                          <td style={{ padding: '13px 14px' }}>
                            {boyPendingHandover ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 9px', borderRadius: '8px', background: '#ffedd5', color: '#ea580c', fontSize: '0.75rem', fontWeight: 800 }}>
                                <Clock size={13} /> {formatCurrency(boyPendingHandover.amount)} submitted
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>None pending</span>
                            )}
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                            {boyPendingHandover ? (
                              <button
                                type="button"
                                disabled={actionLoadingId === (boyPendingHandover.id || boyPendingHandover._id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptHandover(boyPendingHandover);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '6px 11px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: '#059669',
                                  color: '#ffffff',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                <Check size={14} /> Verify Cash
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPartner(b);
                                }}
                                style={{
                                  padding: '6px 11px',
                                  borderRadius: '8px',
                                  border: '1px solid #e2e8f0',
                                  background: '#ffffff',
                                  color: '#0D5C3A',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: CUSTOMERS & LEDGERS (Clickable Rows)              */}
      {/* ======================================================== */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Customers', count: customers.length },
                { id: 'due', label: 'Due Only', count: customers.filter((c) => Number(c.currentBalance) > 0).length },
                { id: 'advance', label: 'Advance', count: customers.filter((c) => Number(c.currentBalance) < 0).length },
                { id: 'settled', label: 'Settled', count: customers.filter((c) => Number(c.currentBalance) === 0).length },
              ].map((pill) => {
                const isActive = customerBalanceFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setCustomerBalanceFilter(pill.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 600,
                      background: isActive ? '#0D5C3A' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#475569',
                      border: isActive ? '1px solid #0D5C3A' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{pill.label}</span>
                    <span
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                        color: isActive ? '#ffffff' : '#475569',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '999px',
                      }}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search customer, ID, phone, area..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '9px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {displayedCustomers.length === 0 ? (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '44px 20px', textAlign: 'center', color: '#64748b' }}>
              <Users size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>No customers match this filter</div>
            </div>
          ) : (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Customer</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Area / Plan</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Total Paid</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700 }}>Balance Status</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCustomers.map((c) => {
                      const balMeta = getBalanceMeta(c.currentBalance);
                      const planText = c.subscription?.planName || (c.deliveryPlan?.milkQty ? `${c.deliveryPlan.milkQty}L Milk` : 'Standard');
                      return (
                        <tr
                          key={c.id || c._id}
                          onClick={() => setSelectedCustomer(c)}
                          style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                        >
                          <td style={{ padding: '13px 14px' }}>
                            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.88rem' }}>{c.name}</strong>
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                              {c.customerId || '—'} · {c.mobile || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '13px 14px', color: '#334155' }}>
                            <div style={{ fontWeight: 600 }}>{c.area || '—'}</div>
                            <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                              {planText} ({c.subscriptionStatus || 'none'})
                            </div>
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                            {formatCurrency(c.totalPaid)}
                          </td>
                          <td style={{ padding: '13px 14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                background: balMeta.bg,
                                color: balMeta.color,
                                border: `1px solid ${balMeta.border}`,
                              }}
                            >
                              {balMeta.label}
                            </span>
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerRecordPayment(c);
                              }}
                              style={{
                                padding: '6px 11px',
                                borderRadius: '8px',
                                border: '1px solid #a7f3d0',
                                background: '#ecfdf5',
                                color: '#0D5C3A',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              + Pay
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PARTNER DETAIL MODAL / DRAWER                            */}
      {/* ======================================================== */}
      {selectedPartner && (() => {
        const pHandovers = getPartnerHandovers(selectedPartner);
        const pPending = pHandovers.filter((h) => h.status === 'pending');
        const pAccepted = pHandovers.filter((h) => h.status === 'accepted');
        const pPendingAmt = pPending.reduce((s, h) => s + (Number(h.amount) || 0), 0);
        const pAcceptedAmt = pAccepted.reduce((s, h) => s + (Number(h.amount) || 0), 0);
        const isActive = selectedPartner.status === 'active' || selectedPartner.status === 'Active' || selectedPartner.isActive;

        return (
          <div
            onClick={() => setSelectedPartner(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9998,
              padding: '16px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                maxWidth: '640px',
                width: '100%',
                maxHeight: '88vh',
                overflowY: 'auto',
                padding: '22px',
                boxShadow: '0 20px 30px rgba(0,0,0,0.18)',
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0D5C3A', color: '#ffffff', fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(selectedPartner.name || 'D').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{selectedPartner.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span><Phone size={12} style={{ verticalAlign: 'middle' }} /> {selectedPartner.mobile || '—'}</span>
                      <span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> {selectedPartner.assignedArea || 'All Hubs'}</span>
                      <span style={{ color: isActive ? '#059669' : '#64748b', fontWeight: 700 }}>
                        ● {isActive ? 'Active Duty' : 'Off Duty'}
                      </span>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedPartner(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#475569' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Partner KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '18px' }}>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0D5C3A', textTransform: 'uppercase' }}>Cash in Hand</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0D5C3A', marginTop: '2px' }}>{formatCurrency(selectedPartner.todayCashCollected)}</div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>Today's UPI</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>{formatCurrency(selectedPartner.todayUpiCollected)}</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Verified Handovers</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>{formatCurrency(pAcceptedAmt)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{pAccepted.length} settled</div>
                </div>
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>Pending Handovers</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ea580c', marginTop: '2px' }}>{formatCurrency(pPendingAmt)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{pPending.length} pending</div>
                </div>
              </div>

              {/* Handover History */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                Handover History ({pHandovers.length})
              </h4>
              {pHandovers.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.84rem' }}>
                  No handover submissions recorded for this partner yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pHandovers.map((h) => {
                    const hId = h.id || h._id;
                    const busy = actionLoadingId === hId;
                    return (
                      <div key={hId} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{formatCurrency(h.amount)}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {new Date(h.handoverDate || h.createdAt).toLocaleString()} · {h.handoverMethod || 'cash'}
                          </div>
                          {h.notes && <div style={{ fontSize: '0.74rem', color: '#475569', fontStyle: 'italic' }}>“{h.notes}”</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {h.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAcceptHandover(h)}
                                style={{ padding: '6px 11px', borderRadius: '8px', border: 'none', background: '#059669', color: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setRejectingItem(h)}
                                style={{ padding: '6px 11px', borderRadius: '8px', border: '1px solid #fecaca', background: '#ffffff', color: '#dc2626', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: h.status === 'accepted' ? '#ecfdf5' : '#fef2f2',
                                color: h.status === 'accepted' ? '#059669' : '#dc2626',
                              }}
                            >
                              {h.status === 'accepted' ? 'Verified' : 'Rejected'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* CUSTOMER DETAIL MODAL / DRAWER                           */}
      {/* ======================================================== */}
      {selectedCustomer && (() => {
        const cPayments = getCustomerPayments(selectedCustomer);
        const cCash = cPayments.filter((p) => (p.paymentMethod || '').toLowerCase() === 'cash').reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const cUpi = cPayments.filter((p) => ['upi', 'razorpay', 'bank_transfer', 'online'].includes((p.paymentMethod || '').toLowerCase())).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const balMeta = getBalanceMeta(selectedCustomer.currentBalance);
        const plan = selectedCustomer.subscription || {};
        const dPlan = selectedCustomer.deliveryPlan || {};

        return (
          <div
            onClick={() => setSelectedCustomer(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9998,
              padding: '16px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                maxWidth: '660px',
                width: '100%',
                maxHeight: '88vh',
                overflowY: 'auto',
                padding: '22px',
                boxShadow: '0 20px 30px rgba(0,0,0,0.18)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ecfdf5', color: '#0D5C3A', border: '1px solid #a7f3d0', fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(selectedCustomer.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{selectedCustomer.name}</h3>
                      <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, background: balMeta.bg, color: balMeta.color, border: `1px solid ${balMeta.border}` }}>
                        {balMeta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                      ID: {selectedCustomer.customerId || '—'} · <Phone size={12} style={{ verticalAlign: 'middle' }} /> {selectedCustomer.mobile || '—'}
                    </div>
                    {(selectedCustomer.area || selectedCustomer.address) && (
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                        <MapPin size={12} style={{ verticalAlign: 'middle' }} /> {selectedCustomer.area} {selectedCustomer.address ? `· ${selectedCustomer.address}` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedCustomer(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#475569' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Ledger & Subscription Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0D5C3A', textTransform: 'uppercase' }}>Total Paid</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0D5C3A', marginTop: '2px' }}>{formatCurrency(selectedCustomer.totalPaid)}</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Cash Paid</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>{formatCurrency(cCash)}</div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>UPI / Digital</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>{formatCurrency(cUpi)}</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Subscription</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '4px', textTransform: 'capitalize' }}>
                    {plan.planName || selectedCustomer.subscriptionStatus || 'None'}
                  </div>
                  {(dPlan.milkQty || dPlan.curdQty) && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {dPlan.milkQty ? `${dPlan.milkQty}L Milk` : ''} {dPlan.curdQty ? `${dPlan.curdQty}g Curd` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Record Payment CTA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  Payment History ({cPayments.length})
                </h4>
                <button
                  type="button"
                  onClick={() => handleTriggerRecordPayment(selectedCustomer)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '9px',
                    border: 'none',
                    background: '#0D5C3A',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <IndianRupee size={14} /> Record Payment
                </button>
              </div>

              {cPayments.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.84rem' }}>
                  No payment entries recorded for this customer yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cPayments.map((p, idx) => (
                    <div key={p.id || p._id || idx} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.98rem' }}>{formatCurrency(p.amount)}</div>
                        <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                          {new Date(p.paymentDate || p.createdAt).toLocaleString()} · By {p.collectedBy || 'Admin'}
                        </div>
                        {(p.referenceNumber || p.notes) && (
                          <div style={{ fontSize: '0.73rem', color: '#475569' }}>
                            {p.referenceNumber ? `Ref: ${p.referenceNumber}` : ''} {p.notes || ''}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ background: p.paymentMethod === 'cash' ? '#f0fdf4' : '#eff6ff', color: p.paymentMethod === 'cash' ? '#059669' : '#2563eb', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                          {p.paymentMethod || 'cash'}
                        </span>
                        {typeof p.previousBalance === 'number' && typeof p.newBalance === 'number' && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                            ₹{p.previousBalance} → ₹{p.newBalance}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* INLINE RECORD PAYMENT MODAL (FALLBACK)                   */}
      {/* ======================================================== */}
      {inlinePaymentCustomer && (
        <div
          onClick={() => setInlinePaymentCustomer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmitInlinePayment}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '22px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0D5C3A' }}>Record Customer Payment</h3>
              <button type="button" onClick={() => setInlinePaymentCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Customer</label>
              <select
                value={inlinePaymentCustomer.id || inlinePaymentCustomer._id}
                onChange={(e) => {
                  const found = customers.find((c) => (c.id || c._id) === e.target.value);
                  if (found) setInlinePaymentCustomer(found);
                }}
                style={{ width: '100%', padding: '9px 10px', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
              >
                {customers.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name} ({c.mobile}) — Bal: ₹{c.currentBalance}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={inlineAmount}
                  onChange={(e) => setInlineAmount(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Method</label>
                <select
                  value={inlineMethod}
                  onChange={(e) => setInlineMethod(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Reference / UTR (Optional)</label>
              <input
                type="text"
                value={inlineRef}
                onChange={(e) => setInlineRef(e.target.value)}
                placeholder="e.g. UPI Ref ID"
                style={{ width: '100%', padding: '9px 10px', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Notes (Optional)</label>
              <input
                type="text"
                value={inlineNotes}
                onChange={(e) => setInlineNotes(e.target.value)}
                placeholder="Monthly settlement, etc."
                style={{ width: '100%', padding: '9px 10px', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setInlinePaymentCustomer(null)}
                style={{ padding: '9px 14px', borderRadius: '9px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: '#0D5C3A', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
              >
                {isSubmittingPayment ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingItem && (
        <div
          className="modal-overlay"
          onClick={() => setRejectingItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#991b1b' }}>
                Reject Cash Handover
              </h3>
              <button type="button" onClick={() => setRejectingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: '#475569', lineHeight: 1.5 }}>
              Rejecting handover of <strong style={{ color: '#0f172a' }}>{formatCurrency(rejectingItem.amount)}</strong> from{' '}
              <strong style={{ color: '#0f172a' }}>{rejectingItem.deliveryBoyName}</strong>. Please provide a reason so the driver can correct it.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
