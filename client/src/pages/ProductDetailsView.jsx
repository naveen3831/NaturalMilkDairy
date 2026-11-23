import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  X,
  Sparkles,
  User,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Check,
  Lock,
  ChevronDown,
  Plus,
  Minus,
  Calendar,
  PhoneCall,
  Star,
  Truck,
  Leaf,
  Navigation,
  Crosshair,
  Share2,
  Edit3,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDairy } from '../context/DairyContext';
import { startSubscriptionPayment } from '../services/subscriptionPayment';
import LeafletMapPicker from '../components/LeafletMapPicker';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

const AVAILABLE_AREAS = [
  'Madhapur',
  'Hitec City',
  'Gachibowli',
  'Kondapur',
  'Jubilee Hills',
  'Banjara Hills',
  'Financial District',
  'Kukatpally',
  'Manikonda',
  'Miyapur',
  'Andheri West',
  'Andheri East',
  'Bandra',
  'Juhu',
  'Powai',
];

export default function ProductDetailsView({
  product,
  onBack,
  onSubscribe,
  customer,
  onDirectPlaceOrder,
  onNavigateDashboard,
}) {
  const { user } = useAuth();
  const { refreshAll, notifyRealtimeSync } = useDairy();

  const effectiveCustomer = customer || user || {};

  // Default initial values
  const defaultMilkQty = product?.name?.toLowerCase().includes('500ml') ? 0.5 : 1.0;
  const [milkQty, setMilkQty] = useState(defaultMilkQty);
  const [curdQty, setCurdQty] = useState(product?.category === 'curd' ? 500 : 0);
  const [orderFrequency, setOrderFrequency] = useState('subscription'); // 'one_time' or 'subscription'
  const [subscriptionSchedule, setSubscriptionSchedule] = useState('daily'); // 'daily', 'alternate', 'selected', 'weekends'
  const [alternateSchedule, setAlternateSchedule] = useState('tomorrow'); // 'tomorrow' or 'day_after'
  const [oneTimeDay, setOneTimeDay] = useState('tomorrow'); // 'tomorrow' or 'weekend'

  // Mobile edit modal state
  const [isEditMobileOpen, setIsEditMobileOpen] = useState(false);
  const [editMobileName, setEditMobileName] = useState('');
  const [editMobilePhone, setEditMobilePhone] = useState('');
  const [isSavingMobile, setIsSavingMobile] = useState(false);
  const [mobileError, setMobileError] = useState('');

  // Contact and Address state
  const [customerName, setCustomerName] = useState(effectiveCustomer.name || 'Valued Customer');
  const [customerMobile, setCustomerMobile] = useState(effectiveCustomer.mobile || '');
  const [address, setAddress] = useState(effectiveCustomer.address || '');
  const [selectedArea, setSelectedArea] = useState(effectiveCustomer.area || effectiveCustomer.assignedArea || 'Madhapur');
  const [landmark, setLandmark] = useState(effectiveCustomer.landmark || '');
  const [selectedLat, setSelectedLat] = useState(effectiveCustomer.latitude || 17.4483);
  const [selectedLng, setSelectedLng] = useState(effectiveCustomer.longitude || 78.3915);

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (effectiveCustomer) {
      if (effectiveCustomer.name) setCustomerName(effectiveCustomer.name);
      if (effectiveCustomer.mobile) setCustomerMobile(effectiveCustomer.mobile);
      if (effectiveCustomer.address) setAddress(effectiveCustomer.address);
      if (effectiveCustomer.area) setSelectedArea(effectiveCustomer.area);
      if (effectiveCustomer.landmark) setLandmark(effectiveCustomer.landmark);
      if (effectiveCustomer.latitude) setSelectedLat(effectiveCustomer.latitude);
      if (effectiveCustomer.longitude) setSelectedLng(effectiveCustomer.longitude);
    }
  }, [effectiveCustomer]);

  // Pricing calculations
  const unitPrice = useMemo(() => {
    if (!product) return 60;
    if (product.numericPrice && product.numericPrice > 0) return product.numericPrice;
    const parsed = parseFloat(String(product.price || '').replace(/[^\d.]/g, ''));
    return !isNaN(parsed) && parsed > 0 ? parsed : (product.category === 'curd' ? 35 : 60);
  }, [product]);

  const dailyCost = useMemo(() => {
    const milkCost = Math.round(milkQty * unitPrice);
    const curdCost = Math.round((curdQty / 500) * 30);
    return milkCost + curdCost;
  }, [milkQty, unitPrice, curdQty]);

  const dropsCount = useMemo(() => {
    if (orderFrequency === 'one_time') return 1;
    if (subscriptionSchedule === 'alternate') return 15;
    if (subscriptionSchedule === 'selected') return 22; // Weekdays
    if (subscriptionSchedule === 'weekends') return 8; // Weekends
    return 30; // Daily
  }, [orderFrequency, subscriptionSchedule]);

  const totalAmount = dailyCost * dropsCount;

  // Handle Share link
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  // Handle mobile number & contact update
  const handleSaveMobile = async (e) => {
    if (e) e.preventDefault();
    const cleanPhone = editMobilePhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setMobileError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!editMobileName.trim()) {
      setMobileError('Please enter customer name.');
      return;
    }
    setIsSavingMobile(true);
    setMobileError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: editMobileName.trim(),
          mobile: cleanPhone,
          address: address.trim() || 'Doorstep Delivery',
          area: selectedArea,
          landmark: landmark.trim(),
          latitude: selectedLat,
          longitude: selectedLng,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomerName(editMobileName.trim());
        setCustomerMobile(cleanPhone);
        setIsEditMobileOpen(false);
        refreshAll?.();
        notifyRealtimeSync?.();
      } else {
        setMobileError(data.message || 'Failed to update mobile number.');
      }
    } catch (err) {
      setMobileError(err.message || 'Network error updating mobile number.');
    } finally {
      setIsSavingMobile(false);
    }
  };

  // Handle Payment & Order Activation
  const handleConfirmOrder = async (e) => {
    if (e) e.preventDefault();

    if (!user) {
      alert('Please sign in or create an account to activate doorstep delivery.');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('Please enter your complete doorstep delivery address.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const isOneTime = orderFrequency === 'one_time';
      const frequencyPayload = isOneTime ? 'once' : subscriptionSchedule;

      await startSubscriptionPayment({
        user,
        purpose: isOneTime ? 'one_time' : 'new',
        days: isOneTime ? 1 : 30,
        milkQty,
        curdQty,
        milkType: product?.name || 'Farm Fresh Pure Milk',
        frequency: frequencyPayload,
        alternateSchedule,
        planName: isOneTime ? `One-Time ${product?.name || 'Milk Order'}` : `30-Day ${product?.name || 'Daily Drop'} Plan`,
        address: address.trim(),
        area: selectedArea,
        landmark: landmark.trim(),
        mobile: customerMobile || user.mobile,
        whatsapp: customerMobile || user.mobile,
        name: customerName || user.name,
        latitude: selectedLat,
        longitude: selectedLng,
        onSuccess: (verifyData) => {
          setIsSuccess(true);
          setSuccessInfo(verifyData?.subscription || {
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + (isOneTime ? 1 : 30) * 86400000).toISOString(),
          });
          refreshAll?.();
          notifyRealtimeSync?.();
          setIsSubmitting(false);
        },
        onFailure: (err) => {
          setErrorMessage(err?.reason || err?.message || 'Payment was not completed. You can try again.');
          setIsSubmitting(false);
        },
        onError: (err) => {
          setErrorMessage(err?.message || 'Checkout encountered an error. Please try again.');
          setIsSubmitting(false);
        },
      });
    } catch (err) {
      setErrorMessage(err?.message || 'Unable to start payment. Please check your network and try again.');
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  const displayImage =
    product.image ||
    product.imageUrl ||
    (Array.isArray(product.images) && product.images[0]) ||
    CLOUDINARY_MEDIA.cowMilk;

  const userInitial = (customerName || user?.name || 'C').charAt(0).toUpperCase();

  return (
    <div
      className="unified-product-checkout-root"
      style={{
        background: '#f8faf8',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        color: '#0c2340',
        paddingBottom: '100px',
      }}
    >
      {/* ── 1. HEADER (Matching Mobile Screen 3) ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #e2ebe5',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#f3f7f4',
            border: '1px solid #e2ebe5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#0d5c3a',
          }}
          aria-label="Back"
        >
          <ArrowLeft size={19} strokeWidth={2.4} />
        </button>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
          <h1
            style={{
              fontSize: '15.5px',
              fontWeight: 900,
              color: '#0c2340',
              margin: 0,
              letterSpacing: '-0.2px',
            }}
          >
            {orderFrequency === 'one_time' ? 'Single Milk Order' : 'Morning Milk Delivery'}
          </h1>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '10.5px',
              color: '#6b7280',
              fontWeight: 600,
              marginTop: '2px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
              }}
            />
            {orderFrequency === 'one_time'
              ? 'Prepaid 1-day drop • Doorstep by 6:30 AM'
              : 'Prepaid 30-day plan • Doorstep drop by 6:30 AM'}
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#f3f7f4',
            border: '1px solid #e2ebe5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#0c2340',
          }}
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.4} />
        </button>
      </header>

      {/* ── LEAFLET MAP MODAL ── */}
      {isMapOpen && (
        <LeafletMapPicker
          initialLat={selectedLat}
          initialLng={selectedLng}
          initialArea={selectedArea}
          onSelectLocation={(loc) => {
            if (loc.latitude) setSelectedLat(loc.latitude);
            if (loc.longitude) setSelectedLng(loc.longitude);
            if (loc.address) setAddress(loc.address);
            if (loc.area) setSelectedArea(loc.area);
            setIsMapOpen(false);
          }}
          onClose={() => setIsMapOpen(false)}
        />
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main
        style={{
          width: '100%',
          maxWidth: '560px',
          margin: '0 auto',
          padding: '14px 16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#991b1b',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── SUCCESS VIEW ── */}
        {isSuccess ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2ebe5',
              padding: '28px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#15803d',
              }}
            >
              <CheckCircle2 size={44} strokeWidth={2.4} />
            </div>

            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0c2340', margin: '0 0 6px 0' }}>
                {orderFrequency === 'one_time' ? 'One-Time Order Placed!' : 'Subscription Active!'}
              </h2>
              <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: 1.45 }}>
                Thank you, <strong>{customerName}</strong>.<br />
                {orderFrequency === 'one_time'
                  ? 'Your one-time doorstep delivery arrives tomorrow morning.'
                  : 'Your pure farm milk delivery starts tomorrow morning.'}
              </p>
            </div>

            <div
              style={{
                width: '100%',
                background: '#f9fafb',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                padding: '14px 16px',
                boxSizing: 'border-box',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#6b7280' }}>Delivery Address</span>
                <strong style={{ color: '#0c2340', textAlign: 'right' }}>{address}, {selectedArea}</strong>
              </div>
              {selectedLat && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                  <span style={{ color: '#6b7280' }}>Leaflet GPS Pin</span>
                  <strong style={{ color: '#0d5c3a' }}>{Number(selectedLat).toFixed(4)}, {Number(selectedLng).toFixed(4)}</strong>
                </div>
              )}
              {landmark && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                  <span style={{ color: '#6b7280' }}>Landmark</span>
                  <strong style={{ color: '#0c2340' }}>{landmark}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#6b7280' }}>Order Plan</span>
                <strong style={{ color: '#0c2340' }}>
                  {milkQty}L Milk {curdQty > 0 ? `+ ${curdQty}g Curd` : ''} ({orderFrequency === 'one_time' ? 'Single Drop' : subscriptionSchedule === 'daily' ? 'Every Morning' : subscriptionSchedule === 'alternate' ? 'Alternate Days' : 'Weekdays'})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#6b7280' }}>Delivery Window</span>
                <strong style={{ color: '#0d5c3a' }}>5:00 AM – 6:30 AM (Silent Doorstep Drop)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#6b7280' }}>Packaging</span>
                <strong style={{ color: '#0c2340' }}>Sanitized Glass Bottles · Chilled at 4°C</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={onBack}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: '#0d5c3a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 900,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Done & Return to App
            </button>
          </div>
        ) : (
          <>
            {/* ── 2. TOP SLEEK PRODUCT BANNER (Matching Screenshot 3 & 2) ── */}
            <div
              style={{
                background: '#f4faf6',
                borderRadius: '18px',
                border: '1.2px solid #dcfce7',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                boxShadow: '0 3px 10px rgba(13, 92, 58, 0.04)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '14px',
                  background: '#ffffff',
                  border: '1px solid #e2ebe5',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={displayImage}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10.5px',
                    color: '#059669',
                    fontWeight: 800,
                  }}
                >
                  <Sparkles size={12} />
                  <span>Farm Fresh · Morning Milked</span>
                </div>
                <h2
                  style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#0c2340',
                    margin: '3px 0 2px 0',
                    letterSpacing: '-0.2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {product.name}
                </h2>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, fontWeight: 600 }}>
                  Milked 4:30 AM · Delivered within 3 hrs • ₹{unitPrice}/Litre
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
                  <div style={{ display: 'flex', color: '#f59e0b' }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={12} fill="#f59e0b" />
                    ))}
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#1f2937' }}>4.9</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>(1,240+)</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: '#e0f2e4',
                      color: '#0a633b',
                      fontSize: '10px',
                      fontWeight: 800,
                    }}
                  >
                    Free Drop
                  </span>
                </div>
              </div>
            </div>

            {/* ── 3. CUSTOMER CONTACT CARD (Matching Screenshot 3) ── */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2ebe5',
                padding: '16px',
                boxShadow: '0 3px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <User size={17} color="#0d5c3a" />
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0c2340' }}>
                    Customer Contact
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '10.5px',
                      fontWeight: 800,
                    }}
                  >
                    <ShieldCheck size={12} />
                    <span>Verified</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMobileName(customerName);
                      setEditMobilePhone(customerMobile);
                      setMobileError('');
                      setIsEditMobileOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#e2f1ea',
                      border: '1px solid #a5d6a7',
                      color: '#0d5c3a',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={11} />
                    <span>Change</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#e2f1ea',
                    color: '#0d5c3a',
                    fontSize: '17px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {userInitial}
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#0c2340' }}>
                    {customerName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: 600 }}>
                    {customerMobile ? `+91 ${customerMobile}` : 'Phone verified'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. DELIVERY ADDRESS WITH LEAFLET GPS "USE MY LOCATION" (Screenshot 3 + Leaflet) ── */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2ebe5',
                padding: '18px',
                boxShadow: '0 3px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={17} color="#0d5c3a" />
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0c2340' }}>
                    Delivery Address
                  </span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>
                  Doorstep Drop
                </span>
              </div>

              {/* LEAFLET GPS Action Bar (Matching Admin & Partner Live Maps) */}
              <div
                onClick={() => setIsMapOpen(true)}
                style={{
                  padding: '11px 14px',
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
                    <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#0c2340' }}>
                      Pinpoint on Leaflet Map
                    </span>
                    <ShieldCheck size={13} color="#10b981" />
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10.5px', color: '#0d5c3a', fontWeight: 800 }}>
                    {selectedLat
                      ? `GPS Pin: ${Number(selectedLat).toFixed(4)}, ${Number(selectedLng).toFixed(4)} (${selectedArea})`
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
                  <span>{selectedLat ? 'Change' : 'Use My Location'}</span>
                </button>
              </div>

              {/* Complete Address Textarea */}
              <div style={{ marginBottom: '10px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    color: '#6b7280',
                    marginBottom: '4px',
                    fontWeight: 600,
                  }}
                >
                  Complete Address (Flat / House No., Society, Street) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Doorstep Address, Hyderabad"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    fontSize: '13px',
                    color: '#0c2340',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Locality & Landmark Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: '#6b7280',
                      marginBottom: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Locality / Area <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 28px 10px 10px',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#0c2340',
                        boxSizing: 'border-box',
                        outline: 'none',
                        appearance: 'none',
                      }}
                    >
                      {AVAILABLE_AREAS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                      {!AVAILABLE_AREAS.includes(selectedArea) && (
                        <option value={selectedArea}>{selectedArea}</option>
                      )}
                    </select>
                    <ChevronDown
                      size={14}
                      color="#6b7280"
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: '#6b7280',
                      marginBottom: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Landmark / Gate Access
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Gate 2"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      fontSize: '12px',
                      color: '#0c2340',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ── 5. CHOOSE ORDER FREQUENCY (One-Time vs Daily Drop - Screenshot 2) ── */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2ebe5',
                padding: '16px',
                boxShadow: '0 3px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: '#496653',
                  letterSpacing: '0.6px',
                  marginBottom: '12px',
                }}
              >
                CHOOSE ORDER FREQUENCY
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* One-Time Card */}
                <div
                  onClick={() => setOrderFrequency('one_time')}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    border: `1.5px solid ${orderFrequency === 'one_time' ? '#0d5c3a' : '#dce8df'}`,
                    background: orderFrequency === 'one_time' ? '#0d5c3a' : '#ffffff',
                    color: orderFrequency === 'one_time' ? '#ffffff' : '#0c2340',
                    cursor: 'pointer',
                    boxShadow: orderFrequency === 'one_time' ? '0 3px 8px rgba(13, 92, 58, 0.22)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Truck size={17} color={orderFrequency === 'one_time' ? '#ffffff' : '#0d5c3a'} />
                    <span style={{ fontSize: '13.5px', fontWeight: 900 }}>One-Time</span>
                  </div>
                  <p
                    style={{
                      fontSize: '11px',
                      margin: '6px 0 0 0',
                      color: orderFrequency === 'one_time' ? 'rgba(255,255,255,0.9)' : '#6b7280',
                      lineHeight: 1.25,
                    }}
                  >
                    Single delivery tomorrow morning
                  </p>
                </div>

                {/* Daily Drop Card */}
                <div
                  onClick={() => setOrderFrequency('subscription')}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    border: `1.5px solid ${orderFrequency === 'subscription' ? '#0d5c3a' : '#dce8df'}`,
                    background: orderFrequency === 'subscription' ? '#0d5c3a' : '#ffffff',
                    color: orderFrequency === 'subscription' ? '#ffffff' : '#0c2340',
                    cursor: 'pointer',
                    boxShadow: orderFrequency === 'subscription' ? '0 3px 8px rgba(13, 92, 58, 0.22)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Calendar size={17} color={orderFrequency === 'subscription' ? '#ffffff' : '#0d5c3a'} />
                    <span style={{ fontSize: '13.5px', fontWeight: 900 }}>Daily Drop</span>
                  </div>
                  <p
                    style={{
                      fontSize: '11px',
                      margin: '6px 0 0 0',
                      color: orderFrequency === 'subscription' ? 'rgba(255,255,255,0.9)' : '#6b7280',
                      lineHeight: 1.25,
                    }}
                  >
                    Every morning by 6:30 AM · Pause anytime
                  </p>
                </div>
              </div>
            </div>

            {/* ── 6. QUANTITY, CURD & DELIVERY SCHEDULE (Screenshot 1 & 3) ── */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2ebe5',
                padding: '18px',
                boxShadow: '0 3px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                <Calendar size={16} color="#0d5c3a" />
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#0c2340' }}>
                  {orderFrequency === 'one_time' ? 'Single Order Selection' : 'Daily Morning Plan'}
                </span>
              </div>

              {/* Milk Quantity Label */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '10px' }}>
                {orderFrequency === 'one_time' ? 'Milk' : 'Daily Cow Milk'} Quantity: <strong>{milkQty}L</strong>
              </div>

              {/* Stepper + Quick Presets Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {/* Stepper */}
                <div
                  style={{
                    height: '42px',
                    borderRadius: '12px',
                    background: '#f3f7f4',
                    border: '1px solid #dce8df',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0 4px',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (milkQty > 0.5) setMilkQty((prev) => Math.max(0.5, prev - 0.5));
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#0d5c3a',
                      padding: '6px',
                    }}
                  >
                    <Minus size={16} strokeWidth={2.4} />
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#0c2340', padding: '0 8px' }}>
                    {milkQty}L
                  </span>
                  <button
                    type="button"
                    onClick={() => setMilkQty((prev) => Math.min(10, prev + 0.5))}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#0d5c3a',
                      padding: '6px',
                    }}
                  >
                    <Plus size={16} strokeWidth={2.4} />
                  </button>
                </div>

                {/* Presets */}
                {[
                  { val: 0.5, label: '500 ml' },
                  { val: 1.0, label: '1 Litre', isPopular: true },
                  { val: 1.5, label: '1.5 L' },
                  { val: 2.0, label: '2 Litres' },
                  { val: 3.0, label: '3 Litres' },
                ].map((item) => {
                  const isSel = Math.abs(milkQty - item.val) < 0.01;
                  return (
                    <div
                      key={item.val}
                      onClick={() => setMilkQty(item.val)}
                      style={{
                        position: 'relative',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: `1.5px solid ${isSel ? '#0d5c3a' : '#dce8df'}`,
                        background: isSel ? '#0d5c3a' : '#f3f7f4',
                        color: isSel ? '#ffffff' : '#374151',
                        fontSize: '12px',
                        fontWeight: isSel ? 900 : 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                        marginTop: item.isPopular ? '6px' : '0',
                      }}
                    >
                      {item.isPopular && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: isSel ? '#ffffff' : '#0d5c3a',
                            color: isSel ? '#0d5c3a' : '#ffffff',
                            border: '1px solid #0d5c3a',
                            borderRadius: '8px',
                            padding: '1px 6px',
                            fontSize: '8.5px',
                            fontWeight: 900,
                          }}
                        >
                          Popular
                        </span>
                      )}
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Curd Add-on Section (Screenshot 1) */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', margin: '18px 0 10px 0' }}>
                {orderFrequency === 'one_time' ? 'Farm' : 'Daily Farm'} Curd (Dahi) Add-on: <strong>{curdQty === 0 ? 'None' : curdQty === 1000 ? '1 Kg' : `${curdQty}g`}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { val: 0, label: 'None', price: '' },
                  { val: 250, label: '250g', price: '+₹15' },
                  { val: 500, label: '500g', price: '+₹30' },
                  { val: 1000, label: '1 Kg', price: '+₹60' },
                ].map((item) => {
                  const isSel = curdQty === item.val;
                  return (
                    <div
                      key={item.val}
                      onClick={() => setCurdQty(item.val)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '12px',
                        border: `1.5px solid ${isSel ? '#f59e0b' : '#e2ebe5'}`,
                        background: isSel ? '#fffbeb' : '#ffffff',
                        textAlign: 'center',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: isSel ? 900 : 700,
                          color: isSel ? '#b45309' : '#374151',
                        }}
                      >
                        {item.label}
                      </span>
                      {item.price && (
                        <span style={{ fontSize: '9.5px', color: '#b45309', fontWeight: 700 }}>
                          {item.price}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Delivery Schedule (When Daily Drop is active - Screenshot 1) */}
              {orderFrequency === 'subscription' && (
                <>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', margin: '18px 0 10px 0' }}>
                    Delivery Schedule
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {/* Every Morning */}
                    <div
                      onClick={() => setSubscriptionSchedule('daily')}
                      style={{
                        position: 'relative',
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: `1.8px solid ${subscriptionSchedule === 'daily' ? '#0d5c3a' : '#e2ebe5'}`,
                        background: subscriptionSchedule === 'daily' ? '#e2f1ea' : '#f9fafb',
                        textAlign: 'center',
                        cursor: 'pointer',
                        marginTop: '7px',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#0d5c3a',
                          color: '#ffffff',
                          borderRadius: '8px',
                          padding: '1.5px 7px',
                          fontSize: '8.5px',
                          fontWeight: 900,
                        }}
                      >
                        Best Value
                      </span>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: subscriptionSchedule === 'daily' ? 900 : 700,
                          color: subscriptionSchedule === 'daily' ? '#0d5c3a' : '#0c2340',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                        }}
                      >
                        <span>Every Morning</span>
                        {subscriptionSchedule === 'daily' && <Check size={13} color="#0d5c3a" />}
                      </div>
                      <span style={{ fontSize: '9px', color: '#6b7280' }}>Daily · 30 Drops</span>
                    </div>

                    {/* Alternate Days */}
                    <div
                      onClick={() => setSubscriptionSchedule('alternate')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: `1.8px solid ${subscriptionSchedule === 'alternate' ? '#0d5c3a' : '#e2ebe5'}`,
                        background: subscriptionSchedule === 'alternate' ? '#e2f1ea' : '#f9fafb',
                        textAlign: 'center',
                        cursor: 'pointer',
                        marginTop: '7px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: subscriptionSchedule === 'alternate' ? 900 : 700,
                          color: subscriptionSchedule === 'alternate' ? '#0d5c3a' : '#0c2340',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                        }}
                      >
                        <span>Alternate Days</span>
                        {subscriptionSchedule === 'alternate' && <Check size={13} color="#0d5c3a" />}
                      </div>
                      <span style={{ fontSize: '9px', color: '#6b7280' }}>1 Day Gap · 15 Drops</span>
                    </div>

                    {/* Weekdays Only */}
                    <div
                      onClick={() => setSubscriptionSchedule('selected')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: `1.8px solid ${subscriptionSchedule === 'selected' ? '#0d5c3a' : '#e2ebe5'}`,
                        background: subscriptionSchedule === 'selected' ? '#e2f1ea' : '#f9fafb',
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: subscriptionSchedule === 'selected' ? 900 : 700,
                          color: subscriptionSchedule === 'selected' ? '#0d5c3a' : '#0c2340',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                        }}
                      >
                        <span>Weekdays Only</span>
                        {subscriptionSchedule === 'selected' && <Check size={13} color="#0d5c3a" />}
                      </div>
                      <span style={{ fontSize: '9px', color: '#6b7280' }}>Mon-Fri · 22 Drops</span>
                    </div>

                    {/* Weekends Only */}
                    <div
                      onClick={() => setSubscriptionSchedule('weekends')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: `1.8px solid ${subscriptionSchedule === 'weekends' ? '#0d5c3a' : '#e2ebe5'}`,
                        background: subscriptionSchedule === 'weekends' ? '#e2f1ea' : '#f9fafb',
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: subscriptionSchedule === 'weekends' ? 900 : 700,
                          color: subscriptionSchedule === 'weekends' ? '#0d5c3a' : '#0c2340',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                        }}
                      >
                        <span>Weekends Only</span>
                        {subscriptionSchedule === 'weekends' && <Check size={13} color="#0d5c3a" />}
                      </div>
                      <span style={{ fontSize: '9px', color: '#6b7280' }}>Sat-Sun · 8 Drops</span>
                    </div>
                  </div>

                  {/* Sub-selector for Alternate Days */}
                  {subscriptionSchedule === 'alternate' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        borderRadius: '12px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#14532d', marginBottom: '8px' }}>
                        Alternate Days Delivery Pattern:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div
                          onClick={() => setAlternateSchedule('tomorrow')}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: `1.5px solid ${alternateSchedule === 'tomorrow' ? '#0d5c3a' : '#dce8df'}`,
                            background: alternateSchedule === 'tomorrow' ? '#0d5c3a' : '#ffffff',
                            color: alternateSchedule === 'tomorrow' ? '#ffffff' : '#0c2340',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 800 }}>Start Tomorrow</div>
                          <div style={{ fontSize: '9.5px', opacity: 0.85 }}>e.g. Mon, Wed, Fri</div>
                        </div>
                        <div
                          onClick={() => setAlternateSchedule('day_after')}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: `1.5px solid ${alternateSchedule === 'day_after' ? '#0d5c3a' : '#dce8df'}`,
                            background: alternateSchedule === 'day_after' ? '#0d5c3a' : '#ffffff',
                            color: alternateSchedule === 'day_after' ? '#ffffff' : '#0c2340',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 800 }}>Start Day After</div>
                          <div style={{ fontSize: '9.5px', opacity: 0.85 }}>e.g. Tue, Thu, Sat</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-note for Weekends Only */}
                  {subscriptionSchedule === 'weekends' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#14532d',
                      }}
                    >
                      Delivered every Saturday & Sunday morning before 6:30 AM (8 drops in 30 days).
                    </div>
                  )}
                </>
              )}

              {/* Delivery Day for One-Time orders */}
              {orderFrequency === 'one_time' && (
                <>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', margin: '18px 0 10px 0' }}>
                    Delivery Day
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div
                      onClick={() => setOneTimeDay('tomorrow')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: `1.5px solid ${oneTimeDay === 'tomorrow' ? '#0d5c3a' : '#dce8df'}`,
                        background: oneTimeDay === 'tomorrow' ? '#0d5c3a' : '#ffffff',
                        color: oneTimeDay === 'tomorrow' ? '#ffffff' : '#0c2340',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 800 }}>Tomorrow Morning</div>
                      <div style={{ fontSize: '9.5px', opacity: 0.85 }}>Before 6:30 AM drop</div>
                    </div>
                    <div
                      onClick={() => setOneTimeDay('weekend')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: `1.5px solid ${oneTimeDay === 'weekend' ? '#0d5c3a' : '#dce8df'}`,
                        background: oneTimeDay === 'weekend' ? '#0d5c3a' : '#ffffff',
                        color: oneTimeDay === 'weekend' ? '#ffffff' : '#0c2340',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 800 }}>This Weekend</div>
                      <div style={{ fontSize: '9.5px', opacity: 0.85 }}>Saturday Morning</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── 7. FARM FRESH PROMISE (Screenshot 2) ── */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2ebe5',
                padding: '18px',
                boxShadow: '0 3px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: '#496653',
                  letterSpacing: '0.6px',
                  marginBottom: '12px',
                }}
              >
                FARM FRESH PROMISE
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Delivered chilled to 4°C directly from farm to doorstep',
                  'Packaged in sterilized, reusable eco-glass bottles',
                  'Zero preservatives, zero oxytocin, unadulterated pure milk',
                  'Free early-morning delivery before 6:30 AM across Hyderabad',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 500, lineHeight: 1.35 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 8. PLAN CALCULATION SUMMARY (Screenshot 1) ── */}
            <div
              style={{
                background: '#f9fafb',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#374151' }}>
                  {orderFrequency === 'one_time' ? 'Single Order Calculation' : '30-Day Plan Calculation'}
                </span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#e2f1ea',
                    color: '#0d5c3a',
                    fontSize: '10.5px',
                    fontWeight: 800,
                  }}
                >
                  {orderFrequency === 'one_time' ? '1 Morning Drop' : `${dropsCount} Morning Drops`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                <span>Milk ({milkQty}L × ₹{unitPrice}/L)</span>
                <strong style={{ color: '#0c2340', fontWeight: 800 }}>
                  ₹{Math.round(milkQty * unitPrice)}{orderFrequency === 'one_time' ? '' : '/drop'}
                </strong>
              </div>

              {curdQty > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                  <span>Curd ({curdQty === 1000 ? '1 Kg' : `${curdQty}g`})</span>
                  <strong style={{ color: '#0c2340', fontWeight: 800 }}>
                    ₹{Math.round((curdQty / 500) * 30)}{orderFrequency === 'one_time' ? '' : '/drop'}
                  </strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                <span>Doorstep Drop (Before 6:30 AM)</span>
                <strong style={{ color: '#16a34a', fontWeight: 900 }}>FREE</strong>
              </div>

              <div style={{ height: '1px', background: '#e5e7eb', margin: '10px 0' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0c2340' }}>
                    {orderFrequency === 'one_time' ? 'Total Order Amount' : 'Total Prepaid Amount'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {orderFrequency === 'one_time'
                      ? `₹${totalAmount} for 1 single morning delivery`
                      : `₹${dailyCost}/day × ${dropsCount} deliveries`}
                  </div>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0d5c3a' }}>
                  ₹{totalAmount}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── 9. FLOATING CONTACT US BUTTON (Screenshot 2) ── */}
      {!isSuccess && (
        <a
          href="https://wa.me/919876543210?text=Hello%20Natural%20Milk%20Dairy!%20I%20have%20an%20order%20inquiry."
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            right: '18px',
            bottom: '96px',
            zIndex: 40,
            background: '#059669',
            color: '#ffffff',
            borderRadius: '30px',
            padding: '9px 14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: 800,
            boxShadow: '0 3px 10px rgba(5, 150, 105, 0.35)',
          }}
        >
          <PhoneCall size={15} />
          <span>Contact Us</span>
        </a>
      )}

      {/* ── 10. STICKY BOTTOM ACTION BAR (Screenshot 1 & 3) ── */}
      {!isSuccess && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 45,
            background: '#ffffff',
            borderTop: '1px solid #e5e7eb',
            padding: '12px 16px 18px 16px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ maxWidth: '560px', margin: '0 auto', width: '100%' }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmOrder}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '14px',
                background: '#0d5c3a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 900,
                fontSize: '15px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '0.2px',
              }}
            >
              {isSubmitting ? (
                <span>Connecting Payment Gateway...</span>
              ) : (
                <>
                  <Lock size={17} />
                  <span>
                    {orderFrequency === 'one_time'
                      ? `Pay ₹${totalAmount} · Place Order`
                      : `Pay ₹${totalAmount} · Activate Delivery`}
                  </span>
                </>
              )}
            </button>

            <div
              style={{
                textAlign: 'center',
                fontSize: '10px',
                color: '#9ca3af',
                fontWeight: 600,
                marginTop: '8px',
              }}
            >
              🔒 256-Bit SSL Encrypted • Secure Checkout • Money-back Guarantee
            </div>
          </div>
        </div>
      )}

      {/* ── 11. UPDATE MOBILE NUMBER MODAL ── */}
      {isEditMobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setIsEditMobileOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2f1ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d5c3a' }}>
                  <Phone size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0c2340' }}>Update Mobile Number</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Updates contact for driver deliveries & notifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditMobileOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {mobileError && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '11.5px', marginBottom: '14px', fontWeight: 600 }}>
                {mobileError}
              </div>
            )}

            <form onSubmit={handleSaveMobile}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  value={editMobileName}
                  onChange={(e) => setEditMobileName(e.target.value)}
                  placeholder="Your Full Name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #dce8df',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                  10-Digit Mobile Number *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dce8df', borderRadius: '10px', overflow: 'hidden' }}>
                  <span style={{ padding: '0 10px', background: '#f3f4f6', color: '#0c2340', fontWeight: 800, fontSize: '13px', borderRight: '1px solid #dce8df', height: '40px', display: 'flex', alignItems: 'center' }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    value={editMobilePhone}
                    onChange={(e) => setEditMobilePhone(e.target.value)}
                    placeholder="9912020406"
                    maxLength={10}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#0c2340',
                      outline: 'none',
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditMobileOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid #dce8df',
                    background: '#f9fafb',
                    color: '#4b5563',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMobile}
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {isSavingMobile ? 'Saving...' : 'Save & Update Mobile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
