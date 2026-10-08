import React, { useState, useEffect } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  MapPin,
  Calendar,
  Search,
  CreditCard,
  Check,
  AlertCircle,
  BookOpen,
  Filter,
} from 'lucide-react';

export default function TodayDeliveries({ onSelectCustomerLedger }) {
  const {
    deliveries,
    deliverySummary,
    selectedDate,
    setSelectedDate,
    fetchDeliveries,
    markDelivered,
    markNotDelivered,
    deliveryBoys,
  } = useDairy();

  const [statusFilter, setStatusFilter] = useState('all');
  const [boyFilter, setBoyFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals for delivery action
  const [deliveringItem, setDeliveringItem] = useState(null);
  const [notDeliveringItem, setNotDeliveringItem] = useState(null);

  // Form states for delivery modal
  const [actualMilk, setActualMilk] = useState(1);
  const [actualCurd, setActualCurd] = useState(0);
  const [paymentMode, setPaymentMode] = useState('credit');
  const [collectedAmount, setCollectedAmount] = useState(0);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Form states for Not Delivered modal
  const [notDeliveredReason, setNotDeliveredReason] = useState('Customer Not Home');
  const [notDeliveredNotes, setNotDeliveredNotes] = useState('');

  useEffect(() => {
    fetchDeliveries(selectedDate, statusFilter, boyFilter);
  }, [selectedDate, statusFilter, boyFilter, fetchDeliveries]);

  const openDeliveredModal = (item) => {
    setDeliveringItem(item);
    setActualMilk(item.plannedMilk);
    setActualCurd(item.plannedCurd);
    setPaymentMode(item.paymentMethod || 'credit');
    const total = item.plannedMilk * (item.milkPrice || 60) + (item.plannedCurd / 500) * (item.curdPrice || 30);
    setCollectedAmount(total);
    setDeliveryNotes('');
  };

  const handleConfirmDelivered = async () => {
    if (!deliveringItem) return;
    await markDelivered(deliveringItem.id, {
      actualMilk: Number(actualMilk),
      actualCurd: Number(actualCurd),
      paymentMethod: paymentMode,
      collectedAmount: paymentMode === 'cash' || paymentMode === 'upi' ? Number(collectedAmount) : 0,
      notes: deliveryNotes,
      actor: 'Admin',
    });
    setDeliveringItem(null);
  };

  const openNotDeliveredModal = (item) => {
    setNotDeliveringItem(item);
    setNotDeliveredReason('Customer Not Home');
    setNotDeliveredNotes('');
  };

  const handleConfirmNotDelivered = async () => {
    if (!notDeliveringItem) return;
    await markNotDelivered(notDeliveringItem.id, {
      reason: notDeliveredReason,
      notes: notDeliveredNotes,
      actor: 'Admin',
    });
    setNotDeliveringItem(null);
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = d.customerName.toLowerCase().includes(q);
      const matchAddress = d.customerAddress && d.customerAddress.toLowerCase().includes(q);
      const matchPhone = d.customerPhone && d.customerPhone.includes(q);
      if (!matchName && !matchAddress && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Summary Statistics Strip */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '18px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Today's Route Deliveries
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Real-time fulfillment tracking for daily automated morning door deliveries
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Calendar size={14} color="#059669" />
            <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Operational Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.84rem',
                outline: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          </div>
        </div>

        {/* Status Counters Strip */}
        <div
          style={{
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>TOTAL PLANNED</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {deliverySummary.total}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>DELIVERED</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              {deliverySummary.delivered}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>PENDING</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
              {deliverySummary.pending}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>NOT DELIVERED</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
              {deliverySummary.notDelivered}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
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
            placeholder="Search by customer, phone, or address..."
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
          {['all', 'pending', 'delivered', 'not_delivered'].map((st) => (
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
              {st === 'all' ? 'All Deliveries' : st.replace('_', ' ')}
            </button>
          ))}

          <select
            value={boyFilter}
            onChange={(e) => setBoyFilter(e.target.value)}
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
            <option value="all">All Delivery Partners</option>
            {deliveryBoys.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.assignedArea})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Delivery Schedule Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredDeliveries.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              textAlign: 'center',
              padding: '48px 20px',
            }}
          >
            <Truck size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
            <h4 style={{ color: '#0f172a', fontSize: '1.05rem', margin: 0 }}>No deliveries matching current filter</h4>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '4px' }}>
              Try selecting a different filter or checking another operational date.
            </p>
          </div>
        ) : (
          filteredDeliveries.map((item, idx) => {
            const isDone = item.status === 'delivered';
            const isMissed = item.status === 'not_delivered';
            const isPending = item.status === 'pending';

            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  padding: '16px 20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.015)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ flex: '1', minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
                      #{idx + 1}
                    </span>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {item.customerName}
                    </h3>

                    {/* Status Pill */}
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: isDone ? '#dcfce7' : isMissed ? '#fee2e2' : '#fef3c7',
                        color: isDone ? '#166534' : isMissed ? '#991b1b' : '#92400e',
                      }}
                    >
                      {isDone ? '✓ Delivered' : isMissed ? '✕ Missed' : '○ Pending'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.86rem', fontWeight: 600, color: '#047857', marginBottom: '4px' }}>
                    <span>🥛 Milk: {isDone ? item.actualMilk : item.plannedMilk} L</span>
                    {(isDone ? item.actualCurd : item.plannedCurd) > 0 && (
                      <span>🥣 Curd: {isDone ? item.actualCurd : item.plannedCurd} g</span>
                    )}
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>
                      ₹{item.totalAmount}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, alignSelf: 'center' }}>
                      ({item.paymentMethod?.toUpperCase()})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#64748b' }}>
                    <MapPin size={13} color="#059669" />
                    <span>{item.customerAddress || 'Address on file'}</span>
                  </div>

                  {item.notes && (
                    <div style={{ fontSize: '0.74rem', color: '#854d0e', background: '#fef9c3', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
                      Note: {item.notes}
                    </div>
                  )}

                  {isMissed && item.notDeliveredReason && (
                    <div style={{ fontSize: '0.74rem', color: '#991b1b', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
                      Reason: {item.notDeliveredReason}
                    </div>
                  )}
                </div>

                {/* Quick Action Controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {item.customerPhone && (
                    <a
                      href={`tel:${item.customerPhone}`}
                      style={{
                        padding: '6px 10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        color: '#334155',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        textDecoration: 'none',
                      }}
                    >
                      <Phone size={13} /> Call
                    </a>
                  )}

                  <button
                    onClick={() => onSelectCustomerLedger && onSelectCustomerLedger(item.customerId)}
                    style={{
                      padding: '6px 10px',
                      background: '#eff6ff',
                      border: '1px solid #dbeafe',
                      borderRadius: '6px',
                      color: '#1d4ed8',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    <BookOpen size={13} /> Ledger
                  </button>

                  {isPending && (
                    <>
                      <button
                        onClick={() => openDeliveredModal(item)}
                        style={{
                          background: '#059669',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={14} /> Delivered
                      </button>

                      <button
                        onClick={() => openNotDeliveredModal(item)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                        }}
                      >
                        <XCircle size={14} /> Missed
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delivered Confirmation Modal */}
      {deliveringItem && (
        <div className="modal-overlay" onClick={() => setDeliveringItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Confirm Delivery</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  {deliveringItem.customerName} • {deliveringItem.customerAddress}
                </p>
              </div>
              <button onClick={() => setDeliveringItem(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Milk Quantity Delivered (Litres)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={actualMilk}
                  onChange={(e) => setActualMilk(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Curd Quantity Delivered (Grams)
                </label>
                <input
                  type="number"
                  step="250"
                  value={actualCurd}
                  onChange={(e) => setActualCurd(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Payment Method
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px' }}
                >
                  <option value="credit">Monthly Credit Account (Bill to Ledger)</option>
                  <option value="cash">Cash on Delivery</option>
                  <option value="upi">UPI / Instant QR</option>
                </select>
              </div>

              {(paymentMode === 'cash' || paymentMode === 'upi') && (
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Amount Collected (₹)
                  </label>
                  <input
                    type="number"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(e.target.value)}
                    style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px' }}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Delivery Notes (Optional)
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Left at doorstep / bottle returned"
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDeliveringItem(null)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelivered}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#059669',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Delivered
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not Delivered Modal */}
      {notDeliveringItem && (
        <div className="modal-overlay" onClick={() => setNotDeliveringItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', margin: 0 }}>Mark Not Delivered</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  {notDeliveringItem.customerName} • {notDeliveringItem.customerAddress}
                </p>
              </div>
              <button onClick={() => setNotDeliveringItem(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Reason for Non-Delivery
                </label>
                <select
                  value={notDeliveredReason}
                  onChange={(e) => setNotDeliveredReason(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px' }}
                >
                  <option value="Customer Not Home">Customer Not Home / Door Locked</option>
                  <option value="Customer Requested Skip">Customer Requested Skip / Holiday</option>
                  <option value="Delivery Boy Shortage">Out of Stock / Route Delay</option>
                  <option value="Severe Weather">Inclement Weather / Road Block</option>
                  <option value="Other">Other Specific Reason</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Additional Notes
                </label>
                <textarea
                  rows="3"
                  value={notDeliveredNotes}
                  onChange={(e) => setNotDeliveredNotes(e.target.value)}
                  placeholder="Explain why delivery was not completed..."
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setNotDeliveringItem(null)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNotDelivered}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Not Delivered
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
