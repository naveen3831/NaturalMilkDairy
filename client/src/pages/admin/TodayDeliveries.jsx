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
  Filter,
  CreditCard,
  Check,
  AlertCircle,
  BookOpen,
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
      {/* Top Banner (PRD Section 7) */}
      <div style={{
        background: 'linear-gradient(135deg, #0d5c3a 0%, #16467a 100%)',
        color: '#ffffff',
        borderRadius: '18px',
        padding: '24px',
        boxShadow: '0 6px 20px rgba(13, 92, 58, 0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f5a623' }}>
              TODAY'S DELIVERY SCHEDULE
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '1.8rem', marginTop: '2px' }}>
              Route & Dispatch Operations
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: '#d1fae5', fontWeight: 600 }}>Delivery Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#0c2340',
                fontWeight: 700,
                border: '2px solid #f5a623',
              }}
            />
          </div>
        </div>

        {/* Status Counters matching PRD Section 7 */}
        <div style={{
          marginTop: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          borderRadius: '14px',
          padding: '14px',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>TOTAL SCHEDULED</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff' }}>
              {deliverySummary.total}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 600 }}>✓ DELIVERED</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#86efac' }}>
              {deliverySummary.delivered}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#fde047', fontWeight: 600 }}>○ PENDING</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fde047' }}>
              {deliverySummary.pending}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600 }}>✕ NOT DELIVERED</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fca5a5' }}>
              {deliverySummary.notDelivered}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="dairy-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={16} color="#899e90" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, address, or phone..."
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status Pills */}
            {['all', 'pending', 'delivered', 'not_delivered'].map((st) => (
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
                {st === 'all' ? 'All Deliveries' : st.replace('_', ' ')}
              </button>
            ))}

            {/* Delivery Boy Selector */}
            <select
              value={boyFilter}
              onChange={(e) => setBoyFilter(e.target.value)}
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <option value="all">All Delivery Boys</option>
              {deliveryBoys.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.assignedArea})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredDeliveries.length === 0 ? (
          <div className="dairy-card" style={{ textAlign: 'center', padding: '40px' }}>
            <Truck size={40} color="#899e90" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ color: '#0c2340', fontSize: '1.2rem' }}>No deliveries match current filter</h4>
            <p style={{ color: '#597361', fontSize: '0.85rem' }}>
              Try changing the status or selected operational date.
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
                className="dairy-card"
                style={{
                  borderLeft: isDone ? '5px solid #16a34a' : isMissed ? '5px solid #dc2626' : '5px solid #f5a623',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  padding: '18px 22px',
                }}
              >
                <div style={{ flex: '1', minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#597361' }}>
                      #{idx + 1}
                    </span>
                    <h3 style={{ fontSize: '1.15rem', color: '#0c2340' }}>
                      {item.customerName}
                    </h3>
                    <span className={`badge ${isDone ? 'badge-delivered' : isMissed ? 'badge-pending' : 'badge-waiting'}`}>
                      {isDone ? '✓ Delivered' : isMissed ? '✕ Not Delivered' : '○ Pending'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.92rem', fontWeight: 700, color: '#0d5c3a', marginBottom: '6px' }}>
                    <span>🥛 Milk: {isDone ? item.actualMilk : item.plannedMilk} L</span>
                    {(isDone ? item.actualCurd : item.plannedCurd) > 0 && (
                      <span>🥣 Curd: {isDone ? item.actualCurd : item.plannedCurd} g</span>
                    )}
                    <span style={{ color: '#0c2340', fontWeight: 800 }}>
                      ₹{item.totalAmount}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#597361', fontWeight: 600 }}>
                      ({item.paymentMethod?.toUpperCase()})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#597361' }}>
                    <MapPin size={14} color="#0d5c3a" />
                    <span>{item.customerAddress || 'Address on file'}</span>
                  </div>

                  {item.notes && (
                    <div style={{ fontSize: '0.78rem', color: '#854d0e', background: '#fef9c3', padding: '4px 8px', borderRadius: '6px', marginTop: '6px', display: 'inline-block' }}>
                      📝 Note: {item.notes}
                    </div>
                  )}

                  {isMissed && item.notDeliveredReason && (
                    <div style={{ fontSize: '0.78rem', color: '#991b1b', background: '#fee2e2', padding: '4px 8px', borderRadius: '6px', marginTop: '6px', display: 'inline-block' }}>
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
                        padding: '8px 12px',
                        background: '#f0f5f1',
                        borderRadius: '8px',
                        color: '#0d5c3a',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Phone size={14} /> Call
                    </a>
                  )}

                  <button
                    onClick={() => onSelectCustomerLedger && onSelectCustomerLedger(item.customerId)}
                    style={{
                      padding: '8px 12px',
                      background: '#edf4fc',
                      borderRadius: '8px',
                      color: '#16467a',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <BookOpen size={14} /> Ledger
                  </button>

                  {isPending && (
                    <>
                      <button
                        onClick={() => openDeliveredModal(item)}
                        style={{
                          background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(13, 92, 58, 0.3)',
                        }}
                      >
                        <Check size={16} /> Delivered
                      </button>

                      <button
                        onClick={() => openNotDeliveredModal(item)}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #dc2626',
                          color: '#dc2626',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <XCircle size={16} /> Not Delivered
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delivered Confirmation Modal (PRD Section 7 & 8) */}
      {deliveringItem && (
        <div className="modal-overlay" onClick={() => setDeliveringItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: '#0c2340' }}>✓ Confirm Delivery</h3>
                <p style={{ fontSize: '0.85rem', color: '#597361' }}>
                  {deliveringItem.customerName} • {deliveringItem.customerAddress}
                </p>
              </div>
              <button onClick={() => setDeliveringItem(null)} style={{ fontSize: '1.2rem', color: '#899e90' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14241a', display: 'block', marginBottom: '4px' }}>
                  🥛 Milk Quantity Actually Delivered (Litres)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={actualMilk}
                  onChange={(e) => setActualMilk(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14241a', display: 'block', marginBottom: '4px' }}>
                  🥣 Curd Quantity Actually Delivered (Grams)
                </label>
                <input
                  type="number"
                  step="250"
                  value={actualCurd}
                  onChange={(e) => setActualCurd(e.target.value)}
                />
              </div>

              {/* Amount Display */}
              <div style={{
                background: '#eaf5ee',
                padding: '12px 16px',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, color: '#0d5c3a' }}>Total Delivery Amount:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0d5c3a' }}>
                  ₹{Number(actualMilk) * 60 + (Number(actualCurd) / 500) * 30}
                </span>
              </div>

              {/* Payment Mode Selection (PRD Section 7) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14241a', display: 'block', marginBottom: '6px' }}>
                  Payment Method:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'credit', label: '○ Credit (Add to Bill)' },
                    { id: 'cash', label: '💵 Cash Paid' },
                    { id: 'upi', label: '📱 UPI Paid' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMode(m.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        border: paymentMode === m.id ? '2px solid #0d5c3a' : '1.5px solid #e2ece3',
                        background: paymentMode === m.id ? '#eaf5ee' : '#ffffff',
                        color: paymentMode === m.id ? '#0d5c3a' : '#597361',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {(paymentMode === 'cash' || paymentMode === 'upi') && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14241a', display: 'block', marginBottom: '4px' }}>
                    Amount Collected Now (₹)
                  </label>
                  <input
                    type="number"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14241a', display: 'block', marginBottom: '4px' }}>
                  Delivery Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Left on wooden tray, bell rung"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmDelivered}
                className="btn-primary"
                style={{ padding: '13px', marginTop: '10px', fontSize: '1rem' }}
              >
                ✓ CONFIRM DELIVERY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Not Delivered Modal (PRD Section 9) */}
      {notDeliveringItem && (
        <div className="modal-overlay" onClick={() => setNotDeliveringItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: '#dc2626' }}>✕ Mark Not Delivered</h3>
                <p style={{ fontSize: '0.85rem', color: '#597361' }}>
                  {notDeliveringItem.customerName} (Rule 2: No charge applied)
                </p>
              </div>
              <button onClick={() => setNotDeliveringItem(null)} style={{ fontSize: '1.2rem', color: '#899e90' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14241a', display: 'block', marginBottom: '6px' }}>
                  Reason (PRD Section 9):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    'Customer Not Home',
                    'Customer Cancelled',
                    'Customer Requested Pause',
                    'Product Unavailable',
                    'Address Issue',
                    'Other',
                  ].map((r) => (
                    <label
                      key={r}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: notDeliveredReason === r ? '#fee2e2' : '#f8faf8',
                        border: notDeliveredReason === r ? '1.5px solid #dc2626' : '1px solid #e2ece3',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        color: notDeliveredReason === r ? '#991b1b' : '#14241a',
                      }}
                    >
                      <input
                        type="radio"
                        name="not_delivered_reason"
                        checked={notDeliveredReason === r}
                        onChange={() => setNotDeliveredReason(r)}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14241a', display: 'block', marginBottom: '4px' }}>
                  Optional Note:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Door was locked, phone unreachable"
                  value={notDeliveredNotes}
                  onChange={(e) => setNotDeliveredNotes(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmNotDelivered}
                className="btn-danger"
                style={{ padding: '13px', marginTop: '10px', justifyContent: 'center', fontSize: '1rem' }}
              >
                [SAVE NOT DELIVERED]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
