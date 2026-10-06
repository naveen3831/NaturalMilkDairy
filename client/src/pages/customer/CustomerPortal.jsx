import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDairy } from '../../context/DairyContext';
import { Milk, Calendar, Clock, CreditCard, PauseCircle, PlusCircle, CheckCircle, Truck, Phone, ChevronRight } from 'lucide-react';

export default function CustomerPortal({ setActiveTab, onOpenPauseModal, onOpenTempQtyModal, onOpenPaymentModal }) {
  const { user } = useAuth();
  const { customers, deliveries } = useDairy();

  // Find customer matching current logged in user
  const currentCustomer = customers.find((c) => c.mobile === user?.mobile || c.id === user?.id) || customers[0] || {
    name: user?.name || 'Customer',
    customerId: 'CUST-101',
    address: 'Andheri West',
    area: 'Andheri West',
    deliveryPlan: { milkQty: 1, milkUnit: 'L', curdQty: 0, curdUnit: 'g', frequency: 'daily', deliveryBoyName: 'Rahul Sharma' },
    currentBalance: 0,
    status: 'active',
  };

  const customerDeliveries = deliveries
    .filter((d) => d.customerId === currentCustomer.id || d.customerName === currentCustomer.name)
    .slice(-7)
    .reverse();

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', minHeight: '80vh' }}>
      {/* Header Profile Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d5c3a 0%, #0c2340 100%)',
          borderRadius: '24px',
          padding: '32px 36px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 12px 30px rgba(13, 92, 58, 0.15)',
          marginBottom: '32px',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.15)', color: '#86efac', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>
            <span>Customer Portal</span> • <span>ID: {currentCustomer.customerId || 'CUST-101'}</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', color: '#ffffff', fontWeight: 900, margin: '4px 0' }}>
            Hello, {currentCustomer.name}
          </h1>
          <p style={{ color: '#d1fae5', fontSize: '0.95rem', margin: 0 }}>
            {currentCustomer.address}, {currentCustomer.area}
          </p>
        </div>

        {/* Balance & Status */}
        <div style={{ textAlign: 'right', background: 'rgba(255, 255, 255, 0.1)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Current Outstanding Balance</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: currentCustomer.currentBalance > 0 ? '#fca5a5' : '#86efac' }}>
            ₹{currentCustomer.currentBalance || 0}
          </div>
          {currentCustomer.currentBalance > 0 && (
            <button
              onClick={() => onOpenPaymentModal && onOpenPaymentModal(currentCustomer)}
              style={{
                marginTop: '8px',
                background: '#f5a623',
                color: '#0c2340',
                fontWeight: 800,
                fontSize: '0.82rem',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Pay via UPI / Card
            </button>
          )}
        </div>
      </div>

      {/* Subscription Summary & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Active Plan Card */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '26px', border: '1.5px solid #e2ece3' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#0c2340', fontWeight: 800 }}>Daily Morning Plan</h3>
            <span style={{ background: '#dcfce7', color: '#166534', fontWeight: 800, fontSize: '0.78rem', padding: '4px 10px', borderRadius: '20px' }}>
              {currentCustomer.status === 'paused' ? 'Paused' : 'Active Delivery'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1, background: '#f8faf8', padding: '16px', borderRadius: '14px', border: '1px solid #e2ece3' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Daily Milk</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0d5c3a' }}>
                {currentCustomer.deliveryPlan?.milkQty || 1} {currentCustomer.deliveryPlan?.milkUnit || 'L'}
              </div>
            </div>

            <div style={{ flex: 1, background: '#f8faf8', padding: '16px', borderRadius: '14px', border: '1px solid #e2ece3' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Daily Curd (Dahi)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0d5c3a' }}>
                {currentCustomer.deliveryPlan?.curdQty || 0} {currentCustomer.deliveryPlan?.curdUnit || 'g'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', marginBottom: '8px' }}>
            <Clock size={16} color="#0d5c3a" />
            <span>Delivered before <strong>6:30 AM</strong> every morning</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569' }}>
            <Truck size={16} color="#0d5c3a" />
            <span>Delivery Partner: <strong>{currentCustomer.deliveryPlan?.deliveryBoyName || 'Rahul Sharma'}</strong></span>
          </div>
        </div>

        {/* Quick Action Triggers */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '26px', border: '1.5px solid #e2ece3', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>
              Manage Next Delivery
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#597361', marginBottom: '20px' }}>
              Need more milk tomorrow or traveling out of town? Take instant action below.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => onOpenPauseModal && onOpenPauseModal(currentCustomer)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#fef8eb',
                border: '1.5px solid #f5a623',
                color: '#92400e',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PauseCircle size={20} color="#d98a0d" />
                <span>Pause Delivery for Vacation</span>
              </div>
              <ChevronRight size={18} />
            </button>

            <button
              onClick={() => onOpenTempQtyModal && onOpenTempQtyModal(currentCustomer)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#eaf5ee',
                border: '1.5px solid #0d5c3a',
                color: '#0d5c3a',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PlusCircle size={20} color="#0d5c3a" />
                <span>Change Tomorrow's Quantity</span>
              </div>
              <ChevronRight size={18} />
            </button>

            <button
              onClick={() => setActiveTab('products')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#edf4fc',
                border: '1.5px solid #38bdf8',
                color: '#0369a1',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Milk size={20} color="#0284c7" />
                <span>Order Ghee, Paneer or Extra Curd</span>
              </div>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Deliveries Table */}
      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '28px', border: '1.5px solid #e2ece3' }}>
        <h3 style={{ fontSize: '1.3rem', color: '#0c2340', fontWeight: 800, marginBottom: '16px' }}>
          Recent Deliveries History
        </h3>

        {customerDeliveries.length === 0 ? (
          <p style={{ color: '#597361', fontSize: '0.95rem' }}>No past deliveries recorded yet. First delivery arrives tomorrow morning!</p>
        ) : (
          <div className="table-responsive">
            <table className="dairy-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Delivered Milk</th>
                  <th>Delivered Curd</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {customerDeliveries.map((d, didx) => (
                  <tr key={didx}>
                    <td><strong>{d.deliveryDate}</strong></td>
                    <td>{d.actualMilk} L</td>
                    <td>{d.actualCurd || 0} g</td>
                    <td>₹{d.totalAmount}</td>
                    <td>
                      <span className={`badge badge-${d.status === 'delivered' ? 'success' : 'warning'}`}>
                        {d.status === 'delivered' ? '✓ Delivered' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${d.paymentStatus === 'paid' ? 'success' : 'info'}`}>
                        {d.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
