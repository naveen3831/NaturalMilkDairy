import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Milk,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Lock,
  ChevronDown,
  Truck,
  Check,
  Crosshair,
  Navigation,
  ShoppingBag,
  Plus,
  Minus,
} from 'lucide-react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import LeafletMapPicker from './LeafletMapPicker';

const AVAILABLE_AREAS = [
  'Andheri West',
  'Andheri East',
  'Bandra',
  'Juhu',
  'Goregaon',
  'Powai',
  'Borivali',
  'Dadar',
  'Thane',
  'Navi Mumbai',
  'Madhapur',
  'Gachibowli',
  'Hitec City',
  'Jubilee Hills',
  'Banjara Hills',
  'Kondapur',
  'Kukatpally',
];

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export default function SubscribeModal({ isOpen, onClose, preselectedProduct = null }) {
  const { products, refreshAll, notifyRealtimeSync } = useDairy();
  const { user, getAuthHeaders } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    whatsapp: user?.mobile || '',
    address: user?.address || '',
    landmark: '',
    area: user?.area || user?.assignedArea || 'Madhapur',
    latitude: user?.latitude || 17.4483,
    longitude: user?.longitude || 78.3915,
    milkQty: preselectedProduct?.selectedQty || (preselectedProduct?.name?.includes('500ml') ? 0.5 : 1),
    curdQty: preselectedProduct?.category === 'curd' ? 500 : 0,
    frequency: preselectedProduct?.selectedFrequency || 'daily',
    alternateSchedule: 'tomorrow',
    paymentType: 'credit',
    paymentCycle: 'monthly',
  });

  const [selectedAddons, setSelectedAddons] = useState({}); // { [productId]: quantity }
  const [isAddonsModalOpen, setIsAddonsModalOpen] = useState(false);
  const [addonCategory, setAddonCategory] = useState('all');

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);
  const [paymentError, setPaymentError] = useState('');

  // Customer contact editing state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [contactError, setContactError] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  const startEditContact = () => {
    setEditName(formData.name || user?.name || '');
    setEditMobile(formData.mobile || user?.mobile || '');
    setContactError('');
    setIsEditingContact(true);
  };

  const handleSaveContact = async (e) => {
    if (e) e.preventDefault();
    const cleanPhone = editMobile.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setContactError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!editName.trim()) {
      setContactError('Please enter customer name.');
      return;
    }
    setIsSavingContact(true);
    setContactError('');
    try {
      const res = await fetch('/api/customers/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: editName.trim(),
          mobile: cleanPhone,
          address: formData.address.trim() || 'Doorstep Delivery',
          area: formData.area,
          landmark: formData.landmark.trim(),
          latitude: formData.latitude,
          longitude: formData.longitude,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormData((prev) => ({
          ...prev,
          name: editName.trim(),
          mobile: cleanPhone,
          whatsapp: cleanPhone,
        }));
        setIsEditingContact(false);
        refreshAll?.();
        notifyRealtimeSync?.();
      } else {
        setContactError(data.message || 'Failed to update contact.');
      }
    } catch (err) {
      setContactError(err.message || 'Error updating contact.');
    } finally {
      setIsSavingContact(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        mobile: user.mobile || prev.mobile,
        whatsapp: prev.whatsapp || user.mobile,
        address: user.address || prev.address,
        area: user.area || user.assignedArea || prev.area,
      }));
    }
  }, [user]);

  React.useEffect(() => {
    if (preselectedProduct) {
      setFormData((prev) => ({
        ...prev,
        milkQty: preselectedProduct.selectedQty || (preselectedProduct.name?.includes('500ml') ? 0.5 : 1),
        curdQty: preselectedProduct.category === 'curd' ? 500 : 0,
        frequency: preselectedProduct.selectedFrequency || 'daily',
      }));
    }
  }, [preselectedProduct]);

  const availableCatalog = useMemo(() => {
    return Array.isArray(products) ? products.filter((p) => p.status !== 'inactive') : [];
  }, [products]);

  const selectedAddonsCount = useMemo(() => {
    return Object.values(selectedAddons).reduce((sum, q) => sum + (Number(q) || 0), 0);
  }, [selectedAddons]);

  const addonsDailyCost = useMemo(() => {
    let cost = 0;
    Object.entries(selectedAddons).forEach(([pId, qty]) => {
      if (qty > 0) {
        const prod = availableCatalog.find((p) => String(p.id || p._id) === String(pId));
        const pPrice = Number(prod?.price || prod?.numericPrice) || 0;
        cost += pPrice * qty;
      }
    });
    return cost;
  }, [selectedAddons, availableCatalog]);

  const extraProductsPayload = useMemo(() => {
    const list = [];
    Object.entries(selectedAddons).forEach(([pId, qty]) => {
      if (qty > 0) {
        const prod = availableCatalog.find((p) => String(p.id || p._id) === String(pId));
        list.push({
          productId: pId,
          name: prod?.name || 'Extra Item',
          quantity: qty,
          unit: prod?.unit || 'pack',
          price: Number(prod?.price || prod?.numericPrice) || 0,
          image: prod?.image || prod?.imageUrl || '',
        });
      }
    });
    return list;
  }, [selectedAddons, availableCatalog]);

  // Live calculation of drops and price matching backend logic
  const planSummary = useMemo(() => {
    const milk = Number(formData.milkQty) || 0;
    const curd = Number(formData.curdQty) || 0;
    const dailyCost = milk * 60 + (curd / 500) * 30 + addonsDailyCost;

    let dropsCount = 30;
    if (formData.frequency === 'once' || formData.frequency === 'single') {
      dropsCount = 1;
    } else if (formData.frequency === 'alternate') {
      dropsCount = 15;
    } else if (formData.frequency === 'selected' || formData.frequency === 'weekdays') {
      dropsCount = 22; // ~22 weekdays in 30 days
    } else if (formData.frequency === 'weekends') {
      dropsCount = 8; // Saturday & Sunday mornings
    }

    const totalAmount = Math.round(dailyCost * dropsCount);
    return {
      dailyCost,
      dropsCount,
      totalAmount,
    };
  }, [formData.milkQty, formData.curdQty, formData.frequency, addonsDailyCost]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== 'customer') {
      setPaymentError('Please sign in with a customer account before subscribing.');
      return;
    }
    if (!formData.address.trim() || !formData.area.trim()) {
      setPaymentError('Please enter your complete delivery address and locality.');
      return;
    }
    setPaymentError('');
    setIsSubmitting(true);
    try {
      const scriptLoaded = await loadRazorpay();
      if (!scriptLoaded) throw new Error('Unable to load Razorpay checkout. Check your internet connection and try again.');

      const orderResponse = await fetch('/api/customers/me/subscription/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          address: formData.address.trim(),
          area: formData.area.trim(),
          landmark: formData.landmark.trim(),
          whatsapp: formData.mobile || user.mobile,
          milkQty: Number(formData.milkQty),
          curdQty: Number(formData.curdQty),
          extraProducts: extraProductsPayload,
          frequency: formData.frequency,
          alternateSchedule: formData.alternateSchedule || 'tomorrow',
          purpose: formData.frequency === 'once' ? 'one_time' : 'new',
          latitude: formData.latitude,
          longitude: formData.longitude,
        }),
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.message || 'Could not prepare subscription payment.');
      }

      const checkout = new window.Razorpay({
        key: orderData.order.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Natural Milk Dairy',
        description: formData.frequency === 'once' ? 'One-Time Morning Milk Delivery' : '30-Day Fresh Morning Milk Delivery',
        order_id: orderData.order.id,
        prefill: { name: user.name, contact: user.mobile },
        theme: { color: '#0d5c3a' },
        handler: async (response) => {
          try {
            const verifyResponse = await fetch('/api/customers/me/subscription/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(verifyData.message || 'Payment could not be verified.');
            }
            setCreatedInfo(verifyData.subscription);
            setIsSuccess(true);
            refreshAll?.();
            notifyRealtimeSync?.();
          } catch (error) {
            setPaymentError(error.message || 'Payment verification failed. Please contact support with your payment receipt.');
          } finally {
            setIsSubmitting(false);
          }
        },
      });
      checkout.on('payment.failed', (response) => {
        setPaymentError(response.error?.description || 'Payment was not completed. You can try again.');
        setIsSubmitting(false);
      });
      checkout.open();
      setIsSubmitting(false);
    } catch (err) {
      setPaymentError(err.message || 'Unable to start checkout. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setCreatedInfo(null);
    setPaymentError('');
    onClose();
  };

  // Get user initial for avatar badge
  const userInitials = (formData.name || user?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="subscribe-fullpage-overlay" onClick={handleClose}>
      <div className="subscribe-fullpage-container" onClick={(e) => e.stopPropagation()}>
        {/* Simple & Professional Header */}
        <header className="subscribe-fullpage-header">
          <button
            type="button"
            className="subscribe-back-btn"
            onClick={handleClose}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="subscribe-header-title-box">
            <h3 className="subscribe-header-title">Morning Milk Delivery</h3>
            <p className="subscribe-header-subtitle">
              <span className="subscribe-live-dot" />
              Prepaid 30-day plan · Doorstep drop by 6:30 AM
            </p>
          </div>

          <button
            type="button"
            className="subscribe-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Success View */}
        {isSuccess ? (
          <div className="subscribe-fullpage-body">
            <div className="subscribe-success-card">
              <div className="subscribe-success-icon">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="subscribe-success-title">
                {formData.frequency === 'once' ? 'One-Time Order Placed!' : 'Subscription Active!'}
              </h3>
              <p className="subscribe-success-intro">
                Thank you, <strong>{formData.name}</strong>. {formData.frequency === 'once' ? 'Your one-time fresh farm delivery arrives tomorrow morning.' : 'Your pure farm milk delivery starts tomorrow morning.'}
              </p>

              <div className="subscribe-success-summary">
                <div className="subscribe-summary-row">
                  <span>Delivery Address</span>
                  <strong>{formData.address}, {formData.area}</strong>
                </div>
                {formData.landmark && (
                  <div className="subscribe-summary-row">
                    <span>Landmark</span>
                    <strong>{formData.landmark}</strong>
                  </div>
                )}
                <div className="subscribe-summary-row">
                  <span>{formData.frequency === 'once' ? 'One-Time Order' : 'Daily Morning Plan'}</span>
                  <strong>
                    {formData.milkQty}L Fresh Milk {formData.curdQty > 0 ? `+ ${formData.curdQty}g Curd` : ''} ({formData.frequency === 'once' ? 'Single Drop (Tomorrow)' : formData.frequency === 'daily' ? 'Every Morning' : formData.frequency === 'alternate' ? 'Alternate Days' : 'Weekdays'})
                  </strong>
                </div>
                <div className="subscribe-summary-row">
                  <span>Delivery Schedule</span>
                  <strong className="text-emerald-700">5:00 AM – 6:30 AM (Silent Doorstep Drop)</strong>
                </div>
                <div className="subscribe-summary-row">
                  <span>Valid Through</span>
                  <strong>
                    {formData.frequency === 'once'
                      ? 'Tomorrow Morning (1 Drop)'
                      : createdInfo?.endDate
                      ? new Date(`${createdInfo.endDate}T00:00:00`).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '30 Days From Start'}
                  </strong>
                </div>
                <div className="subscribe-summary-row">
                  <span>Packaging & Cold Chain</span>
                  <strong>Sanitized Glass Bottles · Chilled at 4°C</strong>
                </div>
              </div>

              <button
                type="button"
                className="subscribe-submit-btn"
                onClick={handleClose}
              >
                Done & Return to App
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form className="subscribe-fullpage-body" onSubmit={handleSubmit}>
            {/* Produce Banner / Spotlight */}
            <div className="subscribe-produce-banner">
              <div className="subscribe-produce-thumb">
                {preselectedProduct?.image ? (
                  <img src={preselectedProduct.image} alt={preselectedProduct.name} />
                ) : (
                  <Milk size={24} className="text-emerald-700" />
                )}
              </div>
              <div className="subscribe-produce-info">
                <div className="subscribe-produce-badge">
                  <Sparkles size={12} />
                  <span>Farm Fresh · Morning Milked</span>
                </div>
                <h4 className="subscribe-produce-title">
                  {preselectedProduct?.name || 'Pure Desi A2 Cow Milk'}
                </h4>
                <p className="subscribe-produce-meta">
                  Milked 4:30 AM · Delivered within 3 hrs · ₹60/Litre
                </p>
              </div>
            </div>

            {/* Section 1: Verified Customer Card */}
            <div className="subscribe-card-section">
              <div className="subscribe-section-header">
                <span className="subscribe-section-title">
                  <User size={16} /> Customer Contact
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="subscribe-verified-tag">
                    <ShieldCheck size={13} /> Verified
                  </span>
                  {!isEditingContact && (
                    <button
                      type="button"
                      onClick={startEditContact}
                      style={{
                        background: 'transparent',
                        border: '1px solid #bbf7d0',
                        color: '#0d5c3a',
                        borderRadius: '8px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>

              {isEditingContact ? (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0c2340', marginBottom: '8px' }}>
                    Update Mobile & Contact Details
                  </div>
                  {contactError && (
                    <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginBottom: '6px', fontWeight: 600 }}>
                      {contactError}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                        10-Digit Mobile
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={editMobile}
                        onChange={(e) => setEditMobile(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(false)}
                      style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveContact}
                      disabled={isSavingContact}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#0d5c3a', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      {isSavingContact ? 'Saving...' : 'Save Phone'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="subscribe-customer-badge">
                  <div className="subscribe-customer-avatar">{userInitials}</div>
                  <div className="subscribe-customer-meta">
                    <div className="subscribe-customer-name">{formData.name || 'Valued Customer'}</div>
                    <div className="subscribe-customer-phone">+91 {formData.mobile}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Doorstep Delivery Address */}
            <div className="subscribe-card-section">
              <div className="subscribe-section-header">
                <span className="subscribe-section-title">
                  <MapPin size={16} /> Delivery Address
                </span>
                <span className="subscribe-section-hint">Doorstep Drop</span>
              </div>

              {/* Leaflet GPS Action Bar */}
              <div
                onClick={() => setIsMapOpen(true)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '14px',
                  background: '#f0fdf4',
                  border: '1.2px solid #b4e2ca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Crosshair size={16} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0c2340' }}>
                      Pinpoint on Leaflet Map
                    </span>
                    <ShieldCheck size={13} color="#10b981" />
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10.5px', color: '#0d5c3a', fontWeight: 700 }}>
                    {formData.latitude
                      ? `GPS Pin: ${Number(formData.latitude).toFixed(4)}, ${Number(formData.longitude).toFixed(4)} (${formData.area})`
                      : 'Tap to locate exact doorstep with Leaflet GPS'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMapOpen(true);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '10px',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <Navigation size={12} />
                  <span>{formData.latitude ? 'Change' : 'Use My Location'}</span>
                </button>
              </div>

              {isMapOpen && (
                <LeafletMapPicker
                  initialLat={formData.latitude}
                  initialLng={formData.longitude}
                  initialArea={formData.area}
                  onSelectLocation={(loc) => {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      address: loc.address || prev.address,
                      area: loc.area || prev.area,
                    }));
                    setIsMapOpen(false);
                  }}
                  onClose={() => setIsMapOpen(false)}
                />
              )}

              <div className="subscribe-field-group">
                <label className="subscribe-field-label">
                  Complete Address (Flat / House No., Society, Wing, Street) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Flat 402, Lotus Greens, 4th Cross Road"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="subscribe-textarea"
                />
              </div>

              <div className="subscribe-grid-2">
                <div>
                  <label className="subscribe-field-label">Delivery Locality / Area</label>
                  <div className="subscribe-select-wrap">
                    <select
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="subscribe-select"
                    >
                      {AVAILABLE_AREAS.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                      {!AVAILABLE_AREAS.includes(formData.area) && formData.area && (
                        <option value={formData.area}>{formData.area}</option>
                      )}
                    </select>
                    <ChevronDown size={16} className="subscribe-select-chevron" />
                  </div>
                </div>

                <div>
                  <label className="subscribe-field-label">Landmark / Gate Access</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Sai Temple, Gate 2"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="subscribe-input"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Subscription Plan Customizer */}
            <div className="subscribe-card-section">
              <div className="subscribe-section-header">
                <span className="subscribe-section-title">
                  <Calendar size={16} /> Daily Morning Plan
                </span>
              </div>

              {/* Milk Quantity Pill Selector */}
              <div className="subscribe-field-group">
                <label className="subscribe-field-label">
                  Daily Cow Milk Quantity: <strong>{formData.milkQty} Litre{Number(formData.milkQty) > 1 ? 's' : ''}</strong>
                </label>
                <div className="subscribe-pills-row">
                  {[
                    { label: '500 ml', val: 0.5 },
                    { label: '1 Litre', val: 1, badge: 'Popular' },
                    { label: '1.5 L', val: 1.5 },
                    { label: '2 Litres', val: 2 },
                    { label: '3 Litres', val: 3 },
                  ].map((item) => {
                    const isSelected = Number(formData.milkQty) === item.val;
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setFormData({ ...formData, milkQty: item.val })}
                        className={`subscribe-pill-btn ${isSelected ? 'active' : ''}`}
                      >
                        {item.badge && <span className="subscribe-pill-subbadge">{item.badge}</span>}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Curd Add-on Pill Selector */}
              <div className="subscribe-field-group">
                <label className="subscribe-field-label">
                  Daily Farm Curd (Dahi) Add-on: <strong>{formData.curdQty > 0 ? `${formData.curdQty}g` : 'None'}</strong>
                </label>
                <div className="subscribe-pills-row">
                  {[
                    { label: 'None', val: 0 },
                    { label: '250g', val: 250, price: '+₹15' },
                    { label: '500g', val: 500, price: '+₹30' },
                    { label: '1 Kg', val: 1000, price: '+₹60' },
                  ].map((item) => {
                    const isSelected = Number(formData.curdQty) === item.val;
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setFormData({ ...formData, curdQty: item.val })}
                        className={`subscribe-pill-btn ${isSelected ? 'active' : ''}`}
                      >
                        <span>{item.label}</span>
                        {item.price && <small className="subscribe-pill-price">{item.price}</small>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extra Farm Products & Add-ons */}
              <div className="subscribe-field-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="subscribe-field-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShoppingBag size={14} color="#0d5c3a" />
                    <span>Farm Add-ons & Extra Products</span>
                    {selectedAddonsCount > 0 && (
                      <span style={{ fontSize: '10px', background: '#0d5c3a', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                        {selectedAddonsCount} Added
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddonsModalOpen(true)}
                    style={{
                      background: '#f0fdf4',
                      border: '1.2px solid #86efac',
                      color: '#15803d',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={12} />
                    <span>{selectedAddonsCount > 0 ? 'Edit Add-ons' : '+ Add-ons'}</span>
                  </button>
                </div>

                {selectedAddonsCount > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {extraProductsPayload.map((item) => (
                      <div
                        key={item.productId}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e2f1ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d5c3a' }}>
                              <ShoppingBag size={18} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0c2340' }}>{item.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#0d5c3a', fontWeight: 700 }}>
                              ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}{formData.frequency === 'once' ? '' : '/drop'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', background: '#0d5c3a', borderRadius: '14px', padding: '2px 4px', color: '#fff' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAddons((prev) => {
                                const next = { ...prev };
                                if ((next[item.productId] || 0) <= 1) {
                                  delete next[item.productId];
                                } else {
                                  next[item.productId] = next[item.productId] - 1;
                                }
                                return next;
                              });
                            }}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0 4px' }}>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAddons((prev) => ({ ...prev, [item.productId]: (prev[item.productId] || 0) + 1 }));
                            }}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => setIsAddonsModalOpen(true)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Plus size={14} color="#0d5c3a" />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        Add Ghee, Paneer, Curd or other fresh dairy to this drop
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0d5c3a' }}>Browse</span>
                  </div>
                )}
              </div>

              {/* Delivery Frequency Selector */}
              <div className="subscribe-field-group">
                <label className="subscribe-field-label">Delivery Schedule</label>
                <div className="subscribe-freq-grid">
                  {[
                    { id: 'daily', title: 'Every Morning', desc: 'Daily · 30 Drops', tag: 'Best Value' },
                    { id: 'alternate', title: 'Alternate Days', desc: '1 Day Gap · 15 Drops', tag: null },
                    { id: 'selected', title: 'Weekdays Only', desc: 'Mon to Fri · 22 Drops', tag: null },
                    { id: 'weekends', title: 'Weekends Only', desc: 'Sat-Sun · 8 Drops', tag: 'Sat & Sun' },
                    { id: 'once', title: 'One-Time Order', desc: 'Single Drop · 1 Day', tag: 'Try Once' },
                  ].map((item) => {
                    const isSelected = formData.frequency === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, frequency: item.id })}
                        className={`subscribe-freq-card ${isSelected ? 'active' : ''}`}
                      >
                        {item.tag && <span className="subscribe-freq-badge">{item.tag}</span>}
                        <div className="subscribe-freq-title-row">
                          <span className="subscribe-freq-title">{item.title}</span>
                          {isSelected && <Check size={14} className="subscribe-freq-check" />}
                        </div>
                        <span className="subscribe-freq-desc">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
                {formData.frequency === 'once' && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#2563eb" />
                    <span style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 700 }}>
                      One-Time Single Order: 1 doorstep delivery tomorrow morning between 5:00 AM – 6:30 AM. No recurring commitment.
                    </span>
                  </div>
                )}
                {formData.frequency === 'alternate' && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Sparkles size={16} color="#15803d" />
                      <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 800 }}>
                        Alternate Days Delivery Pattern:
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, alternateSchedule: 'tomorrow' })}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: (formData.alternateSchedule || 'tomorrow') === 'tomorrow' ? '2px solid #0d5c3a' : '1px solid #cbd5e1',
                          background: (formData.alternateSchedule || 'tomorrow') === 'tomorrow' ? '#0d5c3a' : '#fff',
                          color: (formData.alternateSchedule || 'tomorrow') === 'tomorrow' ? '#fff' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        Start Tomorrow (Mon, Wed...)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, alternateSchedule: 'day_after' })}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: formData.alternateSchedule === 'day_after' ? '2px solid #0d5c3a' : '1px solid #cbd5e1',
                          background: formData.alternateSchedule === 'day_after' ? '#0d5c3a' : '#fff',
                          color: formData.alternateSchedule === 'day_after' ? '#fff' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        Start Day After (Tue, Thu...)
                      </button>
                    </div>
                  </div>
                )}
                {formData.frequency === 'weekends' && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#15803d" />
                    <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 700 }}>
                      Weekends Only Schedule: Delivered every Saturday & Sunday morning before 6:30 AM (8 drops in 30 days).
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary Breakdown & Transparency */}
            <div className="subscribe-summary-box">
              <div className="subscribe-summary-head">
                <span>{formData.frequency === 'once' ? 'Single Order Calculation' : '30-Day Plan Calculation'}</span>
                <span className="subscribe-summary-pill">
                  {formData.frequency === 'once' ? '1 Morning Drop' : `${planSummary.dropsCount} Morning Drops`}
                </span>
              </div>

              <div className="subscribe-calc-list">
                <div className="subscribe-calc-row">
                  <span>Milk ({formData.milkQty}L × ₹60/L)</span>
                  <strong>₹{Number(formData.milkQty) * 60}{formData.frequency === 'once' ? '' : '/drop'}</strong>
                </div>
                {Number(formData.curdQty) > 0 && (
                  <div className="subscribe-calc-row">
                    <span>Curd ({formData.curdQty}g)</span>
                    <strong>₹{(Number(formData.curdQty) / 500) * 30}{formData.frequency === 'once' ? '' : '/drop'}</strong>
                  </div>
                )}
                {extraProductsPayload.map((addon) => (
                  <div key={addon.productId} className="subscribe-calc-row">
                    <span>{addon.name} ({addon.quantity} × ₹{addon.price})</span>
                    <strong>₹{addon.quantity * addon.price}{formData.frequency === 'once' ? '' : '/drop'}</strong>
                  </div>
                ))}
                <div className="subscribe-calc-row">
                  <span>Doorstep Drop (Before 6:30 AM)</span>
                  <span className="subscribe-free-tag">FREE</span>
                </div>
              </div>

              <div className="subscribe-total-row">
                <div>
                  <div className="subscribe-total-label">
                    {formData.frequency === 'once' ? 'Total Order Amount' : 'Total Prepaid Amount'}
                  </div>
                  <div className="subscribe-total-sub">
                    {formData.frequency === 'once'
                      ? `₹${planSummary.totalAmount} for 1 single morning delivery`
                      : `₹${planSummary.dailyCost}/day × ${planSummary.dropsCount} deliveries`}
                  </div>
                </div>
                <div className="subscribe-total-price">₹{planSummary.totalAmount}</div>
              </div>
            </div>

            {/* Delivery Guarantee Info Box */}
            <div className="subscribe-guarantee-box">
              <Truck size={18} className="subscribe-guarantee-icon" />
              <div className="subscribe-guarantee-text">
                <strong>Silent Doorstep Drop:</strong> Delivered daily between <strong>5:00 AM – 6:30 AM</strong> in insulated sanitized glass bottles. Pause, reschedule, or cancel anytime from your customer portal.
              </div>
            </div>

            {/* Submit Action */}
            <div className="subscribe-action-area">
              {paymentError && (
                <div className="subscribe-error-alert" role="alert">
                  {paymentError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="subscribe-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <span className="subscribe-spinner" />
                    <span>Connecting to Razorpay...</span>
                  </>
                ) : (
                  <>
                    <Lock size={17} />
                    <span>Pay ₹{planSummary.totalAmount} · {formData.frequency === 'once' ? 'Place One-Time Order' : 'Activate Delivery'}</span>
                  </>
                )}
              </button>

              <div className="subscribe-footer-trust">
                <span>🔒 256-Bit SSL Encrypted</span>
                <span>•</span>
                <span>Razorpay Secure</span>
                <span>•</span>
                <span>Money-back Guarantee</span>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ── ALL AVAILABLE FARM ADD-ONS PICKER MODAL ── */}
      {isAddonsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setIsAddonsModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0c2340' }}>
                  Farm Add-ons & Extra Products
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                  Select pure farm dairy to accompany your delivery
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddonsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Category Filter Chips */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: '6px', overflowX: 'auto' }}>
              {['all', 'ghee', 'paneer', 'curd', 'milk', 'other'].map((cat) => {
                const isSel = addonCategory === cat;
                const label = cat === 'all' ? 'All Products' : cat.charAt(0).toUpperCase() + cat.slice(1);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAddonCategory(cat)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: isSel ? '1px solid #0d5c3a' : '1px solid #e2e8f0',
                      background: isSel ? '#0d5c3a' : '#f8fafc',
                      color: isSel ? '#ffffff' : '#475569',
                      fontSize: '11.5px',
                      fontWeight: isSel ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Products List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {availableCatalog
                .filter((p) => addonCategory === 'all' || (p.category || '').toLowerCase() === addonCategory.toLowerCase())
                .map((prod) => {
                  const pId = prod.id || prod._id;
                  const currentQty = selectedAddons[pId] || 0;
                  const price = Number(prod.price || prod.numericPrice) || 0;

                  return (
                    <div
                      key={pId}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '14px',
                        border: currentQty > 0 ? '1.5px solid #86efac' : '1px solid #f1f5f9',
                        background: currentQty > 0 ? '#f0fdf4' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        {prod.image || prod.imageUrl ? (
                          <img
                            src={prod.image || prod.imageUrl}
                            alt={prod.name}
                            style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#e2f1ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d5c3a', flexShrink: 0 }}>
                            <ShoppingBag size={20} />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0c2340', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prod.name}
                          </div>
                          <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#0d5c3a' }}>
                            ₹{price} <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>· {prod.unit || 'pack'}</span>
                          </div>
                          {prod.description && (
                            <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {prod.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {currentQty === 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAddons((prev) => ({ ...prev, [pId]: 1 }));
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '18px',
                            background: '#e2f1ea',
                            border: '1.2px solid #a5d6a7',
                            color: '#0d5c3a',
                            fontSize: '11.5px',
                            fontWeight: 900,
                            cursor: 'pointer',
                          }}
                        >
                          + ADD
                        </button>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: '#0d5c3a',
                            borderRadius: '20px',
                            padding: '3px 6px',
                            color: '#ffffff',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAddons((prev) => {
                                const next = { ...prev };
                                if ((next[pId] || 0) <= 1) {
                                  delete next[pId];
                                } else {
                                  next[pId] = next[pId] - 1;
                                }
                                return next;
                              });
                            }}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: '12px', fontWeight: 900, padding: '0 6px' }}>{currentQty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAddons((prev) => ({ ...prev, [pId]: (prev[pId] || 0) + 1 }));
                            }}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  {selectedAddonsCount} Item{selectedAddonsCount === 1 ? '' : 's'} Selected
                </div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#0d5c3a' }}>
                  +₹{addonsDailyCost}{formData.frequency === 'once' ? '' : '/drop'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddonsModalOpen(false)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  background: '#0d5c3a',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Apply Add-ons
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
