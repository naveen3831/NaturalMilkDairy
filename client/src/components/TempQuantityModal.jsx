import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { Clock, Milk } from 'lucide-react';

export default function TempQuantityModal({ isOpen, onClose, customer }) {
  const { setTemporaryQty } = useDairy();

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // tomorrow
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [milkQty, setMilkQty] = useState(2);
  const [curdQty, setCurdQty] = useState(0);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await setTemporaryQty(customer.id, {
      date,
      milkQty: Number(milkQty),
      curdQty: Number(curdQty),
      actor: 'Admin',
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: '#0c2340' }}>Temporary Quantity Change</h3>
            <p style={{ fontSize: '0.85rem', color: '#597361' }}>Customer: <strong>{customer.name}</strong></p>
          </div>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: '#899e90' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            background: '#eaf5ee',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            color: '#0d5c3a',
          }}>
            Normal Schedule: <strong>{customer.deliveryPlan?.milkQty}L Milk / day</strong>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Target Date for Extra/Less Milk:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Temporary Milk Quantity (Litres):
            </label>
            <input
              type="number"
              step="0.5"
              value={milkQty}
              onChange={(e) => setMilkQty(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Temporary Curd Quantity (Grams):
            </label>
            <input
              type="number"
              step="250"
              value={curdQty}
              onChange={(e) => setCurdQty(e.target.value)}
            />
          </div>

          <div style={{
            background: '#edf4fc',
            border: '1px solid #bae6fd',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '0.82rem',
            color: '#0369a1',
          }}>
            Rule 18: On {date}, the delivery boy will see {milkQty}L. After that date, normal {customer.deliveryPlan?.milkQty}L quantity automatically resumes.
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '13px', fontSize: '0.95rem', marginTop: '6px' }}
          >
            ✓ Save Temporary Quantity
          </button>
        </form>
      </div>
    </div>
  );
}
