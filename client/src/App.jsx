import React, { useState } from 'react';
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
import DeliveryBoyApp from './pages/delivery/DeliveryBoyApp';
import CustomerPortal from './pages/customer/CustomerPortal';

import CustomerModal from './components/CustomerModal';
import PaymentModal from './components/PaymentModal';
import PauseDeliveryModal from './components/PauseDeliveryModal';
import TempQuantityModal from './components/TempQuantityModal';

export default function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // Ledger state
  const [selectedLedgerCustomerId, setSelectedLedgerCustomerId] = useState('cust_1');

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

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Universal Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="main-content" style={{ flex: 1, padding: 0 }}>
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

        {/* Admin Management Views */}
        {activeTab === 'dashboard' && (
          <div style={{ padding: '24px 20px 80px 20px', maxWidth: '1360px', margin: '0 auto' }}>
            <AdminDashboard
              setActiveTab={setActiveTab}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenPaymentModal={() => handleOpenPayment()}
            />
          </div>
        )}

        {activeTab === 'deliveries' && (
          <div style={{ padding: '24px 20px 80px 20px', maxWidth: '1360px', margin: '0 auto' }}>
            <TodayDeliveries onSelectCustomerLedger={handleOpenLedger} />
          </div>
        )}

        {activeTab === 'customers' && (
          <div style={{ padding: '24px 20px 80px 20px', maxWidth: '1360px', margin: '0 auto' }}>
            <CustomerList
              onSelectCustomerLedger={handleOpenLedger}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenPaymentModal={handleOpenPayment}
              onOpenPauseModal={handleOpenPause}
              onOpenTempQtyModal={handleOpenTempQty}
            />
          </div>
        )}

        {activeTab === 'ledger' && (
          <div style={{ padding: '24px 20px 80px 20px', maxWidth: '1360px', margin: '0 auto' }}>
            <LedgerView
              customerId={selectedLedgerCustomerId}
              onBack={() => setActiveTab('customers')}
              onOpenPaymentModal={handleOpenPayment}
            />
          </div>
        )}

        {activeTab === 'outstanding' && (
          <div style={{ padding: '24px 20px 80px 20px', maxWidth: '1360px', margin: '0 auto' }}>
            <OutstandingReport
              onSelectCustomerLedger={handleOpenLedger}
              onOpenPaymentModal={handleOpenPayment}
            />
          </div>
        )}

        {activeTab === 'pricing' && (
          <div style={{ padding: '24px 20px 80px 20px', maxWidth: '1360px', margin: '0 auto' }}>
            <ProductsPricing />
          </div>
        )}

        {activeTab === 'delivery-boys' && (
          <div style={{ padding: '24px 20px 80px 20px', maxWidth: '1360px', margin: '0 auto' }}>
            <DeliveryBoysManager />
          </div>
        )}

        {activeTab === 'audit-logs' && (
          <div style={{ padding: '24px 20px 80px 20px', maxWidth: '1360px', margin: '0 auto' }}>
            <AuditLogs />
          </div>
        )}

        {activeTab === 'delivery-boy-app' && (
          <DeliveryBoyApp />
        )}
      </main>

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
