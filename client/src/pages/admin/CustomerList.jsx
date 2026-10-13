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
} from 'lucide-react';

export default function CustomerList({
  onSelectCustomerLedger,
  onOpenAddCustomer,
  onOpenPaymentModal,
  onOpenPauseModal,
  onOpenTempQtyModal,
}) {
  const { customers, resumeDelivery, deliveryBoys, assignPartnerToCustomer, fetchDeliveryBoys } = useDairy();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [partnerMsg, setPartnerMsg] = useState('');

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
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.84rem', fontWeight: 700, color: '#047857' }}>
                    <span>🥛 Milk: {customer.deliveryPlan?.milkQty} {customer.deliveryPlan?.milkUnit || 'L'}</span>
                    {customer.deliveryPlan?.curdQty > 0 && (
                      <span>🥣 Curd: {customer.deliveryPlan?.curdQty} {customer.deliveryPlan?.curdUnit || 'g'}</span>
                    )}
                  </div>

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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
