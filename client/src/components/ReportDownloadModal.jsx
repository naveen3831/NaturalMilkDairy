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
  Eye,
  ArrowLeft,
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
function toIstDateKey(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function getIstDateDaysAgo(daysAgo) {
  return toIstDateKey(new Date(Date.now() - daysAgo * 86400000));
}

function extractRecordsFromLedger(ledgerRes) {
  const deliveries = Array.isArray(ledgerRes?.deliveries) ? [...ledgerRes.deliveries] : [];
  const payments = Array.isArray(ledgerRes?.payments) ? [...ledgerRes.payments] : [];
  const entries = Array.isArray(ledgerRes?.ledgerEntries) ? ledgerRes.ledgerEntries : [];

  entries.forEach((entry) => {
    const raw = entry?.rawItem && typeof entry.rawItem === 'object' ? { ...entry.rawItem } : {};
    if (entry?.type === 'delivery') {
      deliveries.push({
        ...raw,
        id: raw.id || raw._id || entry.id,
        deliveryDate: raw.deliveryDate || raw.date || entry.date || '',
        actualMilk: raw.actualMilk ?? (Number.parseFloat(entry.milk) || 0),
        plannedMilk: raw.plannedMilk ?? (Number.parseFloat(entry.milk) || 0),
        actualCurd: raw.actualCurd ?? (Number.parseFloat(entry.curd) || 0),
        plannedCurd: raw.plannedCurd ?? (Number.parseFloat(entry.curd) || 0),
        totalAmount: raw.totalAmount ?? entry.amount ?? 0,
        status: raw.status || entry.status || 'delivered',
        deliveryBoyName: raw.deliveryBoyName || entry.deliveryBoyName || 'Assigned Partner',
        addons: raw.addons || entry.addons || [],
        addonsTotal: raw.addonsTotal ?? entry.addonsTotal ?? 0,
      });
    } else if (entry?.type === 'payment') {
      payments.push({
        ...raw,
        id: raw.id || raw._id || entry.id,
        paymentDate: raw.paymentDate || raw.createdAt || entry.time || entry.date || '',
        amount: raw.amount ?? entry.paidAmount ?? Math.abs(Number(entry.amount) || 0),
        paymentMethod: raw.paymentMethod || entry.paymentMethod || 'CASH',
        collectedBy: raw.collectedBy || entry.deliveryBoyName || 'Partner',
      });
    }
  });

  return { deliveries, payments };
}

export default function ReportDownloadModal({
  isOpen,
  onClose,
  role = 'customer', // 'customer' | 'partner' | 'admin'
  entityId = null,   // customerId or partnerId (optional)
  title = null,
  subtitle = null,
  initialCustomers = null,
  initialDeliveries = null,
  initialPayments = null,
}) {
  // Scope: 'all' = All Customers consolidated; 'single' = Single customer statement
  const [reportScope, setReportScope] = useState(role === 'customer' ? 'single' : 'all');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [viewMode, setViewMode] = useState('config'); // 'config' | 'preview'
  const [previewData, setPreviewData] = useState(null);

  // Customer picker state (for single customer reports)
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Reset modal view when opened/closed
  useEffect(() => {
    if (isOpen) {
      setViewMode('config');
      setErrorMsg('');
    }
  }, [isOpen]);

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
   * Shared compiler: builds realtime HTML statement & resolved customer info
   */
  const buildCompiledReport = async () => {
    const token =
      sessionStorage.getItem('nmd_jwt_token') ||
      localStorage.getItem('nmd_jwt_token') ||
      '';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    let allDeliveries = [];
    let allPayments = [];

    // Staff roles can query global collections; customers use /ledger directly (avoids 403)
    if (role !== 'customer') {
      const [delRes, payRes] = await Promise.all([
        fetch(getApiUrl('/api/deliveries?range=all'), { headers }).then((r) => r.json()).catch(() => ({ deliveries: [] })),
        fetch(getApiUrl('/api/payments'), { headers }).then((r) => r.json()).catch(() => ({ payments: [] })),
      ]);
      allDeliveries = Array.isArray(delRes?.deliveries) ? delRes.deliveries : [];
      allPayments = Array.isArray(payRes?.payments) ? payRes.payments : [];
    }

    if (allDeliveries.length === 0 && Array.isArray(initialDeliveries) && initialDeliveries.length > 0) {
      allDeliveries = initialDeliveries;
    }
    if (allPayments.length === 0 && Array.isArray(initialPayments) && initialPayments.length > 0) {
      allPayments = initialPayments;
    }

    const todayIst = toIstDateKey(new Date());
    const thresholdStr =
      selectedPeriod === 'weekly'
        ? getIstDateDaysAgo(7)
        : selectedPeriod === 'monthly'
          ? getIstDateDaysAgo(30)
          : '';

    const filterByPeriod = (items, getDate) => {
      if (!thresholdStr) return items;
      return items.filter((item) => {
        const dtKey = toIstDateKey(getDate(item));
        if (!dtKey) return true;
        return dtKey >= thresholdStr && (!todayIst || dtKey <= todayIst);
      });
    };

    const periodLabel = getPeriodLabel();

    if (reportScope === 'all') {
      let custList = customers;
      if (!custList || custList.length === 0) {
        const cRes = await fetch(getApiUrl('/api/customers'), { headers }).then((r) => r.json()).catch(() => ({ customers: [] }));
        if (Array.isArray(cRes?.customers)) custList = cRes.customers;
      }

      const filteredDel = filterByPeriod(allDeliveries, (d) => d.deliveryDate || d.date);
      const filteredPay = filterByPeriod(allPayments, (p) => p.paymentDate || p.createdAt);

      const html = generateAllCustomersHtml({
        customers: custList,
        deliveries: filteredDel,
        payments: filteredPay,
        periodLabel,
      });
      return {
        html,
        titleDoc: `All_Customers_Report_${selectedPeriod}`,
        periodLabel,
        resolvedCustomerId: null,
      };
    }

    // Single customer statement
    let targetCust = selectedCustomer;
    if (!targetCust && Array.isArray(initialCustomers) && initialCustomers.length > 0) {
      targetCust = initialCustomers[0];
    }
    if (!targetCust && (role === 'customer' || entityId)) {
      const lookupId = entityId || 'me';
      const meRes = await fetch(getApiUrl(`/api/customers/${lookupId}`), { headers }).then((r) => r.json()).catch(() => null);
      if (meRes?.customer) targetCust = meRes.customer;
    }
    if (!targetCust && customers.length > 0) {
      targetCust = customers[0];
    }
    if (!targetCust && role !== 'customer') {
      throw new Error('Please select a customer to generate their statement.');
    }

    targetCust = targetCust || {
      name: 'Customer',
      customerId: entityId || '',
      mobile: '',
      area: 'Hyderabad',
      currentBalance: 0,
    };

    let custDeliveries = [];
    let custPayments = [];
    const targetLookupId =
      targetCust.id ||
      targetCust._id ||
      targetCust.customerId ||
      (role === 'customer' ? 'me' : '');

    if (targetLookupId) {
      try {
        const ledgerRes = await fetch(getApiUrl(`/api/customers/${encodeURIComponent(targetLookupId)}/ledger`), { headers })
          .then((r) => r.json())
          .catch(() => null);
        if (ledgerRes?.success) {
          if (ledgerRes.customer) targetCust = ledgerRes.customer;
          const extracted = extractRecordsFromLedger(ledgerRes);
          custDeliveries = extracted.deliveries;
          custPayments = extracted.payments;
        }
      } catch (_) {}
    }

    // Fallback to initial/in-memory records if ledger returned empty
    if (custDeliveries.length === 0 && allDeliveries.length > 0) {
      if (role === 'customer') {
        custDeliveries = [...allDeliveries];
      } else {
        const keys = [targetCust.id, targetCust._id, targetCust.customerId, targetCust.mobile].filter(Boolean).map(String);
        custDeliveries = allDeliveries.filter((d) => {
          const dCustId = String(d.customerId || '');
          const dPhone = String(d.customerPhone || '');
          return keys.includes(dCustId) || (targetCust.mobile && dPhone.includes(String(targetCust.mobile).replace(/\D/g, '')));
        });
      }
    }

    if (custPayments.length === 0 && allPayments.length > 0) {
      if (role === 'customer') {
        custPayments = [...allPayments];
      } else {
        const keys = [targetCust.id, targetCust._id, targetCust.customerId].filter(Boolean).map(String);
        custPayments = allPayments.filter((p) => keys.includes(String(p.customerId || '')));
      }
    }

    custDeliveries = filterByPeriod(custDeliveries, (d) => d.deliveryDate || d.date);
    custPayments = filterByPeriod(custPayments, (p) => p.paymentDate || p.createdAt);

    const html = generateSingleCustomerHtml({
      customer: targetCust,
      deliveries: custDeliveries,
      payments: custPayments,
      periodLabel,
    });

    const safeName = String(targetCust.name || 'Customer').replace(/\s+/g, '_');
    const resolvedCustomerId = targetCust.customerId || targetCust.id || targetCust._id || null;

    return {
      html,
      titleDoc: `Statement_${safeName}_${selectedPeriod}`,
      periodLabel,
      resolvedCustomerId,
    };
  };

  /**
   * Action 1: Preview Report inside modal (works cleanly on mobile responsive & web)
   */
  const handlePreviewReport = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const compiled = await buildCompiledReport();
      setPreviewData(compiled);
      setViewMode('preview');
    } catch (err) {
      console.error('Error generating preview report:', err);
      setErrorMsg(err.message || 'Failed to load statement report.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Action 2: Browser Print / Save as PDF
   */
  const handlePrintPdfRealtime = async () => {
    setIsGenerating(true);
    setErrorMsg('');

    try {
      const compiled = previewData && viewMode === 'preview' ? previewData : await buildCompiledReport();
      setPreviewData(compiled);

      const success = printHtmlDocument(compiled.html, compiled.titleDoc);
      if (success) {
        setTimeout(() => {
          setIsGenerating(false);
        }, 500);
      } else {
        // Fallback to in-modal preview if browser blocked print dialog
        setViewMode('preview');
        setIsGenerating(false);
        setErrorMsg('Pop-up blocked — preview opened below. Use your browser menu to Print or Save PDF.');
      }
    } catch (err) {
      console.error('Error generating realtime report:', err);
      setErrorMsg(err.message || 'Failed to generate report.');
      setIsGenerating(false);
    }
  };

  /**
   * Action 3: Direct Server PDF File Download (via authenticated fetch -> Blob)
   */
  const handleServerDownload = async () => {
    setIsGenerating(true);
    setErrorMsg('');

    try {
      const token =
        sessionStorage.getItem('nmd_jwt_token') ||
        localStorage.getItem('nmd_jwt_token') ||
        '';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const resolvedCustId =
        previewData?.resolvedCustomerId ||
        selectedCustomer?.customerId ||
        selectedCustomer?.id ||
        selectedCustomer?._id ||
        (entityId && entityId !== 'me' ? entityId : '');

      let endpoint = '';
      if (reportScope === 'all') {
        endpoint = `/api/reports/all-customers/pdf?period=${selectedPeriod}`;
      } else if (role === 'customer') {
        endpoint = `/api/reports/customer/pdf?period=${selectedPeriod}`;
        if (resolvedCustId) endpoint += `&customerId=${encodeURIComponent(resolvedCustId)}`;
      } else {
        endpoint = `/api/reports/customer/pdf?period=${selectedPeriod}&customerId=${encodeURIComponent(resolvedCustId || '')}`;
      }

      if (token) {
        endpoint += `&token=${encodeURIComponent(token)}`;
      }

      const fullUrl = getApiUrl(endpoint);
      const resp = await fetch(fullUrl, { headers }).catch(() => null);
      const contentType = resp?.headers?.get('content-type') || '';

      if (!resp || !resp.ok || !contentType.includes('application/pdf')) {
        console.warn('Server PDF unavailable or returned non-PDF, opening realtime report preview.');
        const compiled = previewData || await buildCompiledReport();
        setPreviewData(compiled);
        setViewMode('preview');
        setIsGenerating(false);
        return;
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const fileName = `${previewData?.titleDoc || `${reportScope}_report_${selectedPeriod}`}.pdf`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

      setIsGenerating(false);
    } catch (err) {
      console.warn('Server download issue, falling back to realtime preview:', err);
      try {
        const compiled = previewData || await buildCompiledReport();
        setPreviewData(compiled);
        setViewMode('preview');
      } catch (e2) {
        setErrorMsg(e2.message || 'Failed to generate report.');
      }
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="nmd-report-modal-overlay"
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
      <style>{`
        @media (max-width: 640px) {
          .nmd-report-modal-overlay {
            align-items: flex-end !important;
            padding: 0 !important;
          }
          .nmd-report-modal-card {
            max-width: 100% !important;
            max-height: 92vh !important;
            border-radius: 20px 20px 0 0 !important;
          }
          .nmd-report-modal-header {
            padding: 16px 16px 14px 16px !important;
          }
          .nmd-report-modal-body {
            padding: 14px 16px 20px 16px !important;
          }
          .nmd-report-actions-row {
            flex-direction: column !important;
          }
        }
      `}</style>
      <div
        className="nmd-report-modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: viewMode === 'preview' ? '760px' : '520px',
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
          className="nmd-report-modal-header"
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

        {/* Preview View vs Config Body */}
        {viewMode === 'preview' && previewData ? (
          <div className="nmd-report-modal-body" style={{ padding: '14px 18px 18px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setViewMode('config');
                  setErrorMsg('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '5px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                {previewData.periodLabel}
              </span>
            </div>

            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.78rem' }}>
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
              <iframe
                title={previewData.titleDoc || 'Delivery Statement Report'}
                srcDoc={previewData.html}
                style={{
                  width: '100%',
                  height: '52vh',
                  minHeight: '340px',
                  border: 'none',
                  display: 'block',
                  background: '#ffffff',
                }}
              />
            </div>

            <div className="nmd-report-actions-row" style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handlePrintPdfRealtime}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1px solid #0d5c3a',
                  background: '#f0fdf4',
                  color: '#0d5c3a',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                }}
              >
                <Printer size={16} />
                <span>Print / Save as PDF</span>
              </button>

              <button
                type="button"
                onClick={handleServerDownload}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  boxShadow: '0 4px 12px rgba(13, 92, 58, 0.25)',
                }}
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span>{isGenerating ? 'Downloading...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        ) : (
        <div className="nmd-report-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <button
              type="button"
              onClick={handlePreviewReport}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'none',
                background: '#0d5c3a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.9rem',
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
                  <span>Loading Report...</span>
                </>
              ) : (
                <>
                  <Eye size={16} />
                  <span>
                    {reportScope === 'all'
                      ? 'View All Customers Report'
                      : (selectedCustomer ? `View Report (${selectedCustomer.name})` : 'View Statement Report')}
                  </span>
                </>
              )}
            </button>

            <div className="nmd-report-actions-row" style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleServerDownload}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #0d5c3a',
                  background: '#f0fdf4',
                  color: '#0d5c3a',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Download size={15} />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdfRealtime}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Printer size={15} />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
