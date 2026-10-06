import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDairy } from '../context/DairyContext';
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
  Home,
  CheckCircle,
  Globe,
  User,
  ShieldCheck,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, switchUser, DEMO_USERS } = useAuth();
  const { isOnline, offlineQueue, syncOfflineQueue } = useDairy();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const publicTabs = ['home', 'landing', 'products', 'story', 'faqs', 'contact', 'login', 'register'];
  const isPublicView = publicTabs.includes(activeTab);

  // If in public view, show the clean white navbar with Home, Our products, Our story, FAQs, Contact, and Login/Register
  if (isPublicView) {
    return (
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Brand Logo & Title */}
          <div
            onClick={() => setActiveTab('home')}
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
                src="/logo.png"
                alt="Natural Milk Dairy"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.28rem',
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: '#0d5c3a',
                  letterSpacing: '0.01em',
                }}
              >
                NATURAL<br />MILK DAIRY
              </div>
              <div
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: '#15803d',
                  letterSpacing: '0.16em',
                  marginTop: '3px',
                  textTransform: 'uppercase',
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
              onClick={() => setActiveTab('home')}
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
              onClick={() => setActiveTab('products')}
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
              onClick={() => setActiveTab('story')}
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
              onClick={() => setActiveTab('faqs')}
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
              onClick={() => setActiveTab('contact')}
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

          {/* Right Action: LOGIN & REGISTER (Clearly Visible) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              // Logged in User Controls
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    if (user.role === 'admin') setActiveTab('dashboard');
                    else if (user.role === 'delivery_boy') setActiveTab('delivery-boy-app');
                    else setActiveTab('customer-portal');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#eaf5ee',
                    color: '#0d5c3a',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    border: '1px solid #bbf7d0',
                    cursor: 'pointer',
                  }}
                >
                  {user.role === 'admin' ? <ShieldCheck size={16} /> : user.role === 'delivery_boy' ? <Truck size={16} /> : <User size={16} />}
                  <span>{user.role === 'admin' ? 'Owner Portal' : user.role === 'delivery_boy' ? 'Delivery App' : 'My Portal'}</span>
                </button>

                <button
                  onClick={logout}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              // Not Logged In: SHOW LOGIN & REGISTER BUTTONS PROMINENTLY
              <>
                <button
                  onClick={() => setActiveTab('login')}
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
                  onClick={() => setActiveTab('register')}
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
        </div>
      </header>
    );
  }

  // Otherwise, user is inside the internal Admin or Delivery partner management portal
  return (
    <header
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
                Management Portal
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
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                <Truck size={16} /> Today's Deliveries
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
          ) : user?.role === 'customer' ? (
            <button
              onClick={() => setActiveTab('customer-portal')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0d5c3a',
                color: '#ffffff',
              }}
            >
              <User size={18} /> My Subscription & Ledger
            </button>
          ) : (
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

        {/* User Badge / Role Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
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
          </div>

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
                Switch Account
              </div>

              {DEMO_USERS.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id);
                    setDropdownOpen(false);
                    if (u.role === 'admin') setActiveTab('dashboard');
                    else if (u.role === 'delivery_boy') setActiveTab('delivery-boy-app');
                    else setActiveTab('customer-portal');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: user?.id === u.id ? '#eaf5ee' : 'transparent',
                    marginBottom: '4px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0c2340' }}>{u.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#597361' }}>{u.role}</div>
                  </div>
                  {user?.id === u.id && <CheckCircle size={16} color="#0d5c3a" />}
                </div>
              ))}

              <div style={{ height: '1px', background: '#e5e7eb', margin: '6px 0' }} />

              <div
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                  setActiveTab('home');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#dc2626',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <LogOut size={16} /> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
