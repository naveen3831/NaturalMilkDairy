import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  PauseCircle,
  Milk,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { getSubscriptionHistory, startSubscriptionPayment } from '../services/subscriptionPayment';

export function getStatusStyle(status) {
  const norm = String(status || '').toLowerCase();
  if (norm === 'active') {
    return {
      color: '#0d5c3a',
      background: '#e2f1ea',
      border: '1px solid #b7dfca',
      label: 'Active',
      icon: CheckCircle2,
    };
  }
  if (norm === 'failed') {
    return {
      color: '#dc2626',
      background: '#fee2e2',
      border: '1px solid #fca5a5',
      label: 'Failed',
      icon: ShieldAlert,
    };
  }
  if (norm === 'paused') {
    return {
      color: '#d97706',
      background: '#fef3c7',
      border: '1px solid #fde68a',
      label: 'Paused',
      icon: PauseCircle,
    };
  }
  return {
    color: '#64748b',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    label: norm === 'stopped' ? 'Stopped' : 'Expired',
    icon: Clock,
  };
}

export function SubscriptionStatusBadge({ status }) {
  const style = getStatusStyle(status);
  const Icon = style.icon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 9px',
        borderRadius: '20px',
        fontSize: '0.70rem',
        fontWeight: 800,
        color: style.color,
        background: style.background,
        border: style.border,
        textTransform: 'capitalize',
        letterSpacing: '0.02em',
      }}
    >
      <Icon size={12} strokeWidth={2.5} />
      <span>{style.label}</span>
    </span>
  );
}

export function SubscriptionHistoryCard({
  subscription,
  onRetryPayment,
  isRetrying,
}) {
  const normStatus = String(subscription.status || '').toLowerCase();
  const isFailed = normStatus === 'failed';
  const plan = subscription.plan || {};
  const milkQty = plan.milkQty || 1;
  const milkUnit = plan.milkUnit || 'L';
  const curdQty = plan.curdQty || 0;
  const curdUnit = plan.curdUnit || 'g';
  const frequency = plan.frequency || 'daily';

  const freqLabel =
    frequency === 'alternate'
      ? 'Alternate Days'
      : frequency === 'weekdays'
      ? 'Weekdays Only'
      : 'Daily Morning';

  const planName =
    curdQty > 0
      ? `A2 Cow Milk (${milkQty}${milkUnit}) + Curd (${curdQty}${curdUnit})`
      : `Pure A2 Desi Cow Milk (${milkQty} ${milkUnit})`;

  const amountDisplay = subscription.amount
    ? `₹${Math.round(subscription.amount > 1000 ? subscription.amount / 100 : subscription.amount).toLocaleString('en-IN')}`
    : '₹1,800';

  const startDateStr = subscription.startDate
    ? new Date(subscription.startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const endDateStr = subscription.endDate
    ? new Date(subscription.endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: isFailed ? '1.5px solid #fecaca' : '1px solid #e2ece5',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: isFailed
          ? '0 3px 12px rgba(220, 38, 38, 0.06)'
          : '0 2px 8px rgba(12, 35, 64, 0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header: Title and Status Badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <h4
            style={{
              margin: '0 0 4px 0',
              fontSize: '0.96rem',
              fontWeight: 800,
              color: '#0c2340',
            }}
          >
            {planName}
          </h4>
          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
            {freqLabel} • Order: {subscription.providerOrderId || subscription.id || subscription._id || '—'}
          </span>
        </div>
        <SubscriptionStatusBadge status={subscription.status} />
      </div>

      {/* Details Row: Milk Qty, Dates, Total Amount */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '8px',
          background: '#f8faf9',
          padding: '10px 12px',
          borderRadius: '12px',
          border: '1px solid #edf2ef',
        }}
      >
        <div>
          <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Quantity
          </span>
          <strong style={{ fontSize: '0.84rem', color: '#0c2340', fontWeight: 800 }}>
            {milkQty} {milkUnit} / delivery
          </strong>
        </div>

        <div>
          <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Amount Paid / Due
          </span>
          <strong style={{ fontSize: '0.84rem', color: isFailed ? '#dc2626' : '#0d5c3a', fontWeight: 900 }}>
            {amountDisplay}
          </strong>
        </div>

        <div>
          <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Duration
          </span>
          <strong style={{ fontSize: '0.78rem', color: '#0c2340', fontWeight: 700 }}>
            {startDateStr ? `${startDateStr} - ${endDateStr || '30 days'}` : '30-Day Plan'}
          </strong>
        </div>
      </div>

      {/* Failure Reason Banner if Failed */}
      {isFailed && (
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid #ffe4e6',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldAlert size={16} color="#e11d48" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '0.72rem', color: '#9f1239', fontWeight: 700 }}>
              Payment Unsuccessful
            </span>
            <span style={{ display: 'block', fontSize: '0.70rem', color: '#be123c', lineHeight: 1.25 }}>
              {subscription.failedReason || 'Payment was cancelled or failed by the gateway.'}
            </span>
          </div>
          {typeof onRetryPayment === 'function' && (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => onRetryPayment(subscription)}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
              }}
            >
              <RotateCcw size={12} className={isRetrying ? 'spin' : ''} />
              <span>{isRetrying ? 'Retrying...' : 'Retry Payment'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SubscriptionHistoryModal({
  isOpen,
  onClose,
  user,
  onPaymentSuccess,
}) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [retryError, setRetryError] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getSubscriptionHistory();
      setSubscriptions(list);
    } catch (e) {
      console.warn('Failed loading history', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handleRetry = async (sub) => {
    setRetryingId(sub.id || sub._id);
    setRetryError('');
    try {
      const plan = sub.plan || {};
      const payload = {
        address: sub.deliveryAddress || user?.address || 'Doorstep drop',
        area: sub.area || user?.area || 'Madhupur',
        landmark: sub.landmark || user?.landmark || '',
        whatsapp: sub.whatsapp || user?.mobile || '',
        mobile: user?.mobile || sub.whatsapp || '',
        name: sub.customerName || user?.name || 'Customer',
        milkQty: plan.milkQty || 1,
        curdQty: plan.curdQty || 0,
        frequency: plan.frequency || 'daily',
        deliveryDays: plan.deliveryDays || [],
      };

      await startSubscriptionPayment({
        planPayload: payload,
        user,
        onSuccess: async (result) => {
          setRetryingId(null);
          await loadData();
          if (typeof onPaymentSuccess === 'function') {
            onPaymentSuccess(result);
          }
        },
        onFailure: async (failInfo) => {
          setRetryingId(null);
          setRetryError(failInfo.reason || 'Payment retry failed.');
          await loadData();
        },
      });
    } catch (err) {
      setRetryingId(null);
      setRetryError(err.message || 'Could not start retry payment.');
      await loadData();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(12, 35, 64, 0.65)',
        backdropFilter: 'blur(6px)',
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
          borderRadius: '24px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #e2ece5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafcfb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#e2f1ea',
                color: '#0d5c3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0c2340' }}>
                Subscription History
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                View all past, current, and failed subscription orders
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #e2ebe5',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Retry error alert if any */}
        {retryError && (
          <div
            style={{
              margin: '12px 20px 0',
              padding: '10px 14px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{retryError}</span>
          </div>
        )}

        {/* Content list */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
              <RotateCcw size={24} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Loading subscription records...</span>
            </div>
          ) : subscriptions.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: '#f8faf9',
                borderRadius: '16px',
                border: '1px dashed #d1ded6',
              }}
            >
              <Milk size={36} color="#0d5c3a" style={{ opacity: 0.5, margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0c2340' }}>
                No Subscriptions Found
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                You have not started any subscriptions yet. Pick a fresh morning milk plan to begin!
              </p>
            </div>
          ) : (
            subscriptions.map((sub) => (
              <SubscriptionHistoryCard
                key={sub.id || sub._id || sub.providerOrderId}
                subscription={sub}
                onRetryPayment={handleRetry}
                isRetrying={retryingId === (sub.id || sub._id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2ece5',
            background: '#fafcfb',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '12px',
              border: 'none',
              background: '#0d5c3a',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
