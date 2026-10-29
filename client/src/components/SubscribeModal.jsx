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
} from 'lucide-react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';

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
  const { refreshAll, notifyRealtimeSync } = useDairy();
  const { user, getAuthHeaders } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    whatsapp: user?.mobile || '',
    address: user?.address || '',
    landmark: '',
    area: user?.area || user?.assignedArea || 'Andheri West',
    milkQty: preselectedProduct?.selectedQty || (preselectedProduct?.name?.includes('500ml') ? 0.5 : 1),
    curdQty: preselectedProduct?.category === 'curd' ? 500 : 0,
    frequency: preselectedProduct?.selectedFrequency || 'daily',
    paymentType: 'credit',
    paymentCycle: 'monthly',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);
  const [paymentError, setPaymentError] = useState('');

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

  // Live calculation of drops and price matching backend logic
  const planSummary = useMemo(() => {
    const milk = Number(formData.milkQty) || 0;
    const curd = Number(formData.curdQty) || 0;
    const dailyCost = milk * 60 + (curd / 500) * 30;

    let dropsCount = 30;
    if (formData.frequency === 'alternate') {
      dropsCount = 15;
    } else if (formData.frequency === 'selected' || formData.frequency === 'weekdays') {
      dropsCount = 22; // ~22 weekdays in 30 days
    }

    const totalAmount = Math.round(dailyCost * dropsCount);
    return {
      dailyCost,
      dropsCount,
      totalAmount,
    };
  }, [formData.milkQty, formData.curdQty, formData.frequency]);

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
          frequency: formData.frequency,
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
        description: '30-Day Fresh Morning Milk Delivery',
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
              <h3 className="subscribe-success-title">Subscription Active!</h3>
              <p className="subscribe-success-intro">
                Thank you, <strong>{formData.name}</strong>. Your pure farm milk delivery starts tomorrow morning.
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
                  <span>Daily Morning Plan</span>
                  <strong>
                    {formData.milkQty}L Fresh Milk {formData.curdQty > 0 ? `+ ${formData.curdQty}g Curd` : ''} ({formData.frequency === 'daily' ? 'Every Morning' : formData.frequency === 'alternate' ? 'Alternate Days' : 'Weekdays'})
                  </strong>
                </div>
                <div className="subscribe-summary-row">
                  <span>Delivery Schedule</span>
                  <strong className="text-emerald-700">5:00 AM – 6:30 AM (Silent Doorstep Drop)</strong>
                </div>
                <div className="subscribe-summary-row">
                  <span>Valid Through</span>
                  <strong>
                    {createdInfo?.endDate
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
                <span className="subscribe-verified-tag">
                  <ShieldCheck size={13} /> Verified
                </span>
              </div>

              <div className="subscribe-customer-badge">
                <div className="subscribe-customer-avatar">{userInitials}</div>
                <div className="subscribe-customer-meta">
                  <div className="subscribe-customer-name">{formData.name || 'Valued Customer'}</div>
                  <div className="subscribe-customer-phone">+91 {formData.mobile}</div>
                </div>
              </div>
            </div>

            {/* Section 2: Doorstep Delivery Address */}
            <div className="subscribe-card-section">
              <div className="subscribe-section-header">
                <span className="subscribe-section-title">
                  <MapPin size={16} /> Delivery Address
                </span>
                <span className="subscribe-section-hint">Doorstep Drop</span>
              </div>

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

              {/* Delivery Frequency Selector */}
              <div className="subscribe-field-group">
                <label className="subscribe-field-label">Delivery Schedule</label>
                <div className="subscribe-freq-grid">
                  {[
                    { id: 'daily', title: 'Every Morning', desc: 'Daily · 30 Drops', tag: 'Best Value' },
                    { id: 'alternate', title: 'Alternate Days', desc: '1 Day Gap · 15 Drops', tag: null },
                    { id: 'selected', title: 'Weekdays Only', desc: 'Mon to Fri · 22 Drops', tag: null },
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
                {formData.frequency === 'alternate' && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#15803d" />
                    <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 700 }}>
                      Alternate Days Schedule: Delivered every other morning with 15 doorstep drops over 30 days.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary Breakdown & Transparency */}
            <div className="subscribe-summary-box">
              <div className="subscribe-summary-head">
                <span>30-Day Plan Calculation</span>
                <span className="subscribe-summary-pill">{planSummary.dropsCount} Morning Drops</span>
              </div>

              <div className="subscribe-calc-list">
                <div className="subscribe-calc-row">
                  <span>Milk ({formData.milkQty}L × ₹60/L)</span>
                  <strong>₹{Number(formData.milkQty) * 60}/drop</strong>
                </div>
                {Number(formData.curdQty) > 0 && (
                  <div className="subscribe-calc-row">
                    <span>Curd ({formData.curdQty}g)</span>
                    <strong>₹{(Number(formData.curdQty) / 500) * 30}/drop</strong>
                  </div>
                )}
                <div className="subscribe-calc-row">
                  <span>Doorstep Drop (Before 6:30 AM)</span>
                  <span className="subscribe-free-tag">FREE</span>
                </div>
              </div>

              <div className="subscribe-total-row">
                <div>
                  <div className="subscribe-total-label">Total Prepaid Amount</div>
                  <div className="subscribe-total-sub">₹{planSummary.dailyCost}/day × {planSummary.dropsCount} deliveries</div>
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
                    <span>Pay ₹{planSummary.totalAmount} · Activate Delivery</span>
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
    </div>
  );
}
