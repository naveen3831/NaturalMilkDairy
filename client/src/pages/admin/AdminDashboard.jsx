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
  Activity,
  Plus,
} from 'lucide-react';

export default function AdminDashboard({ setActiveTab, onOpenAddCustomer, onOpenPaymentModal }) {
  const { dashboardSummary, selectedDate, setSelectedDate, deliveryBoys, auditLogs } = useDairy();

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header & Greeting (PRD Section 22) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '24px',
        background: 'linear-gradient(135deg, #0d5c3a 0%, #16467a 100%)',
        borderRadius: '20px',
        color: '#ffffff',
        boxShadow: '0 8px 30px rgba(13, 92, 58, 0.2)',
      }}>
        <div>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#f5a623',
            marginBottom: '4px',
          }}>
            🥛 Natural Milk Dairy — Operational Center
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '1.9rem', fontWeight: 800 }}>
            Good Morning, Dairy Owner!
          </h1>
          <p style={{ color: '#d1fae5', fontSize: '0.92rem', marginTop: '4px' }}>
            Daily automated home delivery routes, payments & credit ledger replacement.
          </p>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: '#e2ece3', fontWeight: 600 }}>Operational Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#ffffff',
              color: '#0c2340',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: '2px solid #f5a623',
            }}
          />
        </div>
      </div>

      {/* Primary KPI Grid (PRD Section 22) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '18px',
      }}>
        {/* Total Customers */}
        <div className="dairy-card" style={{ borderLeft: '5px solid #0d5c3a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#597361' }}>CUSTOMERS</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#eaf5ee' }}>
              <Users size={18} color="#0d5c3a" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0c2340' }}>
            {summary.totalCustomers}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#0d5c3a', fontWeight: 600, marginTop: '4px' }}>
            ● {summary.activeCustomers} Active Delivery Plans
          </div>
        </div>

        {/* Today's Deliveries */}
        <div className="dairy-card" style={{ borderLeft: '5px solid #16467a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#597361' }}>TODAY'S DELIVERIES</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#edf4fc' }}>
              <Truck size={18} color="#16467a" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0c2340' }}>
            {summary.deliveriesCount}
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px' }}>
            <span style={{ color: '#16a34a' }}>✓ {summary.completed} Done</span>
            <span style={{ color: '#d97706' }}>○ {summary.pending} Pending</span>
            <span style={{ color: '#dc2626' }}>✕ {summary.notDelivered} Missed</span>
          </div>
        </div>

        {/* Today's Total Sales */}
        <div className="dairy-card" style={{ borderLeft: '5px solid #f5a623' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#597361' }}>TODAY'S SALES</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#fef8eb' }}>
              <IndianRupee size={18} color="#d98a0d" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0c2340' }}>
            ₹{summary.todaySales.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#597361', marginTop: '4px' }}>
            🥛 {summary.todayMilkLitres} L Milk • 🥣 {summary.todayCurdKg} Kg Curd
          </div>
        </div>

        {/* Credit Added */}
        <div className="dairy-card" style={{ borderLeft: '5px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#597361' }}>CREDIT ADDED</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#f5f3ff' }}>
              <CreditCard size={18} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0c2340' }}>
            ₹{summary.creditAdded.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '4px' }}>
            Delivered to monthly credit accounts
          </div>
        </div>

        {/* Payments Collected */}
        <div className="dairy-card" style={{ borderLeft: '5px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#597361' }}>PAYMENTS COLLECTED</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#ecfdf5' }}>
              <Wallet size={18} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#10b981' }}>
            ₹{summary.paymentsCollected.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#597361', marginTop: '4px' }}>
            Cash & UPI collected today
          </div>
        </div>

        {/* Total Outstanding (PRD Section 22) */}
        <div className="dairy-card" style={{
          borderLeft: '5px solid #dc2626',
          background: 'linear-gradient(180deg, #ffffff 0%, #fff5f5 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991b1b' }}>TOTAL OUTSTANDING</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#fee2e2' }}>
              <AlertCircle size={18} color="#dc2626" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#dc2626' }}>
            ₹{summary.totalOutstanding.toLocaleString()}
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: '#b91c1c',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px',
          }}
          onClick={() => setActiveTab('outstanding')}
          >
            <span>View Pending Credit Report</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* Delivery Progress Bar */}
      <div className="dairy-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#0c2340' }}>Today's Delivery Progress</h3>
            <p style={{ fontSize: '0.82rem', color: '#597361' }}>
              {summary.completed} of {summary.deliveriesCount} customers served
            </p>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d5c3a' }}>
            {deliveryProgress}%
          </div>
        </div>
        <div style={{
          width: '100%',
          height: '12px',
          background: '#e2ece3',
          borderRadius: '10px',
          overflow: 'hidden',
          display: 'flex',
        }}>
          <div style={{
            width: `${deliveryProgress}%`,
            background: 'linear-gradient(90deg, #0d5c3a, #16945a)',
            borderRadius: '10px',
            transition: 'width 0.5s ease-out',
          }} />
        </div>
      </div>

      {/* Quick Action Hub */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
      }}>
        <button
          onClick={() => setActiveTab('deliveries')}
          className="btn-primary"
          style={{ padding: '14px', borderRadius: '14px', fontSize: '0.95rem' }}
        >
          <Truck size={20} />
          <span>Monitor Today's Deliveries</span>
        </button>

        <button
          onClick={() => onOpenAddCustomer && onOpenAddCustomer()}
          className="btn-secondary"
          style={{ padding: '14px', borderRadius: '14px', fontSize: '0.95rem' }}
        >
          <Plus size={20} />
          <span>Add New Customer</span>
        </button>

        <button
          onClick={() => onOpenPaymentModal && onOpenPaymentModal()}
          className="btn-gold"
          style={{ padding: '14px', borderRadius: '14px', fontSize: '0.95rem' }}
        >
          <Wallet size={20} />
          <span>Record Customer Payment</span>
        </button>

        <button
          onClick={() => setActiveTab('outstanding')}
          style={{
            background: '#ffffff',
            border: '1.5px solid #dc2626',
            color: '#dc2626',
            fontWeight: 700,
            padding: '14px',
            borderRadius: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={20} />
          <span>Pending Credit Report</span>
        </button>
      </div>

      {/* Delivery Boys Performance (PRD Section 27 & 28) */}
      <div className="dairy-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#0c2340' }}>Delivery Boy Daily Performance</h3>
            <p style={{ fontSize: '0.85rem', color: '#597361' }}>
              Real-time route completion and cash collection tracking
            </p>
          </div>
          <button
            onClick={() => setActiveTab('delivery-boys')}
            style={{
              color: '#0d5c3a',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Manage All Delivery Boys</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {deliveryBoys.map((boy) => (
            <div
              key={boy.id}
              style={{
                background: '#f8faf8',
                border: '1px solid #e2ece3',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', color: '#0c2340' }}>{boy.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: '#597361', fontWeight: 600 }}>
                    Area: {boy.assignedArea} • {boy.vehicleNumber || 'Bike Route'}
                  </span>
                </div>
                <span className="badge badge-delivered">Active</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                background: '#ffffff',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #edf3ee',
                textAlign: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#597361', fontWeight: 700 }}>COMPLETED</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                    {boy.todayStats?.completed ?? 2}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#597361', fontWeight: 700 }}>PENDING</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706' }}>
                    {boy.todayStats?.pending ?? 1}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#597361', fontWeight: 700 }}>MISSED</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>
                    {boy.todayStats?.notDelivered ?? 0}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                color: '#14241a',
              }}>
                <span>Cash in hand: <strong>₹{boy.todayCashCollected || 0}</strong></span>
                <span>UPI Collected: <strong>₹{boy.todayUpiCollected || 0}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Audit Log Stream (PRD Section 33) */}
      <div className="dairy-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#0c2340' }}>Recent Operational Actions (Audit Trail)</h3>
          <span style={{ fontSize: '0.78rem', color: '#597361', fontWeight: 600 }}>Rule 33 Audit Guarantee</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {auditLogs.slice(0, 5).map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: '#f8faf8',
                borderRadius: '10px',
                border: '1px solid #edf3ee',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#0d5c3a', marginRight: '8px' }}>
                  {log.action}
                </span>
                <span style={{ color: '#14241a' }}>{log.details}</span>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: '#597361', fontWeight: 600 }}>
                  By: {log.actor}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
