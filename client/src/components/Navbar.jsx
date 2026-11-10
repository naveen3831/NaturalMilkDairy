import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
} from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';
import CustomerBottomNav, { CUSTOMER_HOME_NAV_ITEMS } from './CustomerBottomNav';
import CustomerPortalDropdown from './CustomerPortalDropdown';
import {
  CustomerDeliveriesPublicModal,
  CustomerSubscriptionPublicModal,
  CustomerAddressPublicModal,
  CustomerPausePublicModal,
  CustomerSupportPublicModal,
} from './CustomerPublicModals';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const { isOnline, offlineQueue, syncOfflineQueue } = useDairy();
  const { unreadCount, setIsNotificationOpen } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isLoggedInCustomer = user?.role === 'customer';

  // Desktop customer portal dropdown and public modal states
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerModalType, setCustomerModalType] = useState(null);
  const [customerLiveDetails, setCustomerLiveDetails] = useState(null);
  const [customerDeliveriesList, setCustomerDeliveriesList] = useState([]);
  const customerDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isCustomerDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCustomerDropdownOpen]);

  // Fetch live customer details & deliveries for dropdown when customer is logged in
  useEffect(() => {
    if (!user || user.role !== 'customer') return;

    let isMounted = true;
    const fetchCustomerData = async () => {
      try {
        const token = sessionStorage.getItem('nmd_jwt_token') || localStorage.getItem('nmd_jwt_token');
        if (!token) return;

        const custId = user.customerId || user.id || 'me';
        const res = await fetch(`/api/customers/${encodeURIComponent(custId)}/ledger`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (isMounted && data.success) {
          if (data.customer) setCustomerLiveDetails(data.customer);
          if (Array.isArray(data.ledgerEntries)) {
            const dels = data.ledgerEntries
              .filter((e) => e.type === 'delivery')
              .reverse();
            setCustomerDeliveriesList(dels);
          }
        }
      } catch (err) {
        // quiet fallback
      }
    };

    fetchCustomerData();
    const interval = setInterval(fetchCustomerData, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const publicTabs = [
    'home',
    'landing',
    'products',
    'subscription',
    'story',
    'faqs',
    'contact',
    'login',
    'register',
    'my-subscription',
    'my-deliveries',
    'my-address',
    'pause-delivery',
  ];
  const isPublicView = !user || publicTabs.includes(activeTab);

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

  const [isProductDetailsActive, setIsProductDetailsActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return (
      Boolean(urlParams.get('product')) ||
      Boolean(urlParams.get('id')) ||
      document.body.classList.contains('product-details-page-active')
    );
  });

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const checkProductDetails = () => {
      if (typeof window === 'undefined') return;
      const urlParams = new URLSearchParams(window.location.search);
      const isPDP =
        Boolean(urlParams.get('product')) ||
        Boolean(urlParams.get('id')) ||
        document.body.classList.contains('product-details-page-active') ||
        Boolean(document.querySelector('.product-details-root'));
      setIsProductDetailsActive(isPDP);
    };
    checkProductDetails();
    const interval = setInterval(checkProductDetails, 150);
    window.addEventListener('popstate', checkProductDetails);
    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', checkProductDetails);
    };
  }, []);

  // Once the admin logs in, never show the public navbar
  if (user?.role === 'admin') {
    return null;
  }

  // If in public view, show the clean white navbar with Home, Our products, Our story, FAQs, Contact, and Login/Register
  if (isPublicView) {
    // On mobile: remove the top nav bar on products, subscription, deliveries, profile screens
    const hideTopHeader =
      isMobile &&
      (isProductDetailsActive ||
        activeTab === 'products' ||
        activeTab === 'subscription' ||
        activeTab === 'deliveries' ||
        activeTab === 'profile');

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
            display: hideTopHeader ? 'none' : undefined,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isMobile && activeTab !== 'home' && activeTab !== 'landing' && (
              <button
                type="button"
                className="public-mobile-back-btn"
                onClick={() => navigatePage('home')}
                aria-label="Back to Home"
                title="Go back"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#f3f7f4',
                  border: '1px solid #e2ebe5',
                  color: '#0d5c3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <ArrowLeft size={18} />
              </button>
            )}
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
              Products
            </button>

            <button
              onClick={() => navigatePage('subscription')}
              style={{
                color: activeTab === 'subscription' ? '#0d5c3a' : '#4b5563',
                fontWeight: activeTab === 'subscription' ? 800 : 600,
                fontSize: '0.96rem',
                borderBottom: activeTab === 'subscription' ? '2px solid #0d5c3a' : '2px solid transparent',
                padding: '4px 0',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              Subscription
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
              Our Story
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
                {user.role === 'customer' && !isMobile ? (
                  /* DESKTOP WEBSITE: Rich Portal Dropdown Menu instead of redirecting to dashboard */
                  <div
                    ref={customerDropdownRef}
                    style={{ position: 'relative', display: 'inline-block' }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: isCustomerDropdownOpen ? '#0d5c3a' : '#eaf5ee',
                        color: isCustomerDropdownOpen ? '#ffffff' : '#0d5c3a',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        border: '1px solid #bbf7d0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isCustomerDropdownOpen ? '0 2px 10px rgba(13, 92, 58, 0.25)' : 'none',
                      }}
                      title="Customer Portal Menu"
                    >
                      <User size={16} />
                      <span>{user.name ? `${user.name.split(' ')[0]}'s Portal` : 'Customer Portal'}</span>
                      <ChevronDown
                        size={15}
                        style={{
                          transform: isCustomerDropdownOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </button>

                    {isCustomerDropdownOpen && (
                      <CustomerPortalDropdown
                        user={user}
                        customerData={customerLiveDetails || user}
                        deliveries={customerDeliveriesList}
                        onClose={() => setIsCustomerDropdownOpen(false)}
                        onOpenModal={(modalType) => {
                          setIsCustomerDropdownOpen(false);
                          if (modalType === 'subscription') navigatePage('my-subscription');
                          else if (modalType === 'deliveries') navigatePage('my-deliveries');
                          else if (modalType === 'address') navigatePage('my-address');
                          else if (modalType === 'pause') navigatePage('pause-delivery');
                          else if (modalType === 'support') navigatePage('contact');
                          else setCustomerModalType(modalType);
                        }}
                        onNavigate={(tab) => {
                          setIsCustomerDropdownOpen(false);
                          navigatePage(tab);
                        }}
                        onLogout={() => {
                          setIsCustomerDropdownOpen(false);
                          logout();
                          navigatePage('home');
                        }}
                      />
                    )}
                  </div>
                ) : (
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
                )}

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
            if (page === 'subscription') {
              if (user?.role === 'customer') {
                openUserPortal('subscription');
                return;
              }
              navigatePage('subscription');
              return;
            }
            if (page === 'deliveries') {
              if (user?.role === 'customer') {
                openUserPortal('deliveries');
                return;
              }
              navigatePage('login');
              return;
            }
            navigatePage(page);
          }}
        />

        {/* Customer Portal Public Modals - Displayed directly on public pages */}
        <CustomerDeliveriesPublicModal
          isOpen={customerModalType === 'deliveries'}
          onClose={() => setCustomerModalType(null)}
          customer={customerLiveDetails || user}
          deliveries={customerDeliveriesList}
        />
        <CustomerSubscriptionPublicModal
          isOpen={customerModalType === 'subscription'}
          onClose={() => setCustomerModalType(null)}
          customer={customerLiveDetails || user}
          onNavigatePublic={(tab) => {
            setCustomerModalType(null);
            navigatePage(tab);
          }}
        />
        <CustomerAddressPublicModal
          isOpen={customerModalType === 'address'}
          onClose={() => setCustomerModalType(null)}
          customer={customerLiveDetails || user}
          onSaved={(updated) => {
            setCustomerLiveDetails(updated);
          }}
        />
        <CustomerPausePublicModal
          isOpen={customerModalType === 'pause'}
          onClose={() => setCustomerModalType(null)}
          customer={customerLiveDetails || user}
          onUpdated={(updated) => {
            setCustomerLiveDetails(updated);
          }}
        />
        <CustomerSupportPublicModal
          isOpen={customerModalType === 'support'}
          onClose={() => setCustomerModalType(null)}
          customer={customerLiveDetails || user}
        />
      </>
    );
  }

  // If not public view, Navbar should NOT render anything.
  // The obsolete legacy dark navy "MANAGEMENT PORTAL" header is permanently removed.
  return null;
}
