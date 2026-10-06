import React, { useState, useEffect } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Wallet, CreditCard, ArrowRight, Check } from 'lucide-react';

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', color: '#0c2340' }}>Record Customer Payment</h3>
            <p style={{ fontSize: '0.82rem', color: '#597361' }}>PRD Section 11 & 12: Partial & Advance Supported</p>
          </div>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: '#899e90' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Select Customer */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
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
            background: currentBalance > 0 ? '#fee2e2' : currentBalance < 0 ? '#e0f2fe' : '#dcfce7',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: `1.5px solid ${currentBalance > 0 ? '#fca5a5' : currentBalance < 0 ? '#bae6fd' : '#bbf7d0'}`,
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentBalance > 0 ? '#991b1b' : '#075985' }}>
              Current Outstanding Balance:
            </span>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: currentBalance > 0 ? '#991b1b' : '#075985' }}>
              {currentBalance > 0 ? `₹${currentBalance}` : currentBalance < 0 ? `₹${Math.abs(currentBalance)} (Advance)` : `₹0`}
            </span>
          </div>

          {/* Payment Amount */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Amount Paid (₹) *
            </label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
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
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: paymentMethod === m.id ? '2px solid #0d5c3a' : '1.5px solid #e2ece3',
                    background: paymentMethod === m.id ? '#eaf5ee' : '#ffffff',
                    color: paymentMethod === m.id ? '#0d5c3a' : '#597361',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod !== 'cash' && (
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Reference / Transaction ID
              </label>
              <input
                type="text"
                placeholder="e.g. UPI/293847561/GPAY"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Notes
            </label>
            <input
              type="text"
              placeholder="Optional payment notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Calculated New Balance Preview (PRD Section 11 & 12 & 13) */}
          <div style={{
            background: '#f8faf8',
            padding: '12px 16px',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid #e2ece3',
          }}>
            <span style={{ fontSize: '0.85rem', color: '#597361', fontWeight: 600 }}>New Balance After Payment:</span>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: newBalance > 0 ? '#dc2626' : newBalance < 0 ? '#2563eb' : '#16a34a',
            }}>
              {newBalance > 0 ? `₹${newBalance} Pending` : newBalance < 0 ? `₹${Math.abs(newBalance)} Advance` : `₹0 Clear`}
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '14px', fontSize: '1rem', marginTop: '6px' }}
          >
            ✓ [RECORD PAYMENT]
          </button>
        </form>
      </div>
    </div>
  );
}
