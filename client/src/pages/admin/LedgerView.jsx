import React, { useState, useEffect } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  ArrowLeft,
  BookOpen,
  DollarSign,
  Share2,
  Printer,
  Download,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
} from 'lucide-react';

export default function LedgerView({ customerId, onBack, onOpenPaymentModal }) {
  const { getCustomerLedger, getCustomerStatement } = useDairy();
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-10');

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!customerId) return;
      setLoading(true);
      const data = await getCustomerLedger(customerId);
      if (isMounted && data && data.success) {
        setLedgerData(data);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [customerId, getCustomerLedger]);

  if (loading) {
    return (
      <div className="dairy-card" style={{ textAlign: 'center', padding: '60px' }}>
        <BookOpen size={40} color="#0d5c3a" className="spin" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ color: '#0c2340' }}>Loading Customer Ledger...</h3>
      </div>
    );
  }

  if (!ledgerData || !ledgerData.customer) {
    return (
      <div className="dairy-card" style={{ textAlign: 'center', padding: '40px' }}>
        <p>Customer ledger not found.</p>
        <button onClick={onBack} className="btn-secondary" style={{ marginTop: '14px' }}>
          Back to Customers
        </button>
      </div>
    );
  }

  const { customer, ledgerEntries, grossBill, totalPaid, outstanding, totalMilkDelivered, totalCurdDelivered, whatsappUrl } = ledgerData;
  const isPending = outstanding > 0;
  const isAdvance = outstanding < 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#0d5c3a',
            fontWeight: 700,
            fontSize: '0.92rem',
          }}
        >
          <ArrowLeft size={18} />
          <span>Back to Customers</span>
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#25d366',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              padding: '9px 16px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
            }}
          >
            <Send size={16} />
            <span>WhatsApp Reminder</span>
          </a>

          <button
            onClick={handlePrint}
            style={{
              background: '#ffffff',
              border: '1.5px solid #0c2340',
              color: '#0c2340',
              fontWeight: 700,
              fontSize: '0.85rem',
              padding: '9px 16px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Printer size={16} />
            <span>Print Statement</span>
          </button>

          <button
            onClick={() => onOpenPaymentModal && onOpenPaymentModal(customer)}
            className="btn-gold"
            style={{ padding: '9px 16px', fontSize: '0.85rem' }}
          >
            <DollarSign size={16} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Customer Profile Banner */}
      <div className="dairy-card" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f4f8f5 100%)',
        borderLeft: isPending ? '6px solid #dc2626' : isAdvance ? '6px solid #2563eb' : '6px solid #16a34a',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0d5c3a', background: '#eaf5ee', padding: '3px 8px', borderRadius: '4px' }}>
              {customer.customerId}
            </span>
            <h2 style={{ fontSize: '1.8rem', color: '#0c2340', marginTop: '4px' }}>
              {customer.name} — Customer Ledger
            </h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.85rem', color: '#597361' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={14} color="#0d5c3a" /> {customer.mobile}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} color="#0d5c3a" /> {customer.address} ({customer.area})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} color="#0d5c3a" /> Plan: {customer.deliveryPlan?.milkQty}L Milk • {customer.deliveryPlan?.frequency}
              </span>
            </div>
          </div>

          {/* Prominent Balance Display (PRD Section 14) */}
          <div style={{
            background: isPending ? '#fee2e2' : isAdvance ? '#e0f2fe' : '#dcfce7',
            padding: '16px 24px',
            borderRadius: '16px',
            border: `1.5px solid ${isPending ? '#fca5a5' : isAdvance ? '#bae6fd' : '#bbf7d0'}`,
            textAlign: 'right',
          }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: isPending ? '#991b1b' : isAdvance ? '#075985' : '#166534',
            }}>
              Current Account Status
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: isPending ? '#991b1b' : isAdvance ? '#075985' : '#166534',
              lineHeight: 1.1,
              marginTop: '4px',
            }}>
              {isPending && `🔴 ₹${outstanding.toLocaleString()} Pending`}
              {isAdvance && `🔵 ₹${Math.abs(outstanding).toLocaleString()} Advance`}
              {!isPending && !isAdvance && `🟢 No Outstanding`}
            </div>
          </div>
        </div>

        {/* Ledger Month Totals */}
        <div style={{
          marginTop: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #e2ece3',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#597361', fontWeight: 600 }}>TOTAL MILK DELIVERED</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d5c3a' }}>{totalMilkDelivered}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#597361', fontWeight: 600 }}>TOTAL CURD DELIVERED</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d5c3a' }}>{totalCurdDelivered}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#597361', fontWeight: 600 }}>GROSS DELIVERIES BILL</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0c2340' }}>₹{grossBill.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#597361', fontWeight: 600 }}>TOTAL PAYMENTS RECEIVED</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>₹{totalPaid.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Ledger Chronological Table (PRD Section 10) */}
      <div className="dairy-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2ece3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: '#0c2340' }}>Chronological Account Transactions</h3>
            <p style={{ fontSize: '0.8rem', color: '#597361' }}>
              Formula: Outstanding = Total Credit Sales − Total Payments (Rule 10)
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d5c3a', background: '#eaf5ee', padding: '4px 10px', borderRadius: '12px' }}>
            {ledgerEntries.length} Transactions Recorded
          </span>
        </div>

        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Milk</th>
                <th>Curd</th>
                <th>Amount (₹)</th>
                <th>Method / Status</th>
                <th>Delivered By / Recorded By</th>
                <th style={{ textAlign: 'right' }}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#899e90' }}>
                    No ledger entries found for this customer yet.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => {
                  const isPay = entry.type === 'payment';
                  const isMissed = entry.status === 'not_delivered';

                  return (
                    <tr key={entry.id} style={{ background: isPay ? '#f0fdf4' : isMissed ? '#fff1f2' : 'inherit' }}>
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {entry.date}
                      </td>
                      <td>
                        {isPay ? (
                          <span className="badge badge-delivered">💵 Payment</span>
                        ) : isMissed ? (
                          <span className="badge badge-pending">✕ Missed</span>
                        ) : (
                          <span className="badge badge-advance">🥛 Delivery</span>
                        )}
                      </td>
                      <td>{entry.milk}</td>
                      <td>{entry.curd}</td>
                      <td style={{
                        fontWeight: 800,
                        color: isPay ? '#16a34a' : isMissed ? '#991b1b' : '#0c2340',
                      }}>
                        {isPay ? `- ₹${entry.paidAmount}` : isMissed ? '₹0' : `+ ₹${entry.amount}`}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                          {entry.paymentMethod}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#597361' }}>
                          {entry.notes}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#597361' }}>
                        {entry.deliveryBoyName || 'Admin'}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        color: entry.balance > 0 ? '#dc2626' : entry.balance < 0 ? '#2563eb' : '#16a34a',
                      }}>
                        {entry.balance > 0 && `₹${entry.balance}`}
                        {entry.balance < 0 && `₹${Math.abs(entry.balance)} Adv`}
                        {entry.balance === 0 && `₹0`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
