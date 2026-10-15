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
  { id: 'subscription', label: 'Subscription', icon: CalendarDays },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export const CUSTOMER_HOME_NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'story', label: 'Story', icon: BookOpen },
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
    <nav className={className} aria-label={ariaLabel}>
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`customer-nav-link${activePage === id ? ' is-active' : ''}`}
          aria-label={label}
          title={label}
          aria-current={activePage === id ? 'page' : undefined}
          onClick={() => {
            onNavigate(id);
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          }}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
