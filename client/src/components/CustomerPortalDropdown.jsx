import React, { useEffect, useState } from 'react';
import {
  User,
  Truck,
  CalendarDays,
  MapPin,
  PauseCircle,
  PlayCircle,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Milk,
  Clock,
  Sparkles,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CustomerPortalDropdown({
  user,
  onClose,
  onOpenModal,
  onNavigate,
  onLogout,
  customerData,
  deliveries = [],
}) {
  const currentCustomer = customerData || user || {};
  const isPaused = currentCustomer.status === 'paused';
  const plan = currentCustomer.subscription || {};
  const deliveryPlan = currentCustomer.deliveryPlan || {};

  const planName = plan.planName || deliveryPlan.milkType || 'Daily Farm Pure Cow Milk Plan';
  const milkQty = deliveryPlan.milkQty ?? (plan.milkQty || 1);
  const curdQty = deliveryPlan.curdQty ?? (plan.curdQty || 0);

  const initial = (currentCustomer.name || 'C').charAt(0).toUpperCase();
  const customerId = currentCustomer.customerId || user?.customerId || 'CUST-101';
  const phone = currentCustomer.mobile || user?.mobile || '';
  const area = currentCustomer.area || user?.area || 'Madhapur';
  const addressPreview = currentCustomer.address
    ? currentCustomer.address.length > 34
      ? `${currentCustomer.address.slice(0, 34)}...`
      : currentCustomer.address
    : `${area}, Hyderabad`;

  return (
    <div
      className="customer-portal-dropdown-menu"
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: '390px',
        maxWidth: '92vw',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        border: '1.5px solid #d1fae5',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'slideDown 0.2s ease-out',
        textAlign: 'left',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Profile Header Card */}
      <div
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: '#ffffff',
                color: '#0d5c3a',
                fontSize: '1.25rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                border: '2px solid #86efac',
              }}
            >
              {initial}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                  {currentCustomer.name || 'Naveen'}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', opacity: 0.9 }}>
                <span style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.2)', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                  {customerId}
                </span>
                <span style={{ fontSize: '0.78rem' }}>{phone}</span>
              </div>
            </div>
          </div>

          <span
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.74rem',
              fontWeight: 800,
              background: isPaused ? '#fef3c7' : '#dcfce7',
              color: isPaused ? '#92400e' : '#15803d',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isPaused ? '#d97706' : '#16a34a',
              }}
            />
            {isPaused ? 'Paused' : 'Active'}
          </span>
        </div>

        {/* Territory location line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', opacity: 0.95 }}>
          <MapPin size={13} color="#86efac" />
          <span>Doorstep Route: <strong>{area}</strong></span>
        </div>
      </div>

      {/* 2. Active Subscription Box */}
      <div style={{ padding: '14px 16px 10px', background: '#f8faf9', borderBottom: '1px solid #e2ebe5' }}>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            background: '#ffffff',
            border: '1.5px solid #bbf7d0',
            boxShadow: '0 2px 6px rgba(13, 92, 58, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#0d5c3a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Milk Subscription
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '8px' }}>
              Next: Tomorrow 6 AM
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontSize: '0.90rem', color: '#0f172a', display: 'block' }}>
                {milkQty} L Pure Cow Milk {curdQty > 0 ? `+ ${curdQty}g Curd` : ''}
              </strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {planName}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Balance</span>
              <strong style={{ fontSize: '0.88rem', color: '#0d5c3a' }}>₹{currentCustomer.currentBalance || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Rows */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Row 1: My Subscription */}
        <button
          type="button"
          onClick={() => {
            if (typeof onNavigate === 'function') onNavigate('my-subscription');
            else onOpenModal('subscription');
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: '#e2f1ea',
                color: '#0d5c3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarDays size={18} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0f172a' }}>
                My Active Subscription
              </strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                View plan details, volume & validity
              </span>
            </div>
          </div>
          <ChevronRight size={16} color="#94a3b8" />
        </button>

        {/* Row 2: Doorstep Deliveries */}
        <button
          type="button"
          onClick={() => {
            if (typeof onNavigate === 'function') onNavigate('my-deliveries');
            else onOpenModal('deliveries');
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>
                  Doorstep Deliveries
                </strong>
                {deliveries.length > 0 && (
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '8px',
                    }}
                  >
                    {deliveries.length} Drops
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Track daily drops & live proof photos
              </span>
            </div>
          </div>
          <ChevronRight size={16} color="#94a3b8" />
        </button>

        {/* Row 3: Delivery Address */}
        <button
          type="button"
          onClick={() => {
            if (typeof onNavigate === 'function') onNavigate('my-address');
            else onOpenModal('address');
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={18} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0f172a' }}>
                Delivery Address
              </strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {addressPreview}
              </span>
            </div>
          </div>
          <ChevronRight size={16} color="#94a3b8" />
        </button>

        {/* Row 4: Pause / Resume */}
        <button
          type="button"
          onClick={() => {
            if (typeof onNavigate === 'function') onNavigate('pause-delivery');
            else onOpenModal('pause');
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: isPaused ? '#dcfce7' : '#fee2e2',
                color: isPaused ? '#15803d' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPaused ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0f172a' }}>
                {isPaused ? 'Resume Deliveries' : 'Pause Deliveries'}
              </strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {isPaused ? 'Restart your morning drops' : 'Hold drops when out of town'}
              </span>
            </div>
          </div>
          <ChevronRight size={16} color="#94a3b8" />
        </button>

        {/* Row 5: Helpline & Support */}
        <button
          type="button"
          onClick={() => {
            if (typeof onNavigate === 'function') onNavigate('contact');
            else onOpenModal('support');
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: '#f1f5f9',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HelpCircle size={18} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0f172a' }}>
                Customer Care & Helplines
              </strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                WhatsApp & dairy phone assistance
              </span>
            </div>
          </div>
          <ChevronRight size={16} color="#94a3b8" />
        </button>
      </div>

      {/* 4. Footer Logout */}
      <div
        style={{
          padding: '12px 16px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
          Natural Milk Dairy Portal
        </span>
        <button
          type="button"
          onClick={onLogout}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: '#fff1f2',
            color: '#be123c',
            border: '1px solid #fecdd3',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#ffe4e6')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff1f2')}
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
