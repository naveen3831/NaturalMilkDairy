import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { PauseCircle, Calendar, ArrowLeft, X, Check } from 'lucide-react';

export default function PauseDeliveryModal({ isOpen, onClose, customer }) {
  const { pauseDelivery } = useDairy();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    await pauseDelivery(customer.id, {
      pauseFrom,
      pauseUntil,
      reason,
      actor: 'Admin',
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
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
            <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>Pause Delivery Schedule</h3>
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
            style={{
              padding: '14px 20px',
              fontSize: '0.95rem',
              fontWeight: 800,
              marginTop: '6px',
              borderRadius: '14px',
              background: '#0d5c3a',
              color: '#ffffff',
              border: 0,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(13, 92, 58, 0.2)',
            }}
          >
            Confirm Delivery Pause
          </button>
        </form>
      </div>
    </div>
  );
}
