import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDairy } from '../../context/DairyContext';
import {
  User,
  Truck,
  Users,
  LogOut,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
  MapPin,
  TrendingUp,
  Droplet,
  ChevronRight,
  Bike,
  Share2,
} from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../../constants/cloudinaryMedia';

export default function AdminProfileView({ setActiveTab }) {
  const { user, logout } = useAuth();
  const { dashboardSummary, deliveries, deliveryBoys, customers, refreshAll, fetchDashboard, fetchDeliveries } = useDairy();

  const summary = dashboardSummary || {};
  const adminName = user?.name || 'Dairy Owner';
  const adminEmail = user?.email || 'admin@naturalmilkdairy.com';
  const adminMobile = user?.mobile || '7702233931';
  const initial = adminName.charAt(0).toUpperCase() || 'A';
  const cleanId = (user?.id || '').replace(/[^a-zA-Z0-9]/g, '');
  const adminId = cleanId ? `NMD-ADM-${cleanId.slice(-4).toUpperCase()}` : 'NMD-ADM-ROOT';

  const totalDeliveries = deliveries?.length || summary.deliveriesCount || 0;
  const totalPartners = deliveryBoys?.length || 0;
  const onlinePartners = (deliveryBoys || []).filter((b) => b.isOnline).length;
  const totalCustomers = customers?.length || summary.totalCustomers || 0;
  const todayMilk = summary.todayMilkLitres || '0.0';

  const handleRefresh = async () => {
    if (fetchDashboard) await fetchDashboard();
    if (fetchDeliveries) await fetchDeliveries();
    if (refreshAll) await refreshAll();
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out from the Natural Milk Dairy Admin Console?')) {
      logout();
      if (typeof setActiveTab === 'function') {
        setActiveTab('home');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px' }}>
      {/* 1. Admin Identity Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669, #047857)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '1.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
          }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {adminName}
            </h3>
            <span
              style={{
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.68rem',
                fontWeight: 800,
              }}
            >
              Super Admin
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
            ID: {adminId}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '1px' }}>
            {adminEmail} · {adminMobile}
          </div>
        </div>
      </div>

      {/* 2. Operations Snapshot (4 Mini Cards Grid) */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
          Live Operations Snapshot
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div
            onClick={() => setActiveTab('deliveries')}
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Truck size={18} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Deliveries Today</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{totalDeliveries} Drops</div>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('delivery-boys')}
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bike size={18} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Active Fleet</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{onlinePartners} / {totalPartners} Online</div>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('customers')}
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={18} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Customer Base</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{totalCustomers} Accounts</div>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('dashboard')}
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Droplet size={18} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Today Volume</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{todayMilk} L Milk</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Management Shortcuts */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
          Management Shortcuts
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            onClick={() => setActiveTab('deliveries')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={17} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>Today Deliveries Dispatch</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Track {totalDeliveries} doorstep drops & statuses</div>
              </div>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          <div
            onClick={() => setActiveTab('delivery-boys')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bike size={17} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>Fleet & Driver Attendance</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{onlinePartners} of {totalPartners} drivers on duty</div>
              </div>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          <div
            onClick={() => setActiveTab('customers')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={17} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>Customer Directory & Accounts</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Manage {totalCustomers} households & subscriptions</div>
              </div>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          <div
            onClick={() => setActiveTab('contact-settings')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Share2 size={17} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>Contact & Social Media Links</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Update helplines, WhatsApp & official channels</div>
              </div>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          <div
            onClick={handleRefresh}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={17} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>Refresh System Data</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Sync latest orders, payments & telemetry</div>
              </div>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>
        </div>
      </div>

      {/* 4. Sign Out Button */}
      <button
        type="button"
        onClick={handleSignOut}
        style={{
          width: '100%',
          background: '#dc2626',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          padding: '14px',
          fontSize: '0.92rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(220,38,38,0.2)',
        }}
      >
        <LogOut size={18} />
        <span>Sign Out Admin Console</span>
      </button>

      <div style={{ textAlign: 'center', fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
        Natural Milk Dairy · Admin Portal v1.0.0
      </div>
    </div>
  );
}
