import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDairy } from '../context/DairyContext';
import {
  LayoutDashboard,
  Truck,
  Users,
  FileText,
  CreditCard,
  Tag,
  ShieldCheck,
  LogOut,
  Plus,
  Wallet,
  Menu,
  X,
  Calendar,
  UserPlus,
  ChevronRight,
  Sparkles,
  Bell,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

export default function AdminLayout({
  activeTab,
  setActiveTab,
  children,
  onOpenAddCustomer,
  onOpenPaymentModal,
}) {
  const { user, logout } = useAuth();
  const { selectedDate, setSelectedDate, dashboardSummary } = useDairy();
  const { unreadCount, setIsNotificationOpen } = useNotifications();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const summary = dashboardSummary || {};

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      desc: 'Real-time dairy metrics & KPIs',
    },
    {
      id: 'deliveries',
      label: "Today's Deliveries",
      icon: Truck,
      badge: summary.deliveriesCount ? `${summary.deliveriesCount}` : null,
      badgeColor: '#059669',
      desc: 'Morning routes & drop fulfillment',
    },
    {
      id: 'customers',
      label: 'Customer Directory',
      icon: Users,
      badge: summary.totalCustomers ? `${summary.totalCustomers}` : null,
      badgeColor: '#2563eb',
      desc: 'Active accounts & subscriptions',
    },
    {
      id: 'ledger',
      label: 'Customer Ledger',
      icon: FileText,
      badge: null,
      desc: 'Monthly statement & passbooks',
    },
    {
      id: 'outstanding',
      label: 'Credit & Outstanding',
      icon: CreditCard,
      badge: summary.totalOutstanding ? `₹${summary.totalOutstanding}` : null,
      badgeColor: '#dc2626',
      desc: 'Pending balances & recovery',
    },
    {
      id: 'pricing',
      label: 'Products & Pricing',
      icon: Tag,
      badge: null,
      desc: 'Catalog, rates & Cloudinary assets',
    },
    {
      id: 'delivery-boys',
      label: 'Delivery Partners',
      icon: UserPlus,
      badge: null,
      desc: 'Driver routes & cash audit',
    },
    {
      id: 'audit-logs',
      label: 'Audit Trail',
      icon: ShieldCheck,
      badge: null,
      desc: 'Compliance & activity history',
    },
  ];

  const currentNav = (() => {
    if (activeTab === 'add-delivery-boy') {
      return {
        id: 'delivery-boys',
        label: 'Create Delivery Partner',
        desc: 'Register driver credentials, route territory, and email dispatch',
      };
    }
    if (activeTab === 'edit-delivery-boy') {
      return {
        id: 'delivery-boys',
        label: 'Edit Delivery Partner',
        desc: 'Update driver routes, credentials, and MongoDB synchronization',
      };
    }
    if (activeTab === 'add-product') {
      return {
        id: 'pricing',
        label: 'Create Dairy Product',
        desc: 'Add new catalog item, set rate card price, and upload Cloudinary media',
      };
    }
    if (activeTab === 'edit-product') {
      return {
        id: 'pricing',
        label: 'Edit Dairy Product',
        desc: 'Modify product specifications, pricing, description, and photo',
      };
    }
    return navItems.find((item) => item.id === activeTab) || navItems[0];
  })();

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', width: '100%', fontFamily: 'var(--font-main)' }}>
      {/* ============================================================ */}
      {/* 1. LEFT SIDEBAR — CLEAN, PROFESSIONAL & MINIMALIST            */}
      {/* ============================================================ */}
      <aside
        className={`admin-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}
        style={{
          width: '264px',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 110,
          boxShadow: '1px 0 3px rgba(0, 0, 0, 0.02)',
          flexShrink: 0,
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '20px 20px 18px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
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
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                Natural Milk Dairy
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: '#059669',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginTop: '1px',
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                Admin Console
              </div>
            </div>
          </div>

          {/* Close for mobile */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="mobile-close-btn"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '6px 12px',
              marginBottom: '2px',
            }}
          >
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'delivery-boys' && (activeTab === 'add-delivery-boy' || activeTab === 'edit-delivery-boy')) ||
              (item.id === 'pricing' && (activeTab === 'add-product' || activeTab === 'edit-product'));

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? '#ecfdf5' : 'transparent',
                  color: isActive ? '#065f46' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <Icon
                    size={18}
                    color={isActive ? '#059669' : '#64748b'}
                    strokeWidth={isActive ? 2.4 : 1.9}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '12px',
                      background: isActive ? '#059669' : '#f1f5f9',
                      color: isActive ? '#ffffff' : item.badgeColor || '#475569',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.name || 'Dairy Owner'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                    Super Admin
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                setActiveTab('login');
              }}
              title="Sign Out"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.color = '#dc2626';
                e.currentTarget.style.borderColor = '#fecaca';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 105,
          }}
        />
      )}

      {/* ============================================================ */}
      {/* 2. MAIN CONTENT AREA & HEADER                                 */}
      {/* ============================================================ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Sleek Top Bar */}
        <header
          className="admin-top-header"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            padding: '12px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Left: Mobile Trigger & Page Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="admin-mobile-menu-trigger"
              style={{
                display: 'none',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                color: '#0f172a',
              }}
            >
              <Menu size={18} />
            </button>

            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {currentNav.label}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                {currentNav.desc}
              </div>
            </div>
          </div>

          {/* Right: Date Filter & Fast Actions */}
          <div className="admin-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Notification Bell Button (Replaces Date Picker in Nav Bar) */}
            <button
              type="button"
              onClick={() => setIsNotificationOpen(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
              aria-label="View notifications"
            >
              <Bell size={16} color="#059669" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#e11d48',
                    color: '#ffffff',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Quick Action: Add Customer */}
            <button
              onClick={() => onOpenAddCustomer && onOpenAddCustomer()}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.82rem',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#334155';
              }}
            >
              <Plus size={15} color="#059669" />
              <span>Add Customer</span>
            </button>

            {/* Quick Action: Add Partner */}
            <button
              onClick={() => setActiveTab('add-delivery-boy')}
              style={{
                background: '#059669',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.82rem',
                padding: '7px 13px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#047857';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#059669';
              }}
            >
              <UserPlus size={15} />
              <span>+ Partner</span>
            </button>

            {/* Quick Action: Record Payment */}
            <button
              onClick={() => onOpenPaymentModal && onOpenPaymentModal()}
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#b45309',
                fontWeight: 600,
                fontSize: '0.82rem',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef3c7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fffbeb';
              }}
            >
              <Wallet size={15} />
              <span>Record Payment</span>
            </button>
          </div>
        </header>

        {/* Page Content Container */}
        <main
          className="admin-main-content"
          style={{
            flex: 1,
            padding: '24px 28px',
            maxWidth: '1440px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
