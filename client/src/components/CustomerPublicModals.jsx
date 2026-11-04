import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  CalendarDays,
  MapPin,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Clock,
  Milk,
  PhoneCall,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Camera,
  ZoomIn,
  Save,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDairy } from '../context/DairyContext';
import { resolveProofUrl } from '../services/api';

// ══════════════════════════════════════════════════════════════════
// 1. PUBLIC MODAL: DOORSTEP DELIVERIES & PROOF PHOTOS
// ══════════════════════════════════════════════════════════════════
export function CustomerDeliveriesPublicModal({ isOpen, onClose, customer, deliveries = [] }) {
  const [selectedProof, setSelectedProof] = useState(null);

  if (!isOpen) return null;

  const validDeliveries = Array.isArray(deliveries) ? deliveries : [];
  const deliveredCount = validDeliveries.filter((d) => d.status === 'delivered').length;
  const pendingCount = validDeliveries.filter((d) => d.status === 'pending').length;

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return 'Scheduled Drop';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#f8faf9',
        zIndex: 10050,
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'none',
          overflow: 'visible',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Doorstep Deliveries</h2>
              <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.9 }}>
                Real-time tracking, morning drops & verified proof photos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              transition: 'background 0.2s',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Row */}
        <div
          style={{
            padding: '14px 24px',
            background: '#f8faf9',
            borderBottom: '1px solid #e2ebe5',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              padding: '6px 14px',
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#334155',
            }}
          >
            Total Drops: <strong style={{ color: '#0d5c3a' }}>{validDeliveries.length}</strong>
          </div>
          <div
            style={{
              padding: '6px 14px',
              background: '#ecfdf5',
              borderRadius: '10px',
              border: '1px solid #a7f3d0',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#065f46',
            }}
          >
            Delivered: <strong>{deliveredCount}</strong>
          </div>
          <div
            style={{
              padding: '6px 14px',
              background: '#fffbeb',
              borderRadius: '10px',
              border: '1px solid #fde68a',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#92400e',
            }}
          >
            Pending: <strong>{pendingCount}</strong>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#64748b' }}>
            Daily Morning Drop: <strong>5:30 AM – 7:30 AM</strong>
          </div>
        </div>

        {/* Deliveries List */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {validDeliveries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Truck size={42} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '1rem', fontWeight: 700 }}>
                No delivery records found yet
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem' }}>
                Deliveries are scheduled daily at 5:30 AM based on your active milk subscription.
              </p>
            </div>
          ) : (
            validDeliveries.map((del, idx) => {
              const isDelivered = del.status === 'delivered';
              const isPending = del.status === 'pending';
              const proofUrl = del.proofImage || del.rawItem?.proofImage || '';

              return (
                <div
                  key={del.id || del._id || idx}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    border: isDelivered ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                    background: isDelivered ? '#fcfefc' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: isDelivered ? '#dcfce7' : '#fef3c7',
                          color: isDelivered ? '#15803d' : '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isDelivered ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block' }}>
                          {formatDateLabel(del.date || del.deliveryDate)}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {del.deliveryBoyName ? `Delivered by: ${del.deliveryBoyName}` : 'Partner: Morning Milk Route'}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: isDelivered ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2',
                        color: isDelivered ? '#15803d' : isPending ? '#b45309' : '#b91c1c',
                      }}
                    >
                      {del.status || 'Scheduled'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid #f1f5f9',
                      fontSize: '0.84rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#334155' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        <Milk size={15} color="#0d5c3a" />
                        {del.milk || `${del.actualMilk || del.plannedMilk || 1} L Pure Milk`}
                      </span>
                      {(del.curd && del.curd !== '0') || del.actualCurd > 0 ? (
                        <span style={{ fontWeight: 600, color: '#0d5c3a' }}>
                          Curd: {del.curd || `${del.actualCurd || del.plannedCurd}g`}
                        </span>
                      ) : null}
                    </div>

                    {proofUrl ? (
                      <button
                        type="button"
                        onClick={() => setSelectedProof(proofUrl)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: '8px',
                          color: '#065f46',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Camera size={14} />
                        <span>View Proof Photo</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {isDelivered ? 'Doorstep Handover' : 'Awaiting Drop'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            background: '#ffffff',
            borderTop: '1px solid #e2ebe5',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 24px',
              borderRadius: '10px',
              background: '#0d5c3a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Lightbox for proof photo */}
      {selectedProof && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 10100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedProof(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '540px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '12px 18px',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 700 }}>
                <ShieldCheck size={18} color="#4ade80" />
                <span>Verified Doorstep Delivery Photo</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', textAlign: 'center' }}>
              <img
                src={resolveProofUrl(selectedProof)}
                alt="Delivery Proof"
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  borderRadius: '10px',
                  objectFit: 'contain',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 2. PUBLIC MODAL: ACTIVE SUBSCRIPTION DETAILS
// ══════════════════════════════════════════════════════════════════
export function CustomerSubscriptionPublicModal({ isOpen, onClose, customer, onNavigatePublic }) {
  if (!isOpen) return null;

  const plan = customer?.subscription || {};
  const deliveryPlan = customer?.deliveryPlan || {};
  const isPaused = customer?.status === 'paused';

  const planName = plan.planName || deliveryPlan.milkType || 'Daily Farm Pure Cow Milk Plan';
  const milkQty = deliveryPlan.milkQty ?? (plan.milkQty || 1);
  const curdQty = deliveryPlan.curdQty ?? (plan.curdQty || 0);
  const pricePerDay = (milkQty * 60) + ((curdQty / 500) * 30);

  const formatDate = (val) => {
    if (!val) return 'Active Daily Subscription';
    try {
      return new Date(val).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(val);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#f8faf9',
        zIndex: 10050,
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'none',
          overflow: 'visible',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarDays size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>My Active Subscription</h2>
              <p style={{ margin: 0, fontSize: '0.80rem', opacity: 0.9 }}>
                Daily farm-fresh milk plan and scheduled quantities
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Main Card */}
          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: isPaused ? '#fef3c7' : '#0d5c3a',
                    color: isPaused ? '#92400e' : '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  {isPaused ? 'Currently Paused' : 'Active Plan'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                  {planName}
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0d5c3a' }}>
                  ₹{pricePerDay}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>per day</span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #bbf7d0',
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                  Daily Volume
                </span>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                  {milkQty} Litre Milk {curdQty > 0 ? `+ ${curdQty}g Curd` : ''}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                  Delivery Window
                </span>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                  Morning 5:30 – 7:30 AM
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                  Frequency
                </span>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a', textTransform: 'capitalize' }}>
                  {deliveryPlan.frequency || 'Daily Every Morning'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                  Valid Through
                </span>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                  {plan.endDate ? formatDate(plan.endDate) : 'Continuous Active Plan'}
                </strong>
              </div>
            </div>
          </div>

          {/* Details list */}
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.86rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Customer ID:</span>
              <strong style={{ color: '#0f172a' }}>{customer?.customerId || 'CUST-101'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Delivery Territory:</span>
              <strong style={{ color: '#0f172a' }}>{customer?.area || 'Madhapur, Hyderabad'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Payment Mode:</span>
              <strong style={{ color: '#0d5c3a' }}>Prepaid / Monthly Advance</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Account Ledger Balance:</span>
              <strong style={{ color: '#0d5c3a' }}>₹{customer?.currentBalance || 0} (Settled)</strong>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 14px',
              background: '#f0fdf4',
              borderRadius: '12px',
              border: '1px solid #bbf7d0',
              fontSize: '0.80rem',
              color: '#166534',
            }}
          >
            <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>
              100% Unadulterated Pure Farm Cow Milk chilled at 4°C and delivered before 7:30 AM every morning.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: '#ffffff',
            borderTop: '1px solid #e2ebe5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              if (typeof onNavigatePublic === 'function') onNavigatePublic('subscription');
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: '#f0fdf4',
              color: '#0d5c3a',
              fontWeight: 700,
              fontSize: '0.86rem',
              border: '1.5px solid #86efac',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Explore All Plans</span>
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              background: '#0d5c3a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 3. PUBLIC MODAL: DOORSTEP DELIVERY ADDRESS
// ══════════════════════════════════════════════════════════════════
export function CustomerAddressPublicModal({ isOpen, onClose, customer, onSaved }) {
  const { authFetch } = useAuth();
  const [address, setAddress] = useState(customer?.address || '');
  const [area, setArea] = useState(customer?.area || 'Madhapur');
  const [landmark, setLandmark] = useState(customer?.landmark || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (customer) {
      setAddress(customer.address || '');
      setArea(customer.area || 'Madhapur');
      setLandmark(customer.landmark || '');
    }
  }, [customer]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setErrorMsg('Please enter your full delivery address.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await authFetch('/api/customers/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customer.name,
          mobile: customer.mobile,
          address: address.trim(),
          area: area.trim(),
          landmark: landmark.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        if (typeof onSaved === 'function') {
          onSaved({ ...customer, address: address.trim(), area: area.trim(), landmark: landmark.trim() });
        }
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(data.message || 'Failed to update address. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Network error while updating address.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#f8faf9',
        zIndex: 10050,
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'none',
          overflow: 'visible',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Delivery Address</h2>
              <p style={{ margin: 0, fontSize: '0.80rem', opacity: 0.9 }}>
                Doorstep morning milk delivery location & landmark
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Delivery address updated successfully!</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Doorstep Address (Flat, Floor, Building) *
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="e.g. Flat 302, Green Valley Apartments, Road No. 12"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.88rem',
                color: '#0f172a',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Delivery Area *
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Madhapur"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Landmark / Gate Instructions
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Metro Station / Ring Bell"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.78rem',
              color: '#64748b',
              lineHeight: 1.4,
            }}
          >
            ℹ️ Changes to delivery address update your morning driver's delivery manifest automatically.
          </div>

          {/* Footer Buttons */}
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#0d5c3a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: isSaving ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Update Address'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 4. PUBLIC MODAL: PAUSE / RESUME DELIVERIES
// ══════════════════════════════════════════════════════════════════
export function CustomerPausePublicModal({ isOpen, onClose, customer, onUpdated }) {
  const { pauseDelivery, resumeDelivery } = useDairy();
  const isPaused = customer?.status === 'paused';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [pauseFrom, setPauseFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [pauseUntil, setPauseUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [reason, setReason] = useState('Out of Town / Vacation');

  if (!isOpen) return null;

  const targetId = customer?.id || customer?._id || customer?.customerId;

  const handleResume = async () => {
    setIsSubmitting(true);
    try {
      await resumeDelivery(targetId, { actor: customer?.name || 'Customer' });
      setSuccessMsg('Deliveries resumed successfully! Your morning drops will continue as scheduled.');
      if (typeof onUpdated === 'function') {
        onUpdated({ ...customer, status: 'active' });
      }
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1400);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await pauseDelivery(targetId, {
        pauseFrom,
        pauseUntil,
        reason,
        actor: customer?.name || 'Customer',
      });
      setSuccessMsg(`Deliveries paused from ${pauseFrom} to ${pauseUntil}.`);
      if (typeof onUpdated === 'function') {
        onUpdated({ ...customer, status: 'paused' });
      }
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1400);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#f8faf9',
        zIndex: 10050,
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'none',
          overflow: 'visible',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: isPaused
              ? 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)'
              : 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPaused ? <PlayCircle size={22} color="#ffffff" /> : <PauseCircle size={22} color="#ffffff" />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                {isPaused ? 'Resume Milk Deliveries' : 'Pause Deliveries'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.80rem', opacity: 0.9 }}>
                {isPaused ? 'Restart your daily doorstep drops' : 'Going on vacation? Temporarily hold drops'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {successMsg ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.90rem',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={28} color="#059669" style={{ margin: '0 auto 8px' }} />
              <div>{successMsg}</div>
            </div>
          ) : isPaused ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.88rem',
                }}
              >
                Your daily milk deliveries are currently <strong>PAUSED</strong>. Click the button below to resume your morning drops immediately.
              </div>

              <button
                type="button"
                onClick={handleResume}
                disabled={isSubmitting}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.94rem',
                  border: 'none',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <PlayCircle size={18} />
                <span>{isSubmitting ? 'Resuming...' : 'Resume Deliveries Now'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePause} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Pause From
                  </label>
                  <input
                    type="date"
                    value={pauseFrom}
                    onChange={(e) => setPauseFrom(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Resume Date
                  </label>
                  <input
                    type="date"
                    value={pauseUntil}
                    onChange={(e) => setPauseUntil(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Reason (Optional)
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    background: '#ffffff',
                  }}
                >
                  <option value="Out of Town / Vacation">Out of Town / Vacation</option>
                  <option value="Excess Milk at Home">Excess Milk at Home</option>
                  <option value="Festival / Fasting">Festival / Fasting</option>
                  <option value="Other">Other Personal Reason</option>
                </select>
              </div>

              <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                💡 You can un-pause and resume deliveries at any time before 9:00 PM for the next morning.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#b45309',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: isSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Pausing...' : 'Confirm Pause'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 5. PUBLIC MODAL: CUSTOMER CARE & HELPLINE
// ══════════════════════════════════════════════════════════════════
export function CustomerSupportPublicModal({ isOpen, onClose, customer }) {
  if (!isOpen) return null;

  const phone = '+91 98765 43210';
  const cleanPhone = '919876543210';
  const whatsappMsg = encodeURIComponent(
    `Hello Natural Milk Dairy Support,\nMy name is ${customer?.name || 'Customer'} (ID: ${customer?.customerId || 'CUST-101'}). I need assistance regarding my milk delivery.`
  );
  const waUrl = `https://wa.me/${cleanPhone}?text=${whatsappMsg}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#f8faf9',
        zIndex: 10050,
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'none',
          overflow: 'visible',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PhoneCall size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Customer Care</h2>
              <p style={{ margin: 0, fontSize: '0.80rem', opacity: 0.9 }}>
                Direct dairy helpline & 24/7 WhatsApp support
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: '0.94rem', color: '#0f172a' }}>
                WhatsApp Dairy Help
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Instant replies for delivery & billing
              </span>
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#25d366',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.84rem',
                textDecoration: 'none',
              }}
            >
              <MessageSquare size={16} />
              <span>Chat Now</span>
            </a>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: '0.94rem', color: '#0f172a' }}>
                Dairy Owner Helpline
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                5:00 AM – 9:00 PM Daily
              </span>
            </div>
            <a
              href={`tel:${phone}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#0d5c3a',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.84rem',
                textDecoration: 'none',
              }}
            >
              <PhoneCall size={16} />
              <span>Call Us</span>
            </a>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: '#f8fafc',
              fontSize: '0.78rem',
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            ⏰ <strong>Delivery Support Hours:</strong> Morning delivery queries handled from 5:30 AM to 9:00 AM. Route managers and dispatch teams are active.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            background: '#ffffff',
            borderTop: '1px solid #e2ebe5',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: '#0d5c3a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
