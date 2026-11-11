import React, { useState, useEffect } from 'react';
import { useDairy } from '../../context/DairyContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  MapPin,
  Navigation,
  Calendar,
  Search,
  CreditCard,
  Check,
  AlertCircle,
  BookOpen,
  Filter,
  Camera,
  Trash2,
  ChevronRight,
  User,
  Users,
  X,
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
    assignDelivery,
    deleteDelivery,
    deliveryBoys,
    customers,
  } = useDairy();
  const { subscribe: wsSubscribe } = useWebSocket();
  const [timeRange, setTimeRange] = useState('today');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [boyFilter, setBoyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modals for delivery action
  const [deliveringItem, setDeliveringItem] = useState(null);
  const [notDeliveringItem, setNotDeliveringItem] = useState(null);
  const [previewProof, setPreviewProof] = useState(null);
  const [selectedDeliveryDetails, setSelectedDeliveryDetails] = useState(null);

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
    fetchDeliveries(selectedDate, statusFilter, boyFilter, timeRange);
  }, [selectedDate, statusFilter, boyFilter, timeRange, fetchDeliveries]);

  // Real-time synchronization when delivery status or schedule changes
  useEffect(() => {
    if (!wsSubscribe) return;
    const unsub = wsSubscribe('DELIVERY_UPDATED', () => {
      fetchDeliveries(selectedDate, statusFilter, boyFilter, timeRange);
    });
    const unsubLoc = wsSubscribe('LOCATION_UPDATED', () => {
      fetchDeliveries(selectedDate, statusFilter, boyFilter, timeRange);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
      if (typeof unsubLoc === 'function') unsubLoc();
    };
  }, [wsSubscribe, selectedDate, statusFilter, boyFilter, timeRange, fetchDeliveries]);

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

  const [assignmentSuccess, setAssignmentSuccess] = useState('');

  const handleAssignDelivery = async (item, boyId, boyName) => {
    if (!item) return;
    try {
      await assignDelivery(item.id, {
        deliveryBoyId: boyId,
        deliveryBoyName: boyName,
        actor: 'Admin',
      });

      setAssignmentSuccess(`Delivery assigned to ${boyName || 'Partner'}! Delivery partner notified.`);
      setTimeout(() => setAssignmentSuccess(''), 3500);
    } catch (err) {
      console.error('Failed to assign delivery:', err);
    }
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

  // Common Modals Rendered across Desktop and Mobile Responsive
  const renderModals = () => (
    <>
      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmItem(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', borderRadius: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                }}
              >
                <Trash2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Delete Delivery?
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  {deleteConfirmItem.customerName} • {deleteConfirmItem.deliveryDate}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              This will remove the delivery from the <strong>Admin Console</strong> and <strong>Driver Dashboards</strong>.
              <br /><br />
              <span style={{ color: '#059669', fontWeight: 600 }}>
                ✓ The customer's order history and ledger will be safely preserved.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteConfirmItem;
                  setDeleteConfirmItem(null);
                  await deleteDelivery(target.id || target._id);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Delete from Dashboards
              </button>
            </div>
          </div>
        </div>
      )}

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
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', width: '100%' }}
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
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Payment Method
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', width: '100%' }}
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
                    style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', width: '100%' }}
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
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', width: '100%' }}
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
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', width: '100%' }}
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
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', width: '100%' }}
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

      {/* Lightbox Modal for Proof Image */}
      {previewProof && (() => {
        const rawTime = previewProof.deliveredAt || previewProof.updatedAt || previewProof.deliveryDate;
        const formattedTime = rawTime
          ? new Date(rawTime).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })
          : 'Realtime Verified Drop';
        const address = previewProof.customerAddress || previewProof.deliveryAddress || previewProof.address || previewProof.area || 'Doorstep Location';

        return (
          <div className="modal-overlay" onClick={() => setPreviewProof(null)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '520px', width: '92%', borderRadius: '18px', padding: '20px', textAlign: 'left', background: '#ffffff', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '3px 8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857', letterSpacing: '0.3px' }}>
                      ✓ VERIFIED DOORSTEP DROP
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {previewProof.customerName || 'Customer'}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0 0' }}>
                    📍 {address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewProof(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Photo */}
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #059669', background: '#0b1e14' }}>
                <img
                  src={previewProof.proofImage}
                  alt="Home doorstep proof photo"
                  style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
                />
              </div>

              {/* Info Card */}
              <div style={{ marginTop: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748b' }}>🕒 Timestamp:</span>
                  <strong style={{ color: '#065f46', fontWeight: 800 }}>{formattedTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748b' }}>🚚 Fulfilled by:</span>
                  <strong style={{ color: '#0f172a' }}>{previewProof.deliveryBoyName || 'Partner'}</strong>
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: '14px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <a
                  href={previewProof.proofImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="delivery_proof.jpg"
                  style={{
                    padding: '8px 14px',
                    background: '#f1f5f9',
                    color: '#334155',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Download Photo
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewProof(null)}
                  style={{ padding: '8px 18px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );

  // ── SCREEN: MOBILE RESPONSIVE DELIVERIES (EXACT REPLICA OF MOBILE APP _buildOperationsView) ──
  if (isMobile) {
    const allDropsCount = deliveries.length;
    const deliveredCount = deliveries.filter((d) => d.status === 'delivered').length;
    const pendingCount = deliveries.filter((d) => d.status === 'pending').length;

    const mobileFilteredDrops = filteredDeliveries.filter((d) => {
      if (statusFilter === 'delivered') return d.status === 'delivered';
      if (statusFilter === 'pending') return d.status === 'pending';
      return true;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Filter Chips Scroll matching Flutter _buildOperationsView() */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'all', label: `All Drops (${allDropsCount})` },
            { id: 'delivered', label: `Delivered (${deliveredCount})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
          ].map((chip) => {
            const isSelected = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #059669' : '1px solid #e2e8f0',
                  background: isSelected ? '#ecfdf5' : '#ffffff',
                  color: isSelected ? '#059669' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Deliveries List */}
        {mobileFilteredDrops.length === 0 ? (
          <div
            style={{
              padding: '24px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
          >
            No drops match this filter
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mobileFilteredDrops.map((d) => {
              const isDelivered = d.status === 'delivered';
              const isPending = d.status === 'pending';
              const proofUrl = d.proofImage?.toString();
              const driverName = d.deliveryBoyName?.toString() || 'Unassigned';
              const lat = Number(d.customerLatitude || d.latitude);
              const lng = Number(d.customerLongitude || d.longitude);
              const hasGps = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

              return (
                <div
                  key={d.id || d._id}
                  style={{
                    padding: '16px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: `1px solid ${isDelivered ? '#bbf7d0' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* Top row: Name & Status Pill */}
                  <div
                    onClick={() => setSelectedDeliveryDetails(d)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginRight: '8px',
                      }}
                    >
                      {d.customerName || 'Customer'}
                    </span>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                        background: isDelivered ? '#ecfdf5' : isPending ? '#fff8e1' : '#fef2f2',
                        color: isDelivered ? '#059669' : isPending ? '#f57f17' : '#dc2626',
                      }}
                    >
                      {isDelivered ? '✓ DELIVERED' : isPending ? 'PENDING' : 'MISSED'}
                    </span>
                  </div>

                  {/* Address */}
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                    {d.customerAddress || 'Madhapur Doorstep Drop'}
                  </div>

                  {/* GPS Coordinate Link */}
                  {hasGps && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: '#2563eb',
                        textDecoration: 'none',
                        marginTop: '2px',
                        width: 'fit-content',
                      }}
                    >
                      <MapPin size={12} color="#2563eb" />
                      <span>GPS: {lat.toFixed(3)}, {lng.toFixed(3)}</span>
                    </a>
                  )}

                  {/* Quantity & Partner */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '8px',
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#059669' }}>
                      {d.actualMilk ?? d.plannedMilk ?? 1}L Milk
                      {(d.actualCurd ?? d.plannedCurd ?? 0) > 0 ? ` + ${d.actualCurd ?? d.plannedCurd}g Curd` : ''}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                      Partner: {driverName}
                    </span>
                  </div>

                  {/* Doorstep Proof button */}
                  {proofUrl && (
                    <>
                      <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0 4px 0' }} />
                      <button
                        type="button"
                        onClick={() => setPreviewProof(d)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'none',
                          border: 'none',
                          padding: '4px 0',
                          cursor: 'pointer',
                          width: '100%',
                          color: '#059669',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Camera size={14} color="#059669" />
                          <span>View Doorstep Photo Proof</span>
                        </span>
                        <ChevronRight size={16} color="#059669" />
                      </button>
                    </>
                  )}

                  {/* Tap for customer details */}
                  <div
                    onClick={() => setSelectedDeliveryDetails(d)}
                    role="button"
                    tabIndex={0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid #f1f5f9',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 600 }}>Tap for customer & delivery details</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span>Details</span>
                      <ChevronRight size={13} />
                    </span>
                  </div>

                  {/* Pending quick actions */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => openDeliveredModal(d)}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#059669',
                          color: '#ffffff',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={13} />
                        <span>Deliver</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openNotDeliveredModal(d)}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid #fee2e2',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <span>Skip</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Customer & Delivery Details Bottom Sheet Modal (Mobile Responsive) */}
        {selectedDeliveryDetails && (() => {
          const d = selectedDeliveryDetails;
          const matchingCust = customers?.find(
            (c) => (c.id && c.id === d.customerId) ||
                   (c._id && c._id === d.customerId) ||
                   (c.customerId && c.customerId === d.customerId) ||
                   (c.name && d.customerName && c.name.trim().toLowerCase() === d.customerName.trim().toLowerCase())
          ) || {};
          const isDelivered = d.status === 'delivered';
          const isPending = d.status === 'pending';
          const phone = matchingCust.mobile || d.customerPhone || d.phone || '';
          const bal = matchingCust.currentBalance || 0;
          const custAddress = d.customerAddress || matchingCust.address || 'Doorstep Drop';
          const proofUrl = d.proofImage?.toString();
          const driverName = d.deliveryBoyName?.toString() || 'Unassigned';
          const plan = matchingCust.deliveryPlan || {};
          const milkQty = plan.milkQty || d.actualMilk || d.plannedMilk || 1;

          return (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(3px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
              onClick={() => setSelectedDeliveryDetails(null)}
            >
              <div
                style={{
                  background: '#ffffff',
                  width: '100%',
                  maxHeight: '88vh',
                  borderTopLeftRadius: '24px',
                  borderTopRightRadius: '24px',
                  padding: '20px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag handle */}
                <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '2px', margin: '0 auto 4px auto' }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      {d.customerName || 'Customer Details'}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      Date: {d.deliveryDate || 'Today'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '4px 9px',
                        borderRadius: '6px',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        background: isDelivered ? '#ecfdf5' : isPending ? '#fff8e1' : '#fef2f2',
                        color: isDelivered ? '#059669' : isPending ? '#f57f17' : '#dc2626',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isDelivered ? '✓ DELIVERED' : isPending ? 'PENDING' : 'MISSED'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDeliveryDetails(null)}
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Section 1: Customer Profile Details */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <User size={13} color="#059669" />
                      <span>Customer Profile Details</span>
                    </span>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: matchingCust.status === 'paused' ? '#fffbeb' : '#ecfdf5', color: matchingCust.status === 'paused' ? '#b45309' : '#059669' }}>
                      {(matchingCust.status || 'ACTIVE').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ height: '1px', background: '#e2e8f0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Full Name</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{d.customerName}</span>
                  </div>
                  {phone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ color: '#64748b' }}>Phone Number</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{phone}</span>
                        <a
                          href={`tel:${phone}`}
                          style={{
                            padding: '3px 8px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            color: '#2563eb',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Phone size={10} />
                          <span>Call</span>
                        </a>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Doorstep Address</span>
                    <span style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>{custAddress}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Account Balance</span>
                    <span style={{ fontWeight: 800, color: bal > 0 ? '#dc2626' : '#059669' }}>₹{bal}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Subscription Plan</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>{milkQty}L Daily Milk • {plan.deliveryDays || 'Everyday'}</span>
                  </div>
                </div>

                {/* Section 2: Delivery & Fulfillment Details */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Truck size={13} color="#2563eb" />
                    <span>Delivery & Fulfillment Details</span>
                  </span>
                  <div style={{ height: '1px', background: '#e2e8f0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Delivered Products</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>
                      {d.actualMilk ?? d.plannedMilk ?? 1}L Milk
                      {(d.actualCurd ?? d.plannedCurd ?? 0) > 0 ? ` + ${d.actualCurd ?? d.plannedCurd}g Curd` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Billed Amount</span>
                    <span style={{ fontWeight: 800, color: '#7e22ce' }}>₹{d.totalAmount || 0} ({(d.paymentMethod || 'credit').toUpperCase()})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Assigned Partner</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{driverName}</span>
                  </div>
                  {proofUrl && (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                        Doorstep Delivery Photo Proof:
                      </span>
                      <img
                        src={proofUrl}
                        alt="Proof"
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                  )}
                </div>

                {/* Section 3: Action Buttons */}
                {typeof onSelectCustomerLedger === 'function' && matchingCust._id && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeliveryDetails(null);
                      onSelectCustomerLedger(matchingCust);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#059669',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.80rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <BookOpen size={14} />
                    <span>View Customer Ledger & History</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {renderModals()}
      </div>
    );
  }

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
              Deliveries Management
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Real-time fulfillment tracking and scheduling across today, weekly, monthly, and all deliveries
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Quick Range Tabs */}
            <div
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                gap: '2px',
              }}
            >
              {[
                { id: 'today', label: 'Today' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'all', label: 'All Deliveries' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeRange(tab.id)}
                  style={{
                    padding: '6px 13px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: timeRange === tab.id ? '#ffffff' : 'transparent',
                    color: timeRange === tab.id ? '#059669' : '#64748b',
                    boxShadow: timeRange === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Custom Operational Date Picker */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f8fafc',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Calendar size={14} color="#059669" />
              <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setTimeRange('today');
                }}
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

      {/* Assignment Success Alert Banner */}
      {assignmentSuccess && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(5,150,105,0.1)',
          }}
        >
          <CheckCircle size={16} color="#059669" />
          <span>{assignmentSuccess}</span>
        </div>
      )}

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
                      #{idx + 1}
                    </span>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {item.customerName}
                    </h3>

                    {/* Delivery Date Tag */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        color: '#334155',
                      }}
                      title="Scheduled Delivery Date"
                    >
                      <Calendar size={12} color="#059669" />
                      {item.deliveryDate || selectedDate}
                    </span>

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
                  {item.subscriptionEndDate && (
                    <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 700, marginBottom: '4px' }}>
                      Prepaid subscription: ₹{Number(item.subscriptionPaymentAmount || 0).toLocaleString('en-IN')} via {item.subscriptionPaymentMethod?.toUpperCase() || 'RAZORPAY'} · through {new Date(item.subscriptionEndDate).toLocaleDateString('en-IN')}{item.subscriptionPaymentId ? ` · ref ${item.subscriptionPaymentId}` : ''}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                    <MapPin size={13} color="#059669" />
                    <span>{item.customerAddress || 'Address on file'}</span>
                    {(item.customerLatitude || item.latitude) && (item.customerLongitude || item.longitude) && (
                      <a
                        href={`https://www.google.com/maps?q=${item.customerLatitude || item.latitude},${item.customerLongitude || item.longitude}`}
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
                        <span>GPS ({Number(item.customerLatitude || item.latitude).toFixed(3)}, {Number(item.customerLongitude || item.longitude).toFixed(3)})</span>
                      </a>
                    )}
                  </div>

                  {/* Partner Assignment Dropdown (Notifies Delivery Partner) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Truck size={13} color="#059669" /> Assigned:
                    </span>
                    <select
                      value={item.deliveryBoyId || ''}
                      onChange={(e) => {
                        const selId = e.target.value;
                        const selBoy = deliveryBoys.find((b) => (b.id === selId || b._id === selId));
                        handleAssignDelivery(item, selId, selBoy ? selBoy.name : '');
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: item.deliveryBoyId ? '#ecfdf5' : '#f8fafc',
                        color: item.deliveryBoyId ? '#065f46' : '#64748b',
                        cursor: 'pointer',
                        maxWidth: '220px',
                      }}
                      title="Assign or reassign delivery partner (sends instant alert to driver)"
                    >
                      <option value="">Unassigned (Tap to Assign)</option>
                      {(deliveryBoys || [])
                        .filter((boy) => boy.status !== 'inactive')
                        .map((boy) => (
                        <option key={boy.id || boy._id} value={boy.id || boy._id}>
                          {boy.name} ({boy.assignedArea || 'Route'})
                        </option>
                      ))}
                    </select>
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

                  {isDone && item.proofImage && (
                    <button
                      type="button"
                      onClick={() => setPreviewProof(item)}
                      style={{
                        padding: '6px 10px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '6px',
                        color: '#065f46',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                      }}
                      title="View doorstep home proof photo captured by delivery partner"
                    >
                      <Camera size={13} color="#059669" />
                      <span>Proof Photo</span>
                    </button>
                  )}

                  {isDone && (
                    <span
                      style={{
                        padding: '6px 12px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '6px',
                        color: '#065f46',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <CheckCircle size={14} color="#059669" /> Delivered
                    </span>
                  )}

                  {isMissed && (
                    <span
                      style={{
                        padding: '6px 12px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        color: '#b91c1c',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <XCircle size={14} color="#dc2626" /> Missed
                    </span>
                  )}

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

                  {/* Admin-only Delete Button */}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmItem(item)}
                    style={{
                      padding: '6px 10px',
                      background: '#fff5f5',
                      border: '1px solid #fee2e2',
                      borderRadius: '6px',
                      color: '#b91c1c',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Delete delivery from admin and driver dashboards (preserves customer history)"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {renderModals()}
    </div>
  );
}
