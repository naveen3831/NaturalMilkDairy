import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { User, Phone, MapPin, Calendar, CreditCard, Milk } from 'lucide-react';

export default function CustomerModal({ isOpen, onClose }) {
  const { addCustomer, deliveryBoys } = useDairy();

  const [name, setName] = useState('');
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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobile || !address) return;

    await addCustomer({
      name,
      mobile,
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

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', color: '#0c2340' }}>Add New Customer</h3>
            <p style={{ fontSize: '0.85rem', color: '#597361' }}>PRD Section 4: Customer & Delivery Plan Setup</p>
          </div>
          <button onClick={onClose} style={{ fontSize: '1.3rem', color: '#899e90' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Customer Personal Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Customer Name *
              </label>
              <input type="text" placeholder="e.g. Ramesh Kulkarni" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Mobile Number *
              </label>
              <input type="tel" placeholder="10-digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                WhatsApp Number
              </label>
              <input type="tel" placeholder="Defaults to mobile" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Area
              </label>
              <input type="text" placeholder="e.g. Andheri West" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Delivery Address *
              </label>
              <input type="text" placeholder="Flat / Wing, Society Name, Street" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Landmark
              </label>
              <input type="text" placeholder="e.g. Near Metro Station / Opp. Bank" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </div>
          </div>

          <div style={{ height: '1px', background: '#e2ece3' }} />

          {/* Delivery Plan (PRD Section 3 & 5) */}
          <div>
            <h4 style={{ fontSize: '1rem', color: '#0d5c3a', marginBottom: '10px' }}>Delivery Schedule Plan</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Daily Milk Quantity (L)
                </label>
                <input type="number" step="0.5" value={milkQty} onChange={(e) => setMilkQty(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Daily Curd Quantity (g)
                </label>
                <input type="number" step="250" value={curdQty} onChange={(e) => setCurdQty(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Delivery Frequency (PRD 5)
                </label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  <option value="daily">Daily (Every Day)</option>
                  <option value="alternate">Alternate Days</option>
                  <option value="selected">Selected Days (Mon/Wed/Fri)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Assigned Delivery Partner
                </label>
                <select value={deliveryBoyId} onChange={(e) => setDeliveryBoyId(e.target.value)}>
                  {deliveryBoys.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.assignedArea})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: '#e2ece3' }} />

          {/* Payment Settings */}
          <div>
            <h4 style={{ fontSize: '1rem', color: '#0d5c3a', marginBottom: '10px' }}>Payment & Billing Setup</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Payment Type
                </label>
                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                  <option value="credit">Credit Account (Add to Ledger)</option>
                  <option value="prepaid">Prepaid / Advance Balance</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Billing Cycle
                </label>
                <select value={paymentCycle} onChange={(e) => setPaymentCycle(e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Special Delivery Instructions / Notes
                </label>
                <input type="text" placeholder="e.g. Leave on milk bag hook, ring bell once" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '14px', fontSize: '1rem', marginTop: '10px' }}>
            ✓ Register Customer & Activate Schedule
          </button>
        </form>
      </div>
    </div>
  );
}
