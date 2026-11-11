import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Truck,
  MapPin,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Clock,
  Milk,
  ShieldCheck,
  AlertCircle,
  Camera,
  Save,
  PhoneCall,
  MessageSquare,
  Sparkles,
  ChevronRight,
  User,
  CreditCard,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDairy } from '../../context/DairyContext';
import { resolveProofUrl } from '../../services/api';
import LeafletSingleLocationMap from '../../components/LeafletSingleLocationMap';
import { formatISTDateTime } from '../../utils/istDateTime';

// Helper for dates
const formatDateLabel = (dateStr) => {
  if (!dateStr) return 'Scheduled Drop';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

// ══════════════════════════════════════════════════════════════════
// 1. FULL PAGE: MY ACTIVE SUBSCRIPTION
// ══════════════════════════════════════════════════════════════════
export function CustomerSubscriptionPage({ setActiveTab }) {
  const { user, getAuthHeaders } = useAuth();
  const [customerData, setCustomerData] = useState(user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLedger = async () => {
      try {
        const token = sessionStorage.getItem('nmd_jwt_token') || localStorage.getItem('nmd_jwt_token');
        if (!token) return;
        const custId = user?.customerId || user?.id || 'me';
        const res = await fetch(`/api/customers/${encodeURIComponent(custId)}/ledger`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (isMounted && data.success && data.customer) {
          setCustomerData(data.customer);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchLedger();
    return () => { isMounted = false; };
  }, [user]);

  const current = customerData || user || {};
  const plan = current.subscription || {};
  const deliveryPlan = current.deliveryPlan || {};
  const isPaused = current.status === 'paused';
  const hasActiveSub = Boolean(
    (current.subscription?.status === 'active' ||
      (current.subscription?.endDate && new Date(current.subscription.endDate) >= new Date())) &&
    current.status !== 'inactive'
  );

  const planName = plan.planName || deliveryPlan.milkType || 'Daily Farm Pure Cow Milk Plan';
  const milkQty = Number(deliveryPlan.milkQty) > 0 ? Number(deliveryPlan.milkQty) : (Number(plan.plan?.milkQty) > 0 ? Number(plan.plan.milkQty) : (Number(plan.milkQty) > 0 ? Number(plan.milkQty) : 1));
  const curdQty = deliveryPlan.curdQty ?? (plan.curdQty || 0);
  const pricePerDay = (milkQty * 60) + ((curdQty / 500) * 30);
  const monthlyCost = pricePerDay * 30;

  return (
    <div style={{ width: '100%', minHeight: '85vh', backgroundColor: '#f8faf9', padding: '32px 24px 60px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0d5c3a',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </button>

          <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
            <span>Home</span> / <strong style={{ color: '#0d5c3a' }}>My Subscription</strong>
          </div>
        </div>

        {!hasActiveSub ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '60px 32px',
              textAlign: 'center',
              border: '1.5px solid #e2ebe5',
              boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
              maxWidth: '680px',
              margin: '20px auto 0',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#0d5c3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CalendarDays size={36} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>
              No Active Subscription Yet
            </h2>
            <p style={{ fontSize: '0.96rem', color: '#64748b', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: '480px' }}>
              You do not have an active daily milk plan. Subscribe now to get 100% pure, unadulterated farm-fresh milk delivered right to your doorstep every morning before 7:30 AM.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveTab('subscription')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 28px',
                  borderRadius: '12px',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.94rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
                }}
              >
                <span>Choose a Plan & Subscribe</span>
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  border: '1.5px solid #cbd5e1',
                  cursor: 'pointer',
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>

        {/* Hero Section Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
            borderRadius: '24px',
            padding: '36px 40px',
            color: '#ffffff',
            boxShadow: '0 12px 30px rgba(13, 92, 58, 0.18)',
            marginBottom: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: isPaused ? '#fef3c7' : '#dcfce7',
                    color: isPaused ? '#92400e' : '#15803d',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {isPaused ? 'Deliveries Paused' : '● Active Milk Subscription'}
                </span>
                <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                  ID: <strong>{current.customerId || current.id || ''}</strong>
                </span>
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                {planName}
              </h1>
              <p style={{ margin: 0, fontSize: '0.96rem', opacity: 0.92, maxWidth: '600px' }}>
                Pure, unadulterated farm milk delivered fresh every morning straight to your doorstep before 7:30 AM.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '18px',
                padding: '20px 28px',
                textAlign: 'right',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.84rem', opacity: 0.9 }}>Daily Plan Rate</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, margin: '2px 0' }}>₹{pricePerDay}</div>
              <div style={{ fontSize: '0.80rem', opacity: 0.85 }}>≈ ₹{monthlyCost} / month</div>
            </div>
          </div>
        </div>

        {/* 3-Column Plan Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginBottom: '32px',
          }}
        >
          {/* Card 1: Delivery Specs */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              border: '1.5px solid #e2ebe5',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ecfdf5', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Milk size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Daily Delivery Schedule
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.90rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Daily Milk Quantity</span>
                <strong style={{ color: '#0f172a' }}>{milkQty} Litre / Day</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Fresh Curd Quantity</span>
                <strong style={{ color: '#0f172a' }}>{curdQty > 0 ? `${curdQty}g` : 'None'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Delivery Slot</span>
                <strong style={{ color: '#0d5c3a' }}>Morning 5:30 AM – 7:30 AM</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Delivery Frequency</span>
                <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{deliveryPlan.frequency || 'Daily'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Next Scheduled Drop</span>
                <strong style={{ color: isPaused ? '#b45309' : '#059669' }}>
                  {isPaused ? 'Paused' : 'Tomorrow Morning'}
                </strong>
              </div>
            </div>
          </div>

          {/* Card 2: Doorstep Address & Partner */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              border: '1.5px solid #e2ebe5',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Doorstep Drop Location
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.90rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Customer Name</span>
                <strong style={{ color: '#0f172a' }}>{current.name || 'Naveen'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Contact Phone</span>
                <strong style={{ color: '#0f172a' }}>{current.mobile || '7702233931'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Delivery Territory</span>
                <strong style={{ color: '#0f172a' }}>{current.area || 'Madhapur'}</strong>
              </div>
              <div style={{ paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Address</span>
                <strong style={{ color: '#0f172a', lineHeight: 1.4 }}>
                  {current.address || 'Address registered with dairy service'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Delivery Partner</span>
                <strong style={{ color: '#0d5c3a' }}>Morning Route Partner</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Account & Settlement */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              border: '1.5px solid #e2ebe5',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Billing & Settlement
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.90rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Payment Mode</span>
                <strong style={{ color: '#059669' }}>Prepaid / Monthly Advance</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Ledger Balance</span>
                <strong style={{ color: '#0d5c3a', fontSize: '1.05rem' }}>₹{current.currentBalance || 0} (Settled)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Subscription Valid Until</span>
                <strong style={{ color: '#0f172a' }}>
                  {plan.endDate ? formatDateLabel(plan.endDate) : 'Continuous Active'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Auto-Renewal</span>
                <strong style={{ color: '#059669' }}>Active & Protected</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Billing Cycle</span>
                <strong style={{ color: '#0f172a' }}>Monthly Statement</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Bar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px 32px',
            border: '1.5px solid #d1fae5',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 4px 16px rgba(13, 92, 58, 0.05)',
          }}
        >
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Manage Your Daily Deliveries
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
              Track past delivery proof photos, pause drops when traveling, or update your delivery address.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('my-deliveries')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#e0f2fe',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              <Truck size={16} />
              <span>Doorstep Deliveries</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-address')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              <MapPin size={16} />
              <span>Change Address</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pause-delivery')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: isPaused ? '#dcfce7' : '#fee2e2',
                color: isPaused ? '#15803d' : '#dc2626',
                border: isPaused ? '1px solid #bbf7d0' : '1px solid #fecaca',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              <PauseCircle size={16} />
              <span>{isPaused ? 'Resume Drops' : 'Pause Drops'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('subscription')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '10px',
                background: '#0d5c3a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(13, 92, 58, 0.25)',
              }}
            >
              <span>Explore All Plans</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 2. FULL PAGE: DOORSTEP DELIVERIES & PROOF PHOTOS
// ══════════════════════════════════════════════════════════════════
export function CustomerDeliveriesPage({ setActiveTab }) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'delivered' | 'pending'
  const [selectedProof, setSelectedProof] = useState(null);
  const [proofTab, setProofTab] = useState('photo'); // 'photo' | 'map'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDeliveries = async () => {
      try {
        const token = sessionStorage.getItem('nmd_jwt_token') || localStorage.getItem('nmd_jwt_token');
        if (!token) return;
        const custId = user?.customerId || user?.id || 'me';
        const res = await fetch(`/api/customers/${encodeURIComponent(custId)}/ledger`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.ledgerEntries)) {
          const dels = data.ledgerEntries
            .filter((e) => e.type === 'delivery')
            .reverse();
          setDeliveries(dels);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchDeliveries();
    return () => { isMounted = false; };
  }, [user]);

  const deliveredCount = deliveries.filter((d) => d.status === 'delivered').length;
  const pendingCount = deliveries.filter((d) => d.status === 'pending').length;

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === 'delivered') return d.status === 'delivered';
    if (filter === 'pending') return d.status === 'pending';
    return true;
  });

  return (
    <div style={{ width: '100%', minHeight: '85vh', backgroundColor: '#f8faf9', padding: '32px 24px 60px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0d5c3a',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </button>

          <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
            <span>Home</span> / <strong style={{ color: '#0d5c3a' }}>Doorstep Deliveries</strong>
          </div>
        </div>

        {/* Page Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>
              Doorstep Deliveries & Live Drop Proofs
            </h1>
            <p style={{ margin: 0, fontSize: '0.94rem', color: '#64748b' }}>
              Real-time records of every morning milk drop, delivered timings, quantities, and verified delivery photos.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '4px', borderRadius: '12px', border: '1px solid #e2ebe5' }}>
            {[
              { id: 'all', label: `All Drops (${deliveries.length})` },
              { id: 'delivered', label: `Delivered (${deliveredCount})` },
              { id: 'pending', label: `Pending (${pendingCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: filter === tab.id ? '#0d5c3a' : 'transparent',
                  color: filter === tab.id ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Deliveries Grid */}
        {filteredDeliveries.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: '#ffffff',
              borderRadius: '20px',
              border: '1.5px solid #e2ebe5',
            }}
          >
            <Truck size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              {deliveries.length === 0 ? 'No Deliveries Scheduled Yet' : 'No deliveries match this filter'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
              {deliveries.length === 0
                ? 'Your daily doorstep deliveries and verified drop photos will be displayed here once your subscription starts.'
                : 'Deliveries are dispatched daily between 5:30 AM and 7:30 AM.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {filteredDeliveries.map((del, idx) => {
              const isDelivered = del.status === 'delivered';
              const isPending = del.status === 'pending';
              const proofUrl = del.proofImage || del.rawItem?.proofImage || '';

              return (
                <div
                  key={del.id || idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    border: isDelivered ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '12px',
                          background: isDelivered ? '#dcfce7' : '#fef3c7',
                          color: isDelivered ? '#15803d' : '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isDelivered ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.96rem', color: '#0f172a' }}>
                          {formatDateLabel(del.date || del.deliveryDate)}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {del.deliveryBoyName ? `Driver: ${del.deliveryBoyName}` : 'Morning Route Drop'}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: isDelivered ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2',
                        color: isDelivered ? '#15803d' : isPending ? '#b45309' : '#b91c1c',
                      }}
                    >
                      {del.status || 'Scheduled'}
                    </span>
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.86rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 700 }}>
                      <Milk size={18} color="#0d5c3a" />
                      <span>{del.milk || `${del.actualMilk || del.plannedMilk || 1} L Pure Milk`}</span>
                      {(del.curd && del.curd !== '0') || del.actualCurd > 0 ? (
                        <span style={{ color: '#059669' }}>+ {del.curd || `${del.actualCurd || del.plannedCurd}g Curd`}</span>
                      ) : null}
                    </div>
                    <div style={{ fontWeight: 800, color: '#0d5c3a' }}>
                      ₹{del.amount || 60}
                    </div>
                  </div>

                  {proofUrl ? (
                    <div style={{ marginTop: '2px' }}>
                      <div
                        onClick={() => setSelectedProof(proofUrl)}
                        style={{
                          position: 'relative',
                          height: '140px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        <img
                          src={resolveProofUrl(proofUrl)}
                          alt="Delivery Proof"
                          onError={(e) => {
                            const cloud = `https://naturalmilkdairy.speshway.site${proofUrl.startsWith('/') ? proofUrl : `/${proofUrl}`}`;
                            if (e.currentTarget.src !== cloud) e.currentTarget.src = cloud;
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            color: '#ffffff',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={14} color="#4ade80" />
                            Verified Live Drop
                          </span>
                          <span>Click to Enlarge 🔍</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#fafafa',
                        border: '1px dashed #cbd5e1',
                        fontSize: '0.78rem',
                        color: '#94a3b8',
                        textAlign: 'center',
                      }}
                    >
                      {isDelivered ? 'Doorstep Handover Drop' : 'Awaiting Morning Delivery Partner'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proof Lightbox */}
      {selectedProof && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            zIndex: 10100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setSelectedProof(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '680px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.94rem' }}>
                <ShieldCheck size={20} color="#4ade80" />
                <span>Verified Doorstep Delivery Photo</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* View Switcher Tabs */}
            <div style={{ padding: '12px 20px 0 20px', display: 'flex', gap: '10px', background: '#ffffff' }}>
              <button
                type="button"
                onClick={() => setProofTab('photo')}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: proofTab === 'photo' ? '1.5px solid #059669' : '1px solid #e2e8f0',
                  background: proofTab === 'photo' ? '#059669' : '#f8fafc',
                  color: proofTab === 'photo' ? '#ffffff' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Camera size={14} />
                <span>Doorstep Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setProofTab('map')}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: proofTab === 'map' ? '1.5px solid #059669' : '1px solid #e2e8f0',
                  background: proofTab === 'map' ? '#059669' : '#f8fafc',
                  color: proofTab === 'map' ? '#ffffff' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <MapPin size={14} />
                <span>Leaflet Map Location</span>
              </button>
            </div>

            <div style={{ padding: '16px', background: '#f8fafc', textAlign: 'center' }}>
              {proofTab === 'photo' ? (
                <div
                  onClick={() => setProofTab('map')}
                  title="Click image to view doorstep location on Leaflet Map"
                  style={{ position: 'relative', cursor: 'pointer', display: 'inline-block', maxWidth: '100%' }}
                >
                  <img
                    src={resolveProofUrl(selectedProof)}
                    alt="Delivery Proof"
                    onError={(e) => {
                      const cloud = `https://naturalmilkdairy.speshway.site${String(selectedProof).startsWith('/') ? selectedProof : `/${selectedProof}`}`;
                      if (e.currentTarget.src !== cloud) e.currentTarget.src = cloud;
                    }}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      borderRadius: '12px',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      borderRadius: '20px',
                      padding: '5px 14px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid rgba(52, 211, 153, 0.5)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <MapPin size={12} color="#34d399" />
                    <span>Tap image to view on Leaflet Map</span>
                  </div>
                </div>
              ) : (
                <LeafletSingleLocationMap
                  lat={Number(user?.latitude ?? 17.4483)}
                  lng={Number(user?.longitude ?? 78.3915)}
                  title={user?.name || 'Registered Home'}
                  address={user?.address || 'Doorstep Delivery Location'}
                  height="360px"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 3. FULL PAGE: DOORSTEP DELIVERY ADDRESS
// ══════════════════════════════════════════════════════════════════
export function CustomerAddressPage({ setActiveTab }) {
  const { user, authFetch, setUser } = useAuth();
  const [address, setAddress] = useState(user?.address || '');
  const [area, setArea] = useState(user?.area || 'Madhapur');
  const [landmark, setLandmark] = useState(user?.landmark || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setErrorMsg('Please enter your full delivery address.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await authFetch('/api/customers/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          mobile: user.mobile,
          address: address.trim(),
          area: area.trim(),
          landmark: landmark.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        setUser((prev) => ({ ...prev, address: address.trim(), area: area.trim(), landmark: landmark.trim() }));
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setErrorMsg(data.message || 'Failed to update address. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Network error while updating delivery address.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '85vh', backgroundColor: '#f8faf9', padding: '32px 24px 60px' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0d5c3a',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </button>

          <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
            <span>Home</span> / <strong style={{ color: '#0d5c3a' }}>Delivery Address</strong>
          </div>
        </div>

        {/* Form Container */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1.5px solid #e2ebe5',
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '28px 32px',
              background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={24} color="#ffffff" />
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>
                  Manage Doorstep Delivery Address
                </h2>
                <p style={{ margin: 0, fontSize: '0.86rem', opacity: 0.9 }}>
                  Update your flat, floor, building name, landmark, and gate drop instructions.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {errorMsg && (
              <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {saveSuccess && (
              <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.90rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} />
                <span>Doorstep delivery address updated successfully in dairy records!</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                Doorstep Address (Flat / House No, Floor, Building Name, Street) *
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                required
                placeholder="e.g. Flat 302, Green Valley Apartments, Road No. 12"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.94rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  Delivery Area / Colony *
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  required
                  placeholder="e.g. Madhapur"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.94rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  Landmark / Delivery Instructions
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Metro Station / Ring bell at 6 AM"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.94rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.84rem', color: '#166534', lineHeight: 1.5 }}>
              🚚 <strong>Morning Delivery Dispatch Notice:</strong> Updates to your doorstep address automatically reflect on your assigned delivery driver's morning manifest.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.90rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                style={{
                  padding: '12px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: isSaving ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(13, 92, 58, 0.25)',
                }}
              >
                <Save size={18} />
                <span>{isSaving ? 'Updating...' : 'Save & Update Address'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 4. FULL PAGE: PAUSE / RESUME DELIVERIES
// ══════════════════════════════════════════════════════════════════
export function CustomerPausePage({ setActiveTab }) {
  const { user, setUser } = useAuth();
  const { pauseDelivery, resumeDelivery } = useDairy();
  const isPaused = user?.status === 'paused';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [pauseFrom, setPauseFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [pauseUntil, setPauseUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [reason, setReason] = useState('Out of Town / Vacation');

  const targetId = user?.id || user?._id || user?.customerId;

  const handleResume = async () => {
    setIsSubmitting(true);
    try {
      await resumeDelivery(targetId, { actor: user?.name || 'Customer' });
      setSuccessMsg('Deliveries resumed successfully! Your morning drops will continue as scheduled.');
      setUser((prev) => ({ ...prev, status: 'active' }));
      setTimeout(() => {
        setSuccessMsg('');
      }, 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await pauseDelivery(targetId, {
        pauseFrom,
        pauseUntil,
        reason,
        actor: user?.name || 'Customer',
      });
      setSuccessMsg(`Deliveries successfully paused from ${pauseFrom} to ${pauseUntil}.`);
      setUser((prev) => ({ ...prev, status: 'paused' }));
      setTimeout(() => {
        setSuccessMsg('');
      }, 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '85vh', backgroundColor: '#f8faf9', padding: '32px 24px 60px' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0d5c3a',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </button>

          <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
            <span>Home</span> / <strong style={{ color: '#0d5c3a' }}>Pause Deliveries</strong>
          </div>
        </div>

        {/* Card Container */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1.5px solid #e2ebe5',
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '28px 32px',
              background: isPaused
                ? 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)'
                : 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isPaused ? <PlayCircle size={24} color="#ffffff" /> : <PauseCircle size={24} color="#ffffff" />}
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>
                  {isPaused ? 'Resume Morning Deliveries' : 'Vacation & Delivery Pause'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.86rem', opacity: 0.9 }}>
                  {isPaused ? 'Restart daily morning milk drops to your doorstep.' : 'Hold your daily milk deliveries while traveling without losing your subscription.'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: '32px' }}>
            {successMsg && (
              <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <CheckCircle2 size={24} color="#059669" />
                <span>{successMsg}</span>
              </div>
            )}

            {isPaused ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '20px', borderRadius: '16px', background: '#fef3c7', border: '1.5px solid #fde68a', color: '#92400e', lineHeight: 1.6 }}>
                  <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '4px' }}>
                    Your milk deliveries are currently PAUSED
                  </strong>
                  No drops will occur until you resume. Click the button below to resume your morning delivery drops starting tomorrow at 5:30 AM.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '0.90rem',
                      cursor: 'pointer',
                    }}
                  >
                    Back to Home
                  </button>

                  <button
                    type="button"
                    onClick={handleResume}
                    disabled={isSubmitting}
                    style={{
                      padding: '12px 32px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#0d5c3a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(13, 92, 58, 0.25)',
                    }}
                  >
                    <PlayCircle size={18} />
                    <span>{isSubmitting ? 'Resuming...' : 'Resume Deliveries Now'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePause} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                      Pause From Date *
                    </label>
                    <input
                      type="date"
                      value={pauseFrom}
                      onChange={(e) => setPauseFrom(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.94rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                      Resume Delivery On *
                    </label>
                    <input
                      type="date"
                      value={pauseUntil}
                      onChange={(e) => setPauseUntil(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.94rem',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                    Reason for Pause
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.94rem',
                      background: '#ffffff',
                    }}
                  >
                    <option value="Out of Town / Vacation">Out of Town / Vacation</option>
                    <option value="Excess Milk at Home">Excess Milk at Home</option>
                    <option value="Festival / Fasting">Festival / Fasting</option>
                    <option value="Other">Other Personal Reason</option>
                  </select>
                </div>

                <div style={{ padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                  💡 <strong>Flexibility Notice:</strong> You can unpause anytime before 9:00 PM for the following morning. Paused days are not billed or deducted from your advance subscription.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '0.90rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '12px 32px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#b45309',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      cursor: isSubmitting ? 'wait' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Pausing...' : 'Confirm Delivery Pause'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
