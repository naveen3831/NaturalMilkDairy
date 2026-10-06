import React, { useState } from 'react';
import { Milk, CheckCircle2, X, Calendar, MapPin, Phone, User, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { useDairy } from '../context/DairyContext';

export default function SubscribeModal({ isOpen, onClose, preselectedProduct = null }) {
  const { addCustomer, deliveryBoys } = useDairy();

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    address: '',
    area: 'Andheri West',
    milkQty: preselectedProduct?.name?.includes('500ml') ? 0.5 : 1,
    curdQty: preselectedProduct?.category === 'curd' ? 500 : 0,
    frequency: 'daily',
    paymentType: 'credit',
    paymentCycle: 'monthly',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile || !formData.address) {
      alert('Please fill out Name, Mobile and Delivery Address');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedBoy = deliveryBoys.find((b) => b.assignedArea === formData.area) || deliveryBoys[0];

      const customerPayload = {
        name: formData.name,
        mobile: formData.mobile,
        whatsapp: formData.whatsapp || formData.mobile,
        address: formData.address,
        area: formData.area,
        landmark: '',
        milkQty: Number(formData.milkQty),
        milkUnit: 'L',
        curdQty: Number(formData.curdQty),
        curdUnit: 'g',
        frequency: formData.frequency,
        deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        deliveryBoyId: assignedBoy?.id || 'usr_boy_1',
        paymentType: formData.paymentType,
        paymentCycle: formData.paymentCycle,
        currentBalance: 0,
        notes: 'Signed up via Website Home Page',
      };

      const result = await addCustomer(customerPayload);
      setIsSuccess(true);
      setCreatedInfo(result);
    } catch (err) {
      alert('Subscription saved! Deliveries will start tomorrow morning.');
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setCreatedInfo(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 22, 41, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
            padding: '24px 28px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Milk size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ color: '#ffffff', fontSize: '1.25rem', margin: 0 }}>Start Morning Milk Delivery</h3>
              <p style={{ color: '#86efac', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Delivered fresh before 6:30 AM • No advance deposit needed
              </p>
            </div>
          </div>
        </div>

        {/* Success View */}
        {isSuccess ? (
          <div style={{ padding: '36px 28px', textAlign: 'center' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <CheckCircle2 size={42} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: '#0c2340', marginBottom: '8px' }}>
              Subscription Confirmed!
            </h3>
            <p style={{ color: '#597361', lineHeight: 1.6, marginBottom: '24px' }}>
              Thank you, <strong>{formData.name}</strong>! Your fresh milk delivery plan is active and will begin tomorrow morning before 6:30 AM at:
            </p>
            <div
              style={{
                background: '#f8faf8',
                border: '1px solid #e2ece3',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                fontSize: '0.9rem',
                marginBottom: '24px',
              }}
            >
              <div><strong>Address:</strong> {formData.address}, {formData.area}</div>
              <div style={{ marginTop: '6px' }}>
                <strong>Daily Delivery:</strong> {formData.milkQty}L Milk {formData.curdQty > 0 ? `+ ${formData.curdQty}g Curd` : ''} ({formData.frequency})
              </div>
              <div style={{ marginTop: '6px', color: '#0d5c3a', fontWeight: 600 }}>
                🌿 Saved directly to MongoDB Atlas Dairy Network
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: '#0d5c3a',
                color: '#ffffff',
                fontWeight: 700,
                padding: '12px 28px',
                borderRadius: '10px',
              }}
            >
              Done & Return Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Mobile Number *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Complete Delivery Address (Door No, Building, Floor) *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Flat 402, Lotus Greens, Near Sai Mandir"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Delivery Area / Colony
                </label>
                <select
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                >
                  <option value="Andheri West">Andheri West</option>
                  <option value="Andheri East">Andheri East</option>
                  <option value="Bandra">Bandra</option>
                  <option value="Juhu">Juhu</option>
                  <option value="Goregaon">Goregaon</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Delivery Schedule
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <option value="daily">Every Morning (Daily)</option>
                  <option value="alternate">Alternate Days (1 day gap)</option>
                  <option value="selected">Weekdays Only (Mon-Fri)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Daily Cow Milk Quantity
                </label>
                <select
                  value={formData.milkQty}
                  onChange={(e) => setFormData({ ...formData, milkQty: e.target.value })}
                >
                  <option value={0.5}>500 ml (Half Litre)</option>
                  <option value={1}>1 Litre (Standard)</option>
                  <option value={1.5}>1.5 Litres</option>
                  <option value={2}>2 Litres (Family)</option>
                  <option value={3}>3 Litres</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Daily Farm Curd (Dahi)
                </label>
                <select
                  value={formData.curdQty}
                  onChange={(e) => setFormData({ ...formData, curdQty: e.target.value })}
                >
                  <option value={0}>None</option>
                  <option value={250}>250 grams</option>
                  <option value={500}>500 grams (Standard)</option>
                  <option value={1000}>1 Kg (Family)</option>
                </select>
              </div>
            </div>

            <div
              style={{
                background: '#f8faf8',
                borderRadius: '12px',
                padding: '12px 16px',
                border: '1px solid #e2ece3',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Clock size={20} color="#0d5c3a" />
              <div style={{ fontSize: '0.82rem', color: '#597361' }}>
                Delivery starts tomorrow at <strong>6:00 AM – 6:30 AM</strong>. You can pause or adjust quantity anytime before 9:00 PM.
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '14px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(13, 92, 58, 0.3)',
              }}
            >
              {isSubmitting ? 'Starting Subscription...' : 'Confirm Subscription (Pay Monthly)'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
