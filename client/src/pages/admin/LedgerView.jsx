import React, { useState, useEffect } from 'react';
import { useDairy } from '../../context/DairyContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Download,
  Filter,
  MapPin,
  Phone,
  Printer,
  Send,
  User,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  BookOpen,
  LayoutGrid,
  Table as TableIcon,
  Milk,
  Wallet,
  CheckCircle2,
  Package,
} from 'lucide-react';

export default function LedgerView({ customerId, onBack, onOpenPaymentModal, onSelectCustomer }) {
  const { customers, getCustomerLedger } = useDairy();
  const { subscribe: wsSubscribe } = useWebSocket();
  const [activeCustomerId, setActiveCustomerId] = useState(customerId || (customers[0]?._id || customers[0]?.id));
  const [loading, setLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'cards' : 'table'));

  // Sync prop changes
  useEffect(() => {
    if (customerId && customerId !== activeCustomerId) {
      setActiveCustomerId(customerId);
    }
  }, [customerId]);

  // Handle screen resize default view preference
  useEffect(() => {
    const handleResize = () => {
      // only update if user hasn't explicitly toggled, or keep responsive
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set default customer if none selected
  useEffect(() => {
    if (!activeCustomerId && customers && customers.length > 0) {
      const firstId = customers[0]._id || customers[0].id || customers[0].customerId;
      setActiveCustomerId(firstId);
      if (onSelectCustomer) onSelectCustomer(firstId);
    }
  }, [customers, activeCustomerId, onSelectCustomer]);

  // Fetch Ledger data for active customer
  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!activeCustomerId || activeCustomerId === 'cust_1') {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getCustomerLedger(activeCustomerId);
        if (isMounted) {
          if (data && data.success && data.customer) {
            setLedgerData(data);
          } else {
            setLedgerData(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setLedgerData(null);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [activeCustomerId, getCustomerLedger]);

  // Quiet real-time WebSocket passbook sync (updates data without screen flicker)
  useEffect(() => {
    const handleLiveSync = () => {
      if (activeCustomerId && activeCustomerId !== 'cust_1') {
        getCustomerLedger(activeCustomerId).then((data) => {
          if (data && data.success && data.customer) {
            setLedgerData(data);
          }
        }).catch(() => {});
      }
    };

    const unsubDelivery = wsSubscribe('DELIVERY_UPDATED', handleLiveSync);
    const unsubPayment = wsSubscribe('PAYMENT_RECORDED', handleLiveSync);
    const unsubCustomer = wsSubscribe('CUSTOMER_UPDATED', handleLiveSync);

    return () => {
      unsubDelivery();
      unsubPayment();
      unsubCustomer();
    };
  }, [activeCustomerId, getCustomerLedger, wsSubscribe]);

  const handlePrint = () => {
    window.print();
  };

  const handleCustomerChange = (e) => {
    const newId = e.target.value;
    setActiveCustomerId(newId);
    if (onSelectCustomer) onSelectCustomer(newId);
  };

  const customer = ledgerData?.customer;
  const ledgerEntries = ledgerData?.ledgerEntries || [];
  const grossBill = ledgerData?.grossBill || 0;
  const totalPaid = ledgerData?.totalPaid || 0;
  const outstanding = ledgerData?.outstanding || 0;
  const totalMilkDelivered = ledgerData?.totalMilkDelivered || '0.0 L';
  const totalCurdDelivered = ledgerData?.totalCurdDelivered || '0.00 Kg';
  const whatsappUrl = ledgerData?.whatsappUrl || '';
  const isPending = outstanding > 0;
  const isAdvance = outstanding < 0;

  const pendingList = ledgerEntries.filter((e) => e.type === 'delivery' && e.status === 'pending');
  const pendingCount = pendingList.length;
  const pendingMilkQty = pendingList.reduce((acc, e) => acc + (parseFloat(e.milk) || 0), 0);
  const pendingTotalAmount = pendingList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const customerInitial = customer?.name ? customer.name.charAt(0).toUpperCase() : 'C';

  return (
    <div className="ledger-container">
      {/* 1. Header Toolbar with Customer Selector & Quick Actions */}
      <div className="ledger-card-panel ledger-toolbar">
        <div className="ledger-toolbar-left">
          <button
            type="button"
            onClick={onBack}
            className="ledger-back-btn"
            title="Return to Customer Directory"
          >
            <ArrowLeft size={16} />
            <span>Directory</span>
          </button>

          {/* Customer Selector Dropdown */}
          {customers && customers.length > 0 && (
            <div className="ledger-customer-selector">
              <Users size={16} className="ledger-select-icon" />
              <select
                value={activeCustomerId || ''}
                onChange={handleCustomerChange}
                className="ledger-select-input"
                aria-label="Select Customer"
              >
                {customers.map((c) => {
                  const val = c._id || c.customerId || c.id;
                  return (
                    <option key={val} value={val}>
                      {c.name} ({c.customerId}) {c.area ? `• ${c.area}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {customer && (
          <div className="ledger-toolbar-actions">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ledger-action-btn ledger-action-whatsapp"
                title="Send WhatsApp Statement"
              >
                <Send size={15} />
                <span>WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="ledger-action-btn ledger-action-print"
              title="Print Passbook / Statement"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPaymentModal && onOpenPaymentModal(customer)}
              className="ledger-action-btn ledger-action-pay"
              title="Record Payment Collection"
            >
              <DollarSign size={15} />
              <span>Record Pay</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="ledger-card-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <BookOpen size={36} color="#059669" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ color: '#0f172a', fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
            Loading Customer Passbook...
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '6px' }}>
            Fetching transactions, deliveries, and payment balances
          </p>
        </div>
      )}

      {/* Empty / Not Found state */}
      {!loading && (!ledgerData || !customer) && (
        <div className="ledger-card-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Users size={36} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ color: '#0f172a', fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
            {(!customers || customers.length === 0) ? 'No Customers in Directory Yet' : 'Select a Customer to View Ledger'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.86rem', marginTop: '6px' }}>
            {(!customers || customers.length === 0)
              ? 'Add customers from the directory to start tracking delivery passbooks and payments.'
              : 'Choose any customer from the dropdown above to inspect their passbook history.'}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="ledger-back-btn"
            style={{ marginTop: '16px' }}
          >
            Back to Directory
          </button>
        </div>
      )}

      {/* Active Customer Ledger View */}
      {!loading && ledgerData && customer && (
        <>
          {/* 2. Customer Profile & Balance Hero Card */}
          <div className="ledger-card-panel ledger-profile-box">
            <div className="ledger-profile-top">
              <div className="ledger-profile-main">
                <div className="ledger-avatar-circle">
                  {customerInitial}
                </div>

                <div className="ledger-profile-details">
                  <div className="ledger-badge-row">
                    <span className="ledger-id-tag">
                      {customer.customerId}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                      Customer Passbook
                    </span>
                  </div>

                  <h1 className="ledger-name-title">
                    {customer.name}
                  </h1>

                  <div className="ledger-chips-row">
                    {(customer.mobile || customer.email) && (
                      <span className="ledger-chip">
                        <Phone size={13} color="#059669" />
                        <span>{customer.mobile || customer.email}</span>
                      </span>
                    )}

                    {(customer.address || customer.area) && (
                      <span className="ledger-chip">
                        <MapPin size={13} color="#059669" />
                        <span>{customer.address || ''} {customer.area ? `(${customer.area})` : ''}</span>
                      </span>
                    )}

                    <span className="ledger-chip">
                      <Milk size={13} color="#059669" />
                      <span>{customer.deliveryPlan?.milkQty || 1}L Milk • {customer.deliveryPlan?.frequency || 'daily'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Balance Box */}
              <div className={`ledger-balance-box ${isPending ? 'pending' : isAdvance ? 'advance' : 'settled'}`}>
                <div>
                  <div className="ledger-balance-label">
                    Current Ledger Status
                  </div>
                  <div className="ledger-balance-amount">
                    {isPending && `₹${outstanding.toLocaleString()} Due`}
                    {isAdvance && `₹${Math.abs(outstanding).toLocaleString()} Advance`}
                    {!isPending && !isAdvance && `₹0 Settled`}
                  </div>
                </div>
                {(!isPending && !isAdvance) && (
                  <CheckCircle2 size={24} color="#059669" style={{ opacity: 0.8 }} />
                )}
              </div>
            </div>

            {/* Monthly Totals Grid */}
            <div className="ledger-metrics-grid">
              <div className="ledger-metric-card">
                <div className="ledger-metric-label">
                  <Milk size={14} color="#059669" />
                  <span>Milk Delivered</span>
                </div>
                <div className="ledger-metric-val green">{totalMilkDelivered}</div>
              </div>

              <div className="ledger-metric-card">
                <div className="ledger-metric-label">
                  <Package size={14} color="#0284c7" />
                  <span>Curd Delivered</span>
                </div>
                <div className="ledger-metric-val green">{totalCurdDelivered}</div>
              </div>

              <div className="ledger-metric-card">
                <div className="ledger-metric-label">
                  <FileText size={14} color="#64748b" />
                  <span>Gross Deliveries</span>
                </div>
                <div className="ledger-metric-val">₹{grossBill.toLocaleString()}</div>
              </div>

              <div className="ledger-metric-card">
                <div className="ledger-metric-label">
                  <Wallet size={14} color="#059669" />
                  <span>Total Payments</span>
                </div>
                <div className="ledger-metric-val green">₹{totalPaid.toLocaleString()}</div>
              </div>
            </div>

            {/* Today's Scheduled Route Card */}
            {pendingCount > 0 && (
              <div className="ledger-route-banner">
                <div>
                  <div style={{ fontSize: '0.70rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🚚 Today's Scheduled Route
                  </div>
                  <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                    {pendingMilkQty} L (₹{pendingTotalAmount})
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                  Awaiting Fulfillment
                </span>
              </div>
            )}
          </div>

          {/* 3. Chronological Transactions Section */}
          <div className="ledger-card-panel" style={{ overflow: 'hidden' }}>
            <div className="ledger-tx-header">
              <div>
                <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Passbook & Transactions</span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
                    {ledgerEntries.length} Records
                  </span>
                </h2>
                <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Formula: Outstanding = Total Deliveries − Total Collections
                </p>
              </div>

              {/* View Toggle */}
              <div className="ledger-view-toggle">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`ledger-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                  title="Card View (Mobile Optimized)"
                >
                  <LayoutGrid size={14} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`ledger-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                  title="Table View (Spreadsheet)"
                >
                  <TableIcon size={14} />
                  <span>Table</span>
                </button>
              </div>
            </div>

            {/* A. MOBILE CARDS VIEW */}
            {viewMode === 'cards' && (
              <div className="ledger-mobile-cards">
                {ledgerEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontSize: '0.86rem' }}>
                    No ledger entries found for this customer yet.
                  </div>
                ) : (
                  ledgerEntries.map((entry) => {
                    const isPay = entry.type === 'payment';
                    const isMissed = entry.status === 'not_delivered';
                    const isPendingEntry = entry.status === 'pending';

                    const cardTypeClass = isPay
                      ? 'payment'
                      : isMissed
                      ? 'missed'
                      : isPendingEntry
                      ? 'pending'
                      : 'delivered';

                    return (
                      <div key={entry.id} className={`ledger-card-item ${cardTypeClass}`}>
                        {/* Top Row: Date & Status Badge */}
                        <div className="ledger-card-row-top">
                          <span className="ledger-card-date">
                            <Calendar size={13} color="#64748b" />
                            {entry.date}
                          </span>

                          <span
                            className="ledger-card-badge"
                            style={{
                              background: isPay
                                ? '#dcfce7'
                                : isMissed
                                ? '#fee2e2'
                                : isPendingEntry
                                ? '#fef3c7'
                                : '#eff6ff',
                              color: isPay
                                ? '#166534'
                                : isMissed
                                ? '#991b1b'
                                : isPendingEntry
                                ? '#b45309'
                                : '#1e40af',
                            }}
                          >
                            {isPay
                              ? '💵 Payment Received'
                              : isMissed
                              ? '❌ Missed Delivery'
                              : isPendingEntry
                              ? '⏳ Pending Delivery'
                              : '🥛 Delivered'}
                          </span>
                        </div>

                        {/* Middle Row: Description & Amount */}
                        <div className="ledger-card-row-mid">
                          <div className="ledger-card-desc">
                            {isPay ? (
                              <span>
                                {entry.paymentMethod || 'Payment'}
                                {entry.notes ? ` • ${entry.notes}` : ''}
                              </span>
                            ) : (
                              <span>
                                {entry.milk ? `${entry.milk} Milk` : 'Milk'}
                                {entry.curd && entry.curd !== '0 Kg' && entry.curd !== '0.00 Kg'
                                  ? ` + ${entry.curd} Curd`
                                  : ''}
                              </span>
                            )}
                          </div>

                          <div
                            className="ledger-card-amount"
                            style={{
                              color: isPay
                                ? '#059669'
                                : isMissed
                                ? '#dc2626'
                                : isPendingEntry
                                ? '#b45309'
                                : '#0f172a',
                            }}
                          >
                            {isPay
                              ? `- ₹${entry.paidAmount}`
                              : isMissed
                              ? '₹0'
                              : isPendingEntry
                              ? `₹${entry.amount} (Pending)`
                              : `+ ₹${entry.amount}`}
                          </div>
                        </div>

                        {/* Bottom Row: Fulfilled By & Running Balance */}
                        <div className="ledger-card-row-bottom">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span>By: <strong>{entry.deliveryBoyName || 'Admin'}</strong></span>
                            {entry.proofImage && (
                              <a
                                href={entry.proofImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#059669', fontWeight: 700, textDecoration: 'none', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}
                                title="View doorstep delivery photo"
                              >
                                📷 Proof
                              </a>
                            )}
                          </span>

                          <span>
                            Bal:{' '}
                            <strong
                              style={{
                                color: entry.balance > 0 ? '#dc2626' : entry.balance < 0 ? '#2563eb' : '#059669',
                              }}
                            >
                              {entry.balance > 0 && `₹${entry.balance} Due`}
                              {entry.balance < 0 && `₹${Math.abs(entry.balance)} Adv`}
                              {entry.balance === 0 && `₹0 Settled`}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* B. SPREADSHEET TABLE VIEW */}
            {viewMode === 'table' && (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 16px' }}>Type / Status</th>
                      <th style={{ padding: '12px 16px' }}>Milk</th>
                      <th style={{ padding: '12px 16px' }}>Curd</th>
                      <th style={{ padding: '12px 16px' }}>Amount (₹)</th>
                      <th style={{ padding: '12px 16px' }}>Payment / Notes</th>
                      <th style={{ padding: '12px 16px' }}>Fulfilled By</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Running Balance</th>
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
                        const isPendingEntry = entry.status === 'pending';

                        return (
                          <tr
                            key={entry.id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: isPay ? '#f0fdf4' : isMissed ? '#fff1f2' : isPendingEntry ? '#fffdf7' : '#ffffff',
                            }}
                          >
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              {entry.date}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {isPay ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>
                                  Payment
                                </span>
                              ) : isMissed ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>
                                  Missed
                                </span>
                              ) : isPendingEntry ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#b45309' }}>
                                  Pending Delivery
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af' }}>
                                  Delivered
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px' }}>{entry.milk}</td>
                            <td style={{ padding: '12px 16px' }}>{entry.curd}</td>
                            <td
                              style={{
                                padding: '12px 16px',
                                fontWeight: 700,
                                color: isPay ? '#059669' : isMissed ? '#dc2626' : isPendingEntry ? '#b45309' : '#0f172a',
                              }}
                            >
                              {isPay ? `- ₹${entry.paidAmount}` : isMissed ? '₹0' : isPendingEntry ? `₹${entry.amount} (Pending)` : `+ ₹${entry.amount}`}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#334155' }}>
                                {entry.paymentMethod}
                              </div>
                              {entry.notes && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  {entry.notes}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748b' }}>
                              {entry.deliveryBoyName || 'Admin'}
                            </td>
                            <td
                              style={{
                                padding: '12px 16px',
                                textAlign: 'right',
                                fontWeight: 800,
                                color: entry.balance > 0 ? '#dc2626' : entry.balance < 0 ? '#2563eb' : '#059669',
                              }}
                            >
                              <div>
                                {entry.balance > 0 && `₹${entry.balance}`}
                                {entry.balance < 0 && `₹${Math.abs(entry.balance)} Adv`}
                                {entry.balance === 0 && `₹0`}
                              </div>
                              {isPendingEntry && (
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>
                                  Unbilled until delivery
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
