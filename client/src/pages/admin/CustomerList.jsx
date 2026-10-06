import React, { useState } from 'react';
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
} from 'lucide-react';

export default function CustomerList({ onSelectCustomerLedger, onOpenAddCustomer, onOpenPaymentModal, onOpenPauseModal, onOpenTempQtyModal }) {
  const { customers, fetchCustomers, resumeDelivery } = useDairy();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');

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
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: '#0c2340' }}>Customer Directory & Subscriptions</h2>
          <p style={{ color: '#597361', fontSize: '0.9rem' }}>
            Manage daily plans, credit balances, pauses, and delivery routes
          </p>
        </div>

        <button
          onClick={() => onOpenAddCustomer && onOpenAddCustomer()}
          className="btn-primary"
          style={{ padding: '12px 20px', borderRadius: '12px', fontSize: '0.92rem' }}
        >
          <Plus size={18} />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="dairy-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={16} color="#899e90" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, mobile, ID, address..."
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'active', 'paused', 'inactive'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  background: statusFilter === st ? '#0d5c3a' : '#f0f5f1',
                  color: statusFilter === st ? '#ffffff' : '#597361',
                }}
              >
                {st === 'all' ? 'All Customers' : st}
              </button>
            ))}

            {areas.length > 0 && (
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <option value="all">All Areas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '18px',
      }}>
        {filtered.map((customer) => {
          const isPaused = customer.status === 'paused';
          const bal = customer.currentBalance;
          const isOutstanding = bal > 0;
          const isAdvance = bal < 0;

          return (
            <div
              key={customer.id}
              className="dairy-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: isOutstanding ? '5px solid #dc2626' : isAdvance ? '5px solid #2563eb' : '5px solid #16a34a',
                padding: '20px',
                opacity: isPaused ? 0.85 : 1,
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0d5c3a', background: '#eaf5ee', padding: '2px 8px', borderRadius: '4px' }}>
                      {customer.customerId}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', color: '#0c2340', marginTop: '4px' }}>
                      {customer.name}
                    </h3>
                  </div>

                  {/* Balance Display (PRD Section 14) */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#597361', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                      Balance
                    </span>
                    {isOutstanding && (
                      <span className="badge badge-pending" style={{ fontSize: '0.82rem' }}>
                        🔴 ₹{bal.toLocaleString()} Pending
                      </span>
                    )}
                    {isAdvance && (
                      <span className="badge badge-advance" style={{ fontSize: '0.82rem' }}>
                        🔵 ₹{Math.abs(bal).toLocaleString()} Advance
                      </span>
                    )}
                    {!isOutstanding && !isAdvance && (
                      <span className="badge badge-delivered" style={{ fontSize: '0.82rem' }}>
                        🟢 ₹0 Clear
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact & Address */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: '#597361', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} color="#0d5c3a" />
                    <span>{customer.mobile}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#0d5c3a" />
                    <span>{customer.address} ({customer.area})</span>
                  </div>
                </div>

                {/* Delivery Subscription Plan (PRD Section 3 & 4) */}
                <div style={{
                  background: '#f8faf8',
                  border: '1px solid #e2ece3',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0c2340', textTransform: 'uppercase' }}>
                      Daily Plan:
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: '#edf4fc',
                      color: '#16467a',
                      textTransform: 'capitalize',
                    }}>
                      {customer.deliveryPlan?.frequency}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.88rem', fontWeight: 700, color: '#0d5c3a' }}>
                    <span>🥛 Milk: {customer.deliveryPlan?.milkQty} {customer.deliveryPlan?.milkUnit || 'L'}</span>
                    {customer.deliveryPlan?.curdQty > 0 && (
                      <span>🥣 Curd: {customer.deliveryPlan?.curdQty} {customer.deliveryPlan?.curdUnit || 'g'}</span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#597361', marginTop: '4px' }}>
                    Assigned: <strong>{customer.deliveryPlan?.deliveryBoyName || 'Rahul Sharma'}</strong>
                  </div>
                </div>

                {/* Pause status if applicable */}
                {isPaused && (
                  <div style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#92400e',
                    marginBottom: '12px',
                  }}>
                    ⏸️ <strong>Paused</strong>: {customer.pauseFrom || 'Start'} to {customer.pauseUntil || 'End'}
                    <button
                      onClick={() => resumeDelivery(customer.id)}
                      style={{
                        marginLeft: '8px',
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      Resume Now
                    </button>
                  </div>
                )}

                {/* Temporary Qty if active */}
                {customer.temporaryQty?.date && (
                  <div style={{
                    background: '#e0f2fe',
                    border: '1px solid #bae6fd',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#0369a1',
                    marginBottom: '12px',
                  }}>
                    ⚡ Temp Qty on {customer.temporaryQty.date}: {customer.temporaryQty.milkQty}L Milk
                  </div>
                )}
              </div>

              {/* Action Buttons Hub */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                paddingTop: '12px',
                borderTop: '1px solid #e2ece3',
              }}>
                <button
                  onClick={() => onSelectCustomerLedger(customer.id)}
                  style={{
                    padding: '8px 6px',
                    background: '#edf4fc',
                    color: '#16467a',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <BookOpen size={13} />
                  <span>Ledger</span>
                </button>

                <button
                  onClick={() => onOpenPaymentModal && onOpenPaymentModal(customer)}
                  style={{
                    padding: '8px 6px',
                    background: '#eaf5ee',
                    color: '#0d5c3a',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <DollarSign size={13} />
                  <span>Payment</span>
                </button>

                <button
                  onClick={() => onOpenPauseModal && onOpenPauseModal(customer)}
                  style={{
                    padding: '8px 6px',
                    background: '#fef8eb',
                    color: '#b45309',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <PauseCircle size={13} />
                  <span>Pause</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
