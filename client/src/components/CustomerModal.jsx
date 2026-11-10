import React, { useState, useEffect, useRef } from 'react';
import { useDairy } from '../context/DairyContext';
import { User, Phone, MapPin, Calendar, CreditCard, Milk, Mail, Lock, Sparkles, Edit3, Navigation, CheckCircle2, ExternalLink } from 'lucide-react';

const parseCoordinatesFromInput = (input) => {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();
  if (!str) return null;

  // 1. Raw lat,lng (e.g. 17.4483, 78.3915)
  const rawCoordMatch = str.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (rawCoordMatch) {
    const lat = parseFloat(rawCoordMatch[1]);
    const lng = parseFloat(rawCoordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // 2. Google maps @lat,lng
  const atMatch = str.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // 3. Query params: q=lat,lng or query=lat,lng or ll=lat,lng or destination=lat,lng
  const queryMatch = str.match(/[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // 4. Place or dir paths
  const placeMatch = str.match(/\/(?:place|dir|search)\/(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
};

export default function CustomerModal({ isOpen, onClose, customerToEdit = null, customer = null }) {
  const { addCustomer, updateCustomer, deliveryBoys, locations } = useDairy();
  const targetCustomer = customerToEdit || customer;
  const isEditMode = Boolean(targetCustomer);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Madhapur');
  const [landmark, setLandmark] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [status, setStatus] = useState('active');
  const [milkQty, setMilkQty] = useState(1);
  const [milkUnit, setMilkUnit] = useState('L');
  const [curdQty, setCurdQty] = useState(0);
  const [curdUnit, setCurdUnit] = useState('g');
  const [frequency, setFrequency] = useState('daily');
  const [deliveryBoyId, setDeliveryBoyId] = useState('');
  const [paymentType, setPaymentType] = useState('credit');
  const [paymentCycle, setPaymentCycle] = useState('monthly');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const prevOpenRef = useRef(false);
  const prevTargetIdRef = useRef(null);
  const targetId = targetCustomer ? (targetCustomer.id || targetCustomer._id || targetCustomer.customerId || 'editing') : null;

  useEffect(() => {
    // Only reset/populate form fields when modal transitions from closed to open,
    // or when switching to a different customer in edit mode.
    // NEVER reset while the user is actively entering details in the open form!
    const justOpened = isOpen && !prevOpenRef.current;
    const customerChanged = isOpen && targetId !== prevTargetIdRef.current;

    if (justOpened || customerChanged) {
      if (targetCustomer) {
        setName(targetCustomer.name || '');
        setEmail(targetCustomer.email || '');
        setPassword('');
        setMobile(targetCustomer.mobile || '');
        setWhatsapp(targetCustomer.whatsapp || targetCustomer.mobile || '');
        setAddress(targetCustomer.address || '');
        setArea(targetCustomer.area || 'Madhapur');
        setLandmark(targetCustomer.landmark || '');
        const existingUrl = targetCustomer.googleMapsUrl || targetCustomer.addresses?.[0]?.googleMapsUrl || '';
        const existingLat = targetCustomer.latitude || targetCustomer.addresses?.[0]?.latitude || null;
        const existingLng = targetCustomer.longitude || targetCustomer.addresses?.[0]?.longitude || null;
        setGoogleMapsUrl(existingUrl || (existingLat && existingLng ? `https://www.google.com/maps?q=${existingLat},${existingLng}` : ''));
        setLatitude(existingLat);
        setLongitude(existingLng);
        setStatus(targetCustomer.status || 'active');
        setMilkQty(targetCustomer.deliveryPlan?.milkQty ?? 1);
        setMilkUnit(targetCustomer.deliveryPlan?.milkUnit || 'L');
        setCurdQty(targetCustomer.deliveryPlan?.curdQty ?? 0);
        setCurdUnit(targetCustomer.deliveryPlan?.curdUnit || 'g');
        setFrequency(targetCustomer.deliveryPlan?.frequency || 'daily');
        setDeliveryBoyId(targetCustomer.deliveryPlan?.deliveryBoyId || '');
        setPaymentType(targetCustomer.paymentInfo?.paymentType || 'credit');
        setPaymentCycle(targetCustomer.paymentInfo?.paymentCycle || 'monthly');
        setNotes(targetCustomer.notes || '');
      } else {
        setName('');
        setEmail('');
        setPassword('');
        setMobile('');
        setWhatsapp('');
        setAddress('');
        const firstActiveLoc = (locations || []).find((l) => l.isActive)?.name || 'Madhapur';
        setArea(firstActiveLoc);
        setLandmark('');
        setGoogleMapsUrl('');
        setLatitude(null);
        setLongitude(null);
        setStatus('active');
        setMilkQty(1);
        setMilkUnit('L');
        setCurdQty(0);
        setCurdUnit('g');
        setFrequency('daily');
        setDeliveryBoyId(deliveryBoys?.[0]?.id || deliveryBoys?.[0]?._id || '');
        setPaymentType('credit');
        setPaymentCycle('monthly');
        setNotes('');
      }
      setErrorMessage('');
    }

    prevOpenRef.current = isOpen;
    prevTargetIdRef.current = targetId;
  }, [isOpen, targetId, targetCustomer]);

  const handleGoogleMapsUrlChange = (val) => {
    setGoogleMapsUrl(val);
    const parsed = parseCoordinatesFromInput(val);
    if (parsed) {
      setLatitude(parsed.latitude);
      setLongitude(parsed.longitude);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          setGoogleMapsUrl(`https://www.google.com/maps?q=${lat},${lng}`);
        },
        (err) => {
          alert('Could not retrieve current GPS: ' + err.message);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter the customer name.');
      return;
    }
    const cleanMobile = mobile.trim();
    if (!cleanMobile || !/^(?:\+?91[- ]?)?[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }
    if (!address.trim() || address.trim().length < 4) {
      setErrorMessage('Please enter a complete delivery address (at least 4 characters).');
      return;
    }
    if (!isEditMode && !password.trim() && !email.trim()) {
      setErrorMessage('Please provide either an email or set a portal password for customer login.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        const updatePayload = {
          name: name.trim(),
          email: email.trim(),
          mobile: cleanMobile,
          whatsapp: whatsapp ? whatsapp.trim() : cleanMobile,
          address: address.trim(),
          area: area.trim(),
          landmark: landmark.trim(),
          googleMapsUrl: googleMapsUrl.trim(),
          latitude: latitude !== null && !isNaN(Number(latitude)) ? Number(latitude) : undefined,
          longitude: longitude !== null && !isNaN(Number(longitude)) ? Number(longitude) : undefined,
          status,
          milkQty: Number(milkQty),
          milkUnit,
          curdQty: Number(curdQty),
          curdUnit,
          frequency,
          deliveryBoyId,
          paymentType,
          paymentCycle,
          notes: notes.trim(),
          actor: 'Admin',
        };
        if (password && password.trim()) {
          updatePayload.password = password.trim();
        }

        const res = await updateCustomer(targetCustomer.id || targetCustomer._id, updatePayload);
        setIsSubmitting(false);

        if (!res || !res.success) {
          setErrorMessage(res?.message || 'Failed to update customer details.');
          return;
        }
        onClose();
      } else {
        const res = await addCustomer({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          mobile: cleanMobile,
          whatsapp: whatsapp ? whatsapp.trim() : cleanMobile,
          address: address.trim(),
          area: area.trim(),
          landmark: landmark.trim(),
          googleMapsUrl: googleMapsUrl.trim(),
          latitude: latitude !== null && !isNaN(Number(latitude)) ? Number(latitude) : undefined,
          longitude: longitude !== null && !isNaN(Number(longitude)) ? Number(longitude) : undefined,
          status,
          milkQty: Number(milkQty),
          milkUnit,
          curdQty: Number(curdQty),
          curdUnit,
          frequency,
          deliveryBoyId,
          paymentType,
          paymentCycle,
          notes: notes.trim(),
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
        setGoogleMapsUrl('');
        setLatitude(null);
        setLongitude(null);
        setMobile('');
        setWhatsapp('');
        setAddress('');
        onClose();
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div
      className="modal-overlay customer-modal-overlay"
      onMouseDown={(e) => {
        // Prevent accidental closing on touch drag or text selection
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal-content customer-modal-content"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isEditMode ? <Edit3 size={20} color="#2563eb" /> : <Sparkles size={20} color="#059669" />}
              <span>{isEditMode ? `Edit Customer (${targetCustomer.customerId || targetCustomer.name})` : 'Add New Customer'}</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
              {isEditMode
                ? `Update personal details, delivery quotas, and subscription route for ${targetCustomer.name}`
                : 'Create customer profile and automatically send login credentials via email'}
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
                <span>{isEditMode ? 'Change Password (Optional)' : 'Portal Password (Optional)'}</span>
              </label>
              <input
                type="text"
                placeholder={isEditMode ? 'Leave blank to keep current' : 'Leave blank for auto-generated'}
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
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                <MapPin size={12} color="#059669" />
                <span>Service Location / Area *</span>
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 12px', fontSize: '0.84rem', width: '100%', background: '#ffffff' }}
                required
              >
                {locations.filter((l) => l.isActive).map((l) => (
                  <option key={l.id || l._id} value={l.name}>
                    {l.name} {l.pincode ? `(PIN: ${l.pincode})` : ''} • {l.city}
                  </option>
                ))}
                {/* Fallback if editing older customer whose area is not in active locations */}
                {area && !locations.some((l) => l.isActive && l.name.toLowerCase() === area.toLowerCase()) && (
                  <option value={area}>{area} (Current)</option>
                )}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem', background: '#ffffff', width: '100%' }}
              >
                <option value="active">Active (Deliveries Running)</option>
                <option value="paused">Paused (Deliveries Suspended)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
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

            {/* Optional Location / Google Maps Link with Real-Time Coordinate Sync */}
            <div
              style={{
                gridColumn: '1 / -1',
                background: latitude && longitude ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${latitude && longitude ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '10px 12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={13} color="#059669" />
                  <span>Doorstep Location / Google Maps Link (Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#047857',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Detect GPS coordinates using device GPS"
                >
                  <Navigation size={11} />
                  <span>Use Current GPS</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="Paste Google Maps link (e.g. https://maps.app.goo.gl/... or 17.4483, 78.3915)"
                value={googleMapsUrl}
                onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                style={{
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '8px 12px',
                  fontSize: '0.84rem',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              />
              {latitude !== null && longitude !== null && (
                <div
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '6px',
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    color: '#065f46',
                    fontWeight: 700,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 size={13} color="#059669" />
                    <span>✓ Live GPS Detected: {latitude}, {longitude} (Synced Real-Time)</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#047857',
                      textDecoration: 'none',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      background: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    <span>View Map Pin</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
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
                  <option value="">Choose Delivery Partner (Unassigned)</option>
                  {(deliveryBoys || [])
                    .filter((b) => b.status !== 'inactive')
                    .map((b) => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.name} ({b.assignedArea || 'Route'})
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
                background: isEditMode ? '#2563eb' : '#059669',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isSubmitting
                ? (isEditMode ? 'Saving Changes...' : 'Saving & Sending Email...')
                : (isEditMode ? 'Save & Update Customer' : 'Save & Send Credentials Email')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
