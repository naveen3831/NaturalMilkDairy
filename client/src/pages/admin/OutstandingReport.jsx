import React, { useState, useEffect } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  AlertCircle,
  Phone,
  Send,
  DollarSign,
  BookOpen,
  ArrowUpDown,
  Search,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function OutstandingReport({ onSelectCustomerLedger, onOpenPaymentModal }) {
  const { pendingCredit, fetchPendingCredit } = useDairy();
  const [sortBy, setSortBy] = useState('highest');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPendingCredit(sortBy);
  }, [sortBy, fetchPendingCredit]);

  const customersList = pendingCredit.customers || [];

  const filtered = customersList.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.mobile && c.mobile.includes(q);
      const matchArea = c.area && c.area.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchArea) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Executive Summary Banner */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #fee2e2',
          borderRadius: '14px',
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
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#dc2626',
                background: '#fef2f2',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              Revenue Recovery
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              • {filtered.length} customers with pending monthly balance
            </span>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Pending Credit & Outstanding Report
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
            Track overdue customer accounts and send 1-tap WhatsApp payment reminders
          </p>
        </div>

        <div
          style={{
            background: '#fef2f2',
            borderRadius: '12px',
            padding: '12px 20px',
            border: '1px solid #fecaca',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#dc2626' }}>
            TOTAL PENDING COLLECTION
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b91c1c', lineHeight: 1.1, marginTop: '2px' }}>
            ₹{pendingCredit.totalOutstanding?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {/* 2. Sorting & Search Controls */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search debtor by name, phone, or route area..."
            style={{
              paddingLeft: '34px',
              paddingTop: '7px',
              paddingBottom: '7px',
              fontSize: '0.84rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Sort By:</span>
          {[
            { id: 'highest', label: 'Highest Due' },
            { id: 'oldest', label: 'Oldest' },
            { id: 'name', label: 'Name (A-Z)' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSortBy(btn.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: sortBy === btn.id ? '#dc2626' : '#e2e8f0',
                background: sortBy === btn.id ? '#fef2f2' : '#ffffff',
                color: sortBy === btn.id ? '#dc2626' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Pending Credit Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px' }}>Customer ID</th>
                <th style={{ padding: '12px 18px' }}>Customer Name</th>
                <th style={{ padding: '12px 18px' }}>Phone</th>
                <th style={{ padding: '12px 18px' }}>Area / Address</th>
                <th style={{ padding: '12px 18px' }}>Outstanding Due</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions & Reminders</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <CheckCircle size={32} color="#059669" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>All customers are settled!</div>
                    <div style={{ fontSize: '0.78rem' }}>No pending collections at this moment.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const reminderMsg = encodeURIComponent(
                    `Hello ${c.name},\nGreetings from *Natural Milk Dairy*!\nYour milk & curd account has an outstanding balance of *₹${c.outstanding}*.\nKindly make the payment at your earliest convenience. Thank you!`
                  );
                  const waUrl = `https://wa.me/91${c.mobile.replace(/\D/g, '')}?text=${reminderMsg}`;

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#059669' }}>
                        {c.customerId}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Plan: {c.lastDeliveryPlan?.milkQty}L Milk • {c.lastDeliveryPlan?.frequency}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                        <a href={`tel:${c.mobile}`} style={{ color: '#059669', fontWeight: 600, textDecoration: 'none' }}>
                          {c.mobile}
                        </a>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#475569', fontSize: '0.8rem' }}>
                        <strong>{c.area}</strong> — {c.address}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                          }}
                        >
                          ₹{c.outstanding.toLocaleString()} Due
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {/* 1-Click WhatsApp Reminder */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#25d366',
                              color: '#ffffff',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              textDecoration: 'none',
                            }}
                          >
                            <Send size={12} />
                            <span>WhatsApp</span>
                          </a>

                          {/* Quick Payment Button */}
                          <button
                            onClick={() => onOpenPaymentModal && onOpenPaymentModal(c)}
                            style={{
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              color: '#b45309',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <DollarSign size={12} />
                            <span>Collect</span>
                          </button>

                          {/* Ledger Button */}
                          <button
                            onClick={() => onSelectCustomerLedger && onSelectCustomerLedger(c.id)}
                            style={{
                              padding: '5px 9px',
                              background: '#eff6ff',
                              border: '1px solid #dbeafe',
                              color: '#1d4ed8',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <BookOpen size={12} />
                            <span>Ledger</span>
                          </button>
                        </div>
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
