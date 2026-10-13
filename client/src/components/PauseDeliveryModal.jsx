import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { PauseCircle, Calendar, ArrowLeft, X, Check, PlayCircle } from 'lucide-react';

export default function PauseDeliveryModal({ isOpen, onClose, customer }) {
  const { pauseDelivery, resumeDelivery } = useDairy();
  const [isResuming, setIsResuming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pauseFrom, setPauseFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [pauseUntil, setPauseUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [reason, setReason] = useState('Vacation / Out of Town');

  if (!isOpen || !customer) return null;

  const isPaused = customer.status === 'paused';

  const handleResume = async () => {
    setIsResuming(true);
    try {
      const targetId = customer.id || customer._id || customer.customerId;
      await resumeDelivery(targetId, { actor: customer.name || 'Customer' });
      onClose();
    } catch (e) {
      console.error('Error resuming delivery:', e);
    } finally {
      setIsResuming(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const targetId = customer.id || customer._id || customer.customerId;
      await pauseDelivery(targetId, {
        pauseFrom,
        pauseUntil,
        reason,
        actor: customer.name || 'Customer',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '490px', padding: '24px' }}>
        {/* Light Header with Back and Close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} /> <span>Back</span>
          </button>

          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>
              {isPaused ? 'Manage Paused Schedule' : 'Pause Delivery Schedule'}
            </h3>
            <p style={{ fontSize: '0.80rem', color: '#64748b', margin: '2px 0 0' }}>Customer: <strong>{customer.name}</strong></p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Prominent Restart Delivery Banner when paused */}
        {isPaused && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            border: '2px solid #86efac',
            borderRadius: '16px',
            padding: '16px 18px',
            marginBottom: '18px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <PlayCircle size={22} />
              </div>
              <div>
                <strong style={{ fontSize: '0.98rem', color: '#14532d', display: 'block' }}>
                  Delivery Is Currently Paused
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#166534' }}>
                  {customer.pauseUntil ? `Scheduled return: ${new Date(customer.pauseUntil).toLocaleDateString()}` : 'Pause active'}
                </span>
              </div>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: '#166534', lineHeight: 1.45 }}>
              Ready to receive fresh milk again? Restart deliveries with 1 click:
            </p>
            <button
              type="button"
              disabled={isResuming}
              onClick={handleResume}
              style={{
                width: '100%',
                padding: '13px 18px',
                borderRadius: '12px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.94rem',
                cursor: isResuming ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                transition: 'background 0.15s ease',
              }}
            >
              <PlayCircle size={18} />
              <span>{isResuming ? 'Restarting Delivery...' : 'Restart / Resume Delivery Now'}</span>
            </button>
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.75rem', color: '#64748b' }}>
              — or adjust your vacation return dates below —
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Pause From (Start Date):
            </label>
            <input
              type="date"
              value={pauseFrom}
              onChange={(e) => setPauseFrom(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '0.90rem',
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Pause Until (Return Date):
            </label>
            <input
              type="date"
              value={pauseUntil}
              onChange={(e) => setPauseUntil(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '0.90rem',
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Reason for Pause:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '0.90rem',
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            >
              <option value="Vacation / Out of Town">Vacation / Out of Town</option>
              <option value="Excess Milk at Home">Excess Milk at Home</option>
              <option value="Fasting / Vrat">Fasting / Vrat</option>
              <option value="Temporary Pause">Temporary Pause</option>
            </select>
          </div>

          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            padding: '12px 14px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            color: '#166534',
            lineHeight: 1.45,
          }}>
            🌿 <strong>Zero Cancellation Charges:</strong> You are not billed during this paused interval. Doorstep delivery will automatically resume on <strong>{pauseUntil}</strong>.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '14px 20px',
              fontSize: '0.95rem',
              fontWeight: 800,
              marginTop: '6px',
              borderRadius: '14px',
              background: '#0d5c3a',
              color: '#ffffff',
              border: 0,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(13, 92, 58, 0.2)',
            }}
          >
            {isSubmitting
              ? 'Saving Schedule...'
              : isPaused
              ? 'Update Paused Dates'
              : 'Confirm Delivery Pause'}
          </button>
        </form>
      </div>
    </div>
  );
}
