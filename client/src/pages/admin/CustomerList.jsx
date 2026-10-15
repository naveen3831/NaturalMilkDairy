import React, { useState, useEffect } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
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
} from 'lucide-react';
import CustomerModal from '../../components/CustomerModal';

export default function CustomerList({
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
    refreshAll,
  } = useDairy();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [partnerMsg, setPartnerMsg] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [internalEditingCustomer, setInternalEditingCustomer] = useState(null);

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

  useEffect(() => {
    if (fetchDeliveryBoys) {
      fetchDeliveryBoys();
    }
  }, [fetchDeliveryBoys]);

  const handleAssignPartner = async (customer, boyId, boyName) => {
    try {
      const res = await assignPartnerToCustomer(customer.id, {
        deliveryBoyId: boyId,
        deliveryBoyName: boyName,
        actor: 'Admin',
      });
      if (res && res.success) {
        setPartnerMsg(`Assigned partner "${boyName || 'None'}" to ${customer.name}. Driver list updated!`);
        setTimeout(() => setPartnerMsg(''), 4000);
      }
    } catch (err) {
      console.error('Assign partner error:', err);
    }
  };

  const filtered = customers.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (areaFilter !== 'all' && c.area !== areaFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchId = c.customerId && c.customerId.toLowerCase().includes(q);
      const matchPhone = c.mobile && c.mobile.includes(q);
      const matchAddr = c.address && c.address.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchPhone && !matchAddr) return false;
    }
    return true;
  });

  const areas = Array.from(new Set(customers.map((c) => c.area).filter(Boolean)));

  return (
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
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Customer Accounts & Subscriptions
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
            Manage daily home delivery subscriptions, pause dates, and credit balances
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
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {['all', 'active', 'paused', 'inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                border: '1px solid',
                borderColor: statusFilter === st ? '#059669' : '#e2e8f0',
                background: statusFilter === st ? '#ecfdf5' : '#ffffff',
                color: statusFilter === st ? '#065f46' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {st === 'all' ? 'All Customers' : st}
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
        </div>
      </div>

      {/* 3. Customer Cards Grid (3 cards per row) */}
      <div
        className="customer-grid-3cols"
      >
        {filtered.map((customer) => {
          const isPaused = customer.status === 'paused';
          const bal = customer.currentBalance;
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
                {/* Header with Name & Balance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
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
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {customer.name}
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
                    <span>{customer.mobile}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#059669" />
                    <span>{customer.address} ({customer.area})</span>
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
                      Subscription Plan
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
                    {customer.subscription?.status === 'pending_payment' && (
                      <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600 }}>
                        Partner assignment is available after payment confirmation.
                      </span>
                    )}
                  </div>
                </div>

                {/* Pause status if applicable */}
                {isPaused && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      color: '#92400e',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>⏸️ Paused: {customer.pauseFrom || 'Start'} to {customer.pauseUntil || 'End'}</span>
                    <button
                      onClick={() => resumeDelivery(customer.id)}
                      style={{
                        background: '#059669',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Resume
                    </button>
                  </div>
                )}

                {/* Temporary Qty if active */}
                {customer.temporaryQty?.date && (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      color: '#1e40af',
                      marginBottom: '12px',
                    }}
                  >
                    ⚡ Temp Qty on {customer.temporaryQty.date}: {customer.temporaryQty.milkQty}L Milk
                  </div>
                )}
              </div>

              {/* Action Buttons Hub */}
              <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Row 1: Daily Customer Operations */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                  }}
                >
                  <button
                    onClick={() => onSelectCustomerLedger(customer.id)}
                    style={{
                      padding: '6px',
                      background: '#eff6ff',
                      border: '1px solid #dbeafe',
                      color: '#1d4ed8',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <BookOpen size={12} />
                    <span>Ledger</span>
                  </button>

                  <button
                    onClick={() => onOpenPaymentModal && onOpenPaymentModal(customer)}
                    style={{
                      padding: '6px',
                      background: '#ecfdf5',
                      border: '1px solid #d1fae5',
                      color: '#047857',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <DollarSign size={12} />
                    <span>Pay</span>
                  </button>

                  <button
                    onClick={() => onOpenPauseModal && onOpenPauseModal(customer)}
                    style={{
                      padding: '6px',
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      color: '#b45309',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <PauseCircle size={12} />
                    <span>Pause</span>
                  </button>

                  <button
                    onClick={() => onOpenTempQtyModal && onOpenTempQtyModal(customer)}
                    style={{
                      padding: '6px',
                      background: '#f5f3ff',
                      border: '1px solid #ede9fe',
                      color: '#6d28d9',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Zap size={12} />
                    <span>Qty</span>
                  </button>
                </div>

                {/* Row 2: Customer Account Management (CRUD) */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleEditCustomer(customer)}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#1e293b',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#edf2f7';
                      e.currentTarget.style.borderColor = '#94a3b8';
                      e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.color = '#1e293b';
                    }}
                  >
                    <Edit size={12} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingCustomer(customer)}
                    title="Delete Customer Account"
                    style={{
                      padding: '7px 14px',
                      background: '#fef2f2',
                      border: '1px solid #fee2e2',
                      borderRadius: '6px',
                      color: '#dc2626',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.borderColor = '#fee2e2';
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
