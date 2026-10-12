import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { Clock, Milk, ArrowLeft, X, PlusCircle } from 'lucide-react';

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
            <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>Adjust Delivery Quantity</h3>
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
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            padding: '12px 14px',
            borderRadius: '12px',
            fontSize: '0.84rem',
            color: '#166534',
            fontWeight: 600,
          }}>
            🌿 Current Plan: <strong>{customer.deliveryPlan?.milkQty}L Milk / day</strong>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Target Date for Extra/Less Milk:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
              Temporary Milk Quantity (Litres):
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={milkQty}
              onChange={(e) => setMilkQty(e.target.value)}
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
              Temporary Curd Quantity (Grams):
            </label>
            <input
              type="number"
              step="250"
              min="0"
              value={curdQty}
              onChange={(e) => setCurdQty(e.target.value)}
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

          <div style={{
            background: '#f0f9ff',
            border: '1.5px solid #bae6fd',
            padding: '12px 14px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            color: '#0369a1',
            lineHeight: 1.45,
          }}>
            ℹ️ <strong>Temporary Schedule:</strong> On <strong>{date}</strong>, the delivery boy will drop <strong>{milkQty}L</strong>. After that date, your normal <strong>{customer.deliveryPlan?.milkQty}L</strong> quantity automatically resumes.
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
            Confirm Quantity Change
          </button>
        </form>
      </div>
    </div>
  );
}
