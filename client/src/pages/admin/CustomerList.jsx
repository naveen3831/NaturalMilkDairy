import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDairy } from '../../context/DairyContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { resolveProofUrl } from '../../services/api';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Navigation,
  Calendar,
  CreditCard,
  PauseCircle,
  PlayCircle,
  TrendingUp,
  Clock,
  BookOpen,
  DollarSign,
  MessageSquare,
  Edit,
  Zap,
  Truck,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Printer,
  Sparkles,
  Camera,
  FileText,
  Table as TableIcon,
  LayoutGrid,
  Milk,
  Package,
  Wallet,
  AlertCircle,
  ChevronDown,
  User,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import CustomerModal from '../../components/CustomerModal';

export default function CustomerList({
  initialCustomerId,
  onClearSelectedCustomer,
  onSelectCustomerLedger,
  onOpenAddCustomer,
  onOpenEditCustomer,
  onOpenPaymentModal,
  onOpenPauseModal,
  onOpenTempQtyModal,
}) {
  const {
    customers,
    pauseDelivery,
    resumeDelivery,
    deliveryBoys,
    assignPartnerToCustomer,
    fetchDeliveryBoys,
    deleteCustomer,
    getCustomerLedger,
    refreshAll,
  } = useDairy();

  const { subscribe: wsSubscribe } = useWebSocket();

  // Active customer selection: null shows all customers; customer ID shows detailed Customer 360 & Ledger view
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || null);

  // Sync prop changes
  useEffect(() => {
    if (initialCustomerId !== undefined && initialCustomerId !== selectedCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  // Directory search & filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [directoryViewMode, setDirectoryViewMode] = useState('grid'); // 'grid' | 'table'

  // Partner assignment & delete banners
  const [partnerMsg, setPartnerMsg] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [internalEditingCustomer, setInternalEditingCustomer] = useState(null);

  // Customer 360 & Ledger state for active customer
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerViewMode, setLedgerViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'cards' : 'table'));
  const [ledgerTab, setLedgerTab] = useState('ledger'); // 'ledger' | 'deliveries' | 'plan'
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilterType, setLedgerFilterType] = useState('all'); // 'all' | 'delivery' | 'payment'

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Delivery Boys on mount
  useEffect(() => {
    if (fetchDeliveryBoys) {
      fetchDeliveryBoys();
    }
  }, [fetchDeliveryBoys]);

  // Find the selected customer object
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return (
      customers.find(
        (c) =>
          c.id === selectedCustomerId ||
          c._id === selectedCustomerId ||
          c.customerId === selectedCustomerId
      ) || ledgerData?.customer || null
    );
  }, [selectedCustomerId, customers, ledgerData]);

  // Load customer ledger data when selectedCustomerId changes
  const loadActiveCustomerLedger = useCallback(async (custId) => {
    if (!custId) {
      setLedgerData(null);
      return;
    }
    setLedgerLoading(true);
    try {
      const data = await getCustomerLedger(custId);
      if (data && data.success && data.customer) {
        setLedgerData(data);
      } else {
        setLedgerData(null);
      }
    } catch (err) {
      console.warn('Failed to fetch ledger:', err);
      setLedgerData(null);
    } finally {
      setLedgerLoading(false);
    }
  }, [getCustomerLedger]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadActiveCustomerLedger(selectedCustomerId);
    } else {
      setLedgerData(null);
    }
  }, [selectedCustomerId, loadActiveCustomerLedger]);

  // Real-time WebSocket sync for active customer ledger
  useEffect(() => {
    if (!wsSubscribe || !selectedCustomerId) return;

    const handleLiveSync = () => {
      getCustomerLedger(selectedCustomerId)
        .then((data) => {
          if (data && data.success && data.customer) {
            setLedgerData(data);
          }
        })
        .catch(() => {});
    };

    const unsubDelivery = wsSubscribe('DELIVERY_UPDATED', handleLiveSync);
    const unsubPayment = wsSubscribe('PAYMENT_RECORDED', handleLiveSync);
    const unsubCustomer = wsSubscribe('CUSTOMER_UPDATED', handleLiveSync);
    const unsubLocation = wsSubscribe('LOCATION_UPDATED', handleLiveSync);

    return () => {
      if (typeof unsubDelivery === 'function') unsubDelivery();
      if (typeof unsubPayment === 'function') unsubPayment();
      if (typeof unsubCustomer === 'function') unsubCustomer();
      if (typeof unsubLocation === 'function') unsubLocation();
    };
  }, [selectedCustomerId, getCustomerLedger, wsSubscribe]);

  // Handlers
  const handleSelectCustomer = (customer) => {
    const custId = customer.id || customer._id || customer.customerId;
    setSelectedCustomerId(custId);
    if (onSelectCustomerLedger) {
      onSelectCustomerLedger(custId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDirectory = () => {
    setSelectedCustomerId(null);
    if (onClearSelectedCustomer) {
      onClearSelectedCustomer();
    }
  };

  const handleEditCustomer = (customer) => {
    if (onOpenEditCustomer) {
      onOpenEditCustomer(customer);
    } else {
      setInternalEditingCustomer(customer);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      const targetId = deletingCustomer.id || deletingCustomer._id || deletingCustomer.customerId;
      const res = await deleteCustomer(targetId, 'Admin');
      if (res && res.success) {
        setDeleteMsg(`Customer "${deletingCustomer.name}" (${deletingCustomer.customerId}) was permanently deleted.`);
        setTimeout(() => setDeleteMsg(''), 4500);
        if (selectedCustomerId === targetId) {
          handleBackToDirectory();
        }
        setDeletingCustomer(null);
        if (refreshAll) refreshAll();
      } else {
        alert(res?.message || 'Failed to delete customer.');
      }
    } catch (err) {
      alert(err.message || 'Error occurred while deleting customer.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignPartner = async (customer, boyId, boyName) => {
    try {
      const targetId = customer.id || customer._id || customer.customerId;
      const res = await assignPartnerToCustomer(targetId, {
        deliveryBoyId: boyId,
        deliveryBoyName: boyName,
        actor: 'Admin',
      });
      if (res && res.success) {
        setPartnerMsg(`Assigned partner "${boyName || 'None'}" to ${customer.name}. Driver route updated!`);
        setTimeout(() => setPartnerMsg(''), 4000);
        if (selectedCustomerId) {
          loadActiveCustomerLedger(selectedCustomerId);
        }
      }
    } catch (err) {
      console.error('Assign partner error:', err);
    }
  };

  // Filter Directory Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === 'active' && c.status !== 'active') return false;
      if (statusFilter === 'paused' && c.status !== 'paused') return false;
      if (statusFilter === 'inactive' && c.status !== 'inactive') return false;
      if (statusFilter === 'outstanding' && (c.currentBalance || 0) <= 0) return false;
      if (statusFilter === 'advance' && (c.currentBalance || 0) >= 0) return false;

      if (areaFilter !== 'all' && c.area !== areaFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchId = c.customerId?.toLowerCase().includes(q);
        const matchPhone = c.mobile && c.mobile.includes(q);
        const matchAddr = c.address?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchPhone && !matchAddr) return false;
      }
      return true;
    });
  }, [customers, statusFilter, areaFilter, search]);

  const areas = useMemo(() => {
    return Array.from(new Set(customers.map((c) => c.area).filter(Boolean)));
  }, [customers]);

  // Derived ledger stats
  const customerObj = activeCustomer;
  const ledgerEntries = ledgerData?.ledgerEntries || [];
  const grossBill = ledgerData?.grossBill || 0;
  const totalPaid = ledgerData?.totalPaid || 0;
  const outstanding = ledgerData?.outstanding ?? (customerObj?.currentBalance || 0);
  const totalMilkDelivered = ledgerData?.totalMilkDelivered || '0.0 L';
  const totalCurdDelivered = ledgerData?.totalCurdDelivered || '0.00 Kg';
  const whatsappUrl = ledgerData?.whatsappUrl || '';
  const isPending = outstanding > 0;
  const isAdvance = outstanding < 0;

  // Filter ledger transactions
  const filteredLedgerEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      if (ledgerFilterType === 'delivery' && entry.type !== 'delivery') return false;
      if (ledgerFilterType === 'payment' && entry.type !== 'payment') return false;
      if (ledgerSearch) {
        const q = ledgerSearch.toLowerCase();
        const matchDate = entry.date?.includes(q);
        const matchNotes = entry.notes?.toLowerCase().includes(q);
        const matchMethod = entry.paymentMethod?.toLowerCase().includes(q);
        const matchBoy = entry.deliveryBoyName?.toLowerCase().includes(q);
        if (!matchDate && !matchNotes && !matchMethod && !matchBoy) return false;
      }
      return true;
    });
  }, [ledgerEntries, ledgerFilterType, ledgerSearch]);

  const customerInitial = customerObj?.name ? customerObj.name.charAt(0).toUpperCase() : 'C';

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW A: DETAILED CUSTOMER 360 & LEDGER VIEW (When a customer is clicked)
  // ═══════════════════════════════════════════════════════════════════════════
  if (selectedCustomerId && customerObj) {
    const isPaused = customerObj.status === 'paused';
    const sub = customerObj.subscription || {};

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 1. Header Toolbar with Back Button, Customer Switcher & Quick Actions */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {/* Left: Back to Directory & Quick Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleBackToDirectory}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '7px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#334155';
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Directory</span>
            </button>

            {/* Quick Customer Switcher */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={14} color="#64748b" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
              <select
                value={customerObj.id || customerObj._id || customerObj.customerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  const found = customers.find((c) => (c.id === newId || c._id === newId || c.customerId === newId));
                  if (found) handleSelectCustomer(found);
                }}
                style={{
                  paddingLeft: '30px',
                  paddingRight: '28px',
                  paddingTop: '7px',
                  paddingBottom: '7px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {customers.map((c) => {
                  const val = c.id || c._id || c.customerId;
                  return (
                    <option key={val} value={val}>
                      {c.name} ({c.customerId}) {c.area ? `• ${c.area}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Right: Actions Hub (WhatsApp, Print, Record Pay, Edit) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#25d366',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.80rem',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(37, 211, 102, 0.2)',
                }}
                title="Send WhatsApp Statement to Customer"
              >
                <MessageSquare size={14} />
                <span>WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.80rem',
                padding: '7px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Print Passbook / Statement"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPaymentModal && onOpenPaymentModal(customerObj)}
              style={{
                background: '#059669',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.80rem',
                padding: '7px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
              }}
              title="Record Payment / Collection"
            >
              <DollarSign size={14} />
              <span>Record Pay</span>
            </button>

            <button
              type="button"
              onClick={() => handleEditCustomer(customerObj)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontWeight: 600,
                fontSize: '0.80rem',
                padding: '7px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Edit Profile Information"
            >
              <Edit size={13} />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Partner Assignment Feedback Banner */}
        {partnerMsg && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '0.86rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={18} color="#059669" />
            <span>{partnerMsg}</span>
          </div>
        )}

        {/* 2. Customer 360 Information Hero Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Top Section: Profile + Balance Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            {/* Identity & Contact Details */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid #e2e8f0',
                }}
              >
                {customerInitial}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.28rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {customerObj.name}
                  </h1>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: '#f1f5f9',
                      color: '#475569',
                      fontFamily: 'monospace',
                    }}
                  >
                    {customerObj.customerId}
                  </span>
                  <span
                    style={{
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      textTransform: 'capitalize',
                      background: isPaused ? '#fef3c7' : customerObj.status === 'active' ? '#dcfce7' : '#f1f5f9',
                      color: isPaused ? '#92400e' : customerObj.status === 'active' ? '#15803d' : '#475569',
                      border: '1px solid',
                      borderColor: isPaused ? '#fde68a' : customerObj.status === 'active' ? '#bbf7d0' : '#e2e8f0',
                    }}
                  >
                    {isPaused ? '⏸️ Subscription Paused' : customerObj.status || 'Active'}
                  </span>
                </div>

                {/* Contact Snippets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '0.82rem', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={13} color="#059669" />
                    <a href={`tel:${customerObj.mobile}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>
                      {customerObj.mobile}
                    </a>
                    {customerObj.mobile && (
                      <a
                        href={`https://wa.me/91${customerObj.mobile.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#16a34a', fontSize: '0.74rem', fontWeight: 600 }}
                      >
                        (Chat on WhatsApp)
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={13} color="#059669" style={{ marginTop: '3px', flexShrink: 0 }} />
                      <span>
                        {customerObj.address} {customerObj.area ? `• ${customerObj.area}` : ''}
                        {customerObj.landmark ? ` (Near: ${customerObj.landmark})` : ''}
                      </span>
                    </div>
                    {customerObj.latitude && customerObj.longitude && (
                      <div style={{ paddingLeft: '21px' }}>
                        <a
                          href={`https://www.google.com/maps?q=${customerObj.latitude},${customerObj.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Navigation size={11} />
                          <span>GPS Pin: {Number(customerObj.latitude).toFixed(4)}, {Number(customerObj.longitude).toFixed(4)} (Open in Maps)</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Balance Box */}
            <div
              style={{
                background: isPending ? '#fef2f2' : isAdvance ? '#eff6ff' : '#ecfdf5',
                border: '1px solid',
                borderColor: isPending ? '#fecaca' : isAdvance ? '#bfdbfe' : '#a7f3d0',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: isPending ? '#991b1b' : isAdvance ? '#1e40af' : '#065f46',
                  }}
                >
                  Customer Ledger Balance
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: isPending ? '#dc2626' : isAdvance ? '#2563eb' : '#059669',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isPending && <AlertCircle size={12} />}
                  {isAdvance && <Sparkles size={12} />}
                  {!isPending && !isAdvance && <CheckCircle2 size={12} />}
                  <span>{isPending ? 'Payment Due' : isAdvance ? 'Advance Credit' : 'Account Settled'}</span>
                </span>
              </div>

              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: isPending ? '#dc2626' : isAdvance ? '#1d4ed8' : '#047857' }}>
                {isPending && `₹${outstanding.toLocaleString()}`}
                {isAdvance && `₹${Math.abs(outstanding).toLocaleString()}`}
                {!isPending && !isAdvance && `₹0`}
              </div>

              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                {isPending ? 'Pending recovery from home delivery drops' : isAdvance ? 'Prepaid advance balance remaining' : 'All delivered products fully paid'}
              </div>
            </div>
          </div>

          {/* Middle Section: Active Subscription & Delivery Logistics Box */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Column 1: Daily Home Delivery Quota */}
            <div>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                🥛 Daily Milk & Dairy Plan
              </div>
              <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                {customerObj.deliveryPlan?.milkQty || 1} {customerObj.deliveryPlan?.milkUnit || 'L'} Milk
                {customerObj.deliveryPlan?.curdQty > 0 && ` + ${customerObj.deliveryPlan?.curdQty} ${customerObj.deliveryPlan?.curdUnit || 'g'} Curd`}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '4px' }}>
                Schedule: <strong style={{ textTransform: 'capitalize' }}>{customerObj.deliveryPlan?.frequency || 'Daily'}</strong> • Morning 5:00 AM – 6:30 AM
              </div>
              {sub.endDate && (
                <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, marginTop: '4px' }}>
                  📅 Valid through {new Date(sub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>

            {/* Column 2: Assigned Delivery Partner */}
            <div>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                🚚 Assigned Delivery Partner
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                  {customerObj.deliveryPlan?.deliveryBoyName ? `✓ ${customerObj.deliveryPlan.deliveryBoyName}` : '⚠️ Unassigned'}
                </span>
              </div>
              <select
                value={
                  customerObj.deliveryPlan?.deliveryBoyId ||
                  (deliveryBoys || []).find((b) => b.name?.toLowerCase() === customerObj.deliveryPlan?.deliveryBoyName?.toLowerCase())?.id ||
                  ''
                }
                onChange={(e) => {
                  const selId = e.target.value;
                  const selBoy = (deliveryBoys || []).find((b) => (b.id === selId || b._id === selId));
                  handleAssignPartner(customerObj, selId, selBoy ? selBoy.name : '');
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="">Choose Delivery Partner (Unassigned)</option>
                {(deliveryBoys || [])
                  .filter((b) => b.status !== 'inactive')
                  .map((boy) => (
                    <option key={boy.id || boy._id} value={boy.id || boy._id}>
                      {boy.name} • {boy.assignedArea || 'Route'} {boy.vehicleNumber ? `(${boy.vehicleNumber})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Column 3: Subscription & Quick Pause Controls */}
            <div>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                ⚡ Quick Operations
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isPaused ? (
                  <button
                    type="button"
                    onClick={() => resumeDelivery(customerObj.id, { actor: 'Admin' })}
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <PlayCircle size={13} />
                    <span>Resume Subscription</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenPauseModal && onOpenPauseModal(customerObj)}
                    style={{
                      background: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <PauseCircle size={13} />
                    <span>Pause Subscription</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenTempQtyModal && onOpenTempQtyModal(customerObj)}
                  style={{
                    background: '#f5f3ff',
                    color: '#6d28d9',
                    border: '1px solid #ede9fe',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Zap size={13} />
                  <span>Adjust Temp Qty</span>
                </button>
              </div>

              {/* Temporary quantity note if active */}
              {customerObj.temporaryQty?.date && (
                <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#1e40af', fontWeight: 600 }}>
                  ⚡ Temp Qty on {customerObj.temporaryQty.date}: {customerObj.temporaryQty.milkQty}L Milk
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: 4 KPI Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Milk Delivered
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {totalMilkDelivered}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Curd Delivered
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {totalCurdDelivered}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Gross Billed
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                ₹{grossBill.toLocaleString()}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Paid
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                ₹{totalPaid.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Customer Ledger / Passbook Transactions Section */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {/* Section Toolbar with Search, Filter & View Toggle */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Customer Passbook & Ledger
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#ecfdf5',
                    color: '#065f46',
                  }}
                >
                  {ledgerEntries.length} Records
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Chronological statement of daily milk deliveries, payments received, and running balance
              </p>
            </div>

            {/* Filter pills & search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Transaction search */}
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Filter transactions..."
                  style={{
                    paddingLeft: '30px',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    fontSize: '0.78rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    width: '180px',
                  }}
                />
              </div>

              {/* Type Filter */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
                {['all', 'delivery', 'payment'].map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setLedgerFilterType(tp)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      background: ledgerFilterType === tp ? '#ffffff' : 'transparent',
                      color: ledgerFilterType === tp ? '#0f172a' : '#64748b',
                      boxShadow: ledgerFilterType === tp ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {tp === 'all' ? 'All' : tp === 'delivery' ? 'Deliveries' : 'Payments'}
                  </button>
                ))}
              </div>

              {/* View Toggle (Table vs Cards) */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setLedgerViewMode('table')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: ledgerViewMode === 'table' ? '#ffffff' : 'transparent',
                    color: ledgerViewMode === 'table' ? '#059669' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                  title="Spreadsheet Table View"
                >
                  <TableIcon size={13} />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerViewMode('cards')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: ledgerViewMode === 'cards' ? '#ffffff' : 'transparent',
                    color: ledgerViewMode === 'cards' ? '#059669' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                  title="Mobile Cards View"
                >
                  <LayoutGrid size={13} />
                  <span>Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {ledgerLoading && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#059669' }} />
              <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>Updating Customer Passbook...</div>
            </div>
          )}

          {/* SPREADSHEET TABLE VIEW */}
          {!ledgerLoading && ledgerViewMode === 'table' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                    <th style={{ padding: '10px 16px' }}>Date</th>
                    <th style={{ padding: '10px 14px' }}>Type / Status</th>
                    <th style={{ padding: '10px 14px' }}>Milk</th>
                    <th style={{ padding: '10px 14px' }}>Curd</th>
                    <th style={{ padding: '10px 14px' }}>Amount (₹)</th>
                    <th style={{ padding: '10px 14px' }}>Payment / Notes</th>
                    <th style={{ padding: '10px 14px' }}>Fulfilled By</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '48px 20px', textAlign: 'center' }}>
                        <FileText size={28} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                          No Ledger Entries Found
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                          Daily deliveries and recorded collections for {customerObj.name} will appear here.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLedgerEntries.map((entry) => {
                      const isPay = entry.type === 'payment';
                      const isMissed = entry.status === 'not_delivered';
                      const isPendingEntry = entry.status === 'pending';

                      return (
                        <tr
                          key={entry.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isPendingEntry ? '#fffbeb' : '#ffffff',
                          }}
                        >
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {entry.date}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                textTransform: 'capitalize',
                                background: isPay
                                  ? '#dcfce7'
                                  : isMissed
                                  ? '#fee2e2'
                                  : isPendingEntry
                                  ? '#fef3c7'
                                  : '#ecfdf5',
                                color: isPay
                                  ? '#15803d'
                                  : isMissed
                                  ? '#b91c1c'
                                  : isPendingEntry
                                  ? '#b45309'
                                  : '#047857',
                              }}
                            >
                              {isPay
                                ? 'Payment'
                                : isMissed
                                ? 'Missed'
                                : isPendingEntry
                                ? 'Scheduled'
                                : 'Delivered'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>{entry.milk || '-'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {entry.curd && entry.curd !== '0' && entry.curd !== '0 Kg' && entry.curd !== '0.00 Kg'
                              ? entry.curd
                              : '-'}
                          </td>
                          <td
                            style={{
                              padding: '10px 14px',
                              fontWeight: 700,
                              color: isPay
                                ? '#059669'
                                : isMissed
                                ? '#dc2626'
                                : isPendingEntry
                                ? '#b45309'
                                : '#0f172a',
                            }}
                          >
                            {isPay
                              ? `- ₹${entry.paidAmount}`
                              : isMissed
                              ? '₹0'
                              : isPendingEntry
                              ? `₹${entry.amount}`
                              : `+ ₹${entry.amount}`}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#334155' }}>
                              {entry.paymentMethod || '-'}
                            </div>
                            {((Array.isArray(entry.addons) && entry.addons.length > 0) || Number(entry.addonsTotal || 0) > 0) && (
                              <div style={{ fontSize: '0.70rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '5px', padding: '2px 6px', marginTop: '3px', display: 'inline-block', fontWeight: 700 }}>
                                + {Array.isArray(entry.addons) && entry.addons.length > 0 ? entry.addons.map((a) => `${a.name} × ${a.quantity}`).join(', ') : 'Add-ons'} (₹{Number(entry.addonsTotal || 0)}{Number(entry.addonPaidAmount || 0) > 0 ? ` · Paid ₹${Number(entry.addonPaidAmount)}` : ''})
                              </div>
                            )}
                            {entry.notes && (
                              <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>
                                {entry.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span>{entry.deliveryBoyName || 'Admin'}</span>
                              {entry.proofImage && (
                                <a
                                  href={resolveProofUrl(entry.proofImage)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.68rem',
                                    color: '#059669',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    background: '#ecfdf5',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                  title="View Doorstep Delivery Photo"
                                >
                                  <Camera size={11} />
                                  <span>Proof</span>
                                </a>
                              )}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '10px 16px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: entry.balance > 0 ? '#dc2626' : entry.balance < 0 ? '#2563eb' : '#059669',
                            }}
                          >
                            <div>
                              {entry.balance > 0 && `₹${entry.balance} Due`}
                              {entry.balance < 0 && `₹${Math.abs(entry.balance)} Adv`}
                              {entry.balance === 0 && `₹0 Settled`}
                            </div>
                            {isPendingEntry && (
                              <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 500 }}>
                                Scheduled
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* MOBILE CARDS VIEW */}
          {!ledgerLoading && ledgerViewMode === 'cards' && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredLedgerEntries.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                  <FileText size={28} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.90rem' }}>
                    No Ledger Entries Recorded Yet
                  </div>
                </div>
              ) : (
                filteredLedgerEntries.map((entry) => {
                  const isPay = entry.type === 'payment';
                  const isMissed = entry.status === 'not_delivered';
                  const isPendingEntry = entry.status === 'pending';

                  return (
                    <div
                      key={entry.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} color="#64748b" />
                          {entry.date}
                        </span>
                        <span
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isPay ? '#dcfce7' : isMissed ? '#fee2e2' : isPendingEntry ? '#fef3c7' : '#ecfdf5',
                            color: isPay ? '#15803d' : isMissed ? '#b91c1c' : isPendingEntry ? '#b45309' : '#047857',
                          }}
                        >
                          {isPay ? 'Payment' : isMissed ? 'Missed' : isPendingEntry ? 'Scheduled' : 'Delivered'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                          {isPay ? (
                            <span>{entry.paymentMethod || 'Payment'} {entry.notes ? `• ${entry.notes}` : ''}</span>
                          ) : (
                            <div>
                              <span>{entry.milk || 'Milk'} {entry.curd && entry.curd !== '0' ? `+ ${entry.curd}` : ''}</span>
                              {((Array.isArray(entry.addons) && entry.addons.length > 0) || Number(entry.addonsTotal || 0) > 0) && (
                                <div style={{ marginTop: '3px', fontSize: '0.70rem', fontWeight: 700, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '5px', display: 'inline-block' }}>
                                  + {Array.isArray(entry.addons) && entry.addons.length > 0 ? entry.addons.map((a) => `${a.name} × ${a.quantity}`).join(', ') : 'Add-ons'} (₹{Number(entry.addonsTotal || 0)}{Number(entry.addonPaidAmount || 0) > 0 ? ` · Paid ₹${Number(entry.addonPaidAmount)}` : ''})
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            color: isPay ? '#059669' : isMissed ? '#dc2626' : isPendingEntry ? '#b45309' : '#0f172a',
                          }}
                        >
                          {isPay ? `- ₹${entry.paidAmount}` : isMissed ? '₹0' : isPendingEntry ? `₹${entry.amount}` : `+ ₹${entry.amount}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                        <span>By: <strong>{entry.deliveryBoyName || 'Admin'}</strong></span>
                        <span>
                          Bal:{' '}
                          <strong style={{ color: entry.balance > 0 ? '#dc2626' : entry.balance < 0 ? '#2563eb' : '#059669' }}>
                            {entry.balance > 0 && `₹${entry.balance} Due`}
                            {entry.balance < 0 && `₹${Math.abs(entry.balance)} Adv`}
                            {entry.balance === 0 && `₹0 Settled`}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW B: ALL CUSTOMERS DIRECTORY (The Default Directory View)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── SCREEN: MOBILE RESPONSIVE CUSTOMERS (EXACT REPLICA OF MOBILE APP _buildCustomersView) ──
  const renderMobileCustomersView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search Bar matching Flutter TextField */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '10px 14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name or phone..."
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.84rem',
                color: '#0f172a',
                background: 'transparent',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenAddCustomer && onOpenAddCustomer()}
            style={{
              background: '#059669',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.78rem',
              padding: '10px 14px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
            }}
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>

        {/* Customer Cards List */}
        {filteredCustomers.length === 0 ? (
          <div
            style={{
              padding: '24px',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
          >
            No customers match this search
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredCustomers.map((c) => {
              const name = c.name || 'Customer';
              const mobile = c.mobile || '';
              const rawStatus = (c.status || 'active').toLowerCase();
              const isPaused = rawStatus === 'paused';
              const status = rawStatus.toUpperCase();
              const plan = c.deliveryPlan && typeof c.deliveryPlan === 'object' ? c.deliveryPlan : (c.subscription || {});
              const milkQty = plan.milkQty || plan.milkQuantity || 1;
              const bal = c.currentBalance || 0;
              const lat = Number(c.latitude);
              const lng = Number(c.longitude);
              const hasGps = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

              return (
                <div
                  key={c.id || c._id || c.customerId}
                  onClick={() => setSelectedCustomerId(c.id || c._id || c.customerId)}
                  style={{
                    padding: '14px',
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Left Initial Box 36x36 */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isPaused ? '#fffbeb' : '#ecfdf5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.94rem',
                      color: isPaused ? '#b45309' : '#059669',
                      flexShrink: 0,
                    }}
                  >
                    {name.length > 0 ? name[0].toUpperCase() : 'C'}
                  </div>

                  {/* Middle: Details */}
                  <div style={{ flex: 1, marginLeft: '12px', minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mobile} • {milkQty}L Daily{c.area ? ` • ${c.area}` : ''}
                    </div>
                    {hasGps && (
                      <div style={{ marginTop: '2px' }}>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            textDecoration: 'none',
                          }}
                        >
                          <MapPin size={11} color="#2563eb" />
                          <span>GPS: {lat.toFixed(3)}, {lng.toFixed(3)}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Right: Status Pill & Balance */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0, marginLeft: '8px' }}>
                    <div
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isPaused ? '#fffbeb' : '#ecfdf5',
                        color: isPaused ? '#b45309' : '#059669',
                        fontSize: '0.60rem',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {status}
                    </div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: bal < 0 ? '#ef4444' : '#059669',
                      }}
                    >
                      Bal: ₹{bal}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isMobile ? renderMobileCustomersView() : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Toolbar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.015)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Customer Directory
          </h1>
          <p style={{ fontSize: '0.80rem', color: '#64748b', margin: '2px 0 0 0' }}>
            Active customer accounts, daily delivery subscriptions, and passbook ledgers
          </p>
        </div>

        <button
          onClick={() => onOpenAddCustomer && onOpenAddCustomer()}
          style={{
            background: '#059669',
            border: 'none',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.84rem',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}
        >
          <Plus size={16} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Partner Assignment Feedback Banner */}
      {partnerMsg && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '0.86rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 5px rgba(5, 150, 105, 0.12)',
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{partnerMsg}</span>
        </div>
      )}

      {/* Delete Feedback Banner */}
      {deleteMsg && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '0.86rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 5px rgba(220, 38, 38, 0.1)',
          }}
        >
          <Trash2 size={18} color="#dc2626" />
          <span>{deleteMsg}</span>
        </div>
      )}

      {/* 2. Filter & Search Controls */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, ID, or route area..."
            style={{
              paddingLeft: '34px',
              paddingTop: '7px',
              paddingBottom: '7px',
              fontSize: '0.84rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'all', label: 'All Customers' },
            { id: 'active', label: 'Active' },
            { id: 'paused', label: 'Paused' },
            { id: 'inactive', label: 'Inactive' },
            { id: 'outstanding', label: 'Due Only' },
            { id: 'advance', label: 'Advance' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: statusFilter === st.id ? '#059669' : '#e2e8f0',
                background: statusFilter === st.id ? '#ecfdf5' : '#ffffff',
                color: statusFilter === st.id ? '#065f46' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {st.label}
            </button>
          ))}

          {areas.length > 0 && (
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              style={{
                width: 'auto',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Areas</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}

          {/* Toggle between Card Grid and Table */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setDirectoryViewMode('grid')}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: 'none',
                background: directoryViewMode === 'grid' ? '#ffffff' : 'transparent',
                color: directoryViewMode === 'grid' ? '#059669' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Card Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setDirectoryViewMode('table')}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: 'none',
                background: directoryViewMode === 'table' ? '#ffffff' : 'transparent',
                color: directoryViewMode === 'table' ? '#059669' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Directory Table View"
            >
              <TableIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Customer Cards Grid (3 cards per row) */}
      {directoryViewMode === 'grid' && (
        <div className="customer-grid-3cols">
          {filteredCustomers.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '48px 20px',
                textAlign: 'center',
              }}
            >
              <Users size={32} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                No Customers Found
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                Try adjusting your search criteria or filter options
              </p>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const isPaused = customer.status === 'paused';
              const bal = customer.currentBalance || 0;
              const isOutstanding = bal > 0;
              const isAdvance = bal < 0;

              return (
                <div
                  key={customer.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.015)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    {/* Header with Name & Balance (Clickable) */}
                    <div
                      onClick={() => handleSelectCustomer(customer)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                        cursor: 'pointer',
                      }}
                      title="Click to view complete customer profile and ledger"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: '#f1f5f9',
                            color: '#334155',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {customer.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h3
                            style={{
                              fontSize: '0.98rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              margin: 0,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{customer.name}</span>
                          </h3>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                            ID: {customer.customerId}
                          </span>
                        </div>
                      </div>

                      {/* Balance Badge */}
                      <div>
                        {isOutstanding && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fee2e2',
                              display: 'inline-block',
                            }}
                          >
                            ₹{bal.toLocaleString()} Due
                          </span>
                        )}
                        {isAdvance && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #dbeafe',
                              display: 'inline-block',
                            }}
                          >
                            ₹{Math.abs(bal).toLocaleString()} Advance
                          </span>
                        )}
                        {!isOutstanding && !isAdvance && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #d1fae5',
                              display: 'inline-block',
                            }}
                          >
                            ₹0 Clear
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact and Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.78rem', color: '#64748b', margin: '8px 0 12px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} color="#059669" />
                        <a href={`tel:${customer.mobile}`} style={{ color: '#475569', textDecoration: 'none' }}>
                          {customer.mobile}
                        </a>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <MapPin size={13} color="#059669" />
                        <span>{customer.address} ({customer.area})</span>
                        {customer.latitude && customer.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            <Navigation size={10} />
                            <span>GPS ({Number(customer.latitude).toFixed(3)}, {Number(customer.longitude).toFixed(3)})</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Subscription Quota Card */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                          SUBSCRIPTION PLAN
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#e2e8f0',
                              color: '#334155',
                              textTransform: 'capitalize',
                            }}
                          >
                            {customer.deliveryPlan?.frequency || 'Daily'}
                          </span>
                          {isPaused ? (
                            <button
                              type="button"
                              onClick={() => resumeDelivery(customer.id, { actor: 'Admin' })}
                              style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #86efac',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                              title="Start / Resume daily subscription"
                            >
                              <PlayCircle size={11} /> Start Sub
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date().toISOString().split('T')[0];
                                pauseDelivery(customer.id, {
                                  pauseFrom: today,
                                  pauseUntil: null,
                                  reason: 'Stopped by Admin',
                                  actor: 'Admin',
                                });
                              }}
                              style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                              title="Stop / Pause daily subscription"
                            >
                              <PauseCircle size={11} /> Stop Sub
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.84rem', fontWeight: 700, color: '#047857' }}>
                        <span>🥛 Milk: {customer.deliveryPlan?.milkQty} {customer.deliveryPlan?.milkUnit || 'L'}</span>
                        {customer.deliveryPlan?.curdQty > 0 && (
                          <span>🥣 Curd: {customer.deliveryPlan?.curdQty} {customer.deliveryPlan?.curdUnit || 'g'}</span>
                        )}
                      </div>

                      {customer.subscription?.status && (
                        <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                          <strong>Subscription payment:</strong>{' '}
                          {customer.subscription.status === 'active'
                            ? `Paid ₹${Number(customer.subscription.amount || 0).toLocaleString('en-IN')} via Razorpay · through ${customer.subscription.endDate ? new Date(customer.subscription.endDate).toLocaleDateString('en-IN') : 'end date unavailable'}`
                            : customer.subscription.status === 'pending_payment'
                              ? 'Awaiting customer payment'
                              : customer.subscription.status}
                          {customer.subscription.status === 'active' && customer.subscription.paymentId && (
                            <span> · Payment reference: {customer.subscription.paymentId}</span>
                          )}
                        </div>
                      )}

                      {/* Interactive Delivery Partner Selector */}
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Truck size={13} color="#059669" /> Assigned Delivery Partner:
                          </span>
                          {customer.deliveryPlan?.deliveryBoyName ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#047857', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                              ✓ {customer.deliveryPlan.deliveryBoyName}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>
                              ⚠️ Unassigned
                            </span>
                          )}
                        </div>
                        <select
                          disabled={customer.subscription?.status === 'pending_payment'}
                          value={
                            customer.deliveryPlan?.deliveryBoyId ||
                            (deliveryBoys || []).find((b) => b.name?.toLowerCase() === customer.deliveryPlan?.deliveryBoyName?.toLowerCase())?.id ||
                            ''
                          }
                          onChange={(e) => {
                            const selId = e.target.value;
                            const selBoy = (deliveryBoys || []).find((b) => (b.id === selId || b._id === selId));
                            handleAssignPartner(customer, selId, selBoy ? selBoy.name : '');
                          }}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            fontSize: '0.80rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: (customer.deliveryPlan?.deliveryBoyId || customer.deliveryPlan?.deliveryBoyName) ? '#ecfdf5' : '#ffffff',
                            color: (customer.deliveryPlan?.deliveryBoyId || customer.deliveryPlan?.deliveryBoyName) ? '#065f46' : '#334155',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                          }}
                          title="Assign a delivery partner to this user"
                        >
                          <option value="">Choose Delivery Partner (Unassigned)</option>
                          {(deliveryBoys || [])
                            .filter((boy) => boy.status !== 'inactive')
                            .map((boy) => (
                              <option key={boy.id || boy._id} value={boy.id || boy._id}>
                                {boy.name} • {boy.assignedArea || 'Route'} {boy.vehicleNumber ? `(${boy.vehicleNumber})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Hub */}
                  <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Primary Button: View Complete Details & Ledger */}
                    <button
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dbeafe';
                        e.currentTarget.style.color = '#1e40af';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.color = '#1d4ed8';
                      }}
                    >
                      <BookOpen size={14} />
                      <span>View Details & Customer Ledger</span>
                    </button>

                    {/* Secondary Row: Quick Ops (Pay, Pause, Qty, Edit, Delete) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                      <button
                        onClick={() => onOpenPaymentModal && onOpenPaymentModal(customer)}
                        style={{
                          padding: '6px 4px',
                          background: '#ecfdf5',
                          border: '1px solid #d1fae5',
                          color: '#047857',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                        }}
                        title="Record Payment"
                      >
                        <DollarSign size={11} />
                        <span>Pay</span>
                      </button>

                      <button
                        onClick={() => onOpenPauseModal && onOpenPauseModal(customer)}
                        style={{
                          padding: '6px 4px',
                          background: '#fffbeb',
                          border: '1px solid #fef3c7',
                          color: '#b45309',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                        }}
                        title="Pause Schedule"
                      >
                        <PauseCircle size={11} />
                        <span>Pause</span>
                      </button>

                      <button
                        onClick={() => onOpenTempQtyModal && onOpenTempQtyModal(customer)}
                        style={{
                          padding: '6px 4px',
                          background: '#f5f3ff',
                          border: '1px solid #ede9fe',
                          color: '#6d28d9',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                        }}
                        title="Adjust Temporary Qty"
                      >
                        <Zap size={11} />
                        <span>Qty</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditCustomer(customer)}
                        style={{
                          padding: '6px 4px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          color: '#1e293b',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                        }}
                        title="Edit Profile"
                      >
                        <Edit size={11} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingCustomer(customer)}
                        title="Delete Customer Account"
                        style={{
                          padding: '6px 4px',
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          borderRadius: '6px',
                          color: '#dc2626',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                        }}
                      >
                        <Trash2 size={11} />
                        <span>Del</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. Table Directory View Option */}
      {directoryViewMode === 'table' && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                  <th style={{ padding: '12px 18px' }}>Customer ID</th>
                  <th style={{ padding: '12px 18px' }}>Name & Contact</th>
                  <th style={{ padding: '12px 18px' }}>Route & Area</th>
                  <th style={{ padding: '12px 18px' }}>Daily Plan</th>
                  <th style={{ padding: '12px 18px' }}>Assigned Partner</th>
                  <th style={{ padding: '12px 18px' }}>Balance</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No customers match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const bal = customer.currentBalance || 0;
                    return (
                      <tr key={customer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>
                          {customer.customerId}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div
                            onClick={() => handleSelectCustomer(customer)}
                            style={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
                          >
                            {customer.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {customer.mobile}
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', color: '#475569' }}>
                          <strong>{customer.area}</strong> • {customer.address}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontWeight: 700, color: '#047857' }}>
                            {customer.deliveryPlan?.milkQty}L Milk
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>
                            ({customer.deliveryPlan?.frequency})
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', color: '#334155' }}>
                          {customer.deliveryPlan?.deliveryBoyName ? (
                            <span style={{ color: '#047857', fontWeight: 600 }}>
                              ✓ {customer.deliveryPlan.deliveryBoyName}
                            </span>
                          ) : (
                            <span style={{ color: '#b45309', fontWeight: 600 }}>
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {bal > 0 ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>₹{bal} Due</span>
                          ) : bal < 0 ? (
                            <span style={{ color: '#2563eb', fontWeight: 700 }}>₹{Math.abs(bal)} Adv</span>
                          ) : (
                            <span style={{ color: '#059669', fontWeight: 700 }}>₹0 Clear</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            style={{
                              padding: '5px 12px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <BookOpen size={12} />
                            <span>Ledger</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div
          className="modal-overlay"
          onClick={() => !isDeleting && setDeletingCustomer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '100%',
              borderRadius: '16px',
              padding: '24px',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Delete Customer Account
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Permanent CRUD Delete Action
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, margin: '0 0 14px 0' }}>
              Are you sure you want to permanently delete customer{' '}
              <strong style={{ color: '#0f172a' }}>{deletingCustomer.name}</strong> (
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{deletingCustomer.customerId}</span>
              )?
            </p>

            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: '#92400e',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                This action will delete the customer profile, login credentials, and all associated active delivery routes.
                {deletingCustomer.currentBalance !== 0 && (
                  <div style={{ marginTop: '4px', fontWeight: 700, color: '#b45309' }}>
                    Note: Customer currently has a balance of ₹{deletingCustomer.currentBalance}.
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingCustomer(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease',
                }}
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Internal Edit Modal */}
      {internalEditingCustomer && (
        <CustomerModal
          isOpen={Boolean(internalEditingCustomer)}
          customerToEdit={internalEditingCustomer}
          onClose={() => setInternalEditingCustomer(null)}
        />
      )}
    </>
  );
}
