import React, { useState, useEffect } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  Users,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  IndianRupee,
  CreditCard,
  Wallet,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Plus,
  ShieldCheck,
  UserCheck,
  Activity,
  Download,
  FileText,
} from 'lucide-react';
import ReportDownloadModal from '../../components/ReportDownloadModal';

export default function AdminDashboard({ setActiveTab, onOpenAddCustomer, onOpenPaymentModal }) {
  const { dashboardSummary, deliveryBoys, deliveries, fetchDeliveries, auditLogs, fetchDashboard, refreshAll } = useDairy();

  const [mobileFilter, setMobileFilter] = useState('all'); // 'all', 'delivered', 'pending'
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchDashboard();
    if (typeof fetchDeliveries === 'function') fetchDeliveries();
    refreshAll();
  }, [fetchDashboard, fetchDeliveries, refreshAll]);

  const summary = dashboardSummary || {
    totalCustomers: 0,
    activeCustomers: 0,
    deliveriesCount: 0,
    completed: 0,
    pending: 0,
    notDelivered: 0,
    todaySales: 0,
    creditAdded: 0,
    paymentsCollected: 0,
    totalOutstanding: 0,
    totalAdvance: 0,
    todayMilkLitres: '0.0',
    todayCurdKg: '0.00',
  };

  const deliveryProgress = summary.deliveriesCount > 0
    ? Math.round((summary.completed / summary.deliveriesCount) * 100)
    : 0;

  const allDrops = deliveries || [];
  const deliveredDrops = allDrops.filter((d) => d.status === 'delivered');
  const pendingDrops = allDrops.filter((d) => d.status === 'pending');
  const totalPlanned = allDrops.length > 0 ? allDrops.length : (summary.deliveriesCount || 0);

  const filteredDrops = allDrops.filter((d) => {
    if (mobileFilter === 'delivered') return d.status === 'delivered';
    if (mobileFilter === 'pending') return d.status === 'pending';
    return true;
  });

  // ── SCREEN: MOBILE RESPONSIVE OVERVIEW (FULL PARITY WITH WEB ADMIN CONSOLE) ──
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. Executive Welcome & Live Operations Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            border: '1px solid #d1fae5',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#065f46',
                background: '#dcfce7',
                padding: '3px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Live Operations
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              Morning routes active
            </span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              Welcome back, Dairy Admin 👋
            </h1>
            <p style={{ color: '#475569', fontSize: '0.78rem', marginTop: '3px', margin: 0, lineHeight: 1.35 }}>
              Daily overview of farm milk subscriptions, delivery fulfillment, and customer accounts.
            </p>
          </div>
        </div>

        {/* 2. Today Route Fulfillment Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#065f46', letterSpacing: '0.04em' }}>
                TODAY ROUTE FULFILLMENT
              </span>
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#059669' }}>
              {deliveryProgress}% Done
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${deliveryProgress}%`,
                height: '100%',
                background: '#059669',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* 3 Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' }}>
            {/* Card 1: Delivered */}
            <div
              onClick={() => setActiveTab('deliveries')}
              role="button"
              tabIndex={0}
              title="View Today's Deliveries"
              style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#047857', letterSpacing: '0.04em' }}>
                DELIVERED
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#065f46', margin: '2px 0 1px' }}>
                {summary.completed || deliveredDrops.length} / {totalPlanned}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#059669', fontWeight: 600 }}>
                Doorstep drops
              </div>
            </div>

            {/* Card 2: Today Milk */}
            <div
              onClick={() => setActiveTab('deliveries')}
              role="button"
              tabIndex={0}
              title="View Today's Deliveries"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.04em' }}>
                TODAY MILK
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 1px' }}>
                {summary.todayMilkLitres || '0.0'} L
              </div>
              <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
                {summary.todayCurdKg ? `${Math.round(parseFloat(summary.todayCurdKg) * 1000)} g` : '0 g'} Curd
              </div>
            </div>

            {/* Card 3: Collections */}
            <div
              onClick={() => setActiveTab('payments')}
              role="button"
              tabIndex={0}
              title="View Payments & Collections"
              style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b45309', letterSpacing: '0.04em' }}>
                COLLECTIONS
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#b45309', margin: '2px 0 1px' }}>
                ₹{summary.todaySales || summary.paymentsCollected || 0}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#b45309', fontWeight: 600 }}>
                Cash & UPI
              </div>
            </div>
          </div>
        </div>

        {/* 3. Operational & Financial KPI Metrics Grid (Web Dashboard Mirror) */}
        <div>
          <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            Operational & Financial KPIs
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Card 1: Total Customers */}
            <div
              onClick={() => setActiveTab('customers')}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b' }}>CUSTOMERS</span>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={14} />
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                {summary.totalCustomers}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#059669' }}>
                {summary.activeCustomers} Active Plans
              </div>
            </div>

            {/* Card 2: Today's Deliveries */}
            <div
              onClick={() => setActiveTab('deliveries')}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b' }}>TODAY'S DROPS</span>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={14} />
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                {summary.deliveriesCount}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#2563eb' }}>
                {summary.completed} Done • {summary.pending} Pend
              </div>
            </div>

            {/* Card 3: Today's Sales */}
            <div
              onClick={() => setActiveTab('deliveries')}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b' }}>TODAY'S SALES</span>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IndianRupee size={14} />
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                ₹{Number(summary.todaySales || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🥛 {summary.todayMilkLitres} L • 🥣 {summary.todayCurdKg} Kg
              </div>
            </div>

            {/* Card 4: Credit Added */}
            <div
              onClick={() => setActiveTab('ledger')}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b' }}>CREDIT ADDED</span>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={14} />
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                ₹{Number(summary.creditAdded || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Billed to customer ledgers
              </div>
            </div>

            {/* Card 5: Collections */}
            <div
              onClick={() => setActiveTab('payments')}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b' }}>COLLECTIONS</span>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={14} />
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f766e', lineHeight: 1.1 }}>
                ₹{Number(summary.paymentsCollected || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#0f766e', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Cash ₹{Number(summary.todayCashCollected || 0).toLocaleString()} • UPI ₹{Number(summary.todayUpiCollected || 0).toLocaleString()}
              </div>
            </div>

            {/* Card 6: Total Outstanding */}
            <div
              onClick={() => setActiveTab('outstanding')}
              style={{
                background: '#ffffff',
                border: '1px solid #fecaca',
                borderRadius: '14px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#dc2626' }}>OUTSTANDING</span>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={14} />
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', lineHeight: 1.1 }}>
                ₹{Number(summary.totalOutstanding || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#dc2626' }}>
                Pending Credit Due
              </div>
            </div>
          </div>
        </div>

        {/* 4. Quick Action Hub */}
        <div>
          <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            Quick Actions Hub
          </h2>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '2px',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {[
              { id: 'deliveries', label: 'Deliveries', icon: Truck, color: '#2563eb', bg: '#eff6ff', act: () => setActiveTab('deliveries') },
              { id: 'reports', label: 'Download Reports', icon: Download, color: '#0d5c3a', bg: '#ecfdf5', act: () => setShowReportModal(true) },
              { id: 'add-customer', label: 'Add Customer', icon: Plus, color: '#059669', bg: '#ecfdf5', act: () => onOpenAddCustomer && onOpenAddCustomer() },
              { id: 'partners', label: 'Partners', icon: UserCheck, color: '#047857', bg: '#f0fdf4', act: () => setActiveTab('delivery-boys') },
              { id: 'payment', label: 'Record Payment', icon: Wallet, color: '#b45309', bg: '#fffbeb', act: () => onOpenPaymentModal && onOpenPaymentModal() },
              { id: 'rates', label: 'Product Rates', icon: TrendingUp, color: '#6d28d9', bg: '#f5f3ff', act: () => setActiveTab('pricing') },
            ].map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.act}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconComp size={12} />
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Partner Route Performance */}
        {deliveryBoys && deliveryBoys.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Partner Route Performance
                </h2>
                <p style={{ fontSize: '0.70rem', color: '#64748b', margin: '1px 0 0 0' }}>
                  Live driver fulfillment & cash reconciliation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('delivery-boys')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#059669',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <span>Manage</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {deliveryBoys.slice(0, 3).map((boy) => {
                const boyId = boy.id || boy._id;
                const completed = boy.todayStats?.completed ?? allDrops.filter((d) => (d.deliveryBoyId === boyId || d.deliveryBoyName === boy.name) && d.status === 'delivered').length;
                const pending = boy.todayStats?.pending ?? allDrops.filter((d) => (d.deliveryBoyId === boyId || d.deliveryBoyName === boy.name) && d.status === 'pending').length;
                const missed = boy.todayStats?.notDelivered ?? allDrops.filter((d) => (d.deliveryBoyId === boyId || d.deliveryBoyName === boy.name) && d.status === 'not_delivered').length;

                return (
                  <div
                    key={boy.id || boy._id}
                    onClick={() => setActiveTab('delivery-boys')}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.015)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{boy.name}</div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b' }}>Route: {boy.assignedArea} • {boy.vehicleNumber || 'Bike Route'}</div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: boy.isOnline ? '#ecfdf5' : '#f1f5f9',
                          color: boy.isOnline ? '#059669' : '#64748b',
                        }}
                      >
                        {boy.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        background: '#f8fafc',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.60rem', fontWeight: 700, color: '#64748b' }}>DONE</div>
                        <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#059669' }}>{completed}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.60rem', fontWeight: 700, color: '#64748b' }}>PENDING</div>
                        <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#d97706' }}>{pending}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.60rem', fontWeight: 700, color: '#64748b' }}>MISSED</div>
                        <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#dc2626' }}>{missed}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#475569' }}>
                      <span>Cash: <strong>₹{boy.todayCashCollected || 0}</strong></span>
                      <span>UPI: <strong>₹{boy.todayUpiCollected || 0}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Recent Operations Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: '0' }}>
            Recent Operations Activity
          </h2>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '2px',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            <button
              type="button"
              onClick={() => setMobileFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: mobileFilter === 'all' ? '1px solid #059669' : '1px solid #e2e8f0',
                background: mobileFilter === 'all' ? '#ecfdf5' : '#ffffff',
                color: mobileFilter === 'all' ? '#059669' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              All Drops ({totalPlanned})
            </button>
            <button
              type="button"
              onClick={() => setMobileFilter('delivered')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: mobileFilter === 'delivered' ? '1px solid #059669' : '1px solid #e2e8f0',
                background: mobileFilter === 'delivered' ? '#ecfdf5' : '#ffffff',
                color: mobileFilter === 'delivered' ? '#059669' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Delivered ({deliveredDrops.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileFilter('pending')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: mobileFilter === 'pending' ? '1px solid #059669' : '1px solid #e2e8f0',
                background: mobileFilter === 'pending' ? '#ecfdf5' : '#ffffff',
                color: mobileFilter === 'pending' ? '#059669' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Pending ({pendingDrops.length})
            </button>
          </div>

          {/* Delivery Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredDrops.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.80rem',
                }}
              >
                No doorstep drops found for this filter today.
              </div>
            ) : (
              filteredDrops.slice(0, 10).map((item) => {
                const isDone = item.status === 'delivered';
                const isMissed = item.status === 'not_delivered';
                const partnerName =
                  item.deliveryBoyName ||
                  item.deliveryBoyId?.name ||
                  (deliveryBoys?.find((b) => b.id === item.deliveryBoyId || b._id === item.deliveryBoyId)?.name) ||
                  'naveen';
                const customerName = item.customerName || item.customerId?.name || 'Customer';
                const address = item.address || item.customerId?.address || item.doorstepId || '';
                const milkText = item.plannedMilk
                  ? `${item.plannedMilk}L Milk`
                  : item.items?.[0]
                  ? `${item.items[0].quantity}${item.items[0].unit || 'L'} ${item.items[0].name}`
                  : '1L Milk';

                return (
                  <div
                    key={item.id || item._id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: `1px solid ${isDone ? '#bbf7d0' : '#e2e8f0'}`,
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.015)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0f172a' }}>
                        {customerName}
                      </span>
                      <span
                        style={{
                          padding: '3px 7px',
                          borderRadius: '6px',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          background: isDone ? '#ecfdf5' : isMissed ? '#fef2f2' : '#fffbeb',
                          color: isDone ? '#047857' : isMissed ? '#dc2626' : '#d97706',
                          textTransform: 'uppercase',
                        }}
                      >
                        {isDone ? 'DELIVERED' : isMissed ? 'NOT DELIVERED' : 'PENDING'}
                      </span>
                    </div>

                    {address && (
                      <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.35, marginTop: '2px' }}>
                        {address}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#059669' }}>
                        {milkText}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        Partner: {partnerName}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 7. Recent Operational Log (Audit Trail) */}
        {auditLogs && auditLogs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Recent Operational Log
                </h2>
                <p style={{ fontSize: '0.70rem', color: '#64748b', margin: '1px 0 0 0' }}>
                  Immutable system record of customer deliveries and cash transactions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('audit-logs')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#059669',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <span>All Logs</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {auditLogs.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  onClick={() => setActiveTab('audit-logs')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      background: '#e2e8f0',
                      color: '#334155',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    {log.category}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong style={{ color: '#0f172a' }}>{log.action}: </strong>
                    <span style={{ color: '#475569' }}>{log.details}</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>by {log.actor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <ReportDownloadModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          role="admin"
          initialCustomers={customers}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Executive Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
          border: '1px solid #d1fae5',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#065f46',
                background: '#dcfce7',
                padding: '3px 9px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Live Operations
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>• Morning automated routes active</span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
            Welcome back, Dairy Admin 👋
          </h1>
          <p style={{ color: '#475569', fontSize: '0.86rem', marginTop: '4px', margin: 0 }}>
            Here is your daily overview of farm milk subscriptions, delivery fulfillment, and customer accounts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('deliveries')}
            style={{
              background: '#059669',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}
          >
            <Truck size={15} />
            <span>Today's Routes</span>
          </button>

          <button
            onClick={() => setActiveTab('outstanding')}
            style={{
              background: '#ffffff',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            <AlertCircle size={15} />
            <span>Pending Credit</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            style={{
              background: '#0d5c3a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 4px rgba(13,92,58,0.2)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#0a492e')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#0d5c3a')}
          >
            <Download size={15} />
            <span>Download Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. Sleek KPI Metrics Cards Grid (3 cards per row) */}
      <div
        className="kpi-grid-3cols"
      >
        {/* Card 1: Total Customers */}
        <div
          onClick={() => setActiveTab('customers')}
          title="View Customer Directory"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(16, 185, 129, 0.15), 0 4px 8px -2px rgba(0,0,0,0.04)';
            e.currentTarget.style.borderColor = '#a7f3d0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Customers
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>
            {summary.totalCustomers}
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('subscriptions');
            }}
            title="View Active Subscriptions"
            style={{
              fontSize: '0.75rem',
              color: '#059669',
              fontWeight: 600,
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              marginLeft: '-6px',
              borderRadius: '6px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ecfdf5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span>{summary.activeCustomers} Active Subscriptions</span>
            <ArrowRight size={12} style={{ opacity: 0.6 }} />
          </div>
        </div>

        {/* Card 2: Today's Deliveries */}
        <div
          onClick={() => setActiveTab('deliveries')}
          title="View Today's Deliveries"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(37, 99, 235, 0.15), 0 4px 8px -2px rgba(0,0,0,0.04)';
            e.currentTarget.style.borderColor = '#bfdbfe';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Today's Deliveries
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>
            {summary.deliveriesCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 600, marginTop: '8px' }}>
            <span style={{ color: '#059669' }}>{summary.completed} Done</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#d97706' }}>{summary.pending} Pending</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#dc2626' }}>{summary.notDelivered} Missed</span>
          </div>
        </div>

        {/* Card 3: Today's Sales */}
        <div
          onClick={() => setActiveTab('deliveries')}
          title="View Today's Sales & Deliveries"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(245, 158, 11, 0.15), 0 4px 8px -2px rgba(0,0,0,0.04)';
            e.currentTarget.style.borderColor = '#fde68a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Today's Sales
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>
            ₹{summary.todaySales.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
            🥛 {summary.todayMilkLitres} L Milk • 🥣 {summary.todayCurdKg} Kg Curd
          </div>
        </div>

        {/* Card 4: Credit Added */}
        <div
          onClick={() => setActiveTab('ledger')}
          title="View Customer Ledgers"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(147, 51, 234, 0.15), 0 4px 8px -2px rgba(0,0,0,0.04)';
            e.currentTarget.style.borderColor = '#e9d5ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Credit Added
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>
            ₹{summary.creditAdded.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
            Billed to monthly customer ledgers
          </div>
        </div>

        {/* Card 5: Payments Collected */}
        <div
          onClick={() => setActiveTab('payments')}
          title="View Collections & Payments"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(15, 118, 110, 0.15), 0 4px 8px -2px rgba(0,0,0,0.04)';
            e.currentTarget.style.borderColor = '#99f6e4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Collections
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f766e', marginTop: '6px', lineHeight: 1.1 }}>
            ₹{(summary.paymentsCollected || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 700, marginTop: '8px' }}>
            Cash ₹{(summary.todayCashCollected || 0).toLocaleString()} • UPI ₹{(summary.todayUpiCollected || 0).toLocaleString()}
          </div>
        </div>

        {/* Card 6: Total Outstanding */}
        <div
          onClick={() => setActiveTab('outstanding')}
          title="View Credit & Outstanding"
          style={{
            background: '#ffffff',
            border: '1px solid #fee2e2',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(220, 38, 38, 0.15), 0 4px 8px -2px rgba(0,0,0,0.04)';
            e.currentTarget.style.borderColor = '#fca5a5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#fee2e2';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Outstanding
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', marginTop: '6px', lineHeight: 1.1 }}>
            ₹{summary.totalOutstanding.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#dc2626',
              fontWeight: 600,
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View Pending Report</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* 3. Delivery Progress Bar */}
      <div
        onClick={() => setActiveTab('deliveries')}
        title="View Today's Deliveries"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px 24px',
          cursor: 'pointer',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(5, 150, 105, 0.12)';
          e.currentTarget.style.borderColor = '#a7f3d0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Today's Delivery Fulfillment</span>
              <ArrowRight size={14} color="#059669" />
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {summary.completed} of {summary.deliveriesCount} morning deliveries fulfilled
            </div>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>
            {deliveryProgress}%
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: '8px',
            background: '#f1f5f9',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${deliveryProgress}%`,
              height: '100%',
              background: '#059669',
              borderRadius: '999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* 4. Quick Action Hub */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <button
          onClick={() => setActiveTab('deliveries')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: '#0f172a',
            fontSize: '0.84rem',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={16} />
          </div>
          <span>Deliveries</span>
        </button>

        <button
          onClick={() => onOpenAddCustomer && onOpenAddCustomer()}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: '#0f172a',
            fontSize: '0.84rem',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={16} />
          </div>
          <span>Add Customer</span>
        </button>

        <button
          onClick={() => setActiveTab('delivery-boys')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: '#0f172a',
            fontSize: '0.84rem',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={16} />
          </div>
          <span>Delivery Partners</span>
        </button>

        <button
          onClick={() => onOpenPaymentModal && onOpenPaymentModal()}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: '#0f172a',
            fontSize: '0.84rem',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={16} />
          </div>
          <span>Record Payment</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: '#0f172a',
            fontSize: '0.84rem',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={16} />
          </div>
          <span>Product Rates</span>
        </button>

        <button
          onClick={() => setShowReportModal(true)}
          style={{
            background: '#ffffff',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: '#065f46',
            fontSize: '0.84rem',
            fontWeight: 700,
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0fdf4';
            e.currentTarget.style.borderColor = '#86efac';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#bbf7d0';
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download size={16} />
          </div>
          <span>Download Reports (PDF)</span>
        </button>
      </div>

      {/* 5. Delivery Partner Performance */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '22px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Partner Route Performance
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Live driver fulfillment and cash reconciliation tracking
            </p>
          </div>
          <button
            onClick={() => setActiveTab('delivery-boys')}
            style={{
              fontSize: '0.8rem',
              color: '#059669',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Manage Partners</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
          }}
        >
          {deliveryBoys.map((boy) => (
            <div
              key={boy.id}
              onClick={() => setActiveTab('delivery-boys')}
              title={`View ${boy.name}'s Route & Partner Details`}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
                    {boy.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Route: {boy.assignedArea} • {boy.vehicleNumber || 'Bike Route'}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: '#dcfce7',
                    color: '#166534',
                  }}
                >
                  Active
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  background: '#ffffff',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9',
                  textAlign: 'center',
                  marginTop: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>DONE</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669' }}>
                    {boy.todayStats?.completed ?? 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>PENDING</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706' }}>
                    {boy.todayStats?.pending ?? 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>MISSED</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>
                    {boy.todayStats?.notDelivered ?? 0}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: '#475569',
                }}
              >
                <span>Cash: <strong>₹{boy.todayCashCollected || 0}</strong></span>
                <span>UPI: <strong>₹{boy.todayUpiCollected || 0}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Recent Audit Activity Trail */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Recent Operational Log
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Immutable system record of customer deliveries and cash transactions
            </p>
          </div>
          <button
            onClick={() => setActiveTab('audit-logs')}
            style={{
              fontSize: '0.8rem',
              color: '#059669',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Full Audit Trail</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {auditLogs.slice(0, 4).map((log) => (
            <div
              key={log.id}
              onClick={() => setActiveTab('audit-logs')}
              title="View full audit trail"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #f1f5f9',
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#f1f5f9';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: '#e2e8f0',
                    color: '#334155',
                    textTransform: 'uppercase',
                  }}
                >
                  {log.category}
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{log.action}:</span>
                <span style={{ color: '#475569' }}>{log.details}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                by {log.actor}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ReportDownloadModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        role="admin"
        initialCustomers={customers}
      />
    </div>
  );
}
