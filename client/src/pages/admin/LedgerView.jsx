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
  const { getCustomerLedger } = useDairy();
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', textAlign: 'center', padding: '60px 20px' }}>
        <BookOpen size={36} color="#059669" style={{ margin: '0 auto 12px auto' }} />
        <h3 style={{ color: '#0f172a', fontSize: '1.05rem', margin: 0 }}>Loading Customer Ledger...</h3>
      </div>
    );
  }

  if (!ledgerData || !ledgerData.customer) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Customer ledger record not found.</p>
        <button
          onClick={onBack}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to Directory
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Back button & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#059669',
            fontWeight: 700,
            fontSize: '0.86rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Customers</span>
        </button>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#25d366',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.8rem',
              padding: '7px 14px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            <Send size={14} />
            <span>Send Statement</span>
          </a>

          <button
            onClick={handlePrint}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.8rem',
              padding: '7px 14px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Printer size={14} />
            <span>Print Invoice</span>
          </button>

          <button
            onClick={() => onOpenPaymentModal && onOpenPaymentModal(customer)}
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#b45309',
              fontWeight: 600,
              fontSize: '0.8rem',
              padding: '7px 14px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <DollarSign size={14} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 2. Customer Profile & Balance Snapshot */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '22px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
                {customer.customerId}
              </span>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>• Customer Passbook</span>
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {customer.name}
            </h1>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={13} color="#059669" /> {customer.mobile}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="#059669" /> {customer.address} ({customer.area})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} color="#059669" /> Plan: {customer.deliveryPlan?.milkQty}L Milk • {customer.deliveryPlan?.frequency}
              </span>
            </div>
          </div>

          {/* Account Balance Box */}
          <div
            style={{
              background: isPending ? '#fef2f2' : isAdvance ? '#eff6ff' : '#ecfdf5',
              padding: '12px 20px',
              borderRadius: '12px',
              border: `1px solid ${isPending ? '#fecaca' : isAdvance ? '#bfdbfe' : '#bbf7d0'}`,
              textAlign: 'right',
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: isPending ? '#dc2626' : isAdvance ? '#1d4ed8' : '#059669',
              }}
            >
              Current Ledger Status
            </div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: isPending ? '#b91c1c' : isAdvance ? '#1e40af' : '#047857',
                marginTop: '2px',
                lineHeight: 1.1,
              }}
            >
              {isPending && `₹${outstanding.toLocaleString()} Due`}
              {isAdvance && `₹${Math.abs(outstanding).toLocaleString()} Advance`}
              {!isPending && !isAdvance && `₹0 Settled`}
            </div>
          </div>
        </div>

        {/* Ledger Month Totals */}
        <div
          style={{
            marginTop: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TOTAL MILK DELIVERED</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>{totalMilkDelivered}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TOTAL CURD DELIVERED</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>{totalCurdDelivered}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>GROSS DELIVERIES BILL</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>₹{grossBill.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TOTAL PAYMENTS RECEIVED</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>₹{totalPaid.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 3. Chronological Transactions Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Chronological Transaction Records
            </h2>
            <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Formula: Outstanding = Total Credit Deliveries − Total Collections
            </p>
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
            {ledgerEntries.length} Transactions
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px' }}>Date</th>
                <th style={{ padding: '12px 18px' }}>Type</th>
                <th style={{ padding: '12px 18px' }}>Milk</th>
                <th style={{ padding: '12px 18px' }}>Curd</th>
                <th style={{ padding: '12px 18px' }}>Amount (₹)</th>
                <th style={{ padding: '12px 18px' }}>Payment Method / Notes</th>
                <th style={{ padding: '12px 18px' }}>Fulfilled By</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No ledger entries found for this customer yet.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => {
                  const isPay = entry.type === 'payment';
                  const isMissed = entry.status === 'not_delivered';

                  return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isPay ? '#f0fdf4' : isMissed ? '#fff1f2' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {entry.date}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {isPay ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>
                            Payment
                          </span>
                        ) : isMissed ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>
                            Missed
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af' }}>
                            Delivery
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px' }}>{entry.milk}</td>
                      <td style={{ padding: '12px 18px' }}>{entry.curd}</td>
                      <td
                        style={{
                          padding: '12px 18px',
                          fontWeight: 700,
                          color: isPay ? '#059669' : isMissed ? '#dc2626' : '#0f172a',
                        }}
                      >
                        {isPay ? `- ₹${entry.paidAmount}` : isMissed ? '₹0' : `+ ₹${entry.amount}`}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {entry.paymentMethod}
                        </div>
                        {entry.notes && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {entry.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748b' }}>
                        {entry.deliveryBoyName || 'Admin'}
                      </td>
                      <td
                        style={{
                          padding: '12px 18px',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: entry.balance > 0 ? '#dc2626' : entry.balance < 0 ? '#2563eb' : '#059669',
                        }}
                      >
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
