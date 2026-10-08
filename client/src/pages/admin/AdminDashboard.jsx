import React from 'react';
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
} from 'lucide-react';

export default function AdminDashboard({ setActiveTab, onOpenAddCustomer, onOpenPaymentModal }) {
  const { dashboardSummary, deliveryBoys, auditLogs } = useDairy();

  const summary = dashboardSummary || {
    totalCustomers: 7,
    activeCustomers: 6,
    deliveriesCount: 6,
    completed: 4,
    pending: 1,
    notDelivered: 1,
    todaySales: 390,
    creditAdded: 240,
    paymentsCollected: 150,
    totalOutstanding: 3080,
    todayMilkLitres: '8.5',
    todayCurdKg: '2.50',
  };

  const deliveryProgress = summary.deliveriesCount > 0
    ? Math.round((summary.completed / summary.deliveriesCount) * 100)
    : 0;

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
        </div>
      </div>

      {/* 2. Sleek KPI Metrics Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Total Customers */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
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
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            {summary.activeCustomers} Active Subscriptions
          </div>
        </div>

        {/* Card 2: Today's Deliveries */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
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
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
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
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
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
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
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
            ₹{summary.paymentsCollected.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
            Cash & UPI received today
          </div>
        </div>

        {/* Card 6: Total Outstanding */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fee2e2',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
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
            onClick={() => setActiveTab('outstanding')}
            style={{
              fontSize: '0.75rem',
              color: '#dc2626',
              fontWeight: 600,
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <span>View Pending Report</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* 3. Delivery Progress Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
              Today's Delivery Fulfillment
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
          <span>Today's Deliveries</span>
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
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
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
                    {boy.todayStats?.completed ?? 2}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>PENDING</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706' }}>
                    {boy.todayStats?.pending ?? 1}
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
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #f1f5f9',
                fontSize: '0.82rem',
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
    </div>
  );
}
