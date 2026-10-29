import React from 'react';
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  ShoppingBag,
  Truck,
  UserRound,
  Home,
} from 'lucide-react';

export const CUSTOMER_PORTAL_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'subscription', label: 'Subscription', icon: CalendarDays },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export const CUSTOMER_MOBILE_PORTAL_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'subscription', label: 'Subscription', icon: CalendarDays },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export const CUSTOMER_HOME_NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'subscription', label: 'Subscription', icon: CalendarDays },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export default function CustomerBottomNav({
  activePage,
  onNavigate,
  className = '',
  items = CUSTOMER_PORTAL_ITEMS,
  ariaLabel = 'Customer dashboard',
}) {
  return (
    <nav
      className={`customer-bottom-nav customer-portal-bottom-nav ${className}`.trim()}
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '64px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2ebe4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 99999,
        boxShadow: '0 -4px 20px rgba(12, 35, 64, 0.08)',
        padding: '0 4px env(safe-area-inset-bottom, 0px)',
        boxSizing: 'border-box',
      }}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = activePage === id;
        return (
          <button
            key={id}
            type="button"
            className={`customer-nav-link${isActive ? ' is-active' : ''}`}
            aria-label={label}
            title={label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              if (typeof onNavigate === 'function') {
                onNavigate(id);
              }
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }}
            style={{
              flex: 1,
              maxWidth: '80px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '6px 0',
              cursor: 'pointer',
              color: isActive ? '#0d5c3a' : '#64748b',
              fontWeight: isActive ? 800 : 600,
              fontSize: '0.70rem',
              lineHeight: 1.1,
              transition: 'all 0.18s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isActive ? 'translateY(-1px) scale(1.08)' : 'none',
                transition: 'transform 0.18s ease',
              }}
            >
              <Icon size={20} color={isActive ? '#0d5c3a' : '#64748b'} aria-hidden="true" />
            </div>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
