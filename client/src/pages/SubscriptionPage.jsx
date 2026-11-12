import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Stars,
  CheckCircle2,
  Clock,
  Clock3,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  PauseCircle,
  PlayCircle,
  Milk,
  RotateCcw,
  Check,
  ChevronRight,
  HelpCircle,
  Package,
  Truck,
  Snowflake,
  Leaf,
  MapPin,
  Eye,
  Settings,
  Bell,
  Home,
  Edit3,
  X,
  LayoutGrid,
  UserRound,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomerBottomNav, { CUSTOMER_HOME_NAV_ITEMS } from '../components/CustomerBottomNav';
import SubscriptionHistoryModal, { SubscriptionStatusBadge } from '../components/SubscriptionHistoryModal';
import { startSubscriptionPayment, getSubscriptionHistory } from '../services/subscriptionPayment';
import {
  UpgradePlanFullPage,
  ExtendSubscriptionFullPage,
  PauseDeliveryFullPage,
  ChangeTomorrowQtyFullPage,
  ChangeAddressFullPage,
  StopSubscriptionFullPage,
} from '../components/SubscriptionActionModals';

export default function SubscriptionPage({ setActiveTab }) {
  const { user } = useAuth();
  const isLoggedInCustomer = user?.role === 'customer';

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [selectedWeekdayIndex, setSelectedWeekdayIndex] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [extendingSub, setExtendingSub] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentState, setPaymentState] = useState({
    loading: false,
    failed: false,
    failedReason: '',
    orderId: null,
    planId: null,
    success: false,
  });

  const [activeSubscription, setActiveSubscription] = useState(null);

  useEffect(() => {
    if (isLoggedInCustomer) {
      getSubscriptionHistory()
        .then((subs) => {
          if (Array.isArray(subs) && subs.length > 0) {
            const found = subs.find((s) => s.status === 'active' || s.status === 'paused') || subs[0];
            if (found) setActiveSubscription(found);
          }
        })
        .catch(() => { });
    }
  }, [isLoggedInCustomer]);

  const expiryInfo = React.useMemo(() => {
    let targetDate = null;
    const raw = activeSubscription?.endDate || user?.subscription?.endDate || user?.subscriptionEndDate;
    if (raw) {
      targetDate = new Date(raw);
    } else {
      const now = new Date();
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 28);
    }
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
    const diffDays = Math.ceil((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
    const formattedDate = targetDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const isExpired = diffDays < 0;
    const isExpiringSoon = diffDays >= 0 && diffDays <= 3;

    let countdownText = '';
    if (isExpired) {
      countdownText = `Expired on ${formattedDate}`;
    } else if (diffDays === 0) {
      countdownText = 'Expires Today';
    } else if (diffDays === 1) {
      countdownText = '1 Day Remaining';
    } else {
      countdownText = `${diffDays} Days Remaining`;
    }

    return {
      formattedDate,
      diffDays,
      isExpired,
      isExpiringSoon,
      countdownText,
    };
  }, [activeSubscription, user]);

  const renderExpiryCard = (compact = false) => {
    const { formattedDate, countdownText, isExpired, isExpiringSoon } = expiryInfo;
    const badgeBg = isExpired ? '#fef2f2' : isExpiringSoon ? '#fffbeb' : '#e2f1ea';
    const badgeBorder = isExpired ? '#fecaca' : isExpiringSoon ? '#fde68a' : '#bbf7d0';
    const badgeColor = isExpired ? '#dc2626' : isExpiringSoon ? '#b45309' : '#0d5c3a';

    return (
      <div
        style={{
          background: isExpired ? '#fff5f5' : isExpiringSoon ? '#fffdf5' : '#f0fdf4',
          border: `1.5px solid ${badgeBorder}`,
          borderRadius: '16px',
          padding: compact ? '12px 14px' : '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: badgeBg,
                color: badgeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CalendarDays size={18} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                Subscription Expiry
              </span>
              <strong style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0c2340', display: 'block' }}>
                Valid Until: {formattedDate}
              </strong>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: badgeBg,
              border: `1px solid ${badgeBorder}`,
              color: badgeColor,
              fontWeight: 800,
              fontSize: '0.72rem',
              flexShrink: 0,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badgeColor }} />
            {countdownText}
          </span>
        </div>

        {(isExpiringSoon || isExpired) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isExpired ? '#fee2e2' : '#fef3c7',
              padding: '8px 12px',
              borderRadius: '10px',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={15} color={badgeColor} />
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: badgeColor }}>
                {isExpired ? 'Plan expired. Renew to continue daily deliveries!' : 'Expiring soon! Extend to keep morning deliveries.'}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowExtendModal(true);
              }}
              style={{
                background: badgeColor,
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Extend / Renew Plan
            </button>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedPlan, setSelectedPlan] = useState('cow-daily');
  const [selectedFrequency, setSelectedFrequency] = useState('daily');
  const [milkQuantity, setMilkQuantity] = useState(1);

  const plans = [
    {
      id: 'cow-daily',
      name: 'Desi Cow Milk (A2)',
      tag: 'Most Popular',
      pricePerLiter: 60,
      description: '100% pure, unadulterated raw A2 cow milk delivered fresh from morning milking in eco-friendly glass bottles.',
      features: [
        'Naturally rich in A2 Beta-casein',
        'Delivered before 6:30 AM daily',
        'Zero chemicals, zero adulteration',
        'Pause or skip deliveries anytime',
      ],
      popular: true,
      color: '#059669',
      bgColor: '#ecfdf5',
      borderColor: '#a7f3d0',
    },
    {
      id: 'buffalo-daily',
      name: 'Rich Buffalo Milk',
      tag: 'Creamy & Thick',
      pricePerLiter: 75,
      description: 'High-fat, rich whole buffalo milk with thick natural malai layer. Perfect for authentic chai, paneer, and sweets.',
      features: [
        'Naturally thick & high cream content',
        'Delivered before 6:30 AM daily',
        'Purity tested before every dispatch',
        'Modify quantities with 1 tap',
      ],
      popular: false,
      color: '#0284c7',
      bgColor: '#f0f9ff',
      borderColor: '#bae6fd',
    },
    {
      id: 'combo-essential',
      name: 'Morning Essentials Combo',
      tag: 'Best Value',
      pricePerLiter: 95,
      description: '1L Farm Cow Milk + 500g Artisanal Clay Pot Curd combo delivered fresh to your doorstep every morning.',
      features: [
        'Complete morning breakfast nutrition',
        'Includes daily fresh clay pot curd',
        'Save ₹15 per day on combo bundle',
        'Pause deliveries when traveling',
      ],
      popular: false,
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
    },
  ];

  const handleStartPlan = async (planId) => {
    if (!isLoggedInCustomer) {
      localStorage.setItem('nmd_pending_subscription', JSON.stringify({
        planId,
        frequency: selectedFrequency,
        quantity: milkQuantity,
      }));
      if (typeof setActiveTab === 'function') {
        setActiveTab('login');
      }
      return;
    }

    setPaymentState({
      loading: true,
      failed: false,
      failedReason: '',
      orderId: null,
      planId,
      success: false,
    });

    const isCombo = planId === 'combo-essential';
    const planMilkQty = isCombo ? 1 : (milkQuantity || 1);
    const planCurdQty = isCombo ? 500 : 0;

    const payload = {
      address: user?.address || 'Doorstep drop',
      area: user?.area || user?.assignedArea || 'Madhupur',
      landmark: user?.landmark || '',
      whatsapp: user?.mobile || '',
      mobile: user?.mobile || '',
      name: user?.name || 'Customer',
      milkQty: planMilkQty,
      curdQty: planCurdQty,
      frequency: selectedFrequency || 'daily',
      deliveryDays: [],
    };

    try {
      await startSubscriptionPayment({
        planPayload: payload,
        user,
        onSuccess: (result) => {
          setPaymentState({
            loading: false,
            failed: false,
            failedReason: '',
            orderId: result.order?.id,
            planId,
            success: true,
          });
          if (isMobile) {
            setShowMobileDetails(true);
          }
        },
        onFailure: (failInfo) => {
          setPaymentState({
            loading: false,
            failed: true,
            failedReason: failInfo.reason || 'Payment could not be completed.',
            orderId: failInfo.orderId,
            planId,
            success: false,
          });
        },
      });
    } catch (err) {
      setPaymentState({
        loading: false,
        failed: true,
        failedReason: err.message || 'Unable to connect to Razorpay payment gateway.',
        orderId: null,
        planId,
        success: false,
      });
    }
  };

  const renderPaymentNotice = () => {
    if (paymentState.loading) {
      return (
        <div
          style={{
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#0369a1',
            fontWeight: 700,
            fontSize: '0.84rem',
            boxShadow: '0 2px 8px rgba(3, 105, 161, 0.08)',
          }}
        >
          <RotateCcw size={16} className="spin" />
          <span>Opening Razorpay Secure Checkout...</span>
        </div>
      );
    }

    if (paymentState.failed) {
      return (
        <div
          style={{
            background: '#fff1f2',
            border: '1.5px solid #fecaca',
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.10)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <ShieldAlert size={22} color="#dc2626" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <strong style={{ color: '#9f1239', fontSize: '0.88rem', display: 'block' }}>
                Subscription Payment Failed
              </strong>
              <span style={{ color: '#be123c', fontSize: '0.74rem', lineHeight: 1.3, display: 'block' }}>
                {paymentState.failedReason || 'Payment was cancelled or rejected by gateway.'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleStartPlan(paymentState.planId || selectedPlan)}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              }}
            >
              <RotateCcw size={13} />
              <span>Retry Payment</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              style={{
                background: '#ffffff',
                color: '#9f1239',
                border: '1px solid #fca5a5',
                padding: '7px 12px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.74rem',
                cursor: 'pointer',
              }}
            >
              History
            </button>
          </div>
        </div>
      );
    }

    if (paymentState.success) {
      return (
        <div
          style={{
            background: '#ecfdf5',
            border: '1.5px solid #a7f3d0',
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.10)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={22} color="#059669" />
            <div>
              <strong style={{ color: '#065f46', fontSize: '0.88rem', display: 'block' }}>
                Subscription Activated!
              </strong>
              <span style={{ color: '#047857', fontSize: '0.74rem' }}>
                Your 30-day fresh morning deliveries start tomorrow before 6:30 AM.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            style={{
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            View Subscriptions
          </button>
        </div>
      );
    }

    return null;
  };

  // Mobile Subscription Details Screen (Image 2)
  const renderMobileDetails = () => {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div style={{ minHeight: '100vh', background: '#f9faf9', padding: '16px 16px 105px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
          <button
            type="button"
            onClick={() => setShowMobileDetails(false)}
            aria-label="Back"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#ffffff',
              border: '1.2px solid #e2ebe5',
              color: '#0c2340',
              fontWeight: 700,
              fontSize: '0.80rem',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0c2340', textAlign: 'center' }}>
            Subscription Details
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              title="Subscription History"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '20px',
                background: '#e2f1ea',
                border: '1px solid #b7dfca',
                color: '#0d5c3a',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
              }}
            >
              <Clock size={13} />
              <span>History</span>
            </button>

            <div
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1.2px solid #e2ebe5',
                color: '#0d5c3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} />
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#e53935',
                }}
              />
            </div>
          </div>
        </div>

        {renderPaymentNotice()}

        {/* 1. Summary Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <img
              src="/sub_active_thumb.png"
              onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}
              alt="Farm Pure Milk"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                objectFit: 'cover',
                border: '1px solid #e2ebe5',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0c2340', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Daily Farm Pure Milk Plan
                </h4>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '20px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: '#e2f1ea',
                    color: '#0d5c3a',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0d5c3a' }} />
                  Active
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 600 }}>
                ID: {user?.customerId || 'CUST-101'} • {user?.deliveryPlan?.frequency === 'alternate' ? 'Alternate Days' : 'Daily Morning'}
              </span>
            </div>
          </div>

          {/* 2 Metric Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              style={{
                background: '#f7faf8',
                borderRadius: '12px',
                border: '1px solid #e5ede8',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Milk size={18} color="#0d5c3a" />
              <div>
                <strong style={{ display: 'block', fontSize: '0.84rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15 }}>
                  1 L / day
                </strong>
                <span style={{ fontSize: '0.70rem', color: '#6b7280' }}>Pure A2 Milk</span>
              </div>
            </div>

            <div
              style={{
                background: '#f7faf8',
                borderRadius: '12px',
                border: '1px solid #e5ede8',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Clock3 size={18} color="#0d5c3a" />
              <div>
                <strong style={{ display: 'block', fontSize: '0.84rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15 }}>
                  Before 6:30 AM
                </strong>
                <span style={{ fontSize: '0.70rem', color: '#6b7280' }}>Morning Delivery</span>
              </div>
            </div>
          </div>

          {/* Partner & Delivery Area Row */}
          <div
            style={{
              background: '#fafbfb',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.76rem',
              color: '#4b5563',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserRound size={15} color="#6b7280" />
              <span>Partner Naveen</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="#6b7280" />
              <span>Delivery Area {user?.area || 'Madhupur'}</span>
            </div>
          </div>
        </div>

        {/* Dedicated Subscription Expiry Card */}
        {renderExpiryCard(false)}

        {/* 2. Order Schedule */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={18} color="#0d5c3a" />
              <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Order Schedule</strong>
            </div>
            <span style={{ color: '#0d5c3a', fontSize: '0.78rem', fontWeight: 800 }}>Change →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {weekdays.map((day, idx) => {
              const isSelected = selectedWeekdayIndex === idx;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedWeekdayIndex(idx)}
                  style={{
                    height: '38px',
                    borderRadius: '10px',
                    border: isSelected ? '1px solid #0d5c3a' : '1px solid #e2ebe5',
                    background: isSelected ? '#0d5c3a' : '#f3f7f4',
                    color: isSelected ? '#ffffff' : '#4b5563',
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? 900 : 700,
                    cursor: 'pointer',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Delivery Address */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <MapPin size={18} color="#0d5c3a" />
            <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Delivery Address</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: '#f3f7f4',
                  color: '#0d5c3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Home size={19} />
              </div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Home</strong>
                <span style={{ fontSize: '0.76rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {user?.address || 'Madhupur, Hyderabad, Telangana - 500081'}
                </span>
              </div>
            </div>
            <ChevronRight size={19} color="#9ca3af" />
          </div>
        </div>

        {/* 4. Next Delivery (Mint card matching Image 2) */}
        <div
          style={{
            background: '#e8f5ee',
            borderRadius: '20px',
            border: '1.2px solid #c8e6d5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(13, 92, 58, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Truck size={18} color="#0d5c3a" />
            <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Next Delivery</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#d4ede0',
                  color: '#0d5c3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarDays size={19} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Tomorrow, 28 Oct 2026</strong>
                <span style={{ fontSize: '0.76rem', color: '#4b5563' }}>Before 6:30 AM</span>
              </div>
            </div>
            <ChevronRight size={19} color="#0d5c3a" />
          </div>
        </div>

        {/* 5. Manage Subscription (4 Tinted Action Cards) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Settings size={18} color="#0d5c3a" />
            <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Manage Subscription</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Option 1: Upgrade Plan */}
            <div
              onClick={() => setShowUpgradeModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#f0fdf4',
                border: '1.2px solid #bbf7d0',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Upgrade Plan</strong>
                  <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>Increase quantity, switch to A2 or combo</span>
                </div>
              </div>
              <ChevronRight size={18} color="#15803d" />
            </div>

            {/* Option 2: Extend Subscription */}
            <div
              onClick={() => setShowExtendModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#fffbeb',
                border: '1.2px solid #fde68a',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarDays size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Extend Subscription</strong>
                  <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>Add 7, 15, 30 or 60 days to current plan</span>
                </div>
              </div>
              <ChevronRight size={18} color="#d97706" />
            </div>

            {/* Card 1: Pause */}
            <div
              onClick={() => setShowPauseModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#fef9ee',
                border: '1.1px solid #fde68a',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PauseCircle size={19} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0c2340', fontWeight: 800 }}>Pause Delivery for a Trip</strong>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Temporary pause your deliveries</span>
                </div>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            {/* Card 2: Quantity */}
            <div
              onClick={() => setShowQtyModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#f0fdf4',
                border: '1.1px solid #bbf7d0',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Edit3 size={19} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0c2340', fontWeight: 800 }}>Change Tomorrow's Quantity</strong>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Update milk quantity for next delivery</span>
                </div>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            {/* Card 3: Address */}
            <div
              onClick={() => setShowAddressModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#f0f9ff',
                border: '1.1px solid #bae6fd',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck size={19} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0c2340', fontWeight: 800 }}>Change Delivery Address</strong>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Update or add new address</span>
                </div>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            {/* Card 4: Stop */}
            <div
              onClick={() => setShowStopModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#fef2f2',
                border: '1.1px solid #fecaca',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={19} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', color: '#dc2626', fontWeight: 800 }}>Stop Subscription</strong>
                  <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>Cancel your plan anytime</span>
                </div>
              </div>
              <ChevronRight size={18} color="#f87171" />
            </div>
          </div>
        </div>

        {/* 6. Explore More Plans Button */}
        <button
          type="button"
          onClick={() => {
            setShowMobileDetails(false);
            if (typeof setActiveTab === 'function') setActiveTab('products');
          }}
          style={{
            width: '100%',
            height: '50px',
            borderRadius: '16px',
            border: 'none',
            background: '#0d5c3a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(13, 92, 58, 0.25)',
            marginBottom: '20px',
          }}
        >
          <LayoutGrid size={18} />
          <span>Explore More Plans</span>
        </button>
      </div>
    );
  };

  // Mobile Subscription Overview Screen (Redesigned Clean Mobile Experience)
  const renderMobileOverview = () => {
    const monthlyDeliveries = selectedFrequency === 'alternate' ? 15 : 30;
    const activeQty = milkQuantity || 1;

    return (
      <div style={{ minHeight: '100vh', background: '#f6faf7', paddingBottom: '104px' }}>
        {/* Clean Mobile Header */}
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e6eee8',
            padding: '14px 16px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.62rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#059669',
                marginBottom: '2px',
              }}
            >
              Daily Morning Delivery
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0c2340', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Subscription
            </h2>
          </div>

          {isLoggedInCustomer && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: '999px',
                background: '#ecfdf5',
                border: '1px solid #bbf7d0',
                color: '#0d5c3a',
                fontWeight: 800,
                fontSize: '0.73rem',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Clock size={13} />
              <span>History</span>
            </button>
          )}
        </div>

        {/* Main Mobile Content Stack */}
        <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {renderPaymentNotice()}

          {/* Compact Light Hero Card */}
          <div
            onClick={() => {
              if (typeof setActiveTab === 'function') setActiveTab('products');
            }}
            style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 55%, #ffffff 100%)',
              borderRadius: '16px',
              border: '1px solid #ccebd8',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 3px 12px rgba(13, 92, 58, 0.05)',
              cursor: 'pointer',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#064e3b', lineHeight: 1.25, marginBottom: '4px' }}>
                Pure Farm Milk by 6:30 AM
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.72rem', color: '#475569', lineHeight: 1.4 }}>
                Chilled to 4°C in glass bottles. Pause or modify anytime in 1 tap.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#065f46', background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Leaf size={10} /> 100% Pure
                </span>
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#065f46', background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Snowflake size={10} /> 4°C Chilled
                </span>
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#065f46', background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Truck size={10} /> Zero Fee
                </span>
              </div>
            </div>

            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid #d1fae5',
                padding: '6px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(13, 92, 58, 0.08)',
              }}
            >
              <img
                src="/sub_hero_milk.png"
                onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}
                alt="Fresh Farm Milk"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Logged-In Active Subscription OR Guest Subscription Plans */}
          {isLoggedInCustomer ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0c2340' }}>
                  Active Subscription
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMobileDetails(true)}
                  style={{ background: 'none', border: 'none', color: '#0d5c3a', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Manage Details →
                </button>
              </div>

              <div
                onClick={() => setShowMobileDetails(true)}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid #dbe7df',
                  padding: '14px',
                  boxShadow: '0 3px 12px rgba(13, 92, 58, 0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <img
                    src="/sub_active_thumb.png"
                    onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}
                    alt="Plan Thumbnail"
                    style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2ebe5' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#0c2340', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Daily Farm Pure Milk Plan
                      </h4>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '20px',
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          background: '#e2f1ea',
                          color: '#0d5c3a',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0d5c3a' }} />
                        Active
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      ID: {user?.customerId || 'CUST-101'} • {user?.deliveryPlan?.frequency === 'alternate' ? 'Alternate Days' : 'Daily Morning'}
                    </span>
                  </div>
                </div>

                {/* 3 Compact Metric Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  <div
                    style={{
                      background: '#f4faf6',
                      borderRadius: '10px',
                      border: '1px solid #e1efe6',
                      padding: '7px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Milk size={13} color="#0d5c3a" />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.deliveryPlan?.milkQty || 1} L / day
                      </strong>
                      <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block' }}>Pure A2 Milk</span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#f4faf6',
                      borderRadius: '10px',
                      border: '1px solid #e1efe6',
                      padding: '7px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Clock3 size={13} color="#0d5c3a" />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Before 6:30 AM
                      </strong>
                      <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block' }}>Morning Drop</span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#f4faf6',
                      borderRadius: '10px',
                      border: '1px solid #e1efe6',
                      padding: '7px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <MapPin size={13} color="#0d5c3a" />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.area || 'Madhupur'}
                      </strong>
                      <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block' }}>Area</span>
                    </div>
                  </div>
                </div>

                {renderExpiryCard(true)}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMobileDetails(true);
                    }}
                    style={{
                      height: '36px',
                      borderRadius: '10px',
                      border: '1.2px solid #0d5c3a',
                      background: '#ffffff',
                      color: '#0d5c3a',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    View Details
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMobileDetails(true);
                    }}
                    style={{
                      height: '36px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#0d5c3a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(13, 92, 58, 0.22)',
                    }}
                  >
                    Manage Plan
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Slim Sign-In Strip for Existing Subscribers */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2ebe5',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: '#ecfdf5',
                      color: '#0d5c3a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CalendarDays size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.2 }}>
                      Already a Subscriber?
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Sign in to track & pause deliveries
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof setActiveTab === 'function') setActiveTab('login');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.2px solid #0d5c3a',
                    background: '#f2f8f4',
                    color: '#0d5c3a',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Sign In
                </button>
              </div>

              {/* Frequency & Daily Quantity Selector Bar */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2ebe5',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'inline-flex', background: '#f1f6f3', padding: '3px', borderRadius: '10px', gap: '3px' }}>
                  {[
                    { id: 'daily', label: 'Daily' },
                    { id: 'alternate', label: 'Alternate' },
                  ].map((freq) => {
                    const active = selectedFrequency === freq.id;
                    return (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setSelectedFrequency(freq.id)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '8px',
                          border: 'none',
                          background: active ? '#0d5c3a' : 'transparent',
                          color: active ? '#ffffff' : '#475569',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                      >
                        {freq.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>Qty:</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f6f3', borderRadius: '9px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setMilkQuantity((q) => Math.max(0.5, Number((q - 0.5).toFixed(1))))}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '7px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#0d5c3a',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '42px', textAlign: 'center', fontSize: '0.76rem', fontWeight: 900, color: '#0c2340' }}>
                      {activeQty} L
                    </span>
                    <button
                      type="button"
                      onClick={() => setMilkQuantity((q) => Math.min(5, Number((q + 0.5).toFixed(1))))}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '7px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#0d5c3a',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Subscription Plans Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0c2340' }}>
                    Choose Your Plan
                  </h3>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '999px' }}>
                    {monthlyDeliveries} drops / mo
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plans.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    const monthlyEstimate = Math.round(plan.pricePerLiter * activeQty * monthlyDeliveries);
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        style={{
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: isSelected ? `1.8px solid ${plan.color}` : '1px solid #e2ebe5',
                          padding: '14px',
                          boxShadow: isSelected ? '0 8px 20px rgba(5, 150, 105, 0.1)' : '0 2px 8px rgba(0,0,0,0.02)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '9px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ minWidth: 0 }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: plan.bgColor,
                                color: plan.color,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                marginBottom: '5px',
                              }}
                            >
                              <Milk size={10} />
                              <span>{plan.tag}</span>
                            </span>
                            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.2 }}>
                              {plan.name}
                            </h4>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '2px' }}>
                              <span style={{ fontSize: '1.22rem', fontWeight: 900, color: '#0d5c3a', lineHeight: 1 }}>
                                ₹{plan.pricePerLiter}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700 }}>
                                /L
                              </span>
                            </div>
                            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#059669' }}>
                              ~₹{monthlyEstimate.toLocaleString('en-IN')}/mo
                            </span>
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.73rem', color: '#64748b', lineHeight: 1.4 }}>
                          {plan.description}
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '2px' }}>
                          {plan.features.slice(0, 2).map((feature, fIdx) => (
                            <span
                              key={fIdx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                color: '#334155',
                                background: '#f8fafc',
                                border: '1px solid #eef2f6',
                                borderRadius: '8px',
                                padding: '3px 7px',
                              }}
                            >
                              <CheckCircle2 size={11} color={plan.color} style={{ flexShrink: 0 }} />
                              <span>{feature}</span>
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartPlan(plan.id);
                          }}
                          style={{
                            width: '100%',
                            height: '38px',
                            borderRadius: '10px',
                            border: isSelected ? 'none' : '1.2px solid #0d5c3a',
                            background: isSelected ? '#0d5c3a' : '#f4faf6',
                            color: isSelected ? '#ffffff' : '#0d5c3a',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: isSelected ? '0 3px 10px rgba(13, 92, 58, 0.2)' : 'none',
                          }}
                        >
                          <span>Start {selectedFrequency === 'alternate' ? 'Alternate-Day' : 'Daily'} Plan ({activeQty}L)</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* More Subscription Plans Section */}
          <div style={{ marginTop: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0c2340' }}>
                Explore Dairy Categories
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (typeof setActiveTab === 'function') setActiveTab('products');
                }}
                style={{ background: 'none', border: 'none', color: '#0d5c3a', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                View All →
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
              }}
            >
              {[
                { title: 'Milk Plans', img: '/cat_img_milk.png', bg: '#edf7f1', border: '#dbeee2' },
                { title: 'Curd Plans', img: '/cat_img_curd.png', bg: '#f4f7fa', border: '#e2e9f0' },
                { title: 'Ghee Plans', img: '/cat_img_ghee.png', bg: '#fef8ec', border: '#fae8c6' },
              ].map((cat) => (
                <div
                  key={cat.title}
                  onClick={() => {
                    if (typeof setActiveTab === 'function') setActiveTab('products');
                  }}
                  style={{
                    background: cat.bg,
                    borderRadius: '14px',
                    border: `1px solid ${cat.border}`,
                    padding: '10px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <img src={cat.img} alt={cat.title} style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
                  <strong style={{ fontSize: '0.72rem', color: '#0c2340', fontWeight: 800 }}>
                    {cat.title}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: '#f9faf9', paddingBottom: '70px' }}>
        {showMobileDetails && isLoggedInCustomer ? renderMobileDetails() : renderMobileOverview()}
        <CustomerBottomNav
          activePage="subscription"
          onNavigate={(pageId) => {
            setShowMobileDetails(false);
            if (pageId === 'subscription') {
              window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
              return;
            }
            if (typeof setActiveTab === 'function') {
              if (pageId === 'deliveries') {
                if (user?.role === 'customer') {
                  localStorage.setItem('nmd_customer_page', 'deliveries');
                  setActiveTab('customer-portal');
                } else {
                  setActiveTab('my-deliveries');
                }
                return;
              }
              if (pageId === 'profile') {
                if (user?.role === 'customer') {
                  localStorage.setItem('nmd_customer_page', 'profile');
                  setActiveTab('customer-portal');
                } else {
                  setActiveTab('login');
                }
                return;
              }
              setActiveTab(pageId === 'home' && user?.role === 'customer' ? 'customer-portal' : pageId);
            }
          }}
          items={CUSTOMER_HOME_NAV_ITEMS}
          className="customer-mobile-bottom-nav"
        />
        <SubscriptionHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          user={user}
          onPaymentSuccess={() => {
            setShowHistoryModal(false);
            setShowMobileDetails(true);
          }}
        />
        {showUpgradeModal && (
          <UpgradePlanFullPage
            user={user}
            onClose={() => setShowUpgradeModal(false)}
            onSuccess={(msg) => {
              setShowUpgradeModal(false);
              alert(msg);
            }}
          />
        )}
        {showExtendModal && (
          <ExtendSubscriptionFullPage
            user={user}
            onClose={() => setShowExtendModal(false)}
            onSuccess={(msg) => {
              setShowExtendModal(false);
              alert(msg);
            }}
          />
        )}
        {showPauseModal && (
          <PauseDeliveryFullPage
            user={user}
            onClose={() => setShowPauseModal(false)}
            onSuccess={(msg) => {
              setShowPauseModal(false);
              alert(msg);
            }}
          />
        )}
        {showQtyModal && (
          <ChangeTomorrowQtyFullPage
            user={user}
            onClose={() => setShowQtyModal(false)}
            onSuccess={(msg) => {
              setShowQtyModal(false);
              alert(msg);
            }}
          />
        )}
        {showAddressModal && (
          <ChangeAddressFullPage
            user={user}
            onClose={() => setShowAddressModal(false)}
            onSuccess={(msg) => {
              setShowAddressModal(false);
              alert(msg);
            }}
          />
        )}
        {showStopModal && (
          <StopSubscriptionFullPage
            user={user}
            onClose={() => setShowStopModal(false)}
            onSuccess={(msg) => {
              setShowStopModal(false);
              alert(msg);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="subscription-public-page" style={{ minHeight: '100vh', background: '#fafbfc', paddingBottom: '90px' }}>
      {/* Hero Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 55%, #f8fafc 100%)',
        color: '#0f172a',
        padding: '52px 24px 44px',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid #d1fae5',
      }}>
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.08)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '1080px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#dcfce7',
            color: '#065f46',
            border: '1px solid #bbf7d0',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            <Sparkles size={14} color="#059669" />
            <span>Farm-Fresh Doorstep Subscription</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.9rem, 4vw, 2.8rem)',
            fontWeight: 900,
            lineHeight: 1.18,
            marginBottom: '14px',
            letterSpacing: '-0.02em',
            color: '#064e3b',
          }}>
            Pure Milk, Delivered Every Morning by 6:30 AM
          </h1>

          <p style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.12rem)',
            color: '#475569',
            maxWidth: '680px',
            lineHeight: 1.6,
            marginBottom: '26px',
          }}>
            Experience farm-fresh pure cow and buffalo milk with zero adulteration. No lock-in, free door-step delivery, and full flexibility to pause or resume anytime.
          </p>

          {/* Quick Perks Pill Row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              color: '#065f46',
              border: '1px solid #bbf7d0',
              boxShadow: '0 2px 6px rgba(6, 95, 70, 0.05)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}>
              <Clock size={14} color="#059669" />
              <span>Doorstep by 6:30 AM</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              color: '#065f46',
              border: '1px solid #bbf7d0',
              boxShadow: '0 2px 6px rgba(6, 95, 70, 0.05)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}>
              <PauseCircle size={14} color="#059669" />
              <span>Pause / Resume with 1 Tap</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              color: '#065f46',
              border: '1px solid #bbf7d0',
              boxShadow: '0 2px 6px rgba(6, 95, 70, 0.05)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}>
              <ShieldCheck size={14} color="#059669" />
              <span>Zero Chemicals & Preservatives</span>
            </div>
          </div>

          {/* User Status Bar if Logged In */}
          {isLoggedInCustomer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                background: '#ffffff',
                color: '#064e3b',
                border: '1px solid #bbf7d0',
                padding: '10px 18px',
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(6, 95, 70, 0.08)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
                onClick={() => handleStartPlan('cow-daily')}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }} />
                <span>Customer Active: Plan Valid Until {expiryInfo.formattedDate}</span>
                <span style={{ fontSize: '0.74rem', background: '#e2f1ea', color: '#0d5c3a', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                  {expiryInfo.countdownText}
                </span>
                <ArrowRight size={16} color="#059669" />
              </div>

              <button
                type="button"
                onClick={() => setShowExtendModal(true)}
                style={{
                  background: '#ffffff',
                  border: '1.2px solid #bbf7d0',
                  color: '#065f46',
                  padding: '10px 18px',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(6, 95, 70, 0.06)',
                }}
              >
                <CalendarDays size={16} />
                <span>Extend Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                style={{
                  background: '#ffffff',
                  border: '1.2px solid #bbf7d0',
                  color: '#065f46',
                  padding: '10px 18px',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(6, 95, 70, 0.06)',
                }}
              >
                <Clock size={16} />
                <span>Subscription History</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Container */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 18px' }}>
        <div style={{ marginBottom: '20px' }}>
          {renderPaymentNotice()}
        </div>

        {/* Desktop Active Subscription Summary & Expiry Card */}
        {isLoggedInCustomer && (
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #d1fae5',
              borderRadius: '22px',
              padding: '22px 24px',
              marginBottom: '36px',
              boxShadow: '0 4px 18px rgba(13, 92, 58, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src="/sub_active_thumb.png"
                  onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}
                  alt="Active Subscription"
                  style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover', border: '1px solid #e2ebe5' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900, color: '#0c2340' }}>
                      Active Doorstep Subscription
                    </h3>
                    <span style={{ background: '#e2f1ea', color: '#0d5c3a', borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800 }}>
                      Active • ID {user?.customerId || 'CUST-101'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                    {user?.deliveryPlan?.milkType || 'Desi Cow Milk (A2)'} • {user?.deliveryPlan?.milkQty || 1}L Daily Morning Drop before 6:30 AM
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  style={{
                    background: '#f0fdf4',
                    border: '1.2px solid #bbf7d0',
                    color: '#15803d',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={16} />
                  <span>Upgrade Plan & Add Products</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowExtendModal(true)}
                  style={{
                    background: '#0d5c3a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(13, 92, 58, 0.25)',
                  }}
                >
                  <CalendarDays size={16} />
                  <span>Extend Subscription</span>
                </button>
              </div>
            </div>

            {renderExpiryCard(false)}
          </div>
        )}
        {/* Section Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#059669',
            textTransform: 'uppercase',
          }}>
            Transparent Doorstep Plans
          </span>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.1rem)',
            fontWeight: 800,
            color: '#0f172a',
            marginTop: '6px',
          }}>
            Choose Your Daily Morning Plan
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#64748b', maxWidth: '540px', margin: '6px auto 0' }}>
            Flexible daily subscriptions. Start tomorrow morning, pause anytime you are out of town, pay automatically or at month-end.
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '22px',
          marginBottom: '40px',
        }}>
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: isSelected ? `2.5px solid ${plan.color}` : '1.5px solid #e2e8f0',
                  padding: '28px 24px',
                  boxShadow: isSelected ? '0 12px 32px rgba(5, 150, 105, 0.14)' : '0 4px 16px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '22px',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                    textTransform: 'uppercase',
                  }}>
                    {plan.tag}
                  </div>
                )}

                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: plan.bgColor,
                    color: plan.color,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    marginBottom: '14px',
                  }}>
                    <Milk size={13} />
                    <span>{plan.tag}</span>
                  </div>

                  <h3 style={{ fontSize: '1.32rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                    {plan.name}
                  </h3>

                  <p style={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.5, marginBottom: '20px' }}>
                    {plan.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    marginBottom: '22px',
                  }}>
                    <span style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a' }}>
                      ₹{plan.pricePerLiter}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>/ Litre</span>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '18px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                      Plan Highlights:
                    </div>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '9px',
                        fontSize: '0.85rem',
                        color: '#334155',
                        marginBottom: '10px',
                      }}>
                        <CheckCircle2 size={16} color={plan.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartPlan(plan.id);
                  }}
                  style={{
                    width: '100%',
                    padding: '13px 18px',
                    borderRadius: '14px',
                    background: isSelected ? plan.color : '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 6px 18px rgba(5, 150, 105, 0.28)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{isLoggedInCustomer ? 'Manage This Subscription' : 'Start Daily Delivery'}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* How Doorstep Subscription Works */}
        <section style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1.5px solid #e2e8f0',
          padding: '36px 26px',
          marginBottom: '36px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Effortless Experience
            </span>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              How Doorstep Subscription Works
            </h3>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
          }}>
            {[
              {
                step: '01',
                title: 'Set Quantity & Days',
                desc: 'Select daily morning quantity (1L, 2L, or curd combo) and preferred delivery time before 6:30 AM.',
                icon: CalendarDays,
                color: '#059669',
              },
              {
                step: '02',
                title: 'Fresh Doorstep Drop',
                desc: 'Milked at 3:30 AM, chilled instantly, and delivered by our friendly partner in sterile glass bottles.',
                icon: Milk,
                color: '#0284c7',
              },
              {
                step: '03',
                title: 'Pause Anytime with 1 Tap',
                desc: 'Going on vacation? Pause deliveries instantly from your phone. You only pay for what you receive.',
                icon: PauseCircle,
                color: '#d97706',
              },
              {
                step: '04',
                title: 'Transparent Ledger',
                desc: 'Check live delivery photos, daily drop receipts, and recharge online with zero hidden charges.',
                icon: ShieldCheck,
                color: '#8b5cf6',
              },
            ].map((stepItem, idx) => {
              const Icon = stepItem.icon;
              return (
                <div key={idx} style={{
                  padding: '20px',
                  borderRadius: '18px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                      <Icon size={20} color={stepItem.color} />
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#cbd5e1' }}>
                      {stepItem.step}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                    {stepItem.title}
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                    {stepItem.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Call to Action Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 60%, #f8fafc 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: '24px',
          padding: '36px 28px',
          color: '#064e3b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(6, 95, 70, 0.08)',
        }}>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '10px', color: '#064e3b' }}>
            Ready for Fresh Morning Milk at Your Doorstep?
          </h3>
          <p style={{ fontSize: '0.94rem', color: '#475569', maxWidth: '520px', marginBottom: '22px' }}>
            Start with zero deposit. Delivered fresh every morning before 6:30 AM in hygienic glass bottles.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => handleStartPlan(selectedPlan)}
              style={{
                background: '#0d5c3a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                padding: '12px 24px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(13, 92, 58, 0.2)',
              }}
            >
              <span>{isLoggedInCustomer ? 'Open Subscription Manager' : 'Subscribe Now'}</span>
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof setActiveTab === 'function') {
                  setActiveTab('products');
                }
              }}
              style={{
                background: '#ffffff',
                color: '#065f46',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '12px 22px',
                borderRadius: '14px',
                border: '1.5px solid #bbf7d0',
                cursor: 'pointer',
              }}
            >
              Explore Products
            </button>
          </div>
        </div>
      </div>
      {/* ── Full-Screen Upgrade Plan Page ── */}
      {showUpgradeModal && (
        <UpgradePlanFullPage
          user={user}
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={(msg) => { setShowUpgradeModal(false); alert(msg); }}
        />
      )}

      {/* ── Full-Screen Extend Subscription Page ── */}
      {showExtendModal && (
        <ExtendSubscriptionFullPage
          user={user}
          onClose={() => setShowExtendModal(false)}
          onSuccess={(msg) => { setShowExtendModal(false); alert(msg); }}
        />
      )}

      {/* ── Full-Screen Pause Delivery Page ── */}
      {showPauseModal && (
        <PauseDeliveryFullPage
          user={user}
          onClose={() => setShowPauseModal(false)}
          onSuccess={(msg) => { setShowPauseModal(false); alert(msg); }}
        />
      )}

      {/* ── Full-Screen Change Tomorrow Qty Page ── */}
      {showQtyModal && (
        <ChangeTomorrowQtyFullPage
          user={user}
          onClose={() => setShowQtyModal(false)}
          onSuccess={(msg) => { setShowQtyModal(false); alert(msg); }}
        />
      )}

      {/* ── Full-Screen Change Address Page ── */}
      {showAddressModal && (
        <ChangeAddressFullPage
          user={user}
          onClose={() => setShowAddressModal(false)}
          onSuccess={(msg) => { setShowAddressModal(false); alert(msg); }}
        />
      )}

      {/* ── Full-Screen Stop Subscription Page ── */}
      {showStopModal && (
        <StopSubscriptionFullPage
          user={user}
          onClose={() => setShowStopModal(false)}
          onSuccess={(msg) => { setShowStopModal(false); alert(msg); }}
        />
      )}

      {/* ── Subscription History Modal ── */}
      <SubscriptionHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        user={user}
        onPaymentSuccess={() => {
          setShowHistoryModal(false);
        }}
      />
    </div>
  );
}
