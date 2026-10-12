import React, { useState, useEffect } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Wallet, CreditCard, ArrowLeft, X, Check } from 'lucide-react';

export default function PaymentModal({ isOpen, onClose, selectedCustomer }) {
  const { customers, recordPayment } = useDairy();
  const { user } = useAuth();

  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerId(selectedCustomer.id);
      if (selectedCustomer.currentBalance > 0) {
        setAmount(selectedCustomer.currentBalance);
      }
    } else if (customers.length > 0) {
      setCustomerId(customers[0].id);
    }
  }, [selectedCustomer, customers]);

  if (!isOpen) return null;

  const currentCustomer = customers.find((c) => c.id === customerId);
  const currentBalance = currentCustomer ? currentCustomer.currentBalance : 0;
  const payAmt = Number(amount) || 0;
  const newBalance = currentBalance - payAmt;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId || payAmt <= 0) return;

    await recordPayment({
      customerId,
      amount: payAmt,
      paymentMethod,
      referenceNumber,
      notes,
      collectedBy: user?.name || 'Admin',
      deliveryBoyId: user?.role === 'delivery_boy' ? user.id : '',
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
            <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>Record Payment</h3>
            <p style={{ fontSize: '0.80rem', color: '#64748b', margin: '2px 0 0' }}>Instant Ledger Settlement</p>
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
          {/* Select Customer */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Select Customer:
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const c = customers.find((cust) => cust.id === e.target.value);
                if (c && c.currentBalance > 0) setAmount(c.currentBalance);
              }}
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
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customerId}) — Balance: ₹{c.currentBalance}
                </option>
              ))}
            </select>
          </div>

          {/* Current Outstanding Box */}
          <div style={{
            background: currentBalance > 0 ? '#fef2f2' : currentBalance < 0 ? '#eff6ff' : '#f0fdf4',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: `1.5px solid ${currentBalance > 0 ? '#fecaca' : currentBalance < 0 ? '#bfdbfe' : '#bbf7d0'}`,
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentBalance > 0 ? '#991b1b' : currentBalance < 0 ? '#1e40af' : '#166534' }}>
              Current Outstanding Balance:
            </span>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: currentBalance > 0 ? '#991b1b' : currentBalance < 0 ? '#1e40af' : '#166534' }}>
              {currentBalance > 0 ? `₹${currentBalance}` : currentBalance < 0 ? `₹${Math.abs(currentBalance)} (Advance)` : `₹0`}
            </span>
          </div>

          {/* Payment Amount */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Amount Paid (₹) *
            </label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
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

          {/* Payment Method */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Payment Method:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'cash', label: '💵 Cash' },
                { id: 'upi', label: '📱 UPI' },
                { id: 'bank_transfer', label: '🏦 Bank' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: paymentMethod === m.id ? '2px solid #0d5c3a' : '1.5px solid #e2e8f0',
                    background: paymentMethod === m.id ? '#e8f5e9' : '#f8fafc',
                    color: paymentMethod === m.id ? '#0d5c3a' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod !== 'cash' && (
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Reference / Transaction ID
              </label>
              <input
                type="text"
                placeholder="e.g. UPI/293847561/GPAY"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
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
          )}

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Notes
            </label>
            <input
              type="text"
              placeholder="Optional payment notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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

          {/* Calculated New Balance Preview */}
          <div style={{
            background: '#f8fafc',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1.5px solid #e2e8f0',
          }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>New Balance After Payment:</span>
            <span style={{
              fontSize: '1.15rem',
              fontWeight: 900,
              color: newBalance > 0 ? '#dc2626' : newBalance < 0 ? '#2563eb' : '#16a34a',
            }}>
              {newBalance > 0 ? `₹${newBalance} Pending` : newBalance < 0 ? `₹${Math.abs(newBalance)} Advance` : `₹0 Clear`}
            </span>
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
            Confirm & Record Payment
          </button>
        </form>
      </div>
    </div>
  );
}
