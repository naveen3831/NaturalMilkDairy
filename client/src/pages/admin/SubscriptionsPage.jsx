import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CreditCard, MapPin, Phone, RefreshCw, Search, Users, PauseCircle, PlayCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const titleCase = (value = '') => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusStyle = (status) => {
  const styles = {
    active: { color: '#047857', background: '#ecfdf5' },
    paused: { color: '#b45309', background: '#fffbeb' },
    stopped: { color: '#b45309', background: '#fffbeb' },
    pending: { color: '#b45309', background: '#fffbeb' },
    failed: { color: '#b91c1c', background: '#fef2f2' },
    expired: { color: '#475569', background: '#f1f5f9' },
    cancelled: { color: '#b91c1c', background: '#fef2f2' },
  };
  return styles[status] || styles.expired;
};

function Detail({ label, value }) {
  return (
    <div>
      <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: 3 }}>{label}</div>
      <div style={{ color: '#0f172a', fontSize: '0.84rem', fontWeight: 600, overflowWrap: 'anywhere' }}>{value || '—'}</div>
    </div>
  );
}

export default function SubscriptionsPage({ onSignIn }) {
  const { token, logout } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  const handleToggleSubscription = async (subscription, action) => {
    const subId = subscription._id || subscription.id;
    setTogglingId(subId);
    setActionMsg('');
    try {
      const response = await fetch(`/api/subscriptions/${subId}/toggle-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action,
          reason: `Admin ${action === 'stop' ? 'stopped' : 'started'} subscription`,
          actor: 'Admin',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update subscription status.');
      }
      setActionMsg(`Subscription for ${subscription.customerName || subscription.customer?.name || 'customer'} successfully ${action === 'stop' ? 'stopped / paused' : 'started / resumed'}!`);
      setTimeout(() => setActionMsg(''), 5000);
      loadSubscriptions();
    } catch (err) {
      alert(err.message || 'Error updating subscription status');
    } finally {
      setTogglingId(null);
    }
  };

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/subscriptions', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setNeedsSignIn(response.status === 401 || response.status === 403);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Subscription service returned an unexpected response. Check that the API server is running.');
      }
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load subscriptions.');
      }
      setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    } catch (err) {
      setError(err.message || 'Unable to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const filteredSubscriptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return subscriptions.filter((subscription) => {
      if (statusFilter !== 'all' && subscription.status !== statusFilter) return false;
      if (!query) return true;
      const customer = subscription.customer || {};
      return [
        subscription.customerName,
        subscription.customerId,
        customer.name,
        customer.customerId,
        customer.mobile,
        customer.email,
        subscription.providerOrderId,
        subscription.providerPaymentId,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [subscriptions, search, statusFilter]);

  const activeCount = subscriptions.filter((item) => item.status === 'active').length;
  const totalPaid = subscriptions.reduce((total, item) => total + (item.payment?.amount || 0), 0);
  const options = ['all', 'active', 'paused', 'pending', 'failed', 'expired', 'cancelled'];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.35rem', fontWeight: 800 }}>Subscriptions</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Customer plans, delivery schedules, and payment records
          </p>
        </div>
        <button
          type="button"
          onClick={loadSubscriptions}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', border: '1px solid #dbe3ed', borderRadius: 9, background: '#fff', color: '#334155', fontWeight: 650, cursor: loading ? 'wait' : 'pointer' }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      {actionMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderRadius: 10, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.85rem', fontWeight: 650 }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{actionMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total subscriptions', value: subscriptions.length, icon: Users, color: '#2563eb' },
          { label: 'Active subscriptions', value: activeCount, icon: CalendarDays, color: '#059669' },
          { label: 'Payments recorded', value: formatAmount(totalPaid), icon: CreditCard, color: '#7c3aed' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 11, background: `${stat.color}12`, color: stat.color }}>
                <Icon size={19} />
              </span>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{stat.value}</div>
                <div style={{ marginTop: 2, fontSize: '0.75rem', color: '#64748b' }}>{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 11, top: 11 }} />
          <input
            aria-label="Search subscriptions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer, phone, order or payment ID"
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 35px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#0f172a', fontSize: '0.84rem' }}
          />
        </div>
        <select
          aria-label="Filter by subscription status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{ minWidth: 155, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#334155' }}
        >
          {options.map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : titleCase(status)}</option>)}
        </select>
      </div>

      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: 14, borderRadius: 10, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <span>{needsSignIn ? 'Your admin session needs to be refreshed to view subscription and payment details.' : error}</span>
          <span style={{ display: 'inline-flex', gap: 12 }}>
            {needsSignIn && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  if (onSignIn) onSignIn();
                }}
                style={{ border: 0, background: 'none', color: '#991b1b', fontWeight: 750, cursor: 'pointer' }}
              >
                Sign in again
              </button>
            )}
            <button type="button" onClick={loadSubscriptions} style={{ border: 0, background: 'none', color: '#991b1b', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
          </span>
        </div>
      )}
      {loading && <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Loading subscriptions…</div>}
      {!loading && !error && filteredSubscriptions.length === 0 && (
        <div style={{ padding: 36, textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#64748b' }}>
          No subscriptions match your search.
        </div>
      )}

      {!loading && filteredSubscriptions.map((subscription) => {
        const customer = subscription.customer || {};
        const payment = subscription.payment;
        const plan = subscription.plan || {};
        const planItems = [];
        if (plan.milkQty) planItems.push(`${plan.milkQty} L milk`);
        if (plan.curdQty) planItems.push(`${plan.curdQty} g curd`);
        const schedule = plan.frequency === 'selected'
          ? `${titleCase(plan.frequency)}: ${(plan.deliveryDays || []).join(', ')}`
          : titleCase(plan.frequency || '—');
        const status = statusStyle(subscription.status);

        return (
          <article key={subscription._id} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 18, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 13, boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{customer.name || subscription.customerName || 'Customer'}</strong>
                  <span style={{ padding: '4px 9px', borderRadius: 20, background: status.background, color: status.color, fontSize: '0.72rem', fontWeight: 750 }}>{titleCase(subscription.status)}</span>
                  <span style={{ color: '#64748b', fontSize: '0.76rem' }}>{customer.customerId || subscription.customerId}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 7, color: '#64748b', fontSize: '0.8rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={13} />{customer.mobile || subscription.whatsapp || 'No phone'}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={13} />{subscription.area || customer.area || 'No area'}{subscription.deliveryAddress ? ` · ${subscription.deliveryAddress}` : ''}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>{formatAmount(payment?.amount ?? (subscription.amount / 100))}</div>
                <div style={{ marginTop: 3, color: payment ? '#047857' : '#b45309', fontSize: '0.75rem', fontWeight: 650 }}>{payment ? 'Payment received' : 'No payment recorded'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '14px 18px', paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <Detail label="Plan" value={planItems.length ? planItems.join(' + ') : '—'} />
              <Detail label="Delivery schedule" value={schedule} />
              <Detail label="Subscription period" value={`${formatDate(subscription.startDate)} – ${formatDate(subscription.endDate)}`} />
              <Detail label="Email" value={customer.email} />
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #eef2f7' }}>
              <div style={{ marginBottom: 10, color: '#334155', fontSize: '0.8rem', fontWeight: 750 }}>Payment details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '12px 18px' }}>
                <Detail label="Payment status" value={payment ? 'Paid / captured' : titleCase(subscription.status === 'pending' ? 'awaiting payment' : subscription.status)} />
                <Detail label="Method" value={titleCase(payment?.method || (subscription.providerPaymentId ? 'razorpay' : '—'))} />
                <Detail label="Paid on" value={formatDate(payment?.date)} />
                <Detail label="Payment ID" value={payment?.gatewayPaymentId || subscription.providerPaymentId || payment?.referenceNumber} />
                <Detail label="Order ID" value={payment?.gatewayOrderId || subscription.providerOrderId} />
                <Detail label="Collected by" value={payment?.collectedBy} />
              </div>
            </div>

            {/* Admin Action Row to Stop or Start Subscription */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.80rem', color: '#64748b' }}>
                Subscription status: <strong style={{ color: subscription.status === 'active' ? '#047857' : '#b45309' }}>{titleCase(subscription.status)}</strong>
                {subscription.status === 'active' ? ' · Daily deliveries active' : ' · Deliveries paused / stopped'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {subscription.status === 'active' ? (
                  <button
                    type="button"
                    disabled={togglingId === (subscription._id || subscription.id)}
                    onClick={() => handleToggleSubscription(subscription, 'stop')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1.5px solid #fde68a',
                      background: '#fffbeb',
                      color: '#b45309',
                      fontWeight: 750,
                      fontSize: '0.82rem',
                      cursor: togglingId === (subscription._id || subscription.id) ? 'wait' : 'pointer',
                      boxShadow: '0 1px 2px rgba(180, 83, 9, 0.08)',
                    }}
                  >
                    <PauseCircle size={15} />
                    <span>{togglingId === (subscription._id || subscription.id) ? 'Stopping...' : 'Stop Subscription'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={togglingId === (subscription._id || subscription.id)}
                    onClick={() => handleToggleSubscription(subscription, 'start')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1.5px solid #86efac',
                      background: '#f0fdf4',
                      color: '#15803d',
                      fontWeight: 750,
                      fontSize: '0.82rem',
                      cursor: togglingId === (subscription._id || subscription.id) ? 'wait' : 'pointer',
                      boxShadow: '0 1px 2px rgba(21, 128, 61, 0.12)',
                    }}
                  >
                    <PlayCircle size={15} />
                    <span>{togglingId === (subscription._id || subscription.id) ? 'Starting...' : 'Start Subscription'}</span>
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
      {!loading && !error && filteredSubscriptions.length > 0 && (
        <div style={{ color: '#64748b', fontSize: '0.76rem', textAlign: 'right' }}>
          Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
        </div>
      )}
    </section>
  );
}
