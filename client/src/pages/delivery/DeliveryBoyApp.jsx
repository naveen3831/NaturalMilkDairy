import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDairy } from '../../context/DairyContext';
import {
  Truck,
  Check,
  X,
  Phone,
  Navigation,
  MapPin,
  Clock,
  DollarSign,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Wallet,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export default function DeliveryBoyApp() {
  const { user } = useAuth();
  const {
    deliveries,
    deliverySummary,
    selectedDate,
    fetchDeliveries,
    markDelivered,
    markNotDelivered,
    isOnline,
    offlineQueue,
    syncOfflineQueue,
  } = useDairy();

  // Active delivery boy filtering
  const boyId = user?.id || 'usr_boy_1';
  const boyName = user?.name || 'Rahul Sharma';
  const boyArea = user?.assignedArea || 'Andheri West';

  // Modal states
  const [activeItem, setActiveItem] = useState(null);
  const [actionType, setActionType] = useState(null); // 'delivered' | 'not_delivered' | 'payment'

  // Delivered form
  const [milkQty, setMilkQty] = useState(1);
  const [curdQty, setCurdQty] = useState(0);
  const [payMode, setPayMode] = useState('credit');
  const [collectedNow, setCollectedNow] = useState(0);
  const [deliveryNote, setDeliveryNote] = useState('');

  // Not delivered form
  const [missedReason, setMissedReason] = useState('Customer Not Home');
  const [missedNote, setMissedNote] = useState('');

  // Tab: 'deliveries' or 'summary'
  const [viewTab, setViewTab] = useState('deliveries');

  useEffect(() => {
    fetchDeliveries(selectedDate, 'all', boyId);
  }, [selectedDate, boyId, fetchDeliveries]);

  // Filter deliveries for this delivery boy
  const myDeliveries = deliveries.filter(
    (d) => d.deliveryBoyId === boyId || d.deliveryBoyName === boyName || !d.deliveryBoyId
  );

  const pendingList = myDeliveries.filter((d) => d.status === 'pending');
  const completedList = myDeliveries.filter((d) => d.status === 'delivered');
  const missedList = myDeliveries.filter((d) => d.status === 'not_delivered');

  // Today's collections for this boy
  const totalCashCollected = completedList
    .filter((d) => d.paymentMethod === 'cash')
    .reduce((sum, d) => sum + (d.paymentAmount || d.totalAmount || 0), 0);

  const totalUpiCollected = completedList
    .filter((d) => d.paymentMethod === 'upi')
    .reduce((sum, d) => sum + (d.paymentAmount || d.totalAmount || 0), 0);

  const openDeliverModal = (item) => {
    setActiveItem(item);
    setActionType('delivered');
    setMilkQty(item.plannedMilk);
    setCurdQty(item.plannedCurd);
    setPayMode(item.paymentMethod || 'credit');
    const amt = item.plannedMilk * (item.milkPrice || 60) + (item.plannedCurd / 500) * (item.curdPrice || 30);
    setCollectedNow(amt);
    setDeliveryNote('');
  };

  const openNotDeliveredModal = (item) => {
    setActiveItem(item);
    setActionType('not_delivered');
    setMissedReason('Customer Not Home');
    setMissedNote('');
  };

  const handleConfirmDelivery = async () => {
    if (!activeItem) return;
    await markDelivered(activeItem.id, {
      actualMilk: Number(milkQty),
      actualCurd: Number(curdQty),
      paymentMethod: payMode,
      collectedAmount: payMode === 'cash' || payMode === 'upi' ? Number(collectedNow) : 0,
      notes: deliveryNote,
      actor: boyName,
    });
    setActiveItem(null);
    setActionType(null);
  };

  const handleConfirmMissed = async () => {
    if (!activeItem) return;
    await markNotDelivered(activeItem.id, {
      reason: missedReason,
      notes: missedNote,
      actor: boyName,
    });
    setActiveItem(null);
    setActionType(null);
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Offline Status Bar (PRD Section 34) */}
      {!isOnline && (
        <div style={{
          background: '#d97706',
          color: '#ffffff',
          padding: '10px 16px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
        }}>
          <WifiOff size={18} />
          <span>Offline Mode: Deliveries saved on phone. Will sync automatically!</span>
        </div>
      )}

      {/* Top Header & Fast Switcher (PRD Section 7 & 41) */}
      <div style={{
        background: 'linear-gradient(135deg, #0d5c3a 0%, #0c2340 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 8px 24px rgba(13, 92, 58, 0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#f5a623', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              TODAY'S DELIVERY ROUTE
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#ffffff', fontWeight: 900, marginTop: '2px' }}>
              {boyName}
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#d1fae5' }}>
              Route: <strong>{boyArea}</strong> • Date: {selectedDate}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {isOnline ? <Wifi size={14} color="#86efac" /> : <WifiOff size={14} color="#fca5a5" />}
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Big Tap Summary Counters (PRD Section 41) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          borderRadius: '14px',
          padding: '12px',
          textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#86efac', fontWeight: 700 }}>✓ DELIVERED</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#86efac' }}>
              {completedList.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#fde047', fontWeight: 700 }}>○ PENDING</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fde047' }}>
              {pendingList.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#fca5a5', fontWeight: 700 }}>✕ NOT DONE</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fca5a5' }}>
              {missedList.length}
            </div>
          </div>
        </div>

        {/* Sub Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => setViewTab('deliveries')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              background: viewTab === 'deliveries' ? '#f5a623' : 'rgba(255, 255, 255, 0.15)',
              color: viewTab === 'deliveries' ? '#0c2340' : '#ffffff',
            }}
          >
            Today's Customers ({pendingList.length} remaining)
          </button>
          <button
            type="button"
            onClick={() => setViewTab('summary')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              background: viewTab === 'summary' ? '#f5a623' : 'rgba(255, 255, 255, 0.15)',
              color: viewTab === 'summary' ? '#0c2340' : '#ffffff',
            }}
          >
            Cash Summary (₹{totalCashCollected + totalUpiCollected})
          </button>
        </div>
      </div>

      {/* VIEW: Deliveries List */}
      {viewTab === 'deliveries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {myDeliveries.length === 0 ? (
            <div className="dairy-card" style={{ textAlign: 'center', padding: '40px' }}>
              <Truck size={48} color="#899e90" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ color: '#0c2340' }}>No Deliveries Assigned Today</h3>
              <p style={{ color: '#597361', fontSize: '0.88rem' }}>Check with dairy owner or switch date.</p>
            </div>
          ) : (
            myDeliveries.map((item, index) => {
              const isDone = item.status === 'delivered';
              const isMissed = item.status === 'not_delivered';
              const isPending = item.status === 'pending';

              return (
                <div
                  key={item.id}
                  className="dairy-card"
                  style={{
                    borderLeft: isDone ? '6px solid #16a34a' : isMissed ? '6px solid #dc2626' : '6px solid #f5a623',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: isDone ? '#fbfdfb' : isMissed ? '#fffafa' : '#ffffff',
                  }}
                >
                  {/* Customer Info & Order Details (PRD Section 41) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#0d5c3a',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {index + 1}
                        </span>
                        <h3 style={{ fontSize: '1.25rem', color: '#0c2340' }}>
                          {item.customerName}
                        </h3>
                      </div>

                      {/* Quantity Line */}
                      <div style={{
                        marginTop: '6px',
                        display: 'flex',
                        gap: '12px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: '#0d5c3a',
                      }}>
                        <span>🥛 {isDone ? item.actualMilk : item.plannedMilk} L Milk</span>
                        {(isDone ? item.actualCurd : item.plannedCurd) > 0 && (
                          <span>🥣 {isDone ? item.actualCurd : item.plannedCurd} g Curd</span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${isDone ? 'badge-delivered' : isMissed ? 'badge-pending' : 'badge-waiting'}`}>
                        {isDone ? '✓ Completed' : isMissed ? '✕ Missed' : '○ Pending'}
                      </span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0c2340', marginTop: '4px' }}>
                        ₹{item.totalAmount}
                      </div>
                    </div>
                  </div>

                  {/* Customer Address & Navigation (PRD Section 20) */}
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#597361',
                    background: '#f8faf8',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <MapPin size={16} color="#0d5c3a" />
                    <span>{item.customerAddress}</span>
                  </div>

                  {/* Special Note (PRD Section 19) */}
                  {item.notes && (
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#92400e',
                      background: '#fef3c7',
                      padding: '6px 12px',
                      borderRadius: '8px',
                    }}>
                      🔔 Note: <strong>{item.notes}</strong>
                    </div>
                  )}

                  {/* Action Bar (PRD Section 41: CALL, MAP, DELIVERED, NOT DONE) */}
                  <div style={{ display: 'grid', gridTemplateColumns: isPending ? '1fr 1fr 2fr 1.5fr' : '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                    {/* Call Button (PRD Section 20) */}
                    <a
                      href={`tel:${item.customerPhone}`}
                      style={{
                        padding: '10px 8px',
                        background: '#eaf5ee',
                        color: '#0d5c3a',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <Phone size={14} /> [CALL]
                    </a>

                    {/* Map Button (PRD Section 20) */}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(item.customerAddress || item.customerName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px 8px',
                        background: '#edf4fc',
                        color: '#16467a',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <Navigation size={14} /> [MAP]
                    </a>

                    {isPending && (
                      <>
                        {/* DELIVERED Button (Big 1-Tap) */}
                        <button
                          type="button"
                          onClick={() => openDeliverModal(item)}
                          style={{
                            background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 4px 12px rgba(13, 92, 58, 0.3)',
                          }}
                        >
                          <Check size={16} /> [✓ DELIVERED]
                        </button>

                        {/* NOT DONE Button */}
                        <button
                          type="button"
                          onClick={() => openNotDeliveredModal(item)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1.5px solid #fca5a5',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <X size={14} /> [✕ NOT DONE]
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW: Cash Reconciliation Summary (PRD Section 28) */}
      {viewTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="dairy-card" style={{ background: '#f8faf8' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#0c2340', marginBottom: '16px' }}>
              Today's Route Collection (End of Day)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2ece3',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, color: '#597361' }}>💵 Physical Cash Collected:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0d5c3a' }}>
                  ₹{totalCashCollected.toLocaleString()}
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2ece3',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, color: '#597361' }}>📱 UPI Direct Received:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16467a' }}>
                  ₹{totalUpiCollected.toLocaleString()}
                </span>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #0d5c3a 0%, #16467a 100%)',
                color: '#ffffff',
                padding: '20px',
                borderRadius: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#f5a623', fontWeight: 800, textTransform: 'uppercase' }}>
                    TOTAL RECONCILIATION AMOUNT
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '2px' }}>
                    ₹{(totalCashCollected + totalUpiCollected).toLocaleString()}
                  </div>
                </div>
                <Wallet size={36} color="#f5a623" />
              </div>
            </div>

            <div style={{
              marginTop: '16px',
              fontSize: '0.85rem',
              color: '#597361',
              background: '#eaf5ee',
              padding: '12px',
              borderRadius: '10px',
            }}>
              💡 Please deposit the <strong>₹{totalCashCollected} cash</strong> at the dairy counter. The dairy owner will verify and confirm reconciliation on the admin portal.
            </div>
          </div>
        </div>
      )}

      {/* Delivered Confirmation Modal (PRD Section 7 & 8) */}
      {actionType === 'delivered' && activeItem && (
        <div className="modal-overlay" onClick={() => setActionType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: '#0d5c3a' }}>✓ Delivery Completed</h3>
                <p style={{ fontSize: '0.85rem', color: '#597361' }}>{activeItem.customerName}</p>
              </div>
              <button onClick={() => setActionType(null)} style={{ fontSize: '1.2rem', color: '#899e90' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Milk Delivered */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  🥛 Milk Delivered:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[0.5, 1, 1.5, 2].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setMilkQty(qty)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        border: milkQty === qty ? '2px solid #0d5c3a' : '1.5px solid #e2ece3',
                        background: milkQty === qty ? '#eaf5ee' : '#ffffff',
                        color: milkQty === qty ? '#0d5c3a' : '#14241a',
                      }}
                    >
                      {qty} L
                    </button>
                  ))}
                </div>
              </div>

              {/* Curd Delivered */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  🥣 Curd Delivered:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[0, 500, 1000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setCurdQty(qty)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        border: curdQty === qty ? '2px solid #0d5c3a' : '1.5px solid #e2ece3',
                        background: curdQty === qty ? '#eaf5ee' : '#ffffff',
                        color: curdQty === qty ? '#0d5c3a' : '#14241a',
                      }}
                    >
                      {qty === 0 ? 'No Curd' : qty >= 1000 ? '1 kg' : `${qty} g`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Calculation Display (PRD Section 7) */}
              <div style={{
                background: '#eaf5ee',
                padding: '14px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1.5px solid #16945a',
              }}>
                <span style={{ fontWeight: 800, color: '#0d5c3a' }}>Today's Amount:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0d5c3a' }}>
                  ₹{Number(milkQty) * 60 + (Number(curdQty) / 500) * 30}
                </span>
              </div>

              {/* Payment Mode Selection (PRD Section 7) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Payment:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'credit', label: '○ Credit' },
                    { id: 'cash', label: '💵 Cash' },
                    { id: 'upi', label: '📱 UPI' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMode(m.id)}
                      style={{
                        padding: '12px 6px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        border: payMode === m.id ? '2px solid #0d5c3a' : '1.5px solid #e2ece3',
                        background: payMode === m.id ? '#0d5c3a' : '#ffffff',
                        color: payMode === m.id ? '#ffffff' : '#597361',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <input
                  type="text"
                  placeholder="Optional delivery note (e.g. Given to maid)"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                />
              </div>

              {/* CONFIRM BUTTON (PRD Section 7: [CONFIRM]) */}
              <button
                type="button"
                onClick={handleConfirmDelivery}
                className="btn-primary"
                style={{ padding: '15px', fontSize: '1.1rem', marginTop: '6px' }}
              >
                [CONFIRM]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Not Delivered Modal (PRD Section 9) */}
      {actionType === 'not_delivered' && activeItem && (
        <div className="modal-overlay" onClick={() => setActionType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: '#dc2626' }}>NOT DELIVERED</h3>
                <p style={{ fontSize: '0.85rem', color: '#597361' }}>{activeItem.customerName}</p>
              </div>
              <button onClick={() => setActionType(null)} style={{ fontSize: '1.2rem', color: '#899e90' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14241a' }}>Reason:</label>
              {[
                'Customer Not Home',
                'Customer Cancelled',
                'Customer Requested Pause',
                'Product Unavailable',
                'Other',
              ].map((r) => (
                <label
                  key={r}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: missedReason === r ? '#fee2e2' : '#f8faf8',
                    border: missedReason === r ? '1.5px solid #dc2626' : '1px solid #e2ece3',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: missedReason === r ? '#991b1b' : '#14241a',
                  }}
                >
                  <input
                    type="radio"
                    name="missed_reason"
                    checked={missedReason === r}
                    onChange={() => setMissedReason(r)}
                  />
                  <span>{r}</span>
                </label>
              ))}

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Note:</label>
                <input
                  type="text"
                  placeholder="Optional detail..."
                  value={missedNote}
                  onChange={(e) => setMissedNote(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmMissed}
                className="btn-danger"
                style={{ padding: '14px', fontSize: '1rem', justifyContent: 'center', marginTop: '6px' }}
              >
                [SAVE]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
