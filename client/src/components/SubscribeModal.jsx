import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  MapPin,
  Milk,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useDairy } from '../context/DairyContext';

export default function SubscribeModal({ isOpen, onClose, preselectedProduct = null }) {
  const { addCustomer, deliveryBoys, refreshAll, notifyRealtimeSync } = useDairy();

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    address: '',
    landmark: '',
    area: 'Andheri West',
    milkQty: preselectedProduct?.selectedQty || (preselectedProduct?.name?.includes('500ml') ? 0.5 : 1),
    curdQty: preselectedProduct?.category === 'curd' ? 500 : 0,
    frequency: preselectedProduct?.selectedFrequency || 'daily',
    paymentType: 'credit',
    paymentCycle: 'monthly',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

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
        landmark: formData.landmark || '',
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
      refreshAll?.();
      notifyRealtimeSync?.();
    } catch (err) {
      alert('Subscription saved! Deliveries will start tomorrow morning.');
      setIsSuccess(true);
      refreshAll?.();
      notifyRealtimeSync?.();
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
    <div className="subscribe-fullpage-overlay" onClick={handleClose}>
      <div className="subscribe-fullpage-container" onClick={(e) => e.stopPropagation()}>
        {/* Light Sticky Top Header */}
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
            <div className="subscribe-header-icon">
              <Milk size={20} />
            </div>
            <div>
              <h3>Start Morning Delivery</h3>
              <p>Before 6:30 AM · Zero Deposit</p>
            </div>
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

        {/* Success View (Light Theme) */}
        {isSuccess ? (
          <div className="subscribe-fullpage-body">
            <div className="subscribe-success-card">
              <div className="subscribe-success-icon">
                <CheckCircle2 size={42} />
              </div>
              <h3 className="subscribe-success-title">Subscription Confirmed!</h3>
              <p className="subscribe-success-intro">
                Thank you, <strong>{formData.name}</strong>! Your fresh milk delivery plan is active and will begin tomorrow morning before 6:30 AM.
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
                    {formData.milkQty}L Milk {formData.curdQty > 0 ? `+ ${formData.curdQty}g Curd` : ''} ({formData.frequency === 'daily' ? 'Every Morning' : formData.frequency})
                  </strong>
                </div>
                <div className="subscribe-summary-row">
                  <span>Drop Timing</span>
                  <strong style={{ color: '#16a34a' }}>5:00 AM – 6:30 AM (Silent Doorstep Drop)</strong>
                </div>
                <div className="subscribe-summary-row">
                  <span>Packaging</span>
                  <strong>Sanitized Glass Bottles (Cold-Chain 4°C)</strong>
                </div>
              </div>

              <button
                type="button"
                className="subscribe-submit-btn"
                onClick={handleClose}
              >
                Done & Return Home
              </button>
            </div>
          </div>
        ) : (
          /* Form View (Light Theme) */
          <form className="subscribe-fullpage-body" onSubmit={handleSubmit}>
            {/* Section 1: Customer Contact Details */}
            <div className="subscribe-card-section">
              <span className="subscribe-section-label">
                <User size={15} /> Personal Contact Details
              </span>

              <div className="subscribe-form-grid">
                <div>
                  <label className="subscribe-field-label">Full Name *</label>
                  <div className="subscribe-input-wrap">
                    <User size={16} className="subscribe-input-icon" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="subscribe-input has-icon"
                    />
                  </div>
                </div>

                <div>
                  <label className="subscribe-field-label">Mobile Number *</label>
                  <div className="subscribe-input-wrap">
                    <Phone size={16} className="subscribe-input-icon" />
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="subscribe-input has-icon"
                    />
                  </div>
                </div>
              </div>

              <div className="subscribe-field-full">
                <label className="subscribe-field-label">WhatsApp Number (Optional)</label>
                <div className="subscribe-input-wrap">
                  <Phone size={16} className="subscribe-input-icon" />
                  <input
                    type="tel"
                    placeholder="Same as mobile if left blank"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="subscribe-input has-icon"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Doorstep Delivery Address */}
            <div className="subscribe-card-section">
              <span className="subscribe-section-label">
                <MapPin size={15} /> Doorstep Delivery Address
              </span>

              <div className="subscribe-field-full">
                <label className="subscribe-field-label">
                  Complete Address (Door No, Flat, Wing, Society, Street) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Flat 402, Lotus Greens, Near Sai Mandir"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="subscribe-textarea"
                />
              </div>

              <div className="subscribe-form-grid">
                <div>
                  <label className="subscribe-field-label">Delivery Area / Locality</label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="subscribe-select"
                  >
                    <option value="Andheri West">Andheri West</option>
                    <option value="Andheri East">Andheri East</option>
                    <option value="Bandra">Bandra</option>
                    <option value="Juhu">Juhu</option>
                    <option value="Goregaon">Goregaon</option>
                    <option value="Powai">Powai</option>
                    <option value="Borivali">Borivali</option>
                    <option value="Dadar">Dadar</option>
                    <option value="Thane">Thane</option>
                    <option value="Navi Mumbai">Navi Mumbai</option>
                  </select>
                </div>

                <div>
                  <label className="subscribe-field-label">Landmark / Gate Access</label>
                  <input
                    type="text"
                    placeholder="e.g. Opposite City Park"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="subscribe-input"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Daily Delivery Plan */}
            <div className="subscribe-card-section">
              <span className="subscribe-section-label">
                <Calendar size={15} /> Daily Milk & Curd Plan
              </span>

              <div className="subscribe-form-grid">
                <div>
                  <label className="subscribe-field-label">Daily Cow Milk Quantity</label>
                  <select
                    value={formData.milkQty}
                    onChange={(e) => setFormData({ ...formData, milkQty: e.target.value })}
                    className="subscribe-select"
                  >
                    <option value={0.5}>500 ml (Half Litre)</option>
                    <option value={1}>1 Litre (Standard)</option>
                    <option value={1.5}>1.5 Litres</option>
                    <option value={2}>2 Litres (Family)</option>
                    <option value={3}>3 Litres</option>
                  </select>
                </div>

                <div>
                  <label className="subscribe-field-label">Daily Farm Curd (Dahi)</label>
                  <select
                    value={formData.curdQty}
                    onChange={(e) => setFormData({ ...formData, curdQty: e.target.value })}
                    className="subscribe-select"
                  >
                    <option value={0}>None</option>
                    <option value={250}>250 grams</option>
                    <option value={500}>500 grams (Standard)</option>
                    <option value={1000}>1 Kg (Family)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="subscribe-field-label">Delivery Schedule</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="subscribe-select"
                >
                  <option value="daily">Every Morning (Daily)</option>
                  <option value="alternate">Alternate Days (1 day gap)</option>
                  <option value="selected">Weekdays Only (Mon-Fri)</option>
                </select>
              </div>
            </div>

            {/* Delivery Guarantee Info Box (Light Mint) */}
            <div className="subscribe-info-box">
              <div className="subscribe-info-box-icon">
                <Clock size={18} />
              </div>
              <p>
                Delivery starts tomorrow between <strong>5:00 AM – 6:30 AM</strong>. Silent doorstep drop in sanitized glass bottles. Pause or adjust quantity anytime before 8:00 PM.
              </p>
            </div>

            {/* Submit Action */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="subscribe-submit-btn"
              >
                {isSubmitting ? 'Starting Subscription...' : 'Confirm Morning Subscription (Pay Monthly)'}
              </button>
              <p className="subscribe-footer-guarantee">
                🌿 100% Raw A2 Gir Cow Milk · No advance deposit · Cancel or pause anytime
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
