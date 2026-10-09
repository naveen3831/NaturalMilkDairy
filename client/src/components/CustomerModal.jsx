import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { User, Phone, MapPin, Calendar, CreditCard, Milk, Mail, Lock, Sparkles } from 'lucide-react';

export default function CustomerModal({ isOpen, onClose }) {
  const { addCustomer, deliveryBoys } = useDairy();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Andheri West');
  const [landmark, setLandmark] = useState('');
  const [milkQty, setMilkQty] = useState(1);
  const [milkUnit, setMilkUnit] = useState('L');
  const [curdQty, setCurdQty] = useState(500);
  const [curdUnit, setCurdUnit] = useState('g');
  const [frequency, setFrequency] = useState('daily');
  const [deliveryBoyId, setDeliveryBoyId] = useState(deliveryBoys[0]?.id || '');
  const [paymentType, setPaymentType] = useState('credit');
  const [paymentCycle, setPaymentCycle] = useState('monthly');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!name || !mobile || !address) return;

    setIsSubmitting(true);
    const res = await addCustomer({
      name,
      email: email.trim(),
      password: password.trim(),
      mobile: mobile.trim(),
      whatsapp: whatsapp || mobile,
      address,
      area,
      landmark,
      milkQty: Number(milkQty),
      milkUnit,
      curdQty: Number(curdQty),
      curdUnit,
      frequency,
      deliveryBoyId,
      paymentType,
      paymentCycle,
      notes,
      actor: 'Admin',
    });
    setIsSubmitting(false);

    if (!res || !res.success) {
      setErrorMessage(res?.message || 'Failed to add customer. Please check phone number and email.');
      return;
    }

    setName('');
    setEmail('');
    setPassword('');
    setMobile('');
    setWhatsapp('');
    setAddress('');
    onClose();
  };

  return (
    <div className="modal-overlay customer-modal-overlay" onClick={onClose}>
      <div className="modal-content customer-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Add New Customer</h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Create customer profile and automatically send login credentials via email
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
        </div>

        {errorMessage && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '14px',
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Customer Personal Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Customer Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kulkarni"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Mobile Number *
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                <Mail size={13} />
                <span>Customer Email (For Credentials)</span>
              </label>
              <input
                type="email"
                placeholder="e.g. customer@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #bbf7d0', background: '#f0fdf4', padding: '8px 12px', fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                <Lock size={13} />
                <span>Portal Password (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Leave blank for auto-generated"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="Defaults to mobile"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Area / Locality
              </label>
              <input
                type="text"
                placeholder="e.g. Andheri West"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Delivery Address *
              </label>
              <input
                type="text"
                placeholder="Flat / Wing, Society Name, Street"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                required
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Landmark
              </label>
              <input
                type="text"
                placeholder="e.g. Near Metro Station / Opp. Bank"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: '#f1f5f9' }} />

          {/* Delivery Plan */}
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#059669', margin: '0 0 8px 0' }}>Morning Subscription Plan</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Daily Milk Quantity (L)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={milkQty}
                  onChange={(e) => setMilkQty(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Daily Curd Quantity (g)
                </label>
                <input
                  type="number"
                  step="250"
                  value={curdQty}
                  onChange={(e) => setCurdQty(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Delivery Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                >
                  <option value="daily">Daily (Every Day)</option>
                  <option value="alternate">Alternate Days</option>
                  <option value="selected">Selected Days (Mon/Wed/Fri)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Assigned Delivery Partner
                </label>
                <select
                  value={deliveryBoyId}
                  onChange={(e) => setDeliveryBoyId(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                >
                  <option value="">Select Delivery Partner</option>
                  {deliveryBoys.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.assignedArea})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: '#f1f5f9' }} />

          {/* Payment Terms */}
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>Billing & Ledger Settings</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Billing Type
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                >
                  <option value="credit">Monthly Credit Account</option>
                  <option value="prepaid">Prepaid Advance</option>
                  <option value="cod">Daily Cash on Delivery</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Settlement Cycle
                </label>
                <select
                  value={paymentCycle}
                  onChange={(e) => setPaymentCycle(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Delivery Instructions / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ring bell once / leave on shelf"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
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
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#059669',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isSubmitting ? 'Saving & Sending Email...' : 'Save & Send Credentials Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
