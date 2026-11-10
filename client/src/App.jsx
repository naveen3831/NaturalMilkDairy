import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useDairy } from './context/DairyContext';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import StoryPage from './pages/StoryPage';
import FaqsPage from './pages/FaqsPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublicSubscriptionPage from './pages/SubscriptionPage';
import FloatingContactButton from './components/FloatingContactButton';

import AdminDashboard from './pages/admin/AdminDashboard';
import TodayDeliveries from './pages/admin/TodayDeliveries';
import CustomerList from './pages/admin/CustomerList';
import SubscriptionsPage from './pages/admin/SubscriptionsPage';
import PaymentsManager from './pages/admin/PaymentsManager';
import LedgerView from './pages/admin/LedgerView';
import OutstandingReport from './pages/admin/OutstandingReport';
import ProductsPricing from './pages/admin/ProductsPricing';
import DeliveryBoysManager from './pages/admin/DeliveryBoysManager';
import LocationsManager from './pages/admin/LocationsManager';
import AuditLogs from './pages/admin/AuditLogs';
import AdminSupportDesk from './pages/admin/AdminSupportDesk';
import AddDeliveryBoyPage from './pages/admin/AddDeliveryBoyPage';
import EditDeliveryBoyPage from './pages/admin/EditDeliveryBoyPage';
import AddProductPage from './pages/admin/AddProductPage';
import EditProductPage from './pages/admin/EditProductPage';
import AdminProfileView from './pages/admin/AdminProfileView';
import ContactSettingsView from './pages/admin/ContactSettingsView';
import DeliveryBoyApp from './pages/delivery/DeliveryBoyApp';
import CustomerPortal from './pages/customer/CustomerPortal';
import AdminLayout from './components/AdminLayout';
import {
  CustomerSubscriptionPage,
  CustomerDeliveriesPage,
  CustomerAddressPage,
  CustomerPausePage,
} from './pages/customer/CustomerPublicFullPages';

import CustomerModal from './components/CustomerModal';
import PaymentModal from './components/PaymentModal';
import PauseDeliveryModal from './components/PauseDeliveryModal';
import TempQuantityModal from './components/TempQuantityModal';
import NotificationModal from './components/NotificationModal';

export default function App() {
  const { user, logout } = useAuth();

  const adminTabs = [
    'dashboard',
    'deliveries',
    'customers',
    'subscriptions',
    'payments',
    'ledger',
    'outstanding',
    'pricing',
    'delivery-boys',
    'locations',
    'audit-logs',
    'supports',
    'contact-settings',
    'add-delivery-boy',
    'edit-delivery-boy',
    'add-product',
    'edit-product',
    'profile',
  ];

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Initialize activeTab with persistence, role-awareness, and URL redirect handling
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const portalParam = urlParams.get('portal');
      const tabParam = urlParams.get('tab');
      const savedUser = JSON.parse(sessionStorage.getItem('nmd_user') || 'null');
      const savedAdminTab = localStorage.getItem('nmd_admin_tab');
      const savedGeneralTab = localStorage.getItem('nmd_current_tab');
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const isMob = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

      // 0. Once the admin is logged in: NEVER show public pages!
      if (savedUser?.role === 'admin') {
        const directTab = pathParts[0];
        if (directTab && adminTabs.includes(directTab)) {
          return directTab;
        }
        if (savedAdminTab && adminTabs.includes(savedAdminTab)) {
          return savedAdminTab;
        }
        return 'dashboard';
      }

      // If user is NOT logged in, NEVER allow admin/internal portal tabs!
      const internalTabs = [
        ...adminTabs,
        'delivery-boy-app',
        'customer-portal',
        'my-subscription',
        'my-deliveries',
        'my-address',
        'pause-delivery',
      ];
      const directTab = pathParts[0];
      if (!savedUser && directTab && internalTabs.includes(directTab)) {
        return 'home';
      }

      // 1. Direct portal links (from dispatch emails)
      if (portalParam === 'delivery' || tabParam === 'delivery') {
        if (savedUser?.role === 'delivery_boy') {
          return 'delivery-boy-app';
        }
        return 'login';
      }

      if (portalParam === 'customer' || tabParam === 'customer') {
        if (savedUser?.role === 'customer') {
          return isMob ? 'customer-portal' : 'home';
        }
        return 'login';
      }

      // Root path ("/" or empty path): ALWAYS open the public Home page for guests/customers!
      if (pathParts.length === 0) {
        return 'home';
      }

      if (pathParts[0] === 'delivery') {
        return savedUser?.role === 'delivery_boy' ? 'delivery-boy-app' : 'login';
      }

      if (pathParts[0] === 'customer') {
        if (savedUser?.role === 'customer') {
          if (isMob) return 'customer-portal';
          if (pathParts[1] === 'subscription') return 'my-subscription';
          if (pathParts[1] === 'deliveries') return 'my-deliveries';
          if (pathParts[1] === 'address') return 'my-address';
          if (pathParts[1] === 'pause') return 'pause-delivery';
          return 'home';
        }
        return 'login';
      }

      const knownTabs = [
        'home', 'products', 'subscription', 'story', 'faqs', 'contact', 'register',
        'my-subscription', 'my-deliveries', 'my-address', 'pause-delivery',
        'dashboard', 'deliveries', 'customers', 'ledger', 'outstanding',
        'subscriptions', 'payments', 'pricing', 'delivery-boys', 'locations', 'audit-logs', 'supports', 'contact-settings', 'profile', 'add-delivery-boy',
        'edit-delivery-boy', 'add-product', 'edit-product',
      ];
      if (pathParts.length === 1 && knownTabs.includes(directTab)) {
        if (!savedUser && internalTabs.includes(directTab)) {
          return 'home';
        }
        if (savedUser?.role === 'customer' && adminTabs.includes(directTab)) {
          return isMob ? 'customer-portal' : 'home';
        }
        if (savedUser?.role === 'delivery_boy' && adminTabs.includes(directTab)) {
          return 'delivery-boy-app';
        }
        return directTab;
      }

      if (tabParam === 'login' || window.location.pathname === '/login') {
        if (!savedUser) return 'login';
      }

      // Default fallback for any unspecified routes is the Home page
      return 'home';
    } catch (e) {}
    return 'home';
  });

  // Handle URL email redirects on mount / param changes
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const portalParam = urlParams.get('portal');
      const tabParam = urlParams.get('tab');

      if (portalParam === 'delivery' || tabParam === 'delivery') {
        const savedUser = JSON.parse(sessionStorage.getItem('nmd_user') || 'null');
        if (savedUser?.role === 'delivery_boy') {
          setActiveTab('delivery-boy-app');
        } else {
          // If currently logged in as a different role, log out so driver can sign in
          if (savedUser && savedUser.role !== 'delivery_boy') {
            logout();
          }
          setActiveTab('login');
        }
      } else if (portalParam === 'customer') {
        const savedUser = JSON.parse(sessionStorage.getItem('nmd_user') || 'null');
        if (savedUser?.role === 'customer') {
          setActiveTab('customer-portal');
        } else {
          if (savedUser && savedUser.role !== 'customer') {
            logout();
          }
          setActiveTab('login');
        }
      } else if (tabParam === 'login' || window.location.pathname === '/login') {
        const savedUser = JSON.parse(sessionStorage.getItem('nmd_user') || 'null');
        if (!savedUser) {
          setActiveTab('login');
        }
      }
    } catch (e) {
      console.error('URL redirect handling error:', e);
    }
  }, []);

  // Keep localStorage updated with current active tab
  useEffect(() => {
    localStorage.setItem('nmd_current_tab', activeTab);
    if (adminTabs.includes(activeTab)) {
      localStorage.setItem('nmd_admin_tab', activeTab);
    }
    if (activeTab === 'customer-portal' && !window.location.pathname.startsWith('/customer/')) {
      const savedCustomerPage = localStorage.getItem('nmd_customer_page');
      const customerPage = ['dashboard', 'products', 'subscription', 'deliveries', 'profile'].includes(savedCustomerPage)
        ? savedCustomerPage
        : 'dashboard';
      window.history.replaceState({ nmdCustomerPage: true }, '', `/customer/${customerPage}`);
    } else if (activeTab === 'delivery-boy-app' && !window.location.pathname.startsWith('/delivery/')) {
      const savedDriverPage = localStorage.getItem('nmd_driver_tab');
      const driverPage = ['deliveries', 'route', 'cash', 'profile'].includes(savedDriverPage)
        ? savedDriverPage
        : 'deliveries';
      window.history.replaceState({ nmdDeliveryPage: true }, '', `/delivery/${driverPage}`);
    }
  }, [activeTab]);

  // Handle explicit logout event: always immediately reset activeTab to 'home' and URL to '/'
  useEffect(() => {
    const handleLogout = () => {
      setActiveTab('home');
      if (window.location.pathname !== '/') {
        window.history.replaceState({ nmdPage: 'home' }, '', '/');
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    };
    window.addEventListener('nmd_auth_logout', handleLogout);
    return () => window.removeEventListener('nmd_auth_logout', handleLogout);
  }, []);

  useEffect(() => {
    const syncTabFromLocation = () => {
      const pathParts = window.location.pathname.split('/').filter(Boolean);

      // Once admin logs in, NEVER show public pages under any circumstances
      if (user?.role === 'admin') {
        const pathTab = pathParts[0] || 'dashboard';
        if (adminTabs.includes(pathTab)) {
          setActiveTab(pathTab);
        } else {
          const lastAdminTab = localStorage.getItem('nmd_admin_tab') || 'dashboard';
          const validTab = adminTabs.includes(lastAdminTab) ? lastAdminTab : 'dashboard';
          setActiveTab(validTab);
          if (window.location.pathname !== `/${validTab}`) {
            window.history.replaceState({ nmdPage: validTab }, '', `/${validTab}`);
          }
        }
        return;
      }

      // If user is logged out (no user session), NEVER allow admin or internal portal tabs!
      if (!user) {
        const pathTab = pathParts[0] || 'home';
        const internalTabs = [
          ...adminTabs,
          'delivery-boy-app',
          'customer-portal',
          'my-subscription',
          'my-deliveries',
          'my-address',
          'pause-delivery',
        ];
        if (internalTabs.includes(pathTab)) {
          setActiveTab('home');
          if (window.location.pathname !== '/') {
            window.history.replaceState({ nmdPage: 'home' }, '', '/');
          }
          return;
        }
      }

      if (pathParts[0] === 'customer') {
        if (user?.role === 'customer') {
          if (isMobile) {
            setActiveTab('customer-portal');
            return;
          }
          if (pathParts[1] === 'subscription') { setActiveTab('my-subscription'); return; }
          if (pathParts[1] === 'deliveries') { setActiveTab('my-deliveries'); return; }
          if (pathParts[1] === 'address') { setActiveTab('my-address'); return; }
          if (pathParts[1] === 'pause') { setActiveTab('pause-delivery'); return; }
          setActiveTab('home');
          return;
        }
        setActiveTab('login');
        return;
      }
      if (pathParts[0] === 'delivery') {
        setActiveTab(user?.role === 'delivery_boy' ? 'delivery-boy-app' : 'login');
        return;
      }
      if (pathParts[0] === 'login' && user) {
        setActiveTab(user.role === 'admin'
          ? localStorage.getItem('nmd_admin_tab') || 'dashboard'
          : user.role === 'delivery_boy'
            ? 'delivery-boy-app'
            : user.role === 'customer'
              ? (isMobile ? 'customer-portal' : 'home')
              : 'home');
        return;
      }
      const pathTab = pathParts[0] || 'home';
      const routeTabs = [
        'home', 'products', 'story', 'faqs', 'contact', 'register', 'subscription',
        'my-subscription', 'my-deliveries', 'my-address', 'pause-delivery',
        'dashboard', 'deliveries', 'customers', 'ledger', 'outstanding',
        'subscriptions', 'payments', 'pricing', 'delivery-boys', 'locations', 'audit-logs', 'supports', 'contact-settings', 'profile', 'add-delivery-boy',
        'edit-delivery-boy', 'add-product', 'edit-product',
      ];
      if (pathParts.length <= 1 && routeTabs.includes(pathTab)) {
        if (user?.role === 'customer' && adminTabs.includes(pathTab)) {
          const target = isMobile ? 'customer-portal' : 'home';
          setActiveTab(target);
          if (window.location.pathname !== '/') {
            window.history.replaceState({ nmdPage: target }, '', isMobile ? '/customer/dashboard' : '/');
          }
          return;
        }
        if (user?.role === 'delivery_boy' && adminTabs.includes(pathTab)) {
          setActiveTab('delivery-boy-app');
          return;
        }
        setActiveTab(pathTab);
      }
    };
    window.addEventListener('popstate', syncTabFromLocation);
    return () => window.removeEventListener('popstate', syncTabFromLocation);
  }, [user, isMobile]);

  // Whenever activeTab changes, automatically scroll to the starting top of the page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [activeTab]);

  const navigateToTab = (tab, optionsOrProductId = null) => {
    let targetTab = tab;
    if (user?.role === 'admin') {
      // Once admin logs in, block navigation to public pages and retain admin view
      if (!adminTabs.includes(targetTab)) {
        targetTab = localStorage.getItem('nmd_admin_tab') || 'dashboard';
        if (!adminTabs.includes(targetTab)) targetTab = 'dashboard';
      }
    } else if (user?.role === 'customer') {
      if (adminTabs.includes(tab) || (!isMobile && tab === 'customer-portal')) {
        targetTab = (tab === 'dashboard' || tab === 'home' || tab === 'customer-portal') ? 'home' : (isMobile ? 'customer-portal' : 'home');
      }
    } else if (!user) {
      // Unauthenticated users cannot navigate to internal portals
      const internalTabs = [
        ...adminTabs,
        'delivery-boy-app',
        'customer-portal',
        'my-subscription',
        'my-deliveries',
        'my-address',
        'pause-delivery',
      ];
      if (internalTabs.includes(targetTab)) {
        targetTab = 'home';
      }
    }
    const targetProductId = typeof optionsOrProductId === 'string'
      ? optionsOrProductId
      : (optionsOrProductId?.productId || (typeof optionsOrProductId === 'object' && (optionsOrProductId?.id || optionsOrProductId?._id || optionsOrProductId?.name)));

    if (tab === 'products') {
      if (targetProductId) {
        localStorage.setItem('nmd_selected_product_id', String(targetProductId));
      } else if (!localStorage.getItem('nmd_selected_product_id')) {
        window.dispatchEvent(new CustomEvent('nmd_reset_products_page'));
      }
    } else {
      localStorage.removeItem('nmd_selected_product_id');
      localStorage.removeItem('nmd_selected_product_name');
      localStorage.removeItem('nmd_selected_product_obj');
    }

    setActiveTab(targetTab);
    const activeTargetId = targetProductId || (targetTab === 'products' ? localStorage.getItem('nmd_selected_product_id') : null);
    const routePath = targetTab === 'customer-portal'
      ? `/customer/${localStorage.getItem('nmd_customer_page') || 'dashboard'}`
      : targetTab === 'delivery-boy-app'
        ? `/delivery/${localStorage.getItem('nmd_driver_tab') || 'deliveries'}`
        : targetTab === 'home' || targetTab === 'landing'
          ? '/'
          : targetTab === 'products' && activeTargetId
            ? `/products?product=${encodeURIComponent(activeTargetId)}`
            : `/${targetTab}`;
    if (window.location.pathname + window.location.search !== routePath) {
      window.history.pushState({ nmdPage: targetTab }, '', routePath);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 40);
  };

  // Strict Unauthenticated Protection:
  // When user is not logged in, NEVER allow them on internal/admin/portal tabs - ALWAYS redirect to home page!
  useEffect(() => {
    if (!user) {
      const internalTabs = [
        ...adminTabs,
        'delivery-boy-app',
        'customer-portal',
        'my-subscription',
        'my-deliveries',
        'my-address',
        'pause-delivery',
      ];
      if (internalTabs.includes(activeTab)) {
        setActiveTab('home');
        if (window.location.pathname !== '/') {
          window.history.replaceState({ nmdPage: 'home' }, '', '/');
        }
      }
    }
  }, [user, activeTab]);

  // Strict Role Isolation:
  // Admin isolation: once admin logs in, strictly stay in admin tabs and never show public pages
  useEffect(() => {
    if (user?.role === 'admin') {
      if (!adminTabs.includes(activeTab)) {
        const lastAdminTab = localStorage.getItem('nmd_admin_tab') || 'dashboard';
        const validTab = adminTabs.includes(lastAdminTab) ? lastAdminTab : 'dashboard';
        setActiveTab(validTab);
        if (window.location.pathname !== `/${validTab}`) {
          window.history.replaceState({ nmdPage: validTab }, '', `/${validTab}`);
        }
      }
    }
  }, [user, activeTab]);

  // Delivery boy isolation: Delivery partner does not access admin tabs
  useEffect(() => {
    if (user?.role === 'delivery_boy') {
      if (adminTabs.includes(activeTab)) {
        setActiveTab('delivery-boy-app');
      }
    }
  }, [user, activeTab]);

  // Customer isolation: Customer does not access admin tabs, and stays on public site on desktop
  useEffect(() => {
    if (user?.role === 'customer') {
      if (!isMobile && activeTab === 'customer-portal') {
        setActiveTab('home');
        if (window.location.pathname.startsWith('/customer/')) {
          window.history.replaceState({ nmdPage: 'home' }, '', '/');
        }
      } else if (adminTabs.includes(activeTab)) {
        const target = isMobile ? 'customer-portal' : 'home';
        setActiveTab(target);
        if (window.location.pathname !== (isMobile ? '/customer/dashboard' : '/')) {
          window.history.replaceState({ nmdPage: target }, '', isMobile ? '/customer/dashboard' : '/');
        }
      }
    }
  }, [user, activeTab, isMobile]);

  // Ledger state
  const [selectedLedgerCustomerId, setSelectedLedgerCustomerId] = useState(null);

  // Selected Delivery Boy & Product for Full Page Editing
  const [selectedDeliveryBoyId, setSelectedDeliveryBoyId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [adminToast, setAdminToast] = useState('');
  const showAdminToast = (msg) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(''), 4500);
  };

  // Modal states
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [pauseCustomer, setPauseCustomer] = useState(null);
  const [isTempQtyOpen, setIsTempQtyOpen] = useState(false);
  const [tempQtyCustomer, setTempQtyCustomer] = useState(null);

  // Helper callbacks
  const handleOpenLedger = (customerId) => {
    setSelectedLedgerCustomerId(customerId);
    setActiveTab('customers');
  };

  const handleOpenEditCustomer = (customer) => {
    setEditingCustomer(customer);
  };

  const handleOpenPayment = (customer = null) => {
    setPaymentCustomer(customer);
    setIsPaymentOpen(true);
  };

  const handleOpenPause = (customer) => {
    setPauseCustomer(customer);
    setIsPauseOpen(true);
  };

  const handleOpenTempQty = (customer) => {
    setTempQtyCustomer(customer);
    setIsTempQtyOpen(true);
  };

  const publicTabsList = ['home', 'landing', 'products', 'story', 'faqs', 'contact', 'subscription', 'register'];
  // Once the admin logins, NEVER show public pages! Always keep admin strictly in AdminLayout
  const isAdminView = user?.role === 'admin';

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* If in Admin view, render the dedicated Light-Themed Admin Sidebar Layout */}
      {isAdminView ? (
        <AdminLayout
          activeTab={activeTab}
          setActiveTab={navigateToTab}
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          onOpenPaymentModal={() => handleOpenPayment()}
        >
          {/* Global Admin Toast */}
          {adminToast && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #10b981',
                color: '#065f46',
                padding: '12px 18px',
                borderRadius: '12px',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '18px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)',
              }}
            >
              <span>{adminToast}</span>
            </div>
          )}

          {(activeTab === 'dashboard' || !adminTabs.includes(activeTab)) && (
            <AdminDashboard
              setActiveTab={setActiveTab}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenPaymentModal={() => handleOpenPayment()}
            />
          )}

          {activeTab === 'deliveries' && (
            <TodayDeliveries onSelectCustomerLedger={handleOpenLedger} />
          )}

          {(activeTab === 'customers' || activeTab === 'ledger') && (
            <CustomerList
              initialCustomerId={selectedLedgerCustomerId}
              onClearSelectedCustomer={() => setSelectedLedgerCustomerId(null)}
              onSelectCustomerLedger={handleOpenLedger}
              onOpenAddCustomer={() => {
                setEditingCustomer(null);
                setIsAddCustomerOpen(true);
              }}
              onOpenEditCustomer={handleOpenEditCustomer}
              onOpenPaymentModal={handleOpenPayment}
              onOpenPauseModal={handleOpenPause}
              onOpenTempQtyModal={handleOpenTempQty}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsPage onSignIn={() => navigateToTab('login')} />
          )}

          {activeTab === 'payments' && (
            <PaymentsManager onOpenPaymentModal={handleOpenPayment} />
          )}

          

          {activeTab === 'outstanding' && (
            <OutstandingReport
              onSelectCustomerLedger={handleOpenLedger}
              onOpenPaymentModal={handleOpenPayment}
            />
          )}

          {/* Products & Pricing Full Pages */}
          {activeTab === 'pricing' && (
            <ProductsPricing
              onNavigateToAdd={() => setActiveTab('add-product')}
              onNavigateToEdit={(prodId) => {
                setSelectedProductId(prodId);
                setActiveTab('edit-product');
              }}
            />
          )}

          {activeTab === 'add-product' && (
            <AddProductPage
              onBack={() => setActiveTab('pricing')}
              onSaved={(msg) => {
                setActiveTab('pricing');
                showAdminToast(msg);
              }}
            />
          )}

          {activeTab === 'edit-product' && (
            <EditProductPage
              productId={selectedProductId}
              onBack={() => setActiveTab('pricing')}
              onSaved={(msg) => {
                setActiveTab('pricing');
                showAdminToast(msg);
              }}
              onDeleted={(msg) => {
                setActiveTab('pricing');
                showAdminToast(msg);
              }}
            />
          )}

          {/* Delivery Partners Full Pages */}
          {activeTab === 'delivery-boys' && (
            <DeliveryBoysManager
              onNavigateToAdd={() => setActiveTab('add-delivery-boy')}
              onNavigateToEdit={(boyId) => {
                setSelectedDeliveryBoyId(boyId);
                setActiveTab('edit-delivery-boy');
              }}
            />
          )}

          {activeTab === 'add-delivery-boy' && (
            <AddDeliveryBoyPage
              onBack={() => setActiveTab('delivery-boys')}
              onNavigateToEdit={(boyId) => {
                setSelectedDeliveryBoyId(boyId);
                setActiveTab('edit-delivery-boy');
              }}
              onSaved={(msg) => {
                setActiveTab('delivery-boys');
                showAdminToast(msg);
              }}
            />
          )}

          {activeTab === 'edit-delivery-boy' && (
            <EditDeliveryBoyPage
              deliveryBoyId={selectedDeliveryBoyId}
              onBack={() => setActiveTab('delivery-boys')}
              onSaved={(msg) => {
                setActiveTab('delivery-boys');
                showAdminToast(msg);
              }}
              onDeleted={(msg) => {
                setActiveTab('delivery-boys');
                showAdminToast(msg);
              }}
            />
          )}

          {activeTab === 'locations' && <LocationsManager />}

          {activeTab === 'audit-logs' && <AuditLogs />}

          {activeTab === 'supports' && <AdminSupportDesk />}

          {activeTab === 'contact-settings' && <ContactSettingsView />}

          {activeTab === 'profile' && <AdminProfileView setActiveTab={navigateToTab} />}
        </AdminLayout>
      ) : activeTab === 'delivery-boy-app' ? (
        /* Dedicated Driver Portal Layout (Sidebar on Web, Bottom Bar on Mobile) */
        <DeliveryBoyApp setActiveTab={navigateToTab} />
      ) : (
        <>
          {/* Customers use their own dashboard shell on mobile view; on website desktop they use public Navbar */}
          {!(activeTab === 'customer-portal' && user?.role === 'customer' && isMobile) && (
            <Navbar activeTab={activeTab} setActiveTab={navigateToTab} />
          )}

          {/* Main Content Area - Full 100% Viewport Width */}
          <main
            className={`public-mobile-content${user?.role === 'customer' ? ' customer-public-content' : ''}`}
            style={{
              flex: 1,
              padding: 0,
              width: '100%',
              maxWidth: '100%',
              overflowX: activeTab === 'customer-portal' ? 'visible' : 'hidden',
            }}
          >
            {/* Public Separate Pages */}
            {(activeTab === 'home' || activeTab === 'landing') && (
              <HomePage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'products' && (
              <ProductsPage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'subscription' && (
              <PublicSubscriptionPage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'story' && (
              <StoryPage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'faqs' && (
              <FaqsPage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'contact' && (
              <ContactPage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'login' && (
              <LoginPage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'register' && (
              <RegisterPage setActiveTab={navigateToTab} />
            )}

            {/* Customer Dedicated Full Pages on Website */}
            {activeTab === 'my-subscription' && (
              <CustomerSubscriptionPage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'my-deliveries' && (
              <CustomerDeliveriesPage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'my-address' && (
              <CustomerAddressPage setActiveTab={navigateToTab} />
            )}

            {activeTab === 'pause-delivery' && (
              <CustomerPausePage setActiveTab={navigateToTab} />
            )}

            {/* Customer Self-Service Portal (Preserved for mobile view; website desktop uses public pages & modals) */}
            {activeTab === 'customer-portal' && (
              isMobile ? (
                <CustomerPortal
                  setActiveTab={navigateToTab}
                  onOpenPauseModal={handleOpenPause}
                  onOpenTempQtyModal={handleOpenTempQty}
                  onOpenPaymentModal={handleOpenPayment}
                />
              ) : (
                <HomePage setActiveTab={navigateToTab} />
              )
            )}

            {/* Fallback to HomePage if no public route matches */}
            {![
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
              'customer-portal',
            ].includes(activeTab) && (
              <HomePage setActiveTab={navigateToTab} />
            )}
          </main>

          {/* Floating Contact Us Action Button (Mobile Responsive Only) */}
          {(!isMobile || activeTab !== 'customer-portal') && (
            <FloatingContactButton activeTab={activeTab} setActiveTab={navigateToTab} />
          )}
        </>
      )}

      {/* Global Modals */}
      <CustomerModal
        isOpen={isAddCustomerOpen || Boolean(editingCustomer)}
        customerToEdit={editingCustomer}
        onClose={() => {
          setIsAddCustomerOpen(false);
          setEditingCustomer(null);
        }}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setPaymentCustomer(null);
        }}
        selectedCustomer={paymentCustomer}
      />

      <PauseDeliveryModal
        isOpen={isPauseOpen}
        onClose={() => {
          setIsPauseOpen(false);
          setPauseCustomer(null);
        }}
        customer={pauseCustomer}
      />

      <TempQuantityModal
        isOpen={isTempQtyOpen}
        onClose={() => {
          setIsTempQtyOpen(false);
          setTempQtyCustomer(null);
        }}
        customer={tempQtyCustomer}
      />

      <NotificationModal />
    </div>
  );
}
