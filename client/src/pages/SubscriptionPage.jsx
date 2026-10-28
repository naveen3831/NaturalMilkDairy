import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Clock3,
  ShieldCheck,
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SubscriptionPage({ setActiveTab }) {
  const { user } = useAuth();
  const isLoggedInCustomer = user?.role === 'customer';

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [selectedWeekdayIndex, setSelectedWeekdayIndex] = useState(0);

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

  const handleStartPlan = (planId) => {
    if (isLoggedInCustomer) {
      localStorage.setItem('nmd_customer_page', 'subscription');
      if (typeof setActiveTab === 'function') {
        setActiveTab('customer-portal');
      }
      window.history.pushState({ nmdCustomerPage: true }, '', '/customer/subscription');
    } else {
      localStorage.setItem('nmd_pending_subscription', JSON.stringify({
        planId,
        frequency: selectedFrequency,
        quantity: milkQuantity,
      }));
      if (typeof setActiveTab === 'function') {
        setActiveTab('login');
      }
    }
  };

  // Mobile Subscription Details Screen (Image 2)
  const renderMobileDetails = () => {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div style={{ minHeight: '100vh', background: '#f9faf9', padding: '16px 16px 90px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                ID: {user?.customerId || 'CUST-101'} • Daily Morning
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
            {/* Card 1: Pause */}
            <div
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
          }}
        >
          <LayoutGrid size={18} />
          <span>Explore More Plans</span>
        </button>
      </div>
    );
  };

  // Mobile Subscription Overview Screen (Image 1)
  const renderMobileOverview = () => {
    return (
      <div style={{ minHeight: '100vh', background: '#f9faf9', padding: '16px 16px 90px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Title & Subtitle matching Image 1 */}
        <div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0c2340', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Subscription
          </h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
            Manage your daily dairy plans and upcoming deliveries.
          </p>
        </div>

        {/* Hero Banner Card */}
        <div
          onClick={() => {
            if (typeof setActiveTab === 'function') setActiveTab('products');
          }}
          style={{
            borderRadius: '22px',
            border: '1px solid #cee7d9',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.08)',
            overflow: 'hidden',
            cursor: 'pointer',
            lineHeight: 0,
            background: '#e8f5ee',
          }}
        >
          <img
            src="/sub_hero_banner.png"
            alt="Doorstep Delivery Plans - Fresh Dairy Every Morning"
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
          />
        </div>

        {/* 4 Feature Badges (Single Card with 4 Columns matching Image 1) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2ebe5',
            padding: '12px 4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={16} />
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>100%<br />Pure & Natural</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#e5ede7' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Snowflake size={16} />
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>Chilled<br />to 4°C</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#e5ede7' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} />
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>Doorstep<br />Delivery</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#e5ede7' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={16} />
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>Flexible<br />Plans</span>
          </div>
        </div>

        {/* Active Subscriptions Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0c2340' }}>
              Active Subscriptions
            </h3>
            <button
              type="button"
              onClick={() => setShowMobileDetails(true)}
              style={{ background: 'none', border: 'none', color: '#0d5c3a', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              View All →
            </button>
          </div>

          <div
            onClick={() => setShowMobileDetails(true)}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2ebe5',
              padding: '16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <img
                src="/sub_active_thumb.png"
                onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}
                alt="Plan Thumbnail"
                style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0c2340', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Daily Farm Pure Milk Plan
                  </h4>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '20px',
                      fontSize: '0.66rem',
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
                <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 600 }}>
                  ID: {user?.customerId || 'CUST-101'} • Daily Morning
                </span>
              </div>
            </div>

            {/* 3 Metric Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <div
                style={{
                  background: '#f2f8f4',
                  borderRadius: '10px',
                  border: '1px solid #deede2',
                  padding: '7px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Milk size={14} color="#0d5c3a" />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.70rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    1 L / day
                  </strong>
                  <span style={{ fontSize: '0.60rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>Pure A2 Milk</span>
                </div>
              </div>

              <div
                style={{
                  background: '#f2f8f4',
                  borderRadius: '10px',
                  border: '1px solid #deede2',
                  padding: '7px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Clock3 size={14} color="#0d5c3a" />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.70rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Before 6:30 AM
                  </strong>
                  <span style={{ fontSize: '0.60rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>Morning Delivery</span>
                </div>
              </div>

              <div
                style={{
                  background: '#f2f8f4',
                  borderRadius: '10px',
                  border: '1px solid #deede2',
                  padding: '7px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <MapPin size={14} color="#0d5c3a" />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.70rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.area || 'Madhupur'}
                  </strong>
                  <span style={{ fontSize: '0.60rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>Delivery Area</span>
                </div>
              </div>
            </div>

            {/* Two Action Buttons matching Image 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '2px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileDetails(true);
                }}
                style={{
                  height: '38px',
                  borderRadius: '12px',
                  border: '1.2px solid #0d5c3a',
                  background: '#ffffff',
                  color: '#0d5c3a',
                  fontWeight: 700,
                  fontSize: '0.80rem',
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
                  height: '38px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(13, 92, 58, 0.25)',
                }}
              >
                Manage Plan
              </button>
            </div>
          </div>
        </div>

        {/* More Subscription Plans Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0c2340' }}>
              More Subscription Plans
            </h3>
            <button
              type="button"
              onClick={() => {
                if (typeof setActiveTab === 'function') setActiveTab('products');
              }}
              style={{ background: 'none', border: 'none', color: '#0d5c3a', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              View All →
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: '4px',
            }}
          >
            {/* Card 1: Milk Plans */}
            <div
              onClick={() => {
                if (typeof setActiveTab === 'function') setActiveTab('products');
              }}
              style={{
                flex: '0 0 134px',
                background: '#edf7f1',
                borderRadius: '16px',
                border: '1px solid #dbeee2',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/cat_img_milk.png" alt="Milk Plans" style={{ maxHeight: '64px', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <strong style={{ fontSize: '0.78rem', color: '#0c2340', fontWeight: 800 }}>Milk Plans</strong>
                <ChevronRight size={14} color="#0d5c3a" />
              </div>
            </div>

            {/* Card 2: Curd Plans */}
            <div
              onClick={() => {
                if (typeof setActiveTab === 'function') setActiveTab('products');
              }}
              style={{
                flex: '0 0 134px',
                background: '#f7f7f4',
                borderRadius: '16px',
                border: '1px solid #e7ebe5',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/cat_img_curd.png" alt="Curd Plans" style={{ maxHeight: '64px', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <strong style={{ fontSize: '0.78rem', color: '#0c2340', fontWeight: 800 }}>Curd Plans</strong>
                <ChevronRight size={14} color="#0d5c3a" />
              </div>
            </div>

            {/* Card 3: Ghee Plans */}
            <div
              onClick={() => {
                if (typeof setActiveTab === 'function') setActiveTab('products');
              }}
              style={{
                flex: '0 0 134px',
                background: '#fef8ec',
                borderRadius: '16px',
                border: '1px solid #fae8c6',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/cat_img_ghee.png" alt="Ghee Plans" style={{ maxHeight: '64px', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <strong style={{ fontSize: '0.78rem', color: '#0c2340', fontWeight: 800 }}>Ghee Plans</strong>
                <ChevronRight size={14} color="#0d5c3a" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return showMobileDetails ? renderMobileDetails() : renderMobileOverview();
  }

  return (
    <div className="subscription-public-page" style={{ minHeight: '100vh', background: '#fafbfc', paddingBottom: '90px' }}>
      {/* Hero Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        color: '#ffffff',
        padding: '52px 24px 44px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '1080px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            <Sparkles size={14} color="#fde047" />
            <span>Farm-Fresh Doorstep Subscription</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.9rem, 4vw, 2.8rem)',
            fontWeight: 900,
            lineHeight: 1.18,
            marginBottom: '14px',
            letterSpacing: '-0.02em',
          }}>
            Pure Milk, Delivered Every Morning by 6:30 AM
          </h1>

          <p style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.12rem)',
            color: 'rgba(255,255,255,0.88)',
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
              background: 'rgba(255,255,255,0.12)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}>
              <Clock size={14} color="#a7f3d0" />
              <span>Doorstep by 6:30 AM</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.12)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}>
              <PauseCircle size={14} color="#a7f3d0" />
              <span>Pause / Resume with 1 Tap</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.12)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}>
              <ShieldCheck size={14} color="#a7f3d0" />
              <span>Zero Chemicals & Preservatives</span>
            </div>
          </div>

          {/* User Status Bar if Logged In */}
          {isLoggedInCustomer && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: '#ffffff',
              color: '#064e3b',
              padding: '10px 18px',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              marginTop: '8px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
            onClick={() => handleStartPlan('active')}
            >
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }} />
              <span>Customer Account Active: Manage Doorstep Subscription</span>
              <ArrowRight size={16} color="#059669" />
            </div>
          )}
        </div>
      </section>

      {/* Main Content Container */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 18px' }}>
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
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          borderRadius: '24px',
          padding: '36px 28px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 12px 36px rgba(5, 150, 105, 0.2)',
        }}>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '10px' }}>
            Ready for Fresh Morning Milk at Your Doorstep?
          </h3>
          <p style={{ fontSize: '0.94rem', color: 'rgba(255,255,255,0.9)', maxWidth: '520px', marginBottom: '22px' }}>
            Start with zero deposit. Delivered fresh every morning before 6:30 AM in hygienic glass bottles.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => handleStartPlan(selectedPlan)}
              style={{
                background: '#ffffff',
                color: '#065f46',
                fontWeight: 800,
                fontSize: '0.95rem',
                padding: '12px 24px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
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
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '12px 22px',
                borderRadius: '14px',
                border: '1.5px solid rgba(255,255,255,0.3)',
                cursor: 'pointer',
              }}
            >
              Explore Products
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
