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

import AdminDashboard from './pages/admin/AdminDashboard';
import TodayDeliveries from './pages/admin/TodayDeliveries';
import CustomerList from './pages/admin/CustomerList';
import LedgerView from './pages/admin/LedgerView';
import OutstandingReport from './pages/admin/OutstandingReport';
import ProductsPricing from './pages/admin/ProductsPricing';
import DeliveryBoysManager from './pages/admin/DeliveryBoysManager';
import AuditLogs from './pages/admin/AuditLogs';
import AddDeliveryBoyPage from './pages/admin/AddDeliveryBoyPage';
import EditDeliveryBoyPage from './pages/admin/EditDeliveryBoyPage';
import AddProductPage from './pages/admin/AddProductPage';
import EditProductPage from './pages/admin/EditProductPage';
import DeliveryBoyApp from './pages/delivery/DeliveryBoyApp';
import CustomerPortal from './pages/customer/CustomerPortal';
import AdminLayout from './components/AdminLayout';

import CustomerModal from './components/CustomerModal';
import PaymentModal from './components/PaymentModal';
import PauseDeliveryModal from './components/PauseDeliveryModal';
import TempQuantityModal from './components/TempQuantityModal';

export default function App() {
  const { user, logout } = useAuth();

  const adminTabs = [
    'dashboard',
    'deliveries',
    'customers',
    'ledger',
    'outstanding',
    'pricing',
    'delivery-boys',
    'audit-logs',
    'add-delivery-boy',
    'edit-delivery-boy',
    'add-product',
    'edit-product',
  ];

  // Initialize activeTab with persistence, role-awareness, and URL redirect handling
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const portalParam = urlParams.get('portal');
      const tabParam = urlParams.get('tab');
      const savedUser = JSON.parse(localStorage.getItem('nmd_user') || 'null');
      const savedAdminTab = localStorage.getItem('nmd_admin_tab');
      const savedGeneralTab = localStorage.getItem('nmd_current_tab');

      // 1. Direct portal links (from dispatch emails)
      if (portalParam === 'delivery' || tabParam === 'delivery') {
        if (savedUser?.role === 'delivery_boy') {
          return 'delivery-boy-app';
        }
        return 'login';
      }

      if (portalParam === 'customer' || tabParam === 'customer') {
        if (savedUser?.role === 'customer') {
          return 'customer-portal';
        }
        return 'login';
      }

      if (tabParam === 'login' || window.location.pathname === '/login') {
        if (!savedUser) return 'login';
      }

      // 2. Role-based restoration
      if (savedUser?.role === 'admin') {
        return savedAdminTab && adminTabs.includes(savedAdminTab) ? savedAdminTab : 'dashboard';
      }
      if (savedUser?.role === 'delivery_boy') {
        return 'delivery-boy-app';
      }
      if (savedUser?.role === 'customer') {
        return 'customer-portal';
      }
      if (savedGeneralTab && !adminTabs.includes(savedGeneralTab)) {
        return savedGeneralTab;
      }
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
        const savedUser = JSON.parse(localStorage.getItem('nmd_user') || 'null');
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
        const savedUser = JSON.parse(localStorage.getItem('nmd_user') || 'null');
        if (savedUser?.role === 'customer') {
          setActiveTab('customer-portal');
        } else {
          if (savedUser && savedUser.role !== 'customer') {
            logout();
          }
          setActiveTab('login');
        }
      } else if (tabParam === 'login' || window.location.pathname === '/login') {
        const savedUser = JSON.parse(localStorage.getItem('nmd_user') || 'null');
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
  }, [activeTab]);

  // Strict Role Isolation:
  // Admin isolation
  useEffect(() => {
    if (user?.role === 'admin') {
      const urlParams = new URLSearchParams(window.location.search);
      const isExplicitPortal = urlParams.get('portal') === 'delivery' || urlParams.get('portal') === 'customer';
      if (!isExplicitPortal && !adminTabs.includes(activeTab) && activeTab !== 'login') {
        const lastAdminTab = localStorage.getItem('nmd_admin_tab') || 'dashboard';
        setActiveTab(lastAdminTab);
      }
    }
  }, [user, activeTab]);

  // Delivery boy isolation: Delivery partner only accesses the Delivery App
  useEffect(() => {
    if (user?.role === 'delivery_boy') {
      if (activeTab !== 'delivery-boy-app') {
        setActiveTab('delivery-boy-app');
      }
    }
  }, [user, activeTab]);

  // Customer isolation: Customer does not access admin tabs
  useEffect(() => {
    if (user?.role === 'customer') {
      if (adminTabs.includes(activeTab)) {
        setActiveTab('customer-portal');
      }
    }
  }, [user, activeTab]);

  // Ledger state
  const [selectedLedgerCustomerId, setSelectedLedgerCustomerId] = useState('cust_1');

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
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [pauseCustomer, setPauseCustomer] = useState(null);
  const [isTempQtyOpen, setIsTempQtyOpen] = useState(false);
  const [tempQtyCustomer, setTempQtyCustomer] = useState(null);

  // Helper callbacks
  const handleOpenLedger = (customerId) => {
    setSelectedLedgerCustomerId(customerId);
    setActiveTab('ledger');
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

  const isAdminView = adminTabs.includes(activeTab) || user?.role === 'admin';

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* If in Admin view, render the dedicated Light-Themed Admin Sidebar Layout */}
      {isAdminView ? (
        <AdminLayout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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

          {activeTab === 'dashboard' && (
            <AdminDashboard
              setActiveTab={setActiveTab}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenPaymentModal={() => handleOpenPayment()}
            />
          )}

          {activeTab === 'deliveries' && (
            <TodayDeliveries onSelectCustomerLedger={handleOpenLedger} />
          )}

          {activeTab === 'customers' && (
            <CustomerList
              onSelectCustomerLedger={handleOpenLedger}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenPaymentModal={handleOpenPayment}
              onOpenPauseModal={handleOpenPause}
              onOpenTempQtyModal={handleOpenTempQty}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerView
              customerId={selectedLedgerCustomerId}
              onBack={() => setActiveTab('customers')}
              onOpenPaymentModal={handleOpenPayment}
            />
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

          {activeTab === 'audit-logs' && <AuditLogs />}
        </AdminLayout>
      ) : (
        <>
          {/* Universal Navbar for Public & User Views */}
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Main Content Area - Full 100% Viewport Width */}
          <main style={{ flex: 1, padding: 0, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            {/* Public Separate Pages */}
            {(activeTab === 'home' || activeTab === 'landing') && (
              <HomePage setActiveTab={setActiveTab} />
            )}

            {activeTab === 'products' && (
              <ProductsPage setActiveTab={setActiveTab} />
            )}

            {activeTab === 'story' && (
              <StoryPage setActiveTab={setActiveTab} />
            )}

            {activeTab === 'faqs' && (
              <FaqsPage setActiveTab={setActiveTab} />
            )}

            {activeTab === 'contact' && (
              <ContactPage setActiveTab={setActiveTab} />
            )}

            {activeTab === 'login' && (
              <LoginPage setActiveTab={setActiveTab} />
            )}

            {activeTab === 'register' && (
              <RegisterPage setActiveTab={setActiveTab} />
            )}

            {/* Customer Self-Service Portal */}
            {activeTab === 'customer-portal' && (
              <CustomerPortal
                setActiveTab={setActiveTab}
                onOpenPauseModal={handleOpenPause}
                onOpenTempQtyModal={handleOpenTempQty}
                onOpenPaymentModal={handleOpenPayment}
              />
            )}

            {/* Delivery Boy Mobile App View */}
            {activeTab === 'delivery-boy-app' && (
              <DeliveryBoyApp />
            )}
          </main>
        </>
      )}

      {/* Global Modals */}
      <CustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
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
    </div>
  );
}
