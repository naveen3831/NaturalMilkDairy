import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  PauseCircle,
  PlayCircle,
  Milk,
  RotateCcw,
  Check,
  ChevronRight,
  HelpCircle,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SubscriptionPage({ setActiveTab }) {
  const { user } = useAuth();
  const isLoggedInCustomer = user?.role === 'customer';

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
