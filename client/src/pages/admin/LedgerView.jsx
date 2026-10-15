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
  MessageSquare,
  Plus,
  Camera,
  Sparkles,
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
            <ArrowLeft size={15} />
            <span>Directory</span>
          </button>

          {/* Customer Selector Dropdown */}
          {customers && customers.length > 0 && (
            <div className="ledger-customer-selector">
              <User size={15} className="ledger-select-icon" />
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
                <MessageSquare size={14} />
                <span>WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="ledger-action-btn ledger-action-print"
              title="Print Passbook / Statement"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPaymentModal && onOpenPaymentModal(customer)}
              className="ledger-action-btn ledger-action-pay"
              title="Record Payment Collection"
            >
              <Plus size={14} />
              <span>Record Pay</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="ledger-card-panel" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <BookOpen size={32} color="#059669" style={{ margin: '0 auto 10px auto' }} />
          <h3 style={{ color: '#0f172a', fontSize: '0.98rem', margin: 0, fontWeight: 700 }}>
            Loading Customer Passbook...
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.80rem', marginTop: '4px' }}>
            Fetching transactions, deliveries, and payment balances
          </p>
        </div>
      )}

      {/* Empty / Not Found state */}
      {!loading && (!ledgerData || !customer) && (
        <div className="ledger-card-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Users size={32} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
          <h3 style={{ color: '#0f172a', fontSize: '0.98rem', margin: 0, fontWeight: 700 }}>
            {(!customers || customers.length === 0) ? 'No Customers in Directory Yet' : 'Select a Customer to View Ledger'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '4px', maxWidth: '420px', margin: '4px auto 0' }}>
            {(!customers || customers.length === 0)
              ? 'Add customers from the directory to start tracking delivery passbooks and payments.'
              : 'Choose any customer from the dropdown above to inspect their passbook history.'}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="ledger-back-btn"
            style={{ marginTop: '16px', display: 'inline-flex' }}
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
                  <div className="ledger-header-row">
                    <h1 className="ledger-name-title">
                      {customer.name}
                    </h1>
                    <span className="ledger-id-tag">
                      {customer.customerId}
                    </span>
                  </div>
                  <div className="ledger-passbook-subtitle">
                    Customer Passbook & Ledger
                  </div>

                  <div className="ledger-chips-row">
                    {(customer.mobile || customer.email) && (
                      <span className="ledger-chip">
                        <Phone size={12} className="ledger-chip-icon" />
                        <span>{customer.mobile || customer.email}</span>
                      </span>
                    )}

                    {(customer.address || customer.area) && (
                      <span className="ledger-chip">
                        <MapPin size={12} className="ledger-chip-icon" />
                        <span>{customer.address ? `${customer.address} ` : ''}{customer.area ? `(${customer.area})` : ''}</span>
                      </span>
                    )}

                    <span className="ledger-chip">
                      <Milk size={12} className="ledger-chip-icon" />
                      <span>{customer.deliveryPlan?.milkQty || 1}L Milk • {customer.deliveryPlan?.frequency || 'daily'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Balance Box */}
              <div className={`ledger-balance-box ${isPending ? 'pending' : isAdvance ? 'advance' : 'settled'}`}>
                <div className="ledger-balance-label">
                  Current Ledger Status
                </div>
                <div className="ledger-balance-amount">
                  {isPending && `₹${outstanding.toLocaleString()}`}
                  {isAdvance && `₹${Math.abs(outstanding).toLocaleString()}`}
                  {!isPending && !isAdvance && `₹0`}
                </div>
                <div className="ledger-balance-badge">
                  {isPending && (
                    <>
                      <AlertCircle size={12} />
                      <span>Payment Due</span>
                    </>
                  )}
                  {isAdvance && (
                    <>
                      <Sparkles size={12} />
                      <span>Advance Credit</span>
                    </>
                  )}
                  {!isPending && !isAdvance && (
                    <>
                      <CheckCircle2 size={12} />
                      <span>Settled</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Totals Grid */}
            <div className="ledger-metrics-grid">
              <div className="ledger-metric-card">
                <div className="ledger-metric-header">
                  <span className="ledger-metric-label">Milk Delivered</span>
                  <div className="ledger-metric-icon-wrap milk">
                    <Milk size={14} />
                  </div>
                </div>
                <div className="ledger-metric-val">{totalMilkDelivered}</div>
              </div>

              <div className="ledger-metric-card">
                <div className="ledger-metric-header">
                  <span className="ledger-metric-label">Curd Delivered</span>
                  <div className="ledger-metric-icon-wrap curd">
                    <Package size={14} />
                  </div>
                </div>
                <div className="ledger-metric-val">{totalCurdDelivered}</div>
              </div>

              <div className="ledger-metric-card">
                <div className="ledger-metric-header">
                  <span className="ledger-metric-label">Gross Deliveries</span>
                  <div className="ledger-metric-icon-wrap gross">
                    <FileText size={14} />
                  </div>
                </div>
                <div className="ledger-metric-val">₹{grossBill.toLocaleString()}</div>
              </div>

              <div className="ledger-metric-card">
                <div className="ledger-metric-header">
                  <span className="ledger-metric-label">Total Payments</span>
                  <div className="ledger-metric-icon-wrap payments">
                    <Wallet size={14} />
                  </div>
                </div>
                <div className="ledger-metric-val">₹{totalPaid.toLocaleString()}</div>
              </div>
            </div>

            {/* Today's Scheduled Route Card */}
            {pendingCount > 0 && (
              <div className="ledger-route-banner">
                <div>
                  <div style={{ fontSize: '0.70rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🚚 Today's Scheduled Delivery
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#d97706', marginTop: '2px' }}>
                    {pendingMilkQty} L Milk (₹{pendingTotalAmount})
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                  Awaiting Delivery Partner
                </span>
              </div>
            )}
          </div>

          {/* 3. Chronological Transactions Section */}
          <div className="ledger-card-panel" style={{ overflow: 'hidden' }}>
            <div className="ledger-tx-header">
              <div className="ledger-tx-title-area">
                <h2 className="ledger-tx-title">
                  <span>Passbook & Transactions</span>
                  <span className="ledger-count-pill">
                    {ledgerEntries.length} Records
                  </span>
                </h2>
                <p className="ledger-tx-subtitle">
                  Chronological audit trail of daily milk drops, payments, and account balance
                </p>
              </div>

              {/* View Toggle */}
              <div className="ledger-view-toggle">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`ledger-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                  title="Table View (Spreadsheet)"
                >
                  <TableIcon size={14} />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`ledger-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                  title="Card View (Mobile Optimized)"
                >
                  <LayoutGrid size={14} />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {/* A. MOBILE CARDS VIEW */}
            {viewMode === 'cards' && (
              <div className="ledger-mobile-cards">
                {ledgerEntries.length === 0 ? (
                  <div className="ledger-empty-state">
                    <div className="ledger-empty-icon">
                      <FileText size={20} />
                    </div>
                    <h3 className="ledger-empty-title">No Ledger Entries Found</h3>
                    <p className="ledger-empty-desc">
                      Deliveries and payments recorded for {customer.name} will appear here.
                    </p>
                  </div>
                ) : (
                  ledgerEntries.map((entry) => {
                    const isPay = entry.type === 'payment';
                    const isMissed = entry.status === 'not_delivered';
                    const isPendingEntry = entry.status === 'pending';

                    return (
                      <div
                        key={entry.id}
                        className={`ledger-card-item ${isPay ? 'payment' : isMissed ? 'missed' : isPendingEntry ? 'pending' : 'delivered'}`}
                      >
                        {/* Top Row: Date & Status Badge */}
                        <div className="ledger-card-row-top">
                          <span className="ledger-card-date">
                            <Calendar size={13} color="#64748b" />
                            {entry.date}
                          </span>

                          <span
                            className={`ledger-status-tag ${isPay ? 'payment' : isMissed ? 'missed' : isPendingEntry ? 'pending' : 'delivered'}`}
                          >
                            {isPay
                              ? 'Payment'
                              : isMissed
                              ? 'Missed'
                              : isPendingEntry
                              ? 'Scheduled'
                              : 'Delivered'}
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
                                {entry.curd && entry.curd !== '0' && entry.curd !== '0 Kg' && entry.curd !== '0.00 Kg'
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
                              ? `₹${entry.amount}`
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
                                className="ledger-proof-link"
                                title="View doorstep delivery photo"
                              >
                                <Camera size={11} />
                                <span>Proof</span>
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
              <div className="ledger-table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type / Status</th>
                      <th>Milk</th>
                      <th>Curd</th>
                      <th>Amount (₹)</th>
                      <th>Payment / Notes</th>
                      <th>Fulfilled By</th>
                      <th style={{ textAlign: 'right' }}>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan="8">
                          <div className="ledger-empty-state">
                            <div className="ledger-empty-icon">
                              <FileText size={20} />
                            </div>
                            <h3 className="ledger-empty-title">No Ledger Entries Recorded Yet</h3>
                            <p className="ledger-empty-desc">
                              Deliveries and payment collections for {customer.name} will appear here in chronological order.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((entry) => {
                        const isPay = entry.type === 'payment';
                        const isMissed = entry.status === 'not_delivered';
                        const isPendingEntry = entry.status === 'pending';

                        return (
                          <tr key={entry.id}>
                            <td style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              {entry.date}
                            </td>
                            <td>
                              <span
                                className={`ledger-status-tag ${isPay ? 'payment' : isMissed ? 'missed' : isPendingEntry ? 'pending' : 'delivered'}`}
                              >
                                {isPay
                                  ? 'Payment'
                                  : isMissed
                                  ? 'Missed'
                                  : isPendingEntry
                                  ? 'Scheduled'
                                  : 'Delivered'}
                              </span>
                            </td>
                            <td>{entry.milk || '-'}</td>
                            <td>{entry.curd && entry.curd !== '0' && entry.curd !== '0 Kg' && entry.curd !== '0.00 Kg' ? entry.curd : '-'}</td>
                            <td
                              style={{
                                fontWeight: 700,
                                color: isPay ? '#059669' : isMissed ? '#dc2626' : isPendingEntry ? '#b45309' : '#0f172a',
                              }}
                            >
                              {isPay ? `- ₹${entry.paidAmount}` : isMissed ? '₹0' : isPendingEntry ? `₹${entry.amount}` : `+ ₹${entry.amount}`}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#334155' }}>
                                {entry.paymentMethod || '-'}
                              </div>
                              {entry.notes && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                  {entry.notes}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span>{entry.deliveryBoyName || 'Admin'}</span>
                                {entry.proofImage && (
                                  <a
                                    href={entry.proofImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ledger-proof-link"
                                    title="View doorstep delivery photo"
                                  >
                                    <Camera size={11} />
                                    <span>Proof</span>
                                  </a>
                                )}
                              </div>
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 700,
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
