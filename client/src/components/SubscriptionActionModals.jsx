import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CalendarDays,
  PauseCircle,
  Edit3,
  Truck,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  MapPin,
  Clock,
  ShieldCheck,
  Milk,
  Lock,
  ShoppingBag,
} from 'lucide-react';
import { getApiUrl } from '../services/api';
import { startSubscriptionPayment } from '../services/subscriptionPayment';

const FARM_PRODUCTS = [
  {
    id: 'bilona-ghee',
    name: 'Desi Cow Bilona Ghee (500ml)',
    unit: '500ml',
    price: 450,
    image: '/product-ghee.jpg',
  },
  {
    id: 'malai-paneer',
    name: 'Fresh Malai Paneer (200g)',
    unit: '200g',
    price: 90,
    image: '/product-paneer.jpg',
  },
  {
    id: 'farm-butter',
    name: 'Traditional Farm Butter (250g)',
    unit: '250g',
    price: 120,
    image: '/banner_ghee_butter.png',
  },
  {
    id: 'country-eggs',
    name: 'Farm Fresh Country Eggs (Pack of 6)',
    unit: 'Pack of 6',
    price: 65,
    image: '/product-curd.jpg',
  },
];

const getAuthHeaders = () => {
  const token =
    sessionStorage.getItem('nmd_jwt_token') ||
    localStorage.getItem('nmd_jwt_token') ||
    '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ══════════════════════════════════════════════════════════════════
// 1. FULL-SCREEN: UPGRADE PLAN
// ══════════════════════════════════════════════════════════════════
export function UpgradePlanFullPage({ user, onClose, onSuccess }) {
  const [milkQty, setMilkQty] = useState(user?.deliveryPlan?.milkQty || 2);
  const [milkType, setMilkType] = useState(user?.deliveryPlan?.milkType || 'Desi Cow Milk (A2)');
  const [curdQty, setCurdQty] = useState(user?.deliveryPlan?.curdQty || 0);
  const [frequency, setFrequency] = useState(user?.deliveryPlan?.frequency || 'daily');
  const [productQuantities, setProductQuantities] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateProductQty = (prodId, delta) => {
    setProductQuantities((prev) => {
      const current = prev[prodId] || 0;
      const next = Math.max(0, Math.min(5, current + delta));
      return { ...prev, [prodId]: next };
    });
  };

  const selectedExtraProducts = useMemo(() => {
    return FARM_PRODUCTS.filter((p) => (productQuantities[p.id] || 0) > 0).map((p) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      price: p.price,
      quantity: productQuantities[p.id],
    }));
  }, [productQuantities]);

  const dailyMilkCost = milkQty * (milkType.includes('A2') ? 60 : 54);
  const dailyCurdCost = (curdQty / 500) * 30;
  const extraProductsDaily = selectedExtraProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const dailyTotal = dailyMilkCost + dailyCurdCost + extraProductsDaily;
  const planTotal = dailyTotal * 30;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const extraDesc = selectedExtraProducts.length
        ? ` + ${selectedExtraProducts.map((p) => `${p.quantity}x ${p.name.split('(')[0].trim()}`).join(', ')}`
        : '';
      const planName = `${milkType} Daily Plan (${milkQty}L)${extraDesc}`;

      await startSubscriptionPayment({
        purpose: 'upgrade',
        milkQty,
        curdQty,
        milkType,
        frequency,
        planName,
        extraProducts: selectedExtraProducts,
        address: user?.address || 'Doorstep Delivery',
        area: user?.area || 'Madhapur',
        mobile: user?.mobile,
        name: user?.name,
        onSuccess: (data) => {
          setIsSubmitting(false);
          onSuccess(`Plan upgraded successfully to ${milkQty}L ${milkType}${selectedExtraProducts.length ? ` with ${selectedExtraProducts.length} farm products` : ''}! Payment verified.`);
        },
        onError: (err) => {
          setIsSubmitting(false);
          alert(err.message || 'Payment failed or was cancelled.');
        },
      });
    } catch (err) {
      setIsSubmitting(false);
      alert(err.message || 'Payment failed or was cancelled.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2ebe5',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0c2340',
          }}
        >
          <ArrowLeft size={19} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0c2340' }}>
            Upgrade Subscription Plan
          </h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
            Realtime database sync with delivery partner
          </p>
        </div>
        <div style={{ width: '36px' }} />
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px', maxWidth: '540px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1.5px solid #bbf7d0',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#166534' }}>Customize Your Morning Drop</h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#15803d' }}>Higher volume, premium A2 milk, or add farm fresh dairy essentials</p>
          </div>
        </div>

        {/* Milk Type Selection */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
            SELECT MILK TYPE
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { type: 'Desi Cow Milk (A2)', price: 60, desc: '100% Raw A2 milk from free-grazing Gir/Sahiwal cows' },
              { type: 'Pure Buffalo Milk', price: 54, desc: 'Rich, thick 7% fat whole milk, ideal for traditional tea/ghee' },
            ].map((item) => (
              <div
                key={item.type}
                onClick={() => setMilkType(item.type)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: milkType === item.type ? '2px solid #0d5c3a' : '1.2px solid #e2ebe5',
                  background: milkType === item.type ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0c2340', fontWeight: 800 }}>{item.type}</strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.desc}</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0d5c3a' }}>₹{item.price}/L</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quantity Stepper */}
        <div style={{ marginBottom: '18px', background: '#f8faf9', padding: '16px', borderRadius: '16px', border: '1px solid #e2ebe5' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
            DAILY MILK QUANTITY
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <button
              type="button"
              onClick={() => setMilkQty((q) => Math.max(1, q - 1))}
              style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Minus size={18} color="#0c2340" />
            </button>
            <div style={{ minWidth: '90px', textAlign: 'center' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0c2340' }}>{milkQty}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginLeft: '4px' }}>Litre / day</span>
            </div>
            <button
              type="button"
              onClick={() => setMilkQty((q) => Math.min(10, q + 1))}
              style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e2f1ea', border: '1px solid #a7d7bc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={18} color="#0d5c3a" />
            </button>
          </div>
        </div>

        {/* Curd Add-on */}
        <div style={{ marginBottom: '18px', background: '#f8faf9', padding: '16px', borderRadius: '16px', border: '1px solid #e2ebe5' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
            ADD FRESH COUNTRY CURD (OPTIONAL)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 500, 1000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCurdQty(amt)}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  borderRadius: '12px',
                  border: curdQty === amt ? '2px solid #0d5c3a' : '1px solid #cbd5e1',
                  background: curdQty === amt ? '#f0fdf4' : '#ffffff',
                  color: curdQty === amt ? '#0d5c3a' : '#475569',
                  fontWeight: curdQty === amt ? 800 : 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                {amt === 0 ? 'No Curd' : `${amt}g (+₹${(amt / 500) * 30})`}
              </button>
            ))}
          </div>
        </div>

        {/* Dedicated Section: Add More Farm Fresh Products to Subscription */}
        <div style={{ marginBottom: '20px', background: '#ffffff', padding: '16px', borderRadius: '16px', border: '1.5px solid #d1fae5', boxShadow: '0 2px 8px rgba(13, 92, 58, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={16} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.86rem', fontWeight: 900, color: '#0c2340' }}>
                  Add More Farm Fresh Products
                </strong>
                <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
                  Delivered with your morning milk drop
                </span>
              </div>
            </div>
            {selectedExtraProducts.length > 0 && (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0d5c3a', background: '#e2f1ea', padding: '3px 8px', borderRadius: '10px' }}>
                {selectedExtraProducts.length} selected (+₹{extraProductsDaily}/day)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FARM_PRODUCTS.map((prod) => {
              const qty = productQuantities[prod.id] || 0;
              return (
                <div
                  key={prod.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: qty > 0 ? '1.5px solid #0d5c3a' : '1px solid #e2ebe5',
                    background: qty > 0 ? '#f0fdf4' : '#fafbfb',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <img
                      src={prod.image}
                      alt={prod.name}
                      onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        border: '1px solid #e2ebe5',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.82rem', color: '#0c2340', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prod.name}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#0d5c3a', fontWeight: 700 }}>
                        ₹{prod.price} <span style={{ color: '#64748b', fontWeight: 500 }}>• {prod.unit}</span>
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateProductQty(prod.id, -1)}
                      disabled={qty <= 0}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: qty > 0 ? '#ffffff' : '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        cursor: qty > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: qty > 0 ? 1 : 0.4,
                      }}
                    >
                      <Minus size={15} color="#0c2340" />
                    </button>
                    <span style={{ minWidth: '18px', textAlign: 'center', fontWeight: 900, fontSize: '0.88rem', color: qty > 0 ? '#0d5c3a' : '#64748b' }}>
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateProductQty(prod.id, 1)}
                      disabled={qty >= 5}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#e2f1ea',
                        border: '1px solid #a7d7bc',
                        cursor: qty < 5 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={15} color="#0d5c3a" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Frequency */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
            DELIVERY FREQUENCY
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'daily', label: 'Daily Morning' },
              { id: 'alternate', label: 'Alternate Days' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrequency(f.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: frequency === f.id ? '2px solid #0d5c3a' : '1px solid #cbd5e1',
                  background: frequency === f.id ? '#f0fdf4' : '#ffffff',
                  color: frequency === f.id ? '#0d5c3a' : '#475569',
                  fontWeight: frequency === f.id ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Breakdown Box */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fefce8 0%, #fffbeb 100%)',
            border: '1.5px solid #fef08a',
            padding: '14px 16px',
            borderRadius: '14px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.80rem', color: '#713f12' }}>
            <span>
              Milk ({milkQty}L @ ₹{milkType.includes('A2') ? 60 : 54})
              {curdQty > 0 ? ` + Curd (${curdQty}g)` : ''}
              {extraProductsDaily > 0 ? ` + Extra Farm Items (₹${extraProductsDaily})` : ''}:
            </span>
            <strong style={{ fontWeight: 800, fontSize: '0.90rem', color: '#854d0e' }}>
              ₹{dailyTotal} / drop
            </strong>
          </div>
          <div style={{ height: '1px', background: '#fef08a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#854d0e' }}>
              Total 30-Day Prepaid Amount:
            </span>
            <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0d5c3a' }}>
              ₹{planTotal.toLocaleString('en-IN')}
            </strong>
          </div>
        </div>

        {/* Bottom Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '16px',
            border: 'none',
            background: '#0d5c3a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Lock size={18} />
          {isSubmitting
            ? 'Processing Payment...'
            : `Pay ₹${planTotal.toLocaleString('en-IN')} · Upgrade Plan & Add Products`}
        </button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 2. FULL-SCREEN: EXTEND SUBSCRIPTION
// ══════════════════════════════════════════════════════════════════
export function ExtendSubscriptionFullPage({ user, onClose, onSuccess }) {
  const [selectedDays, setSelectedDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const milkQty = user?.deliveryPlan?.milkQty || 1;
  const pricePerDay = milkQty * 60 + ((user?.deliveryPlan?.curdQty || 0) / 500) * 30;
  const totalCost = selectedDays * pricePerDay;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await startSubscriptionPayment({
        purpose: 'extend',
        days: selectedDays,
        milkQty,
        curdQty: user?.deliveryPlan?.curdQty || 0,
        address: user?.address || 'Doorstep Delivery',
        area: user?.area || 'Madhapur',
        mobile: user?.mobile,
        name: user?.name,
        onSuccess: (data) => {
          setIsSubmitting(false);
          onSuccess(`Subscription extended by ${selectedDays} days! Payment verified via Razorpay.`);
        },
        onError: (err) => {
          setIsSubmitting(false);
          alert(err.message || 'Extension payment was cancelled or failed.');
        },
      });
    } catch (err) {
      setIsSubmitting(false);
      alert(err.message || 'Extension payment was cancelled or failed.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2ebe5',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0c2340',
          }}
        >
          <ArrowLeft size={19} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0c2340' }}>
            Extend Subscription Duration
          </h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
            Zero-gap automatic morning delivery extension
          </p>
        </div>
        <div style={{ width: '36px' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px', maxWidth: '520px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #fde68a',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#d97706', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarDays size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#92400e' }}>Keep Fresh Milk Coming</h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#b45309' }}>Add extra days so you never run out of morning milk</p>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '10px' }}>
          SELECT EXTENSION PERIOD
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '22px' }}>
          {[
            { days: 7, label: `+7 Days (₹${7 * pricePerDay})`, tag: 'Trial Extension' },
            { days: 15, label: `+15 Days (₹${15 * pricePerDay})`, tag: 'Half Month' },
            { days: 30, label: `+30 Days (₹${30 * pricePerDay})`, tag: 'Most Popular' },
            { days: 60, label: `+60 Days (₹${60 * pricePerDay})`, tag: 'Best Value' },
          ].map((item) => (
            <div
              key={item.days}
              onClick={() => setSelectedDays(item.days)}
              style={{
                padding: '14px',
                borderRadius: '14px',
                border: selectedDays === item.days ? '2px solid #d97706' : '1.2px solid #e2ebe5',
                background: selectedDays === item.days ? '#fffbeb' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ fontSize: '0.94rem', color: '#0c2340', fontWeight: 900 }}>{item.label}</strong>
                {selectedDays === item.days && <CheckCircle2 size={16} color="#d97706" />}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>{item.tag}</span>
              <div style={{ marginTop: '8px', fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>
                ₹{item.days * pricePerDay}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '0.86rem', marginBottom: '4px' }}>
            <ShieldCheck size={18} />
            <span>Guaranteed Morning Deliveries</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.74rem', color: '#15803d' }}>
            Deliveries continue without interruption before 6:30 AM. Wallet charges apply daily.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '16px',
            border: 'none',
            background: '#0d5c3a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Lock size={18} />
          {isSubmitting ? 'Processing Payment...' : `Pay ₹${totalCost} · Extend Subscription (${selectedDays} Days)`}
        </button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 3. FULL-SCREEN: PAUSE DELIVERY FOR A TRIP
// ══════════════════════════════════════════════════════════════════
export function PauseDeliveryFullPage({ user, onClose, onSuccess }) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const fourDays = new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0];

  const [pauseFrom, setPauseFrom] = useState(tomorrow);
  const [pauseUntil, setPauseUntil] = useState(fourDays);
  const [reason, setReason] = useState('Vacation / Out of station');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/api/customers/me/pause'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          pauseFrom,
          pauseUntil,
          reason,
          actor: user?.name || 'Customer',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(`Deliveries paused from ${pauseFrom} to ${pauseUntil}! Partner notified.`);
      } else {
        alert(data.message || 'Unable to pause delivery.');
      }
    } catch (err) {
      alert('Pause failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2ebe5',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0c2340',
          }}
        >
          <ArrowLeft size={19} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0c2340' }}>
            Pause Delivery for a Trip
          </h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
            Temporary vacation hold with instant driver route sync
          </p>
        </div>
        <div style={{ width: '36px' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px', maxWidth: '520px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #fef9ee 0%, #fef3c7 100%)',
            border: '1.5px solid #fde68a',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#d97706', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PauseCircle size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#92400e' }}>Zero Waste Vacation Hold</h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#b45309' }}>No bottles will be dropped during your pause. Resumes automatically on return.</p>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
          PAUSE DATE RANGE
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>From Date</span>
            <input
              type="date"
              value={pauseFrom}
              min={tomorrow}
              onChange={(e) => setPauseFrom(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.2px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>To Date</span>
            <input
              type="date"
              value={pauseUntil}
              min={pauseFrom}
              onChange={(e) => setPauseUntil(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.2px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Quick chip buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { label: 'Weekend (2 Days)', days: 2 },
            { label: '4 Days Trip', days: 4 },
            { label: '1 Week Off', days: 7 },
            { label: '15 Days Holiday', days: 15 },
          ].map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                const end = new Date(new Date(pauseFrom).getTime() + c.days * 86400000).toISOString().split('T')[0];
                setPauseUntil(end);
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '999px',
                background: '#e2f1ea',
                border: '1px solid #bbf7d0',
                color: '#0d5c3a',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
          REASON FOR PAUSE
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
          {[
            'Vacation / Out of station',
            'Traveling on business',
            'Sufficient milk stock at home',
            'Family function / emergency',
            'Other personal reason',
          ].map((r) => (
            <label
              key={r}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '12px',
                border: reason === r ? '2px solid #0d5c3a' : '1px solid #e2ebe5',
                background: reason === r ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: reason === r ? 800 : 600,
                color: '#0c2340',
              }}
            >
              <input
                type="radio"
                name="pauseReason"
                checked={reason === r}
                onChange={() => setReason(r)}
                style={{ accentColor: '#0d5c3a' }}
              />
              <span>{r}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '16px',
            border: 'none',
            background: '#0d5c3a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
          }}
        >
          {isSubmitting ? 'Saving Pause...' : 'Confirm Trip Pause'}
        </button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 4. FULL-SCREEN: CHANGE TOMORROW'S QUANTITY
// ══════════════════════════════════════════════════════════════════
export function ChangeTomorrowQtyFullPage({ user, onClose, onSuccess }) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [milkQty, setMilkQty] = useState(user?.deliveryPlan?.milkQty || 1);
  const [curdQty, setCurdQty] = useState(user?.deliveryPlan?.curdQty || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/api/customers/me/temp-qty'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          date: tomorrow,
          milkQty,
          curdQty,
          actor: user?.name || 'Customer',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(`Tomorrow's delivery quantity set to ${milkQty}L Milk${curdQty > 0 ? ` & ${curdQty}g Curd` : ''}!`);
      } else {
        alert(data.message || 'Unable to update tomorrow quantity.');
      }
    } catch (err) {
      alert('Quantity change failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2ebe5',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0c2340',
          }}
        >
          <ArrowLeft size={19} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0c2340' }}>
            Change Tomorrow's Quantity
          </h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
            Single day adjustment for tomorrow morning's drop
          </p>
        </div>
        <div style={{ width: '36px' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px', maxWidth: '520px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1.5px solid #bbf7d0',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Edit3 size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#166534' }}>Drop Date: {tomorrow}</h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#15803d' }}>Delivery before 6:30 AM. Your regular plan resumes automatically afterwards.</p>
          </div>
        </div>

        {/* Milk Stepper */}
        <div style={{ background: '#f8faf9', padding: '16px', borderRadius: '16px', border: '1px solid #e2ebe5', marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
            TOMORROW'S MILK QUANTITY
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', margin: '14px 0' }}>
            <button
              type="button"
              onClick={() => setMilkQty((q) => Math.max(0, q - 0.5))}
              style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Minus size={18} color="#0c2340" />
            </button>
            <div style={{ minWidth: '90px', textAlign: 'center' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0c2340' }}>{milkQty}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginLeft: '4px' }}>L</span>
            </div>
            <button
              type="button"
              onClick={() => setMilkQty((q) => Math.min(10, q + 0.5))}
              style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e2f1ea', border: '1px solid #a7d7bc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={18} color="#0d5c3a" />
            </button>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', display: 'block' }}>Regular quantity: {user?.deliveryPlan?.milkQty || 1}L</span>
        </div>

        {/* Curd Stepper */}
        <div style={{ background: '#f8faf9', padding: '16px', borderRadius: '16px', border: '1px solid #e2ebe5', marginBottom: '22px' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
            TOMORROW'S CURD QUANTITY
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            {[0, 500, 1000, 1500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCurdQty(amt)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: '12px',
                  border: curdQty === amt ? '2px solid #0d5c3a' : '1px solid #cbd5e1',
                  background: curdQty === amt ? '#f0fdf4' : '#ffffff',
                  color: curdQty === amt ? '#0d5c3a' : '#475569',
                  fontWeight: curdQty === amt ? 800 : 600,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                }}
              >
                {amt === 0 ? 'No Curd' : `${amt}g`}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '16px',
            border: 'none',
            background: '#0d5c3a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
          }}
        >
          {isSubmitting ? 'Updating Tomorrow\'s Drop...' : 'Save Tomorrow\'s Quantity'}
        </button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 5. FULL-SCREEN: CHANGE DELIVERY ADDRESS
// ══════════════════════════════════════════════════════════════════
export function ChangeAddressFullPage({ user, onClose, onSuccess }) {
  const [address, setAddress] = useState(user?.address || '');
  const [area, setArea] = useState(user?.area || 'Madhapur');
  const [landmark, setLandmark] = useState(user?.landmark || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const areas = ['Madhapur', 'Gachibowli', 'Kondapur', 'Hitec City', 'Jubilee Hills', 'Banjara Hills', 'Kukatpally', 'Manikonda'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      alert('Please enter your full street / house address.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/api/customers/me/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: user?.name || 'Customer',
          mobile: user?.mobile || '9999999999',
          address: address.trim(),
          area: area.trim(),
          landmark: landmark.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess('Delivery address updated successfully! Assigned driver notified.');
      } else {
        alert(data.message || 'Unable to update address.');
      }
    } catch (err) {
      alert('Address update failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2ebe5',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0c2340',
          }}
        >
          <ArrowLeft size={19} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0c2340' }}>
            Change Delivery Address
          </h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
            Realtime route update for morning doorstep deliveries
          </p>
        </div>
        <div style={{ width: '36px' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px', maxWidth: '520px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1.5px solid #bae6fd',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0369a1' }}>Doorstep Bottle Drop Location</h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#0284c7' }}>Our delivery partner will use these coordinates and instructions.</p>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
            HOUSE / FLAT / BUILDING ADDRESS
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder="e.g. Flat 402, Lotus Greens Apartment, Road No 10"
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.2px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
            AREA / LOCALITY
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {areas.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setArea(a)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: area === a ? '1.5px solid #0d5c3a' : '1px solid #cbd5e1',
                  background: area === a ? '#e2f1ea' : '#ffffff',
                  color: area === a ? '#0d5c3a' : '#475569',
                  fontWeight: area === a ? 800 : 600,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Enter custom area / sector"
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.2px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
            LANDMARK / SPECIAL DROP INSTRUCTIONS
          </label>
          <input
            type="text"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. Opposite community park / Leave bottles in door milk bag"
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.2px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '16px',
            border: 'none',
            background: '#0d5c3a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
          }}
        >
          {isSubmitting ? 'Saving New Address...' : 'Update Delivery Address'}
        </button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 6. FULL-SCREEN: STOP SUBSCRIPTION
// ══════════════════════════════════════════════════════════════════
export function StopSubscriptionFullPage({ user, onClose, onSuccess }) {
  const [reason, setReason] = useState('Relocating to another city/area');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to stop recurring milk deliveries? You can restart anytime.')) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/api/customers/me/pause'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          reason: `Customer stopped: ${reason}`,
          actor: user?.name || 'Customer',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess('Subscription has been stopped. Deliveries will be held.');
      } else {
        alert(data.message || 'Unable to stop subscription.');
      }
    } catch (err) {
      alert('Stop failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2ebe5',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0c2340',
          }}
        >
          <ArrowLeft size={19} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#dc2626' }}>
            Stop Subscription
          </h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
            Cancel or hold recurring daily milk deliveries
          </p>
        </div>
        <div style={{ width: '36px' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px', maxWidth: '520px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1.5px solid #fecaca',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#991b1b' }}>We'll Miss You!</h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#b91c1c' }}>Your remaining wallet balance stays safe in your account.</p>
          </div>
        </div>

        <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '14px', borderRadius: '14px', marginBottom: '20px' }}>
          <strong style={{ display: 'block', fontSize: '0.84rem', color: '#854d0e', marginBottom: '4px' }}>
            💡 Going away for a short trip?
          </strong>
          <p style={{ margin: 0, fontSize: '0.74rem', color: '#a16207' }}>
            You don't need to stop your subscription! You can use the "Pause Delivery for a Trip" option instead to skip days without cancelling.
          </p>
        </div>

        <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#334155', marginBottom: '10px' }}>
          PLEASE TELL US THE REASON
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '26px' }}>
          {[
            'Relocating to another city/area',
            'Milk quantity was too high/low',
            'Taking an extended break from dairy',
            'Switching to store-bought milk',
            'Financial / budget reasons',
            'Other feedback',
          ].map((r) => (
            <label
              key={r}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: reason === r ? '2px solid #dc2626' : '1px solid #e2ebe5',
                background: reason === r ? '#fef2f2' : '#ffffff',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: reason === r ? 800 : 600,
                color: '#0c2340',
              }}
            >
              <input
                type="radio"
                name="stopReason"
                checked={reason === r}
                onChange={() => setReason(r)}
                style={{ accentColor: '#dc2626' }}
              />
              <span>{r}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '16px',
            border: 'none',
            background: '#dc2626',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)',
          }}
        >
          {isSubmitting ? 'Stopping Plan...' : 'Confirm & Stop Subscription'}
        </button>
      </form>
    </div>
  );
}
