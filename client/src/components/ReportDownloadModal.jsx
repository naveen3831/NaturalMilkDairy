import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  Printer,
  Download,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
  Users,
  User,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { getApiUrl } from '../services/api';
import {
  generateAllCustomersHtml,
  generateSingleCustomerHtml,
  printHtmlDocument,
} from '../services/htmlReportService';

/**
 * ReportDownloadModal
 * Professional, simple, publication-grade report generator for Web and Mobile-Responsive.
 * Supports:
 * - All Customers (Consolidated Ledger)
 * - Single Customer Statement (with live list of all available customers)
 * - Weekly (Last 7 Days), Monthly (Last 30 Days), Entire History
 * - Realtime Native Browser Print / "Save as PDF" dialog (100% reliable, zero server dependency)
 * - Direct Server PDF file download option
 */
export default function ReportDownloadModal({
  isOpen,
  onClose,
  role = 'customer', // 'customer' | 'partner' | 'admin'
  entityId = null,   // customerId or partnerId (optional)
  title = null,
  subtitle = null,
  initialCustomers = null,
}) {
  // Scope: 'all' = All Customers consolidated; 'single' = Single customer statement
  const [reportScope, setReportScope] = useState(role === 'customer' ? 'single' : 'all');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Customer picker state (for single customer reports)
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Sync initial scope on role change
  useEffect(() => {
    if (role === 'customer') {
      setReportScope('single');
    }
  }, [role]);

  // Load and populate customers list
  useEffect(() => {
    if (!isOpen) return;
    if (role === 'customer' && entityId) return;

    let isMounted = true;

    // Use initialCustomers immediately if available
    if (Array.isArray(initialCustomers) && initialCustomers.length > 0) {
      setCustomers(initialCustomers);
      setSelectedCustomer((prev) => prev || initialCustomers[0]);
    }

    const fetchCustomersList = async () => {
      setIsLoadingCustomers(!initialCustomers || initialCustomers.length === 0);
      try {
        const token =
          sessionStorage.getItem('nmd_jwt_token') ||
          localStorage.getItem('nmd_jwt_token') ||
          '';

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        let list = [];

        // Tier 1: Try /api/customers
        try {
          const res = await fetch(getApiUrl('/api/customers'), { headers });
          const data = await res.json();
          if (data.success && Array.isArray(data.customers) && data.customers.length > 0) {
            list = data.customers;
          }
        } catch (_) {}

        // Tier 2: Try /api/deliveries/assigned-customers (for delivery partners)
        if (list.length === 0) {
          try {
            const res = await fetch(getApiUrl('/api/deliveries/assigned-customers'), { headers });
            const data = await res.json();
            if (data.success && Array.isArray(data.customers) && data.customers.length > 0) {
              list = data.customers;
            }
          } catch (_) {}
        }

        // Tier 3: Extract from /api/deliveries
        if (list.length === 0) {
          try {
            const res = await fetch(getApiUrl('/api/deliveries?range=today'), { headers });
            const data = await res.json();
            if (data.success && Array.isArray(data.deliveries)) {
              const byId = {};
              data.deliveries.forEach((d) => {
                const cid = d.customerId || d.customer;
                if (cid && !byId[cid]) {
                  byId[cid] = {
                    id: cid,
                    _id: cid,
                    customerId: cid,
                    name: d.customerName || 'Customer',
                    mobile: d.customerPhone || '',
                    address: d.deliveryAddress || '',
                    area: d.area || 'Hyderabad',
                    currentBalance: 0,
                  };
                }
              });
              list = Object.values(byId);
            }
          } catch (_) {}
        }

        if (isMounted && list.length > 0) {
          setCustomers(list);
          setSelectedCustomer((prev) => {
            if (prev) {
              const found = list.find((c) => String(c.id || c._id) === String(prev.id || prev._id));
              if (found) return found;
            }
            if (entityId) {
              const matched = list.find(
                (c) =>
                  String(c.id || c._id) === String(entityId) ||
                  String(c.customerId) === String(entityId)
              );
              if (matched) return matched;
            }
            return list[0];
          });
        }
      } catch (err) {
        console.warn('Could not load customers for report modal:', err);
      } finally {
        if (isMounted) setIsLoadingCustomers(false);
      }
    };

    fetchCustomersList();

    return () => {
      isMounted = false;
    };
  }, [isOpen, role, entityId, initialCustomers]);

  if (!isOpen) return null;

  const periods = [
    {
      id: 'weekly',
      label: 'Weekly Report',
      range: 'Last 7 Days',
      desc: 'Recent deliveries and immediate ledger balance',
      icon: Calendar,
      badge: 'Past 7 Days',
    },
    {
      id: 'monthly',
      label: 'Monthly Statement',
      range: 'Last 30 Days',
      desc: 'Standard billing cycle statement with detailed itemization',
      icon: FileText,
      badge: 'Recommended',
      isPopular: true,
    },
    {
      id: 'all',
      label: 'Entire History',
      range: 'All-Time Records',
      desc: 'Complete lifetime archive of all deliveries and transactions',
      icon: Clock,
      badge: 'Full Archive',
    },
  ];

  const getPeriodLabel = () => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (selectedPeriod === 'weekly') {
      const past = new Date(Date.now() - 7 * 86400000);
      const pastStr = past.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      return `Weekly (${pastStr} to ${todayStr})`;
    } else if (selectedPeriod === 'monthly') {
      const past = new Date(Date.now() - 30 * 86400000);
      const pastStr = past.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      return `Monthly (${pastStr} to ${todayStr})`;
    }
    return 'Entire History (All Time)';
  };

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase().trim();
    const name = String(c.name || '').toLowerCase();
    const phone = String(c.mobile || '').toLowerCase();
    const code = String(c.customerId || '').toLowerCase();
    const area = String(c.area || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || code.includes(q) || area.includes(q);
  });

  /**
   * Action 1: Instant Realtime Browser Print & Save as PDF (Recommended)
   */
  const handlePrintPdfRealtime = async () => {
    setIsGenerating(true);
    setErrorMsg('');

    try {
      const token =
        sessionStorage.getItem('nmd_jwt_token') ||
        localStorage.getItem('nmd_jwt_token') ||
        '';

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch live deliveries (with range=all to get full historical records) and payments
      const [delRes, payRes] = await Promise.all([
        fetch(getApiUrl('/api/deliveries?range=all'), { headers }).then((r) => r.json()).catch(() => ({ deliveries: [] })),
        fetch(getApiUrl('/api/payments'), { headers }).then((r) => r.json()).catch(() => ({ payments: [] })),
      ]);

      let allDeliveries = Array.isArray(delRes.deliveries) ? delRes.deliveries : [];
      let allPayments = Array.isArray(payRes.payments) ? payRes.payments : [];

      // Filter by period threshold
      let thresholdDate = null;
      if (selectedPeriod === 'weekly') {
        thresholdDate = new Date(Date.now() - 7 * 86400000);
      } else if (selectedPeriod === 'monthly') {
        thresholdDate = new Date(Date.now() - 30 * 86400000);
      }

      if (thresholdDate) {
        const thStr = thresholdDate.toISOString().split('T')[0];
        allDeliveries = allDeliveries.filter((d) => {
          const dt = d.deliveryDate || d.date || '';
          return dt >= thStr;
        });

        allPayments = allPayments.filter((p) => {
          const raw = p.paymentDate || p.createdAt;
          if (!raw) return true;
          return new Date(raw) >= thresholdDate;
        });
      }

      const periodLabel = getPeriodLabel();
      let html = '';
      let titleDoc = '';

      if (reportScope === 'all') {
        // Consolidated report for ALL customers
        let custList = customers;
        if (!custList || custList.length === 0) {
          const cRes = await fetch(getApiUrl('/api/customers'), { headers }).then((r) => r.json()).catch(() => ({ customers: [] }));
          if (Array.isArray(cRes.customers)) custList = cRes.customers;
        }

        html = generateAllCustomersHtml({
          customers: custList,
          deliveries: allDeliveries,
          payments: allPayments,
          periodLabel,
        });
        titleDoc = `All_Customers_Report_${selectedPeriod}`;
      } else {
        // Single customer statement: fetch direct customer ledger for 100% complete day-by-day delivery history
        let targetCust = selectedCustomer;
        if (!targetCust && (role === 'customer' || entityId)) {
          const lookupId = entityId || 'me';
          const meRes = await fetch(getApiUrl(`/api/customers/${lookupId}`), { headers }).then((r) => r.json()).catch(() => null);
          if (meRes?.customer) targetCust = meRes.customer;
        }

        if (!targetCust && customers.length > 0) {
          targetCust = customers[0];
        }

        if (!targetCust) {
          throw new Error('Please select a customer to generate their statement.');
        }

        let custDeliveries = [];
        let custPayments = [];
        const targetLookupId = targetCust.id || targetCust._id || targetCust.customerId || (role === 'customer' ? 'me' : '');

        if (targetLookupId) {
          try {
            const ledgerRes = await fetch(getApiUrl(`/api/customers/${targetLookupId}/ledger`), { headers }).then((r) => r.json()).catch(() => null);
            if (ledgerRes?.success) {
              if (ledgerRes.customer) targetCust = ledgerRes.customer;
              if (Array.isArray(ledgerRes.deliveries)) custDeliveries = ledgerRes.deliveries;
              if (Array.isArray(ledgerRes.payments)) custPayments = ledgerRes.payments;
            }
          } catch (_) {}
        }

        // Fallback filter
        if (custDeliveries.length === 0 && allDeliveries.length > 0) {
          const keys = [targetCust.id, targetCust._id, targetCust.customerId, targetCust.mobile].filter(Boolean).map(String);
          custDeliveries = allDeliveries.filter((d) => {
            const dCustId = String(d.customerId || '');
            const dPhone = String(d.customerPhone || '');
            return keys.includes(dCustId) || (targetCust.mobile && dPhone.includes(String(targetCust.mobile).replace(/\D/g, '')));
          });
        }

        if (custPayments.length === 0 && allPayments.length > 0) {
          const keys = [targetCust.id, targetCust._id, targetCust.customerId].filter(Boolean).map(String);
          custPayments = allPayments.filter((p) => {
            const pCustId = String(p.customerId || '');
            return keys.includes(pCustId);
          });
        }

        // Apply period filter (Weekly / Monthly)
        if (thresholdDate) {
          const thStr = thresholdDate.toISOString().split('T')[0];
          custDeliveries = custDeliveries.filter((d) => {
            const dt = d.deliveryDate || d.date || '';
            return dt >= thStr;
          });

          custPayments = custPayments.filter((p) => {
            const raw = p.paymentDate || p.createdAt;
            if (!raw) return true;
            return new Date(raw) >= thresholdDate;
          });
        }

        html = generateSingleCustomerHtml({
          customer: targetCust,
          deliveries: custDeliveries,
          payments: custPayments,
          periodLabel,
        });

        const safeName = String(targetCust.name || 'Customer').replace(/\s+/g, '_');
        titleDoc = `Statement_${safeName}_${selectedPeriod}`;
      }

      // Print document natively
      const success = printHtmlDocument(html, titleDoc);
      if (success) {
        setTimeout(() => {
          setIsGenerating(false);
          onClose();
        }, 500);
      } else {
        throw new Error('Unable to open print preview. Please check pop-up blocker permissions.');
      }
    } catch (err) {
      console.error('Error generating realtime report:', err);
      setErrorMsg(err.message || 'Failed to generate report.');
      setIsGenerating(false);
    }
  };

  /**
   * Action 2: Direct Server PDF Download (Fallback)
   */
  const handleServerDownload = async () => {
    setIsGenerating(true);
    setErrorMsg('');

    try {
      const token =
        sessionStorage.getItem('nmd_jwt_token') ||
        localStorage.getItem('nmd_jwt_token') ||
        '';

      let endpoint = '';
      if (reportScope === 'all') {
        endpoint = `/api/reports/all-customers/pdf?period=${selectedPeriod}`;
      } else if (role === 'customer') {
        endpoint = `/api/reports/customer/pdf?period=${selectedPeriod}`;
        if (entityId) endpoint += `&customerId=${encodeURIComponent(entityId)}`;
      } else {
        const custId = selectedCustomer?.id || selectedCustomer?._id || selectedCustomer?.customerId;
        endpoint = `/api/reports/customer/pdf?period=${selectedPeriod}&customerId=${encodeURIComponent(custId || '')}`;
      }

      if (token) {
        endpoint += `&token=${encodeURIComponent(token)}`;
      }

      const fullUrl = getApiUrl(endpoint);

      // Verify the endpoint returns valid PDF
      const resp = await fetch(fullUrl, { method: 'HEAD' }).catch(() => null);
      const isHtmlFallback = resp && resp.headers.get('content-type')?.includes('text/html');

      if (isHtmlFallback) {
        console.warn('Server returned non-PDF response, switching to realtime browser print engine.');
        await handlePrintPdfRealtime();
        return;
      }

      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_blank';
      link.download = `${reportScope}_report_${selectedPeriod}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setIsGenerating(false);
        onClose();
      }, 700);
    } catch (err) {
      console.warn('Server download issue, falling back to realtime print:', err);
      await handlePrintPdfRealtime();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d5c3a 0%, #15803d 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <Sparkles size={11} />
              Realtime PDF Reports
            </span>
          </div>

          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
            {title || (role === 'customer' ? 'Download Customer Statement' : 'Download Dairy Reports')}
          </h2>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '0.82rem',
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.35,
            }}
          >
            {subtitle || 'Download itemized doorstep deliveries, milk volume, and ledger balance statements.'}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Scope Selection (For Admin & Delivery Partner) */}
          {role !== 'customer' && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Report Type
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setReportScope('all')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: reportScope === 'all' ? '#ffffff' : 'transparent',
                    color: reportScope === 'all' ? '#0d5c3a' : '#64748b',
                    boxShadow: reportScope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Users size={16} />
                  <span>All Customers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportScope('single')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: reportScope === 'single' ? '#ffffff' : 'transparent',
                    color: reportScope === 'single' ? '#0d5c3a' : '#64748b',
                    boxShadow: reportScope === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <User size={16} />
                  <span>Single Customer</span>
                </button>
              </div>
            </div>
          )}

          {/* Customer Selection: VISIBLE LIST OF ALL AVAILABLE CUSTOMERS (When Single Customer is chosen) */}
          {reportScope === 'single' && role !== 'customer' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Select Customer
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#047857',
                    background: '#ecfdf5',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  {filteredCustomers.length} Available
                </span>
              </div>

              {/* Quick Search */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  marginBottom: '8px',
                }}
              >
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search customer by name, mobile, area..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.82rem',
                    width: '100%',
                    color: '#0f172a',
                  }}
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Scrollable Customer List */}
              {isLoadingCustomers && customers.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Loading available customers...</span>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  {customerSearch ? `No customers matching "${customerSearch}"` : 'No customer accounts available.'}
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: '#ffffff',
                  }}
                >
                  {filteredCustomers.map((c) => {
                    const isChosen =
                      selectedCustomer &&
                      (String(selectedCustomer.id || selectedCustomer._id) === String(c.id || c._id) ||
                        String(selectedCustomer.customerId) === String(c.customerId));
                    const balance = Number(c.currentBalance) || 0;
                    const initial = (c.name || 'C').charAt(0).toUpperCase();

                    return (
                      <div
                        key={c.id || c._id || c.customerId}
                        onClick={() => setSelectedCustomer(c)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: isChosen ? '#f0fdf4' : '#fafafa',
                          border: isChosen ? '1.8px solid #0d5c3a' : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: isChosen ? '#0d5c3a' : '#e2e8f0',
                              color: isChosen ? '#ffffff' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              flexShrink: 0,
                            }}
                          >
                            {initial}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: isChosen ? '#065f46' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.mobile ? `+91 ${c.mobile}` : 'No phone'} • {c.area || 'Hyderabad'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: balance > 0 ? '#fef2f2' : '#ecfdf5',
                              color: balance > 0 ? '#dc2626' : '#059669',
                            }}
                          >
                            {balance > 0 ? `Due ₹${Math.round(balance)}` : (balance < 0 ? `Adv ₹${Math.round(Math.abs(balance))}` : 'Cleared')}
                          </span>

                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: isChosen ? '5px solid #0d5c3a' : '2px solid #cbd5e1',
                              background: '#ffffff',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Timeframe Selection */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Select Timeframe
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {periods.map((p) => {
                const isSelected = selectedPeriod === p.id;
                const Icon = p.icon;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPeriod(p.id)}
                    style={{
                      border: isSelected ? '2px solid #0d5c3a' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: isSelected ? '#dcfce7' : '#f1f5f9',
                        color: isSelected ? '#0d5c3a' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? '#065f46' : '#0f172a' }}>
                          {p.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: isSelected ? '#bbf7d0' : '#e2e8f0',
                            color: isSelected ? '#047857' : '#475569',
                          }}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                        {p.desc}
                      </div>
                    </div>

                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isSelected ? '5px solid #0d5c3a' : '2px solid #cbd5e1',
                        background: '#ffffff',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.8rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              {/* Primary Instant Realtime Action */}
              <button
                type="button"
                onClick={handlePrintPdfRealtime}
                disabled={isGenerating}
                style={{
                  flex: 2,
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(13, 92, 58, 0.25)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => !isGenerating && (e.currentTarget.style.background = '#0a492e')}
                onMouseLeave={(e) => !isGenerating && (e.currentTarget.style.background = '#0d5c3a')}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Compiling Report...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {reportScope === 'all'
                        ? 'Download All Customers PDF'
                        : (selectedCustomer ? `Download for ${selectedCustomer.name}` : 'Download Customer Statement PDF')}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Direct File Download Link (Alternative) */}
            <button
              type="button"
              onClick={handleServerDownload}
              disabled={isGenerating}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0d5c3a',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '4px',
                textDecoration: 'underline',
              }}
            >
              <Printer size={13} />
              <span>Or Print / Save Preview</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
