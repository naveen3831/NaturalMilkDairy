import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  CreditCard,
  DollarSign,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  Check,
  X,
  BadgeAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';

export default function PaymentsManager({ onOpenPaymentModal }) {
  const { user, token } = useAuth();
  const { subscribe: wsSubscribe } = useWebSocket();

  // Tabs: 'handovers' (Driver Cash Handovers) | 'customer-payments' (Direct customer payments)
  const [activeTab, setActiveTab] = useState('handovers');

  // Handovers state
  const [handovers, setHandovers] = useState([]);
  const [isLoadingHandovers, setIsLoadingHandovers] = useState(true);
  const [handoverFilter, setHandoverFilter] = useState('all'); // 'all' | 'pending' | 'accepted' | 'rejected'
  const [handoverSearch, setHandoverSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Customer payments state
  const [payments, setPayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentSearch, setPaymentSearch] = useState('');

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Cash amount mismatch at counter');

  // Load Handovers
  const fetchHandovers = useCallback(async () => {
    try {
      setIsLoadingHandovers(true);
      const res = await fetch('/api/payments/handovers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.handovers)) {
        setHandovers(data.handovers);
      }
    } catch (err) {
      console.error('fetchHandovers error:', err);
    } finally {
      setIsLoadingHandovers(false);
    }
  }, [token]);

  // Load Customer Payments
  const fetchPayments = useCallback(async () => {
    try {
      setIsLoadingPayments(true);
      const res = await fetch('/api/payments', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.payments)) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error('fetchPayments error:', err);
    } finally {
      setIsLoadingPayments(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHandovers();
    fetchPayments();
  }, [fetchHandovers, fetchPayments]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!wsSubscribe) return;

    const unsubHandoverSub = wsSubscribe('CASH_HANDOVER_SUBMITTED', () => {
      fetchHandovers();
      setFeedbackMsg({
        type: 'info',
        text: 'New driver cash handover received! List refreshed.',
      });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4500);
    });

    const unsubHandoverUpd = wsSubscribe('CASH_HANDOVER_UPDATED', () => {
      fetchHandovers();
    });

    const unsubPayment = wsSubscribe('PAYMENT_RECORDED', () => {
      fetchPayments();
    });

    return () => {
      if (typeof unsubHandoverSub === 'function') unsubHandoverSub();
      if (typeof unsubHandoverUpd === 'function') unsubHandoverUpd();
      if (typeof unsubPayment === 'function') unsubPayment();
    };
  }, [wsSubscribe, fetchHandovers, fetchPayments]);

  // Handle Accept Handover
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
        setFeedbackMsg({
          type: 'success',
          text: `Verified & accepted ₹${item.amount} from driver ${item.deliveryBoyName}!`,
        });
        setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4500);
        await fetchHandovers();
      } else {
        throw new Error(data.message || 'Failed to accept handover');
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4500);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Handover
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
        setFeedbackMsg({
          type: 'warning',
          text: `Handover of ₹${rejectingItem.amount} rejected. Driver notified.`,
        });
        setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4500);
        setRejectingItem(null);
        await fetchHandovers();
      } else {
        throw new Error(data.message || 'Failed to reject handover');
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4500);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Handover (Admin remove duplicates or invalid records)
  const handleDeleteHandover = async (item) => {
    if (!window.confirm(`Delete handover record of ₹${item.amount} from driver ${item.deliveryBoyName}?`)) return;
    try {
      const res = await fetch(`/api/payments/handovers/${item.id || item._id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'info', text: 'Handover record deleted.' });
        setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
        await fetchHandovers();
      } else {
        alert(data.message || 'Failed to delete handover');
      }
    } catch (e) {
      alert('Failed to delete handover: ' + e.message);
    }
  };

  // Calculations & Metrics
  const pendingHandovers = useMemo(
    () => handovers.filter((h) => h.status === 'pending'),
    [handovers]
  );
  const acceptedHandovers = useMemo(
    () => handovers.filter((h) => h.status === 'accepted'),
    [handovers]
  );

  const pendingAmount = useMemo(
    () => pendingHandovers.reduce((sum, h) => sum + (h.amount || 0), 0),
    [pendingHandovers]
  );

  const acceptedAmount = useMemo(
    () => acceptedHandovers.reduce((sum, h) => sum + (h.amount || 0), 0),
    [acceptedHandovers]
  );

  const totalCustomerCollections = useMemo(
    () => payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments]
  );

  // Filtered Handovers List
  const displayedHandovers = useMemo(() => {
    return handovers.filter((h) => {
      if (handoverFilter !== 'all' && h.status !== handoverFilter) return false;
      if (handoverSearch.trim()) {
        const q = handoverSearch.toLowerCase();
        const matchName = h.deliveryBoyName?.toLowerCase().includes(q);
        const matchMobile = h.deliveryBoyMobile?.toLowerCase().includes(q);
        const matchArea = h.assignedArea?.toLowerCase().includes(q);
        const matchNotes = h.notes?.toLowerCase().includes(q);
        return matchName || matchMobile || matchArea || matchNotes;
      }
      return true;
    });
  }, [handovers, handoverFilter, handoverSearch]);

  // Filtered Payments List
  const displayedPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentMethodFilter !== 'all' && p.paymentMethod !== paymentMethodFilter) return false;
      if (paymentSearch.trim()) {
        const q = paymentSearch.toLowerCase();
        const matchCust = p.customerName?.toLowerCase().includes(q);
        const matchRef = p.referenceNumber?.toLowerCase().includes(q);
        const matchNotes = p.notes?.toLowerCase().includes(q);
        return matchCust || matchRef || matchNotes;
      }
      return true;
    });
  }, [payments, paymentMethodFilter, paymentSearch]);

  return (
    <div style={{ padding: '0 0 32px 0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 1. Header with Title & Quick Action */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Payments & Driver Handovers
            </h1>
            <span
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid #bfdbfe',
              }}
            >
              Real-Time Settlement
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Audit and verify driver shift cash deposits, counter reconciliations, and customer payment receipts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              fetchHandovers();
              fetchPayments();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              color: '#475569',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          {onOpenPaymentModal && (
            <button
              type="button"
              onClick={() => onOpenPaymentModal(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
              }}
            >
              <Plus size={16} />
              <span>Record Customer Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg.text && (
        <div
          style={{
            marginBottom: '18px',
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

      {/* 2. Top Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        {/* Pending Cash Handovers Card */}
        <div
          style={{
            background: '#ffffff',
            border: pendingHandovers.length > 0 ? '1.5px solid #fdba74' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
                Pending Driver Handovers
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                ₹{pendingAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                {pendingHandovers.length} {pendingHandovers.length === 1 ? 'driver' : 'drivers'} awaiting verification
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#ffedd5',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Accepted Cash Collections Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                Verified Cash Handed Over
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                ₹{acceptedAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                {acceptedHandovers.length} settled shift audits
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#dcfce7',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>

        {/* Total Customer Collections */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                Customer Payments Recorded
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                ₹{totalCustomerCollections.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                {payments.length} ledger payment entries
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '18px',
          paddingBottom: '2px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('handovers')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'handovers' ? '2.5px solid #059669' : '2.5px solid transparent',
            color: activeTab === 'handovers' ? '#059669' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <CreditCard size={17} />
          <span>Driver Cash Handovers</span>
          {pendingHandovers.length > 0 && (
            <span
              style={{
                background: '#ea580c',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '999px',
              }}
            >
              {pendingHandovers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customer-payments')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'customer-payments' ? '2.5px solid #059669' : '2.5px solid transparent',
            color: activeTab === 'customer-payments' ? '#059669' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={17} />
          <span>Customer Payment Entries</span>
          <span
            style={{
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '999px',
            }}
          >
            {payments.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DRIVER CASH HANDOVERS                             */}
      {/* ======================================================== */}
      {activeTab === 'handovers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar */}
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
            {/* Status Pills */}
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
                      padding: '7px 13px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 600,
                      background: isActive ? '#059669' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#475569',
                      border: isActive ? '1px solid #059669' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{pill.label}</span>
                    {pill.count > 0 && (
                      <span
                        style={{
                          background: isActive ? 'rgba(255,255,255,0.25)' : pill.badgeColor ? pill.badgeColor : '#e2e8f0',
                          color: isActive ? '#ffffff' : pill.badgeColor ? '#ffffff' : '#475569',
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

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
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

          {/* Handovers List / Table */}
          {isLoadingHandovers ? (
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
                padding: '48px 24px',
                textAlign: 'center',
              }}
            >
              <Wallet size={42} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                No cash handovers found
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                {handoverFilter === 'pending'
                  ? 'Great job! There are no pending cash handovers awaiting verification right now.'
                  : 'When delivery drivers deposit physical route cash at the dairy counter, the submissions will appear here.'}
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
                      padding: '16px 20px',
                      boxShadow: isPending ? '0 4px 14px rgba(234, 88, 12, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Left: Driver Info & Metadata */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: isPending ? '#ffedd5' : isAccepted ? '#dcfce7' : '#fee2e2',
                          color: isPending ? '#ea580c' : isAccepted ? '#059669' : '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          flexShrink: 0,
                        }}
                      >
                        {item.deliveryBoyName ? item.deliveryBoyName.charAt(0).toUpperCase() : 'D'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                            {item.deliveryBoyName || 'Delivery Partner'}
                          </span>
                          {item.assignedArea && (
                            <span
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              📍 {item.assignedArea}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.76rem', color: '#64748b' }}>
                          {item.deliveryBoyMobile && (
                            <span>📞 {item.deliveryBoyMobile}</span>
                          )}
                          <span>
                            🕒 {new Date(item.handoverDate || item.createdAt).toLocaleDateString()} at{' '}
                            {new Date(item.handoverDate || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {item.notes && (
                          <div style={{ marginTop: '5px', fontSize: '0.78rem', color: '#475569', fontStyle: 'italic' }}>
                            “{item.notes}”
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle: Amount & Method */}
                    <div style={{ textAlign: 'center', minWidth: '150px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Handover Amount
                      </div>
                      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: isAccepted ? '#059669' : '#0f172a', lineHeight: 1.2 }}>
                        ₹{item.amount?.toLocaleString()}
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

                    {/* Right: Status Badge & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', justifyContent: 'flex-end' }}>
                      {/* Status Badge */}
                      {isPending && (
                        <span
                          style={{
                            background: '#fff7ed',
                            color: '#c2410c',
                            border: '1px solid #ffedd5',
                            padding: '6px 12px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: '#ea580c',
                            }}
                          />
                          Pending Verification
                        </span>
                      )}

                      {isAccepted && (
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              padding: '6px 12px',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <CheckCircle2 size={15} color="#059669" />
                            Verified & Accepted
                          </span>
                          {item.verifiedBy && (
                            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
                              By {item.verifiedBy}
                            </div>
                          )}
                        </div>
                      )}

                      {isRejected && (
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              background: '#fef2f2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              padding: '6px 12px',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <XCircle size={15} color="#dc2626" />
                            Rejected
                          </span>
                          {item.rejectionReason && (
                            <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: '3px' }}>
                              {item.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin Actions for Pending Handovers */}
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
                              padding: '8px 14px',
                              background: '#059669',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '9px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: isActionBusy ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                              opacity: isActionBusy ? 0.7 : 1,
                            }}
                          >
                            <Check size={16} />
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
                              padding: '8px 12px',
                              background: '#ffffff',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '9px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: isActionBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <X size={15} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {/* Delete Handover Record Button */}
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
                          justifyContent: 'center',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
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
          {/* Controls Bar */}
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
            {/* Method Filter */}
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
                      padding: '7px 13px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 600,
                      background: isActive ? '#059669' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#475569',
                      border: isActive ? '1px solid #059669' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
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

          {/* Table */}
          {isLoadingPayments ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <div>Loading payments...</div>
            </div>
          ) : displayedPayments.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
              }}
            >
              <FileText size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                No customer payment records found
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                Use "+ Record Customer Payment" above to log a new receipt.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>DATE & TIME</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>CUSTOMER</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>METHOD</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>AMOUNT</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>BALANCE CHANGE</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>COLLECTED BY</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>REF / NOTES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPayments.map((p, idx) => (
                      <tr
                        key={p.id || p._id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                          <div>{new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {new Date(p.paymentDate || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {p.customerName || p.customerId}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              background: p.paymentMethod === 'cash' ? '#f0fdf4' : '#eff6ff',
                              color: p.paymentMethod === 'cash' ? '#059669' : '#2563eb',
                              border: p.paymentMethod === 'cash' ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            {p.paymentMethod || 'cash'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                          ₹{p.amount?.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.78rem' }}>
                          {typeof p.previousBalance === 'number' && typeof p.newBalance === 'number' ? (
                            <span>
                              ₹{p.previousBalance} → <strong style={{ color: '#0f172a' }}>₹{p.newBalance}</strong>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>
                          {p.collectedBy || 'Admin'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.78rem', maxWidth: '180px' }}>
                          {p.referenceNumber && <div>Ref: {p.referenceNumber}</div>}
                          {p.notes && <div style={{ color: '#475569' }}>{p.notes}</div>}
                          {!p.referenceNumber && !p.notes && '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: '#475569', lineHeight: 1.5 }}>
              Rejecting handover of <strong style={{ color: '#0f172a' }}>₹{rejectingItem.amount}</strong> from{' '}
              <strong style={{ color: '#0f172a' }}>{rejectingItem.deliveryBoyName}</strong>. Please provide a reason so
              the driver can correct it.
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
