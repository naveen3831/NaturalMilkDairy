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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner (PRD Section 24) */}
      <div style={{
        background: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)',
        color: '#ffffff',
        padding: '24px',
        borderRadius: '18px',
        boxShadow: '0 8px 24px rgba(185, 28, 28, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#fecaca',
            marginBottom: '4px',
          }}>
            REVENUE RECOVERY & CREDIT MANAGEMENT
          </div>
          <h2 style={{ fontSize: '1.9rem', color: '#ffffff' }}>
            Pending Credit & Outstanding Report
          </h2>
          <p style={{ color: '#fee2e2', fontSize: '0.9rem', marginTop: '4px' }}>
            Instant customer balance visibility and 1-tap WhatsApp payment reminders
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '16px 24px',
          textAlign: 'right',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#fecaca' }}>
            TOTAL PENDING COLLECTION
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
            ₹{pendingCredit.totalOutstanding?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#fee2e2', fontWeight: 600 }}>
            Across {filtered.length} customers
          </div>
        </div>
      </div>

      {/* Sorting & Search Controls (PRD Section 24) */}
      <div className="dairy-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={16} color="#899e90" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search debtor by name, phone, area..."
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#597361' }}>Sort By:</span>
            {[
              { id: 'highest', label: 'Highest Outstanding' },
              { id: 'oldest', label: 'Oldest Pending' },
              { id: 'name', label: 'Customer Name (A-Z)' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setSortBy(btn.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: sortBy === btn.id ? '#991b1b' : '#f0f5f1',
                  color: sortBy === btn.id ? '#ffffff' : '#597361',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Credit Table (PRD Section 24) */}
      <div className="dairy-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Customer Name</th>
                <th>Phone / WhatsApp</th>
                <th>Area / Address</th>
                <th>Outstanding Balance</th>
                <th style={{ textAlign: 'right' }}>Actions & Reminders</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#899e90' }}>
                    <CheckCircle size={32} color="#16a34a" style={{ margin: '0 auto 8px auto' }} />
                    <div>All customers have cleared their credit balances!</div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const reminderMsg = encodeURIComponent(
                    `Hello ${c.name},\nGreetings from *Natural Milk Dairy*!\nYour milk & curd account has an outstanding balance of *₹${c.outstanding}*.\nKindly make the payment at your earliest convenience. Thank you!`
                  );
                  const waUrl = `https://wa.me/91${c.mobile.replace(/\D/g, '')}?text=${reminderMsg}`;

                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 800, color: '#0d5c3a', whiteSpace: 'nowrap' }}>
                        {c.customerId}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0c2340', fontSize: '1rem' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#597361' }}>
                          Plan: {c.lastDeliveryPlan?.milkQty}L Milk • {c.lastDeliveryPlan?.frequency}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <a href={`tel:${c.mobile}`} style={{ color: '#0d5c3a', fontWeight: 600 }}>
                          {c.mobile}
                        </a>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#597361' }}>
                        <strong>{c.area}</strong> — {c.address}
                      </td>
                      <td>
                        <span className="badge badge-pending" style={{ fontSize: '0.92rem', padding: '6px 12px' }}>
                          🔴 ₹{c.outstanding.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          {/* 1-Click WhatsApp Reminder (PRD Section 25) */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#25d366',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Send size={13} />
                            <span>WhatsApp</span>
                          </a>

                          {/* Quick Payment Button */}
                          <button
                            onClick={() => onOpenPaymentModal && onOpenPaymentModal(c)}
                            className="btn-gold"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          >
                            <DollarSign size={13} />
                            <span>Collect</span>
                          </button>

                          {/* Ledger Button */}
                          <button
                            onClick={() => onSelectCustomerLedger && onSelectCustomerLedger(c.id)}
                            style={{
                              padding: '6px 10px',
                              background: '#edf4fc',
                              color: '#16467a',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <BookOpen size={13} />
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
