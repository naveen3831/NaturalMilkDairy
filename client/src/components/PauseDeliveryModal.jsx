import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { PauseCircle, Calendar } from 'lucide-react';

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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: '#0c2340' }}>Pause Delivery Plan</h3>
            <p style={{ fontSize: '0.85rem', color: '#597361' }}>Customer: <strong>{customer.name}</strong></p>
          </div>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: '#899e90' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Pause From (Start Date):
            </label>
            <input
              type="date"
              value={pauseFrom}
              onChange={(e) => setPauseFrom(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Pause Until (End Date):
            </label>
            <input
              type="date"
              value={pauseUntil}
              onChange={(e) => setPauseUntil(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Reason:
            </label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="Vacation / Out of Town">Vacation / Out of Town</option>
              <option value="Excess Milk at Home">Excess Milk at Home</option>
              <option value="Fasting / Vrat">Fasting / Vrat</option>
              <option value="Temporary Pause">Temporary Pause</option>
            </select>
          </div>

          <div style={{
            background: '#fef8eb',
            border: '1px solid #fde68a',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '0.82rem',
            color: '#92400e',
          }}>
            Rule 5: Customer will not appear on delivery boy's morning list during this period. Delivery resumes automatically after {pauseUntil}.
          </div>

          <button
            type="submit"
            className="btn-gold"
            style={{ padding: '13px', fontSize: '0.95rem', marginTop: '6px', justifyContent: 'center' }}
          >
            [PAUSE DELIVERY]
          </button>
        </form>
      </div>
    </div>
  );
}
