import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDairy } from '../context/DairyContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Milk,
  Truck,
  Users,
  CreditCard,
  FileText,
  DollarSign,
  Activity,
  LogOut,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  Globe,
  User,
  UserRound,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';
import CustomerBottomNav, { CUSTOMER_HOME_NAV_ITEMS } from './CustomerBottomNav';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, switchUser, DEMO_USERS } = useAuth();
  const { isOnline, offlineQueue, syncOfflineQueue } = useDairy();
  const { unreadCount, setIsNotificationOpen } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isLoggedInCustomer = user?.role === 'customer';

  const publicTabs = ['home', 'landing', 'products', 'story', 'faqs', 'contact', 'login', 'register'];
  const isPublicView = publicTabs.includes(activeTab);

  const navigatePage = (tab) => {
    if (tab === 'products') {
      localStorage.removeItem('nmd_selected_product_id');
      window.dispatchEvent(new CustomEvent('nmd_reset_products_page'));
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 40);
  };

  const openUserPortal = (target = null) => {
    if (user?.role === 'admin') setActiveTab('dashboard');
    else if (user?.role === 'delivery_boy') setActiveTab('delivery-boy-app');
    else {
      const targetPage = target || 'dashboard';
      localStorage.setItem('nmd_customer_page', targetPage);
      if (typeof setActiveTab === 'function') {
        setActiveTab('customer-portal');
      }
      window.history.pushState({ nmdCustomerPage: true }, '', `/customer/${targetPage}`);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };
  // If in public view, show the clean white navbar with Home, Our products, Our story, FAQs, Contact, and Login/Register
  if (isPublicView) {
    return (
      <>
        <header
          className={`public-site-header${isLoggedInCustomer ? ' customer-public-header' : ''}`}
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          }}
        >
        <div
          className="public-site-header-inner"
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            padding: '14px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Brand Logo & Title */}
          <div
            className="public-site-brand"
            onClick={() => navigatePage('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src={CLOUDINARY_MEDIA.logo}
                alt="Natural Milk Dairy"
                onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.24rem',
                  fontWeight: 900,
                  lineHeight: 1.15,
                  color: '#0d5c3a',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                NATURAL MILK DAIRY
              </div>
              <div
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: '#15803d',
                  letterSpacing: '0.14em',
                  marginTop: '2px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                NATURAL • PURE • HEALTHY
              </div>
            </div>
          </div>

          {/* Navigation Links to Separate Pages */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
            }}
            className="public-nav-links"
          >
            <button
              onClick={() => navigatePage('home')}
              style={{
                color: activeTab === 'home' || activeTab === 'landing' ? '#0d5c3a' : '#4b5563',
                fontWeight: activeTab === 'home' || activeTab === 'landing' ? 800 : 600,
                fontSize: '0.96rem',
                borderBottom: activeTab === 'home' || activeTab === 'landing' ? '2px solid #0d5c3a' : '2px solid transparent',
                padding: '4px 0',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              Home
            </button>

            <button
              onClick={() => navigatePage('products')}
              style={{
                color: activeTab === 'products' ? '#0d5c3a' : '#4b5563',
                fontWeight: activeTab === 'products' ? 800 : 600,
                fontSize: '0.96rem',
                borderBottom: activeTab === 'products' ? '2px solid #0d5c3a' : '2px solid transparent',
                padding: '4px 0',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              Our products
            </button>

            <button
              onClick={() => navigatePage('story')}
              style={{
                color: activeTab === 'story' ? '#0d5c3a' : '#4b5563',
                fontWeight: activeTab === 'story' ? 800 : 600,
                fontSize: '0.96rem',
                borderBottom: activeTab === 'story' ? '2px solid #0d5c3a' : '2px solid transparent',
                padding: '4px 0',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              Our story
            </button>

            <button
              onClick={() => navigatePage('faqs')}
              style={{
                color: activeTab === 'faqs' ? '#0d5c3a' : '#4b5563',
                fontWeight: activeTab === 'faqs' ? 800 : 600,
                fontSize: '0.96rem',
                borderBottom: activeTab === 'faqs' ? '2px solid #0d5c3a' : '2px solid transparent',
                padding: '4px 0',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              FAQs
            </button>

            <button
              onClick={() => navigatePage('contact')}
              style={{
                color: activeTab === 'contact' ? '#0d5c3a' : '#4b5563',
                fontWeight: activeTab === 'contact' ? 800 : 600,
                fontSize: '0.96rem',
                borderBottom: activeTab === 'contact' ? '2px solid #0d5c3a' : '2px solid transparent',
                padding: '4px 0',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              Contact
            </button>
          </nav>

          {/* Right Action: LOGIN & REGISTER or USER ACTIONS */}
          <div className="public-site-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user ? (
              // Logged in User Controls
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    openUserPortal();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#eaf5ee',
                    color: '#0d5c3a',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    border: '1px solid #bbf7d0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title="Open Portal Console"
                >
                  {user.role === 'admin' ? (
                    <ShieldCheck size={16} />
                  ) : user.role === 'delivery_boy' ? (
                    <Truck size={16} />
                  ) : (
                    <User size={16} />
                  )}
                  <span>
                    {user.role === 'admin'
                      ? 'Owner Portal'
                      : user.role === 'delivery_boy'
                        ? 'Delivery App'
                        : user.name
                          ? `${user.name.split(' ')[0]}'s Portal`
                          : 'Customer Portal'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(true)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                  }}
                  title="View Notifications"
                  aria-label="View notifications"
                >
                  <Bell size={16} color="#059669" />
                  <span>Alerts</span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: '#e11d48',
                        color: '#ffffff',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '10px',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigatePage('home');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#fff1f2',
                    color: '#be123c',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    border: '1px solid #fecdd3',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title="Sign out of your account"
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              // Not Logged In: SHOW LOGIN & REGISTER BUTTONS PROMINENTLY
              <>
                <button
                  onClick={() => navigatePage('login')}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: '1.5px solid #0d5c3a',
                    background: activeTab === 'login' ? '#eaf5ee' : '#ffffff',
                    color: '#0d5c3a',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Login
                </button>

                <button
                  onClick={() => navigatePage('register')}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(13, 92, 58, 0.25)',
                    transition: 'all 0.2s',
                  }}
                >
                  Register
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="public-mobile-alerts"
            onClick={() => setIsNotificationOpen(true)}
            aria-label={`View notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell size={19} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="public-mobile-alert-count">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

        </div>
        </header>
        <CustomerBottomNav
          className="public-mobile-bottom-nav"
          ariaLabel="Main navigation"
          items={CUSTOMER_HOME_NAV_ITEMS}
          activePage={activeTab === 'landing' ? 'home' : activeTab}
          onNavigate={(page) => {
            if (page === 'profile') {
              if (user?.role === 'customer') {
                openUserPortal('profile');
                return;
              }
              navigatePage('login');
              return;
            }
            navigatePage(page);
          }}
        />
      </>
    );
  }

  // Otherwise, user is inside the internal Admin or Delivery partner management portal
  return (
    <header
      className={user?.role === 'customer' ? 'customer-dashboard-nav' : undefined}
      style={{
        background: 'linear-gradient(180deg, #0c2340 0%, #081a30 100%)',
        color: '#ffffff',
        borderBottom: '3px solid #f5a623',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {!isOnline && (
        <div
          style={{
            background: '#d97706',
            color: '#ffffff',
            fontSize: '0.8rem',
            fontWeight: 600,
            textAlign: 'center',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <WifiOff size={14} />
          You are currently Offline. Deliveries & payments are saved locally and will auto-sync!
        </div>
      )}

      {offlineQueue.length > 0 && isOnline && (
        <div
          style={{
            background: '#0d5c3a',
            color: '#ffffff',
            fontSize: '0.8rem',
            fontWeight: 600,
            textAlign: 'center',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <RefreshCw size={14} className="spin" />
          {offlineQueue.length} offline deliveries pending sync.
          <button
            onClick={syncOfflineQueue}
            style={{
              background: '#f5a623',
              color: '#0c2340',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          >
            Sync Now
          </button>
        </div>
      )}

      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            onClick={() => setActiveTab('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #f5a623',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>
                NATURAL MILK DAIRY
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#f5a623', textTransform: 'uppercase' }}>
                {user?.role === 'customer' ? 'Customer Portal' : 'Management Portal'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('home')}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#86efac',
              border: '1px solid rgba(134, 239, 172, 0.4)',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            <Globe size={14} /> View Website
          </button>
        </div>

        {/* Portal Nav Items */}
        <nav
          className={user?.role === 'customer' ? 'customer-portal-top-nav' : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
        >
          {user?.role === 'admin' ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeTab === 'dashboard' ? 'rgba(245, 166, 35, 0.2)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#f5a623' : '#e5e7eb',
                  border: activeTab === 'dashboard' ? '1px solid #f5a623' : '1px solid transparent',
                }}
              >
                <Activity size={16} /> Dashboard
              </button>

              <button
                onClick={() => setActiveTab('deliveries')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeTab === 'deliveries' ? 'rgba(245, 166, 35, 0.2)' : 'transparent',
                  color: activeTab === 'deliveries' ? '#f5a623' : '#e5e7eb',
                  border: activeTab === 'deliveries' ? '1px solid #f5a623' : '1px solid transparent',
                }}
              >
                <Truck size={16} /> Deliveries
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeTab === 'customers' ? 'rgba(245, 166, 35, 0.2)' : 'transparent',
                  color: activeTab === 'customers' ? '#f5a623' : '#e5e7eb',
                  border: activeTab === 'customers' ? '1px solid #f5a623' : '1px solid transparent',
                }}
              >
                <Users size={16} /> Customers
              </button>

              <button
                onClick={() => setActiveTab('outstanding')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeTab === 'outstanding' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                  color: activeTab === 'outstanding' ? '#fca5a5' : '#e5e7eb',
                  border: activeTab === 'outstanding' ? '1px solid #ef4444' : '1px solid transparent',
                }}
              >
                <CreditCard size={16} /> Credit Report
              </button>

              <button
                onClick={() => setActiveTab('pricing')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeTab === 'pricing' ? 'rgba(245, 166, 35, 0.2)' : 'transparent',
                  color: activeTab === 'pricing' ? '#f5a623' : '#e5e7eb',
                  border: activeTab === 'pricing' ? '1px solid #f5a623' : '1px solid transparent',
                }}
              >
                <DollarSign size={16} /> Products
              </button>

              <button
                onClick={() => setActiveTab('delivery-boys')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeTab === 'delivery-boys' ? 'rgba(245, 166, 35, 0.2)' : 'transparent',
                  color: activeTab === 'delivery-boys' ? '#f5a623' : '#e5e7eb',
                  border: activeTab === 'delivery-boys' ? '1px solid #f5a623' : '1px solid transparent',
                }}
              >
                <Truck size={16} /> Delivery Boys
              </button>

              <button
                onClick={() => setActiveTab('audit-logs')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeTab === 'audit-logs' ? 'rgba(245, 166, 35, 0.2)' : 'transparent',
                  color: activeTab === 'audit-logs' ? '#f5a623' : '#e5e7eb',
                  border: activeTab === 'audit-logs' ? '1px solid #f5a623' : '1px solid transparent',
                }}
              >
                <FileText size={16} /> Audit Trail
              </button>
            </>
          ) : user?.role === 'customer' ? null : (
            <button
              onClick={() => setActiveTab('delivery-boy-app')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                color: '#ffffff',
              }}
            >
              <Truck size={18} /> Today's Deliveries
            </button>
          )}
        </nav>

        {/* Alerts & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          {/* Notification Bell in Management Header */}
          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '20px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              position: 'relative',
              transition: 'background 0.15s ease',
            }}
            title="View Notifications"
            aria-label="View notifications"
          >
            <Bell size={15} color="#86efac" />
            <span>Alerts</span>
            {unreadCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className="portal-account-trigger"
            onClick={() => setDropdownOpen((isOpen) => !isOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="Open account menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '30px',
              cursor: 'pointer',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: user?.role === 'admin' ? '#0d5c3a' : '#f5a623',
                color: user?.role === 'admin' ? '#ffffff' : '#0c2340',
                fontWeight: 800,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#f5a623', fontWeight: 600, textTransform: 'uppercase' }}>
                {user?.role === 'admin' ? 'Owner / Admin' : user?.role === 'delivery_boy' ? 'Partner' : 'Customer'}
              </div>
            </div>
            <ChevronDown size={14} color="#9ca3af" />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                background: '#ffffff',
                color: '#14241a',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                padding: '8px',
                width: '260px',
                zIndex: 200,
                border: '1px solid #e2ece3',
              }}
            >
              <div style={{ padding: '8px 10px', fontSize: '0.72rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>
                Account Information
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{user?.name || 'Authorized User'}</div>
                <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                  Role: {user?.role === 'admin' ? 'Owner / Admin' : user?.role === 'delivery_boy' ? 'Delivery Partner' : 'Customer'}
                </div>
                {user?.mobile && (
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                    Phone: {user.mobile}
                  </div>
                )}
                {user?.email && (
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Email: {user.email}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="portal-profile-link"
                onClick={() => {
                  openUserPortal('profile');
                  setDropdownOpen(false);
                }}
              >
                <User size={17} aria-hidden="true" />
                <span>{user?.role === 'customer' ? 'Profile & dashboard' : 'Open portal'}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
