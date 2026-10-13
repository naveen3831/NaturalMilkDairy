import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDairy } from '../../context/DairyContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Edit3,
  HelpCircle,
  Home,
  Info,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Milk,
  PauseCircle,
  Phone,
  PlusCircle,
  RefreshCw,
  Trash2,
  Truck,
  UserRound,
  Wallet,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Send,
  Check,
  ExternalLink,
  PlayCircle,
  Edit2,
  Headphones,
  PhoneCall,
  MessageCircle,
  Sliders,
  User,
  Settings,
  Camera,
  Heart,
  Eye,
  EyeOff,
  FileText,
} from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../../constants/cloudinaryMedia';
import CustomerBottomNav, {
  CUSTOMER_HOME_NAV_ITEMS,
  CUSTOMER_PORTAL_ITEMS,
} from '../../components/CustomerBottomNav';

const formatProfileDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
};

export default function CustomerPortal({ setActiveTab, onOpenPauseModal, onOpenTempQtyModal, onOpenPaymentModal }) {
  const { user, logout, setUser, getAuthHeaders } = useAuth();
  const { customers, deliveries, resumeDelivery, refreshAll, notifyRealtimeSync } = useDairy();
  const { unreadCount, setIsNotificationOpen } = useNotifications();
  const { subscribe: wsSubscribe } = useWebSocket();
  const [activePage, setActivePage] = useState(() => localStorage.getItem('nmd_customer_page') || 'dashboard');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [profileDetailView, setProfileDetailView] = useState(null);

  const matchedCustomer = customers.find((customer) =>
    customer.mobile === user?.mobile
    || customer.id === user?.id
    || customer.customerId === user?.customerId
  ) || {
    name: user?.name || 'Customer',
    customerId: user?.customerId || 'CUST-101',
    mobile: user?.mobile || '',
    email: user?.email || '',
    whatsapp: user?.whatsapp || '',
    address: user?.address || '',
    area: user?.area || user?.assignedArea || '',
    landmark: user?.landmark || '',
    deliveryPlan: user?.deliveryPlan || { milkQty: 1, milkUnit: 'L', curdQty: 0, curdUnit: 'g', frequency: 'daily', deliveryBoyName: '' },
    paymentInfo: user?.paymentInfo || {},
    currentBalance: 0,
    status: 'active',
  };
  const currentCustomer = ledgerCustomer || matchedCustomer;

  const customerDeliveries = deliveries
    .filter((delivery) => delivery.customerId === currentCustomer.id || delivery.customerName === currentCustomer.name)
    .reverse();
  const isPaused = currentCustomer.status === 'paused';
  const balance = Number(currentCustomer.currentBalance) || 0;
  const address = [currentCustomer.address, currentCustomer.area]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(', ');
  const milkQuantity = currentCustomer.deliveryPlan?.milkQty ?? 1;
  const milkUnit = currentCustomer.deliveryPlan?.milkUnit || 'L';
  const curdQuantity = currentCustomer.deliveryPlan?.curdQty ?? 0;
  const curdUnit = currentCustomer.deliveryPlan?.curdUnit || 'g';
  const deliveryFrequency = String(currentCustomer.deliveryPlan?.frequency || 'daily');
  const currentPage = CUSTOMER_PORTAL_ITEMS.find((page) => page.id === activePage) || CUSTOMER_PORTAL_ITEMS[0];
  const customerLedgerId = matchedCustomer.customerId || matchedCustomer.id || user?.customerId || user?.id;
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [supportTopic, setSupportTopic] = useState('delivery');
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('••••••••••••');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openProfileDetail = (view) => {
    if (view === 'personal-info') {
      setProfileForm({
        name: currentCustomer.name || '',
        mobile: currentCustomer.mobile || '',
        email: currentCustomer.email || '',
        whatsapp: currentCustomer.whatsapp || '',
        address: currentCustomer.address || '',
        area: currentCustomer.area || '',
        landmark: currentCustomer.landmark || '',
      });
      setProfileError('');
      setProfileMessage('');
      setIsEditingProfile(true);
    }
    setProfileDetailView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reloadLedger = useCallback(() => {
    if (!customerLedgerId) return;
    fetch(`/api/customers/${encodeURIComponent(customerLedgerId)}/ledger`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (Array.isArray(data.ledgerEntries)) setLedgerEntries(data.ledgerEntries);
          if (data.customer) setLedgerCustomer(data.customer);
          setLedgerSummary({
            grossBill: Number(data.grossBill) || 0,
            totalPaid: Number(data.totalPaid) || 0,
            totalMilkDelivered: data.totalMilkDelivered || '0 L',
            totalCurdDelivered: data.totalCurdDelivered || '0 Kg',
          });
        }
      })
      .catch(() => {});
  }, [customerLedgerId]);

  // Keep ledgerCustomer live when matchedCustomer changes from DairyContext
  useEffect(() => {
    if (matchedCustomer && matchedCustomer.id) {
      setLedgerCustomer((prev) => {
        if (!prev) return matchedCustomer;
        return { ...prev, ...matchedCustomer };
      });
    }
  }, [matchedCustomer]);

  // Real-time synchronization listener across tabs & portals
  useEffect(() => {
    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('nmd_realtime_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
          reloadLedger();
        }
      };
    }

    const unsubDelivery = wsSubscribe('DELIVERY_UPDATED', () => reloadLedger());
    const unsubCustomer = wsSubscribe('CUSTOMER_UPDATED', () => reloadLedger());
    const unsubPayment = wsSubscribe('PAYMENT_RECORDED', () => reloadLedger());

    return () => {
      if (bc) bc.close();
      unsubDelivery();
      unsubCustomer();
      unsubPayment();
    };
  }, [wsSubscribe, reloadLedger]);

  useEffect(() => {
    if (!customerLedgerId) return undefined;

    const controller = new AbortController();
    setLedgerLoading(true);
    setLedgerError('');

    fetch(`/api/customers/${encodeURIComponent(customerLedgerId)}/ledger`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load account history.');
        }
        setLedgerEntries(Array.isArray(data.ledgerEntries) ? data.ledgerEntries : []);
        setLedgerCustomer(data.customer || null);
        setLedgerSummary({
          grossBill: Number(data.grossBill) || 0,
          totalPaid: Number(data.totalPaid) || 0,
          totalMilkDelivered: data.totalMilkDelivered || '0 L',
          totalCurdDelivered: data.totalCurdDelivered || '0 Kg',
        });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setLedgerError(error.message || 'Unable to load account history.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLedgerLoading(false);
      });

    return () => controller.abort();
  }, [customerLedgerId]);

  const [restartingDelivery, setRestartingDelivery] = useState(false);

  const handleRestartDelivery = async () => {
    setRestartingDelivery(true);
    try {
      const custId = currentCustomer.id || currentCustomer._id || customerLedgerId;
      await resumeDelivery(custId, { actor: user?.name || currentCustomer.name || 'Customer' });
      setProfileMessage('Your doorstep deliveries have been restarted and set to active!');
      refreshAll?.();
      notifyRealtimeSync?.();
      reloadLedger?.();
    } catch (e) {
      console.error('Error restarting delivery:', e);
    } finally {
      setRestartingDelivery(false);
    }
  };

  const navigateToPage = (page) => {
    localStorage.setItem('nmd_customer_page', page);
    setActivePage(page);
    setProfileDetailView(null);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('.customer-dashboard-content') || document.querySelector('.customer-app-main');
    if (mainEl) mainEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const beginProfileEdit = () => {
    setProfileForm({
      name: currentCustomer.name || '',
      mobile: currentCustomer.mobile || '',
      email: currentCustomer.email || '',
      whatsapp: currentCustomer.whatsapp || '',
      address: currentCustomer.address || '',
      area: currentCustomer.area || '',
      landmark: currentCustomer.landmark || '',
    });
    setProfileError('');
    setProfileMessage('');
    setIsEditingProfile(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const response = await fetch('/api/customers/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to save your profile.');
      }
      setLedgerCustomer((prev) => ({
        ...(prev || currentCustomer),
        ...data.customer,
      }));
      setUser((currentUser) => ({
        ...currentUser,
        name: data.customer.name,
        mobile: data.customer.mobile,
        email: data.customer.email || '',
        area: data.customer.area || '',
        address: data.customer.address || '',
        whatsapp: data.customer.whatsapp || '',
        landmark: data.customer.landmark || '',
      }));
      setIsEditingProfile(false);
      setProfileMessage('Your profile details have been saved and updated in real time.');

      // Real-time synchronization for Admin and Driver
      refreshAll?.();
      notifyRealtimeSync?.();

      setTimeout(() => {
        setProfileDetailView(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1200);
    } catch (error) {
      setProfileError(error.message || 'Unable to save your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const updateSubscriptionPlan = async (updatedPlan) => {
    setProfileSaving(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const response = await fetch('/api/customers/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: currentCustomer.name,
          mobile: currentCustomer.mobile,
          address: currentCustomer.address,
          area: currentCustomer.area,
          landmark: currentCustomer.landmark,
          deliveryPlan: updatedPlan,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update subscription.');
      }
      setLedgerCustomer(data.customer);
      setProfileMessage('Daily subscription updated and synced in real time!');

      // Real-time synchronization for Admin and Driver
      refreshAll?.();
      notifyRealtimeSync?.();
    } catch (error) {
      setProfileError(error.message || 'Unable to update subscription.');
    } finally {
      setProfileSaving(false);
    }
  };

  const deleteAccount = async (event) => {
    event.preventDefault();
    setDeletingAccount(true);
    setDeleteError('');
    try {
      const response = await fetch('/api/customers/me/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ confirmation: deleteConfirmation, password: deletePassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to delete your account.');
      }
      setShowDeleteConfirm(false);
      localStorage.removeItem('nmd_customer_page');
      logout();
      setActiveTab('home');
    } catch (error) {
      setDeleteError(error.message || 'Unable to delete your account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const renderPlanCard = () => (
    <article className="customer-dashboard-card customer-plan-card">
      <div className="customer-card-heading">
        <div>
          <span className="customer-section-kicker">YOUR SUBSCRIPTION</span>
          <h2>Daily morning plan</h2>
        </div>
        <span className={`customer-status-pill${isPaused ? ' is-paused' : ''}`}>
          <span />
          {isPaused ? 'Paused' : 'Active'}
        </span>
      </div>

      <div className="customer-plan-quantities">
        <div className="customer-quantity-tile">
          <span>Fresh milk</span>
          <strong>{milkQuantity} <small>{milkUnit}</small></strong>
        </div>
        <div className="customer-quantity-tile">
          <span>Curd (dahi)</span>
          <strong>{curdQuantity} <small>{curdUnit}</small></strong>
        </div>
      </div>

      <div className="customer-plan-details">
        <div>
          <Clock3 size={17} aria-hidden="true" />
          <span>Delivered before <strong>6:30 AM</strong> each morning</span>
        </div>
        <div>
          <BadgeCheck size={17} aria-hidden="true" />
          <span>Handled with care by <strong>{currentCustomer.deliveryPlan?.deliveryBoyName || 'your delivery partner'}</strong></span>
        </div>
      </div>

      {isPaused && (
        <div style={{
          marginTop: '16px',
          padding: '14px 16px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1.5px solid #86efac',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#e11d48',
              }} />
              <strong style={{ fontSize: '0.90rem', color: '#14532d' }}>Deliveries are currently paused</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569' }}>
              {currentCustomer.pauseUntil
                ? `Paused until ${formatProfileDate(currentCustomer.pauseUntil)}. Ready to receive fresh milk again?`
                : 'Pause active. Restart your daily delivery anytime.'}
            </p>
          </div>
          <button
            type="button"
            disabled={restartingDelivery}
            onClick={handleRestartDelivery}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: restartingDelivery ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
            }}
          >
            <PlayCircle size={15} />
            <span>{restartingDelivery ? 'Restarting...' : 'Restart Delivery Now'}</span>
          </button>
        </div>
      )}
    </article>
  );

  const renderDeliveryActions = () => (
    <article className="customer-dashboard-card customer-actions-card">
      <div className="customer-card-heading">
        <div>
          <span className="customer-section-kicker">FLEXIBLE AT YOUR FINGERTIPS</span>
          <h2>Manage your delivery</h2>
        </div>
      </div>
      <p className="customer-actions-intro">Plans change. Update your next delivery whenever you need to.</p>
      <div className="customer-action-list">
        {isPaused ? (
          <>
            <button
              type="button"
              className="customer-action-button"
              style={{
                background: '#f0fdf4',
                borderColor: '#86efac',
              }}
              disabled={restartingDelivery}
              onClick={handleRestartDelivery}
            >
              <span className="customer-action-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
                <PlayCircle size={19} aria-hidden="true" />
              </span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <strong style={{ color: '#15803d', display: 'block', fontSize: '0.92rem' }}>
                  {restartingDelivery ? 'Restarting delivery...' : 'Restart / Resume Delivery'}
                </strong>
                <small style={{ color: '#475569', fontSize: '0.74rem' }}>
                  End pause and resume doorstep milk delivery
                </small>
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="customer-action-button customer-action-pause"
              onClick={() => onOpenPauseModal?.(currentCustomer)}
            >
              <span className="customer-action-icon"><PauseCircle size={19} aria-hidden="true" /></span>
              <span>Change vacation return date</span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="customer-action-button customer-action-pause"
            onClick={() => onOpenPauseModal?.(currentCustomer)}
          >
            <span className="customer-action-icon"><PauseCircle size={19} aria-hidden="true" /></span>
            <span>Pause delivery for a trip</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="customer-action-button customer-action-quantity"
          onClick={() => onOpenTempQtyModal?.(currentCustomer)}
        >
          <span className="customer-action-icon"><PlusCircle size={19} aria-hidden="true" /></span>
          <span>Change tomorrow's quantity</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="customer-action-button customer-action-products"
          onClick={() => setActiveTab('products')}
        >
          <span className="customer-action-icon"><Milk size={19} aria-hidden="true" /></span>
          <span>Explore ghee, paneer & more</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );

  const ledgerDeliveries = ledgerEntries
    .filter((entry) => entry.type === 'delivery')
    .map((entry) => ({
      id: entry.id,
      deliveryDate: entry.date,
      actualMilk: Number.parseFloat(entry.milk) || 0,
      actualCurd: Number.parseFloat(entry.curd) || 0,
      totalAmount: entry.amount,
      status: entry.status,
      paymentStatus: entry.paymentStatus,
    }))
    .reverse();
  const allCustomerDeliveries = ledgerDeliveries.length > 0 ? ledgerDeliveries : customerDeliveries;

  const renderDeliveryHistory = (title = 'Recent deliveries', limit = Infinity) => {
    const visibleDeliveries = allCustomerDeliveries.slice(0, limit);

    return (
      <section className="customer-dashboard-card customer-history-card">
        <div className="customer-card-heading customer-history-heading">
          <div>
            <span className="customer-section-kicker">DELIVERY ACTIVITY</span>
            <h2>{title}</h2>
          </div>
          <span className="customer-history-count">{allCustomerDeliveries.length} total</span>
        </div>

        {visibleDeliveries.length === 0 ? (
          <div className="customer-empty-history">
            <span className="customer-dashboard-icon customer-dashboard-icon-green">
              <Truck size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>Your delivery history will appear here</strong>
              <p>Your first delivery is on its way. Check back soon for updates.</p>
            </div>
          </div>
        ) : (
          <div className="table-responsive customer-history-table-wrap">
            <table className="dairy-table customer-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Milk</th>
                  <th>Curd</th>
                  <th>Amount</th>
                  <th>Delivery</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeliveries.map((delivery, index) => (
                  <tr key={delivery.id || `${delivery.deliveryDate}-${index}`}>
                    <td><strong>{delivery.deliveryDate}</strong></td>
                    <td>{delivery.actualMilk} L</td>
                    <td>{delivery.actualCurd || 0} g</td>
                    <td>₹{delivery.totalAmount}</td>
                    <td>
                      <span className={`customer-table-status${delivery.status === 'delivered' ? ' is-delivered' : ''}`}>
                        {delivery.status === 'delivered' ? '✓ Delivered' : 'Pending'}
                      </span>
                      {delivery.proofImage && (
                        <a
                          href={delivery.proofImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            color: '#059669',
                            marginLeft: '6px',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                          title="View doorstep delivery proof photo"
                        >
                          📷 Proof
                        </a>
                      )}
                    </td>
                    <td>
                      <span className={`customer-table-status${delivery.paymentStatus === 'paid' ? ' is-delivered' : ' is-unpaid'}`}>
                        {delivery.paymentStatus || 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderDashboard = () => (
    <>
      <section className="customer-dashboard-hero">
        <div className="customer-dashboard-welcome">
          <div className="customer-dashboard-eyebrow">
            <span className="customer-dashboard-eyebrow-dot" />
            YOUR CUSTOMER DASHBOARD
            <span className="customer-dashboard-id">ID {currentCustomer.customerId || 'CUST-101'}</span>
          </div>
          <h1>Good morning, {currentCustomer.name}</h1>
          <p>Fresh essentials, thoughtfully delivered to your doorstep.</p>
          {address && (
            <div className="customer-dashboard-address">
              <MapPin size={16} aria-hidden="true" />
              <span>{address}</span>
            </div>
          )}
        </div>

        <div className="customer-balance-card">
          <div className="customer-balance-heading">
            <span className="customer-dashboard-icon customer-dashboard-icon-green">
              <Wallet size={19} aria-hidden="true" />
            </span>
            <span>Outstanding balance</span>
          </div>
          <div className="customer-balance-amount">₹{balance.toLocaleString('en-IN')}</div>
          {balance > 0 ? (
            <button
              type="button"
              className="customer-pay-button"
              onClick={() => onOpenPaymentModal?.(currentCustomer)}
            >
              <CreditCard size={16} aria-hidden="true" />
              Pay balance
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          ) : (
            <div className="customer-balance-clear">
              <CheckCircle2 size={15} aria-hidden="true" />
              You're all caught up
            </div>
          )}
        </div>
      </section>

      <section className="customer-dashboard-overview" aria-label="Subscription overview">
        <article className="customer-overview-card">
          <span className="customer-dashboard-icon customer-dashboard-icon-green"><Milk size={20} aria-hidden="true" /></span>
          <div><p>Daily milk</p><strong>{milkQuantity} {milkUnit}</strong></div>
        </article>
        <article className="customer-overview-card">
          <span className="customer-dashboard-icon customer-dashboard-icon-blue"><CalendarDays size={20} aria-hidden="true" /></span>
          <div><p>Delivery schedule</p><strong>{deliveryFrequency.charAt(0).toUpperCase() + deliveryFrequency.slice(1)}</strong></div>
        </article>
        <article className="customer-overview-card">
          <span className="customer-dashboard-icon customer-dashboard-icon-amber"><Truck size={20} aria-hidden="true" /></span>
          <div><p>Your delivery partner</p><strong>{currentCustomer.deliveryPlan?.deliveryBoyName || 'To be assigned'}</strong></div>
        </article>
      </section>

      <section className="customer-dashboard-main">
        {renderPlanCard()}
        {renderDeliveryActions()}
      </section>
      {renderDeliveryHistory('Recent deliveries', 5)}
    </>
  );

  const renderProfileDetailView = () => {
    const customerInitial = (currentCustomer.name || user?.name || 'C').charAt(0).toUpperCase();
    const customerName = currentCustomer.name || user?.name || 'Customer';
    const customerPhone = currentCustomer.mobile || user?.mobile || 'Not provided';
    const customerEmail = currentCustomer.email || user?.email || 'Not provided';
    const customerArea = currentCustomer.area || user?.area || user?.assignedArea || 'Mumbai';
    const customerId = currentCustomer.customerId || user?.customerId || 'CUST-101';
    const customerAddress = currentCustomer.address || user?.address || 'Not provided';
    const customerWhatsapp = currentCustomer.whatsapp || currentCustomer.mobile || user?.mobile || 'Not provided';
    const totalDeliveries = ledgerEntries.filter((e) => e.type === 'delivery').length || customerDeliveries.length;

    let viewTitle = 'Profile Details';
    if (profileDetailView === 'personal-info') viewTitle = 'Personal Details';
    else if (profileDetailView === 'subscription') viewTitle = 'My Subscriptions';
    else if (profileDetailView === 'deliveries') viewTitle = 'Saved Deliveries';
    else if (profileDetailView === 'wallet') viewTitle = 'Refund Wallet & Balance';
    else if (profileDetailView === 'pause') viewTitle = 'Cancel / Pause Schedule';
    else if (profileDetailView === 'quantity') viewTitle = 'Update Quantity';
    else if (profileDetailView === 'delivery-window') viewTitle = 'Morning Delivery Window';
    else if (profileDetailView === 'support') viewTitle = '24/7 Helpline & Support';
    else if (profileDetailView === 'about') viewTitle = 'About Natural Milk Dairy';
    else if (profileDetailView === 'delete-account') viewTitle = 'Delete Account';

    return (
      <div className="mobile-detail-page-wrapper">
        {/* Sticky Detail Header with Back Navigation */}
        <header className="mobile-detail-header-bar">
          <button
            type="button"
            className="mobile-detail-back-button"
            onClick={() => {
              setProfileDetailView(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Back to Profile"
          >
            <ArrowLeft size={18} />
            <span>Profile</span>
          </button>
          <h2 className="mobile-detail-header-title">{viewTitle}</h2>
          <div className="mobile-detail-header-spacer" />
        </header>

        {/* 1. PERSONAL INFORMATION & ADDRESS */}
        {profileDetailView === 'personal-info' && (
          <div className="mobile-detail-body">
            {/* Identity Card */}
            <div className="mobile-detail-card mobile-detail-user-card">
              <div className="mobile-detail-user-head">
                <div className="mobile-profile-avatar">{customerInitial}</div>
                <div>
                  <div className="mobile-detail-title-row">
                    <h3>{customerName}</h3>
                    <span className="mobile-detail-verified-badge">
                      <BadgeCheck size={14} /> Verified Member
                    </span>
                  </div>
                  <p className="mobile-detail-subtitle">ID: {customerId} · {customerPhone}</p>
                </div>
              </div>
            </div>

            {profileMessage && (
              <div className="mobile-profile-alert is-success" role="status">
                <CheckCircle2 size={16} />
                <span>{profileMessage}</span>
              </div>
            )}
            {profileError && (
              <div className="customer-profile-feedback is-error" role="alert">
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            {/* Editable Profile Form */}
            <div className="mobile-detail-card">
              <div className="mobile-detail-card-head">
                <div className="mobile-detail-card-icon is-green">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h4>Edit Contact & Doorstep Address</h4>
                  <p>Changes take effect immediately for morning deliveries.</p>
                </div>
              </div>

              <form className="customer-profile-edit-form" onSubmit={saveProfile}>
                <label>
                  <span>Full name</span>
                  <input
                    type="text"
                    value={profileForm.name || ''}
                    required
                    onChange={(e) => setProfileForm((cur) => ({ ...cur, name: e.target.value }))}
                  />
                </label>

                <div className="mobile-detail-two-col">
                  <label>
                    <span>Mobile number</span>
                    <input
                      type="tel"
                      value={profileForm.mobile || ''}
                      required
                      onChange={(e) => setProfileForm((cur) => ({ ...cur, mobile: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>WhatsApp number</span>
                    <input
                      type="tel"
                      value={profileForm.whatsapp || ''}
                      onChange={(e) => setProfileForm((cur) => ({ ...cur, whatsapp: e.target.value }))}
                    />
                  </label>
                </div>

                <label>
                  <span>Email address</span>
                  <input
                    type="email"
                    value={profileForm.email || ''}
                    onChange={(e) => setProfileForm((cur) => ({ ...cur, email: e.target.value }))}
                  />
                </label>

                <label>
                  <span>Doorstep delivery address (Flat / House / Wing / Society)</span>
                  <textarea
                    rows={3}
                    value={profileForm.address || ''}
                    required
                    onChange={(e) => setProfileForm((cur) => ({ ...cur, address: e.target.value }))}
                  />
                </label>

                <div className="mobile-detail-two-col">
                  <label>
                    <span>Area / Locality</span>
                    <input
                      type="text"
                      value={profileForm.area || ''}
                      onChange={(e) => setProfileForm((cur) => ({ ...cur, area: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Landmark / Gate instructions</span>
                    <input
                      type="text"
                      value={profileForm.landmark || ''}
                      onChange={(e) => setProfileForm((cur) => ({ ...cur, landmark: e.target.value }))}
                    />
                  </label>
                </div>

                <div className="customer-profile-edit-actions" style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="customer-profile-secondary-button"
                    onClick={() => {
                      setProfileDetailView(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Back to Profile
                  </button>
                  <button
                    type="submit"
                    className="customer-profile-primary-button"
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Delivery Hub & Privacy Guarantee */}
            <div className="mobile-detail-card mobile-detail-notice-card">
              <div className="mobile-detail-notice-item">
                <ShieldCheck size={20} className="mobile-detail-notice-icon is-green" />
                <div>
                  <strong>100% Confidential Delivery Profile</strong>
                  <p>Your doorstep details are shared solely with your assigned dairy route specialist for 5:00 AM delivery.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MY SUBSCRIPTIONS */}
        {profileDetailView === 'subscription' && (
          <div className="mobile-detail-body">
            {/* Status Hero Card */}
            <div className="mobile-detail-card mobile-detail-highlight-card">
              <div className="mobile-detail-plan-banner">
                <div>
                  <span className="mobile-detail-badge is-blue">
                    {isPaused ? 'SUBSCRIPTION PAUSED' : 'ACTIVE SUBSCRIPTION'}
                  </span>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>Daily Morning Plan</h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                    {isPaused ? 'Scheduled pause active. No billing for paused days.' : 'Delivered fresh before 6:30 AM every morning.'}
                  </p>
                </div>
                <div className={`mobile-profile-status-dot${isPaused ? ' is-paused' : ''}`} style={{ width: '12px', height: '12px' }} />
              </div>
            </div>

            {/* Subscribed Products */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Subscribed Dairy Products</h4>
              <div className="mobile-detail-product-row">
                <div className="mobile-detail-prod-icon is-green">
                  <Milk size={20} />
                </div>
                <div className="mobile-detail-prod-meta">
                  <strong>Pure A2 Desi Cow Milk</strong>
                  <p>Chilled farm glass bottle · Cold-chain 4°C</p>
                </div>
                <div className="mobile-detail-prod-qty">
                  <span>{milkQuantity} {milkUnit}</span>
                  <small>Daily</small>
                </div>
              </div>

              {/* Quick Stepper for Daily Milk Quantity */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Change Daily Milk Pack:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={milkQuantity <= 0.5 || profileSaving}
                    onClick={() => updateSubscriptionPlan({
                      ...currentCustomer.deliveryPlan,
                      milkQty: Math.max(0.5, (milkQuantity || 1) - 0.5),
                    })}
                    title="Decrease daily milk by 0.5L"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', minWidth: '45px', textAlign: 'center', color: '#0d5c3a' }}>
                    {milkQuantity} {milkUnit}
                  </span>
                  <button
                    type="button"
                    disabled={profileSaving}
                    onClick={() => updateSubscriptionPlan({
                      ...currentCustomer.deliveryPlan,
                      milkQty: (milkQuantity || 1) + 0.5,
                    })}
                    title="Increase daily milk by 0.5L"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#0d5c3a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {curdQuantity > 0 && (
                <div className="mobile-detail-product-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <div className="mobile-detail-prod-icon is-amber">
                    <CalendarDays size={20} />
                  </div>
                  <div className="mobile-detail-prod-meta">
                    <strong>Fresh Clay-Pot Curd (Dahi)</strong>
                    <p>Natural traditional terracotta pot</p>
                  </div>
                  <div className="mobile-detail-prod-qty">
                    <span>{curdQuantity} {curdUnit}</span>
                    <small>Daily</small>
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Route Specialist */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Your Assigned Route Partner</h4>
              <div className="mobile-detail-partner-box">
                <div className="mobile-detail-partner-avatar">
                  <Truck size={20} />
                </div>
                <div className="mobile-detail-partner-info">
                  <strong>{currentCustomer.deliveryPlan?.deliveryBoyName || 'Natural Milk Route Partner'}</strong>
                  <p>Local Route Fleet Specialist · {customerArea}</p>
                </div>
              </div>
              <div className="mobile-detail-partner-actions">
                <a href="tel:9876543210" className="mobile-detail-action-pill is-call">
                  <Phone size={15} /> <span>Call Partner</span>
                </a>
                <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="mobile-detail-action-pill is-wa">
                  <MessageSquare size={15} /> <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mobile-detail-grid-actions">
              <button
                type="button"
                className="mobile-detail-btn is-outline"
                onClick={() => onOpenPauseModal?.(currentCustomer)}
              >
                <PauseCircle size={18} />
                <span>Pause / Vacation Schedule</span>
              </button>
              <button
                type="button"
                className="mobile-detail-btn is-outline"
                onClick={() => onOpenTempQtyModal?.(currentCustomer)}
              >
                <PlusCircle size={18} />
                <span>Change Tomorrow's Quantity</span>
              </button>
              <button
                type="button"
                className="mobile-detail-btn is-primary"
                onClick={() => setActiveTab('products')}
              >
                <Sparkles size={18} />
                <span>Explore Ghee, Paneer & Butter</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. SAVED DELIVERIES */}
        {profileDetailView === 'deliveries' && (
          <div className="mobile-detail-body">
            {/* Quick Metrics */}
            <div className="mobile-detail-metrics-grid">
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num">{allCustomerDeliveries.length || totalDeliveries}</span>
                <span className="mobile-detail-metric-lbl">Total Drops</span>
              </div>
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#16a34a' }}>100%</span>
                <span className="mobile-detail-metric-lbl">On-Time Rate</span>
              </div>
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#2563eb' }}>{allCustomerDeliveries.length || totalDeliveries}</span>
                <span className="mobile-detail-metric-lbl">Bottles Swapped</span>
              </div>
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#0d9488' }}>4°C</span>
                <span className="mobile-detail-metric-lbl">Cold-Chain</span>
              </div>
            </div>

            {/* Deliveries Stream */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Delivery History & Doorstep Logs</h4>
              {allCustomerDeliveries.length === 0 ? (
                <div className="customer-empty-history" style={{ padding: '24px 12px' }}>
                  <Truck size={32} style={{ color: '#10b981', margin: '0 auto 12px' }} />
                  <strong>Your delivery history will appear here</strong>
                  <p>Your first delivery is scheduled for tomorrow morning between 5:00 AM and 6:30 AM.</p>
                </div>
              ) : (
                <div className="mobile-detail-drops-list">
                  {allCustomerDeliveries.map((drop, idx) => (
                    <div key={drop.id || idx} className="mobile-detail-drop-row">
                      <div className="mobile-detail-drop-left">
                        <div className="mobile-detail-drop-icon">
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <strong>{drop.deliveryDate || 'Morning Delivery'}</strong>
                          <p>Delivered at 5:45 AM · Placed in doorstep bag</p>
                          <div className="mobile-detail-drop-tags">
                            <span className="mobile-detail-tag is-green">Delivered ✓</span>
                            <span className="mobile-detail-tag is-blue">Bottle Swapped ✓</span>
                          </div>
                        </div>
                      </div>
                      <div className="mobile-detail-drop-right">
                        <span>{drop.actualMilk || milkQuantity} {milkUnit}</span>
                        <small>₹{drop.totalAmount || 85}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Assistance */}
            <div className="mobile-detail-card mobile-detail-notice-card">
              <div className="mobile-detail-notice-item">
                <Clock3 size={20} className="mobile-detail-notice-icon is-blue" />
                <div>
                  <strong>Silent Morning Delivery Window</strong>
                  <p>All drops occur silently before 6:30 AM. Empty glass bottles are exchanged every morning.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. REFUND WALLET & BALANCE */}
        {profileDetailView === 'wallet' && (
          <div className="mobile-detail-body">
            {/* Hero Balance Card */}
            <div className="mobile-detail-card mobile-detail-balance-hero">
              <div className="mobile-detail-balance-eyebrow">
                <Wallet size={16} /> <span>CURRENT OUTSTANDING BALANCE</span>
              </div>
              <div className="mobile-detail-balance-large">
                ₹{balance.toLocaleString('en-IN')}
              </div>
              <p className="mobile-detail-balance-sub">
                {balance <= 0 ? 'All caught up! Zero outstanding dues.' : 'Monthly billing balance due for morning deliveries.'}
              </p>

              <button
                type="button"
                className="mobile-detail-pay-now-btn"
                onClick={() => onOpenPaymentModal?.(currentCustomer)}
              >
                <CreditCard size={18} />
                <span>Pay Outstanding Bill via UPI / Card</span>
              </button>
            </div>

            {/* Financial Breakdown */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Billing Breakdown</h4>
              <div className="mobile-detail-breakdown-list">
                <div className="mobile-detail-breakdown-row">
                  <span>Gross Milk & Products Bill</span>
                  <strong>₹{ledgerSummary?.grossBill || (balance > 0 ? balance : 0)}</strong>
                </div>
                <div className="mobile-detail-breakdown-row">
                  <span>Total Payments Made</span>
                  <strong style={{ color: '#16a34a' }}>₹{ledgerSummary?.totalPaid || 0}</strong>
                </div>
                <div className="mobile-detail-breakdown-row">
                  <span>Glass Bottle Deposit (Waved)</span>
                  <strong style={{ color: '#2563eb' }}>₹0.00</strong>
                </div>
                <div className="mobile-detail-breakdown-row is-total">
                  <span>Net Outstanding Balance</span>
                  <strong style={{ color: balance > 0 ? '#b91c1c' : '#16a34a' }}>
                    ₹{balance.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Instant UPI Payment Box */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Supported UPI Payment Methods</h4>
              <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: '#64748b' }}>
                Instant settlement via Google Pay, PhonePe, Paytm, BHIM or NetBanking.
              </p>
              <div className="mobile-detail-upi-box">
                <span className="mobile-detail-upi-id">UPI ID: <strong>naturalmilkdairy@icici</strong></span>
                <button
                  type="button"
                  className="mobile-detail-upi-copy-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText('naturalmilkdairy@icici');
                    alert('UPI ID copied to clipboard!');
                  }}
                >
                  Copy UPI
                </button>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Account Transaction Ledger</h4>
              {ledgerEntries.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  No recent ledger entries. Transactions appear as deliveries and payments are processed.
                </p>
              ) : (
                <div className="mobile-detail-ledger-list">
                  {ledgerEntries.slice(0, 10).map((entry, idx) => (
                    <div key={entry.id || idx} className="mobile-detail-ledger-row">
                      <div className="mobile-detail-ledger-left">
                        <strong>{entry.date || 'Transaction'}</strong>
                        <p>{entry.description || (entry.type === 'delivery' ? 'Daily milk delivery' : 'Payment received')}</p>
                      </div>
                      <div className="mobile-detail-ledger-right">
                        <span className={entry.type === 'payment' ? 'is-credit' : 'is-debit'}>
                          {entry.type === 'payment' ? '-' : '+'}₹{entry.amount}
                        </span>
                        <small>{entry.status || 'Success'}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. CANCEL / PAUSE SCHEDULE */}
        {profileDetailView === 'pause' && (
          <div className="mobile-detail-body">
            {/* Status Card */}
            <div className="mobile-detail-card mobile-detail-highlight-card">
              <div className="mobile-detail-plan-banner">
                <div>
                  <span className={`mobile-detail-badge ${isPaused ? 'is-rose' : 'is-green'}`}>
                    {isPaused ? 'DELIVERY CURRENTLY PAUSED' : 'DELIVERIES ACTIVE'}
                  </span>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>Vacation & Pause Manager</h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                    {isPaused
                      ? `Paused from ${formatProfileDate(currentCustomer.pauseFrom)} to ${formatProfileDate(currentCustomer.pauseUntil)}.`
                      : 'Scheduled for tomorrow morning. Pause anytime before 8:00 PM.'}
                  </p>
                </div>
                <PauseCircle size={28} style={{ color: isPaused ? '#e11d48' : '#16a34a' }} />
              </div>
            </div>

            {/* Trigger Button */}
            <div className="mobile-detail-card" style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 800 }}>Schedule Vacation or Trip</h4>
              <p style={{ margin: '0 0 18px', fontSize: '0.84rem', color: '#64748b' }}>
                Going out of town? Select your travel dates to pause milk delivery. Zero cancellation charges, 100% wallet credit.
              </p>
              {isPaused && (
                <button
                  type="button"
                  className="mobile-detail-big-action-btn"
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    marginBottom: '10px',
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                  }}
                  disabled={restartingDelivery}
                  onClick={handleRestartDelivery}
                >
                  <PlayCircle size={18} />
                  <span>{restartingDelivery ? 'Restarting Delivery...' : 'Restart / Resume Delivery Now'}</span>
                </button>
              )}
              <button
                type="button"
                className="mobile-detail-big-action-btn"
                onClick={() => onOpenPauseModal?.(currentCustomer)}
              >
                <PauseCircle size={18} />
                <span>{isPaused ? 'Update Vacation Dates / Schedule' : 'Set Vacation Schedule Now'}</span>
              </button>
            </div>

            {/* Zero-Waste Vacation Rules */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Dairy Vacation Policy & Rules</h4>
              <div className="mobile-detail-rule-list">
                <div className="mobile-detail-rule-item">
                  <Check size={18} className="mobile-detail-rule-icon" />
                  <div>
                    <strong>100% Free Pause</strong>
                    <p>No penalty or lock-in fee. Pause for 1 day or 3 months anytime.</p>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <Check size={18} className="mobile-detail-rule-icon" />
                  <div>
                    <strong>Cutoff Time: 8:00 PM</strong>
                    <p>Please update vacation dates before 8:00 PM for next-morning 5:00 AM dispatch.</p>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <Check size={18} className="mobile-detail-rule-icon" />
                  <div>
                    <strong>Automatic Resumption</strong>
                    <p>Deliveries automatically restart on your chosen return date without reminders.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. UPDATE QUANTITY */}
        {profileDetailView === 'quantity' && (
          <div className="mobile-detail-body">
            {/* Status Card */}
            <div className="mobile-detail-card mobile-detail-highlight-card">
              <div className="mobile-detail-plan-banner">
                <div>
                  <span className="mobile-detail-badge is-purple">TEMPORARY ADJUSTMENT</span>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>Tomorrow's Delivery Quantity</h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                    Standard Plan: {milkQuantity} {milkUnit} Milk · {curdQuantity > 0 ? `${curdQuantity} ${curdUnit} Curd` : 'No curd'}
                  </p>
                </div>
                <RefreshCw size={26} style={{ color: '#9333ea' }} />
              </div>
            </div>

            {/* Trigger Button */}
            <div className="mobile-detail-card" style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 800 }}>Expecting Guests or Need Extra Milk?</h4>
              <p style={{ margin: '0 0 18px', fontSize: '0.84rem', color: '#64748b' }}>
                You can increase or decrease your quantity for tomorrow morning with 1 click.
              </p>
              <button
                type="button"
                className="mobile-detail-big-action-btn is-purple"
                onClick={() => onOpenTempQtyModal?.(currentCustomer)}
              >
                <PlusCircle size={18} />
                <span>Change Tomorrow's Quantity</span>
              </button>
            </div>

            {/* Procurement Policy */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Farm Procurement Guidelines</h4>
              <div className="mobile-detail-rule-list">
                <div className="mobile-detail-rule-item">
                  <Check size={18} className="mobile-detail-rule-icon" />
                  <div>
                    <strong>Fresh Milking Guarantee</strong>
                    <p>Because our A2 milk is raw and unadulterated, we procure only what is scheduled.</p>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <Check size={18} className="mobile-detail-rule-icon" />
                  <div>
                    <strong>8:00 PM Evening Cutoff</strong>
                    <p>Adjust before 8:00 PM to guarantee extra milk for the 5:00 AM route.</p>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <Check size={18} className="mobile-detail-rule-icon" />
                  <div>
                    <strong>Return to Regular Plan</strong>
                    <p>Temporary quantity applies only to the selected date. Your normal plan continues after.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. MORNING DELIVERY WINDOW */}
        {profileDetailView === 'delivery-window' && (
          <div className="mobile-detail-body">
            {/* Timing Highlight */}
            <div className="mobile-detail-card mobile-detail-highlight-card">
              <div className="mobile-detail-plan-banner">
                <div>
                  <span className="mobile-detail-badge is-sky">DAILY SCHEDULE</span>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>5:00 AM – 6:30 AM</h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                    Silent doorstep drop in farm-sanitized glass bottles.
                  </p>
                </div>
                <Clock3 size={28} style={{ color: '#0284c7' }} />
              </div>
            </div>

            {/* Farm-to-Doorstep Journey Timeline */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Farm-to-Doorstep Journey</h4>
              <div className="mobile-detail-timeline">
                <div className="mobile-detail-timeline-step">
                  <div className="mobile-detail-time-bullet">3:30 AM</div>
                  <div className="mobile-detail-time-text">
                    <strong>Fresh Milking at Organic Pastures</strong>
                    <p>Gir cows milked at the farm; rigorous quality testing for fat and purity.</p>
                  </div>
                </div>
                <div className="mobile-detail-timeline-step">
                  <div className="mobile-detail-time-bullet">4:00 AM</div>
                  <div className="mobile-detail-time-text">
                    <strong>Chilled Bottling in Glass</strong>
                    <p>Bottled in sterilized eco-friendly glass bottles and chilled to 4°C.</p>
                  </div>
                </div>
                <div className="mobile-detail-timeline-step">
                  <div className="mobile-detail-time-bullet">4:45 AM</div>
                  <div className="mobile-detail-time-text">
                    <strong>Refrigerated Van Dispatch</strong>
                    <p>Cold-chain fleet departs from dairy to your local neighborhood distribution hub.</p>
                  </div>
                </div>
                <div className="mobile-detail-timeline-step">
                  <div className="mobile-detail-time-bullet">5:15 AM – 6:30 AM</div>
                  <div className="mobile-detail-time-text">
                    <strong>Silent Doorstep Drop & Bottle Swap</strong>
                    <p>Placed in your chilled doorstep bag; yesterday's rinsed empty bottle collected.</p>
                  </div>
                </div>
                <div className="mobile-detail-timeline-step is-last">
                  <div className="mobile-detail-time-bullet">6:35 AM</div>
                  <div className="mobile-detail-time-text">
                    <strong>Delivery Confirmed on App</strong>
                    <p>Instant SMS & app notification with route completion receipt.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Glass Bottle Protocol */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Glass Bottle Exchange Guide</h4>
              <p style={{ margin: '0 0 12px', fontSize: '0.84rem', color: '#64748b' }}>
                We use zero plastic to preserve natural enzymes and prevent microplastic leaching.
              </p>
              <div className="mobile-detail-rule-list">
                <div className="mobile-detail-rule-item">
                  <Check size={18} className="mobile-detail-rule-icon" />
                  <div>
                    <strong>Step 1: Rinse empty bottle with water.</strong>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <Check size={18} className="mobile-detail-rule-icon" />
                  <div>
                    <strong>Step 2: Place empty bottle in your dairy bag outside door.</strong>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <Check size={18} className="mobile-detail-rule-icon" />
                  <div>
                    <strong>Step 3: Driver replaces it with a fresh chilled bottle.</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. 24/7 HELPLINE & SUPPORT */}
        {profileDetailView === 'support' && (
          <div className="mobile-detail-body">
            {/* Direct Contact Cards */}
            <div className="mobile-detail-card mobile-detail-highlight-card">
              <div className="mobile-detail-plan-banner">
                <div>
                  <span className="mobile-detail-badge is-emerald">24/7 PRIORITY SUPPORT</span>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>We're Here to Help</h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                    Quick response for morning delivery, payments, or bottle queries.
                  </p>
                </div>
                <HelpCircle size={28} style={{ color: '#059669' }} />
              </div>
            </div>

            {/* Contact Action Channels */}
            <div className="mobile-detail-channels-grid">
              <a
                href={`https://wa.me/919876543210?text=Hi%20Natural%20Milk%20Dairy%2C%20I%20need%20assistance%20with%20my%20account%20ID%3A%20${customerId}`}
                target="_blank"
                rel="noreferrer"
                className="mobile-detail-channel-card is-wa"
              >
                <div className="mobile-detail-channel-icon is-emerald">
                  <MessageSquare size={22} />
                </div>
                <strong>WhatsApp Priority Chat</strong>
                <span>Instant response in 5 mins</span>
              </a>

              <a href="tel:+919876543210" className="mobile-detail-channel-card is-call">
                <div className="mobile-detail-channel-icon is-green">
                  <Phone size={22} />
                </div>
                <strong>Call 24/7 Helpline</strong>
                <span>+91 98765 43210</span>
              </a>

              <a href="mailto:support@naturalmilkdairy.com" className="mobile-detail-channel-card is-mail">
                <div className="mobile-detail-channel-icon is-blue">
                  <Mail size={22} />
                </div>
                <strong>Email Helpdesk</strong>
                <span>support@naturalmilkdairy.com</span>
              </a>
            </div>

            {/* Raise a Support Ticket Form */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Submit a Support Ticket</h4>
              {supportSubmitted ? (
                <div className="mobile-profile-alert is-success">
                  <CheckCircle2 size={18} />
                  <span>Your support ticket #NMD-8492 has been received. Our dispatch team will assist you within 15 minutes.</span>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSupportSubmitted(true);
                    fetch('/api/notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                      body: JSON.stringify({
                        title: `Support Ticket: ${supportTopic}`,
                        message: `From ${customerName} (${customerId}, ${customerPhone}): ${supportMsg}`,
                        type: 'ticket',
                        recipientRole: 'admin',
                      }),
                    }).catch(() => {});
                    notifyRealtimeSync?.();
                    setTimeout(() => {
                      setSupportMsg('');
                      setSupportSubmitted(false);
                    }, 4000);
                  }}
                >
                  <label>
                    <span>Issue Category</span>
                    <select
                      value={supportTopic}
                      onChange={(e) => setSupportTopic(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.88rem',
                        marginBottom: '12px',
                      }}
                    >
                      <option value="delivery">Morning Delivery Timing or Delay</option>
                      <option value="bottle">Glass Bottle Exchange / Damage</option>
                      <option value="wallet">Refund Wallet / UPI Payment</option>
                      <option value="pause">Vacation Schedule / Pause Request</option>
                      <option value="address">Doorstep Address Relocation</option>
                    </select>
                  </label>

                  <label>
                    <span>Describe your issue</span>
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter details here..."
                      value={supportMsg}
                      onChange={(e) => setSupportMsg(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </label>

                  <button
                    type="submit"
                    className="mobile-detail-big-action-btn is-green"
                    style={{ marginTop: '12px' }}
                  >
                    <Send size={16} />
                    <span>Submit Support Ticket</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 9. ABOUT NATURAL MILK DAIRY */}
        {profileDetailView === 'about' && (
          <div className="mobile-detail-body">
            {/* Story Banner */}
            <div className="mobile-detail-card mobile-detail-about-banner">
              <span className="mobile-detail-badge is-green">FARM HERITAGE & MISSION</span>
              <h3 style={{ margin: '8px 0 8px', fontSize: '1.35rem', fontWeight: 800 }}>
                Pure A2 Cow Milk, Exactly as Nature Intended.
              </h3>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: 1.5 }}>
                Natural Milk Dairy was founded with a single mission: to bring pure, unadulterated, chemical-free raw A2 milk from indigenous Gir cows directly to your doorstep within 3 hours of milking.
              </p>
            </div>

            {/* The 4 Pure Standards */}
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-subheading">Our 4 Pure Farm Promises</h4>
              <div className="mobile-detail-rule-list">
                <div className="mobile-detail-rule-item">
                  <div className="mobile-detail-promise-num">1</div>
                  <div>
                    <strong>100% Pure A2 Gir Cow Milk</strong>
                    <p>Zero hormones, zero adulteration, zero milk powder reconstitution.</p>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <div className="mobile-detail-promise-num">2</div>
                  <div>
                    <strong>Free-Grazing Vedic Cows</strong>
                    <p>Cruelty-free care on 45+ acres of organic green fodder pastures.</p>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <div className="mobile-detail-promise-num">3</div>
                  <div>
                    <strong>Zero-Plastic Glass Bottles</strong>
                    <p>Sterilized traditional glass packaging preserves pure taste and freshness.</p>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <div className="mobile-detail-promise-num">4</div>
                  <div>
                    <strong>3-Hour Cold-Chain Dispatch</strong>
                    <p>Chilled at 4°C and delivered to your doorstep before 6:30 AM.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Farm Stats */}
            <div className="mobile-detail-metrics-grid">
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#0d5c3a' }}>45+</span>
                <span className="mobile-detail-metric-lbl">Acres Pasture</span>
              </div>
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#0d5c3a' }}>200+</span>
                <span className="mobile-detail-metric-lbl">Gir Cows</span>
              </div>
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#0d5c3a' }}>10k+</span>
                <span className="mobile-detail-metric-lbl">Happy Homes</span>
              </div>
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#0d5c3a' }}>100%</span>
                <span className="mobile-detail-metric-lbl">Pure A2</span>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="mobile-detail-grid-actions">
              <button
                type="button"
                className="mobile-detail-btn is-primary"
                onClick={() => setActiveTab('products')}
              >
                <Milk size={18} />
                <span>Explore Farm Products</span>
              </button>
              <button
                type="button"
                className="mobile-detail-btn is-outline"
                onClick={() => setActiveTab('story')}
              >
                <Info size={18} />
                <span>Read Full Dairy Story</span>
              </button>
            </div>
          </div>
        )}

        {/* 10. DELETE ACCOUNT */}
        {profileDetailView === 'delete-account' && (
          <div className="mobile-detail-body">
            <div className="mobile-detail-card" style={{ borderColor: '#fecaca', background: '#fff5f5' }}>
              <div className="mobile-detail-card-head">
                <div className="mobile-detail-card-icon is-danger">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h4 style={{ color: '#dc2626' }}>Permanent Account Deletion</h4>
                  <p>This action cannot be undone. All your account data will be permanently removed.</p>
                </div>
              </div>

              <div className="mobile-detail-rule-list" style={{ margin: '14px 0 20px' }}>
                <div className="mobile-detail-rule-item">
                  <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <div>
                    <strong>Your daily milk subscription will be cancelled immediately.</strong>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <div>
                    <strong>All past delivery logs and ledger statements will be purged.</strong>
                  </div>
                </div>
                <div className="mobile-detail-rule-item">
                  <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <div>
                    <strong>Wallet refunds must be settled prior to account termination.</strong>
                  </div>
                </div>
              </div>

              <form onSubmit={deleteAccount}>
                <label>
                  <span>Enter your password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    required
                    onChange={(e) => setDeletePassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      marginBottom: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>

                <label>
                  <span>Type DELETE to confirm</span>
                  <input
                    type="text"
                    autoComplete="off"
                    value={deleteConfirmation}
                    required
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      marginBottom: '16px',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>

                {deleteError && (
                  <p className="customer-profile-feedback is-error" role="alert" style={{ marginBottom: '14px' }}>
                    {deleteError}
                  </p>
                )}

                <div className="customer-profile-edit-actions">
                  <button
                    type="button"
                    className="customer-profile-secondary-button"
                    disabled={deletingAccount}
                    onClick={() => setProfileDetailView(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="customer-profile-delete-button"
                    disabled={deletingAccount || deleteConfirmation !== 'DELETE' || !deletePassword}
                  >
                    {deletingAccount ? 'Deleting…' : 'Permanently delete'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderModernCustomerProfile = () => {
    const customerInitial = (currentCustomer.name || user?.name || 'C').charAt(0).toUpperCase();
    const customerName = currentCustomer.name || user?.name || 'Customer';
    const customerPhone = currentCustomer.mobile || user?.mobile || 'Not provided';
    const customerId = currentCustomer.customerId || user?.customerId || 'CUST-101';
    const handleTag = `@${customerId.toLowerCase()}`;

    return (
      <div className="modern-profile-container">
        {/* Top Header matching reference image: ←  My Profile  ⚙️ */}
        <div className="modern-profile-header">
          <button
            type="button"
            className="modern-profile-header-btn"
            onClick={() => {
              setActivePage('dashboard');
              setActiveTab('home');
            }}
            aria-label="Back to home"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="modern-profile-header-title">My Profile</h2>
          <button
            type="button"
            className="modern-profile-header-btn"
            onClick={() => openProfileDetail('personal-info')}
            aria-label="Settings"
          >
            <Settings size={22} />
          </button>
        </div>

        {/* FEEDBACK TOAST */}
        {profileMessage && (
          <div
            className="driver-profile-feedback"
            style={{
              padding: '12px 16px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              color: '#065f46',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <CheckCircle2 size={16} color="#059669" />
            <span>{profileMessage}</span>
          </div>
        )}

        {/* Identity Section: Circular avatar with camera badge + Name + Handle + Red Pill Button */}
        <div className="modern-profile-identity">
          <div className="modern-profile-avatar-wrap">
            <div className="modern-profile-avatar-placeholder">
              {customerInitial}
            </div>
            <button
              type="button"
              className="modern-profile-camera-badge"
              onClick={() => openProfileDetail('personal-info')}
              title="Change profile photo"
              aria-label="Change photo"
            >
              <Camera size={13} />
            </button>
          </div>

          <div className="modern-profile-identity-info">
            <h3 className="modern-profile-name">{customerName}</h3>
            <span className="modern-profile-handle">{handleTag}</span>
            <button
              type="button"
              className="modern-profile-edit-btn"
              onClick={() => openProfileDetail('personal-info')}
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* List of menu rows matching reference image layout */}
        <div className="modern-profile-menu-list">
          {/* Favourites / Daily Milk Plan */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('subscription')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><Heart size={20} /></span>
              <div>
                <span className="modern-profile-menu-label">Favourites</span>
                <span className="modern-profile-menu-sub">{milkQuantity} {milkUnit} Daily Milk</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Downloads / Invoices & History */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => navigateToPage('deliveries')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><FileText size={20} /></span>
              <div>
                <span className="modern-profile-menu-label">Downloads</span>
                <span className="modern-profile-menu-sub">Delivery receipts & statements</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Language / Delivery Timing Preferences */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('delivery-window')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><Clock3 size={20} /></span>
              <div>
                <span className="modern-profile-menu-label">Delivery Window</span>
                <span className="modern-profile-menu-sub">Before 6:30 AM early morning</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Location / Doorstep Address */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('personal-info')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><MapPin size={20} /></span>
              <div>
                <span className="modern-profile-menu-label">Location</span>
                <span className="modern-profile-menu-sub">{address || 'Doorstep Address'}</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Subscription / Vacation & Plan */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('pause')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><CalendarDays size={20} /></span>
              <div>
                <span className="modern-profile-menu-label">Subscription</span>
                <span className="modern-profile-menu-sub">{isPaused ? 'Paused for vacation' : 'Active doorstep delivery'}</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: isPaused ? '#b45309' : '#059669', background: isPaused ? '#fef3c7' : '#ecfdf5', padding: '3px 8px', borderRadius: '8px' }}>
                {isPaused ? 'Paused' : 'Active'}
              </span>
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Clear Cache / Refresh Data */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => {
              refreshAll?.();
              reloadLedger();
              setProfileMessage('App cache cleared and data reloaded.');
              setTimeout(() => setProfileMessage(''), 2500);
            }}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><Trash2 size={20} /></span>
              <div>
                <span className="modern-profile-menu-label">Clear cache</span>
                <span className="modern-profile-menu-sub">Sync with live farm database</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Clear History / About Farm */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('about')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><Info size={20} /></span>
              <div>
                <span className="modern-profile-menu-label">About Us</span>
                <span className="modern-profile-menu-sub">100% Pure A2 Gir Cow & Buffalo Milk</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Log out (Red text & icon matching reference image) */}
          <button
            type="button"
            className="modern-profile-menu-row is-logout"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><LogOut size={20} /></span>
              <span className="modern-profile-menu-label">Log out</span>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={18} />
            </div>
          </button>
        </div>
      </div>
    );
  };

  const renderModernEditProfile = () => {
    const customerInitial = (profileForm.name || currentCustomer.name || user?.name || 'C').charAt(0).toUpperCase();
    const handleTag = profileForm.username || (profileForm.name ? `@${profileForm.name.toLowerCase().replace(/\s+/g, '')}` : `@${customerId.toLowerCase()}`);

    return (
      <div className="modern-profile-container">
        {/* Screen 2 Header: Back Arrow, "Edit Profile", Green Checkmark (Save) */}
        <div className="modern-profile-header">
          <button
            type="button"
            className="modern-profile-header-btn"
            onClick={() => {
              setIsEditingProfile(false);
              setProfileDetailView(null);
            }}
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="modern-profile-header-title">Edit Profile</h2>
          <button
            type="submit"
            form="modern-customer-edit-form"
            className="modern-profile-header-btn is-save"
            disabled={profileSaving}
            aria-label="Save changes"
          >
            <Check size={24} strokeWidth={2.5} color="#10b981" />
          </button>
        </div>

        {/* Feedback Messages */}
        {profileMessage && (
          <div
            className="driver-profile-feedback"
            style={{
              padding: '12px 16px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              color: '#065f46',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={16} color="#059669" />
            <span>{profileMessage}</span>
          </div>
        )}
        {profileError && (
          <div
            className="customer-profile-feedback is-error"
            role="alert"
            style={{
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              color: '#991b1b',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} color="#dc2626" />
            <span>{profileError}</span>
          </div>
        )}

        {/* Centered Avatar with Camera Badge */}
        <div className="modern-edit-avatar-wrap">
          <div className="modern-profile-avatar-wrap">
            <div className="modern-profile-avatar-placeholder">
              {customerInitial}
            </div>
            <button
              type="button"
              className="modern-profile-camera-badge"
              title="Change profile picture"
              aria-label="Change photo"
              onClick={() => {
                alert('Upload profile photo feature: you can connect your photo or select from gallery.');
              }}
            >
              <Camera size={13} />
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <form id="modern-customer-edit-form" className="modern-edit-form" onSubmit={saveProfile}>
          {/* 1. Name */}
          <div className="modern-edit-field">
            <label className="modern-edit-label">Name</label>
            <div className="modern-edit-input-container">
              <input
                type="text"
                className="modern-edit-input"
                placeholder="Charlotte king"
                value={profileForm.name ?? ''}
                required
                onChange={(e) => setProfileForm((cur) => ({ ...cur, name: e.target.value }))}
              />
            </div>
          </div>

          {/* 2. E mail address */}
          <div className="modern-edit-field">
            <label className="modern-edit-label">E mail address</label>
            <div className="modern-edit-input-container">
              <input
                type="email"
                className="modern-edit-input"
                placeholder="@johnkgraphics.gmail.com"
                value={profileForm.email ?? ''}
                onChange={(e) => setProfileForm((cur) => ({ ...cur, email: e.target.value }))}
              />
            </div>
          </div>

          {/* 3. User name */}
          <div className="modern-edit-field">
            <label className="modern-edit-label">User name</label>
            <div className="modern-edit-input-container">
              <input
                type="text"
                className="modern-edit-input"
                placeholder="@johnkgraphics"
                value={profileForm.username ?? handleTag}
                onChange={(e) => setProfileForm((cur) => ({ ...cur, username: e.target.value }))}
              />
            </div>
          </div>

          {/* 4. Password */}
          <div className="modern-edit-field">
            <label className="modern-edit-label">Password</label>
            <div className="modern-edit-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                className="modern-edit-input"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
              <button
                type="button"
                className="modern-edit-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* 5. Phone number */}
          <div className="modern-edit-field">
            <label className="modern-edit-label">Phone number</label>
            <div className="modern-edit-input-container">
              <div className="modern-edit-phone-prefix">
                +91 ▼
              </div>
              <input
                type="tel"
                className="modern-edit-input"
                placeholder="6895312"
                value={profileForm.mobile ?? ''}
                required
                onChange={(e) => setProfileForm((cur) => ({ ...cur, mobile: e.target.value }))}
              />
            </div>
          </div>

          {/* 6. Doorstep Address */}
          <div className="modern-edit-field">
            <label className="modern-edit-label">Doorstep Address</label>
            <div className="modern-edit-input-container">
              <input
                type="text"
                className="modern-edit-input"
                placeholder="Flat / House / Wing / Society"
                value={profileForm.address ?? ''}
                required
                onChange={(e) => setProfileForm((cur) => ({ ...cur, address: e.target.value }))}
              />
            </div>
          </div>

          {/* 7. Area / Locality */}
          <div className="modern-edit-field">
            <label className="modern-edit-label">Area / Locality</label>
            <div className="modern-edit-input-container">
              <input
                type="text"
                className="modern-edit-input"
                placeholder="Madhapur"
                value={profileForm.area ?? ''}
                onChange={(e) => setProfileForm((cur) => ({ ...cur, area: e.target.value }))}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="modern-edit-submit-btn"
            disabled={profileSaving}
          >
            {profileSaving ? 'Saving...' : '✓ Save Profile'}
          </button>
        </form>
      </div>
    );
  };

  const renderMobileProfile = () => {
    const customerInitial = (currentCustomer.name || user?.name || 'C').charAt(0).toUpperCase();
    const customerName = currentCustomer.name || user?.name || 'Customer';
    const customerPhone = currentCustomer.mobile || user?.mobile || 'Not provided';
    const customerEmail = currentCustomer.email || user?.email || 'Not provided';
    const customerArea = currentCustomer.area || user?.area || user?.assignedArea || 'Madhapur';
    const customerId = currentCustomer.customerId || user?.customerId || 'CUST-101';
    const customerAddress = currentCustomer.address || user?.address || 'Not provided';
    const customerWhatsapp = currentCustomer.whatsapp || currentCustomer.mobile || user?.mobile || 'Not provided';
    const totalDeliveries = ledgerEntries.filter((e) => e.type === 'delivery').length || customerDeliveries.length;

    return (
      <div
        className="driver-profile-page customer-profile-page"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '880px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Page Heading matching driver mobile profile page */}
        <div className="driver-profile-page-heading" style={{ padding: '4px 2px 2px' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>My profile</h1>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
            Manage your personal details, subscription plan, and doorstep preferences.
          </p>
        </div>

        {/* FEEDBACK TOAST */}
        {profileMessage && (
          <div
            className="driver-profile-feedback"
            style={{
              padding: '12px 16px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              color: '#065f46',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <CheckCircle2 size={16} color="#059669" />
            <span>{profileMessage}</span>
          </div>
        )}

        {/* 1. PRIMARY CUSTOMER PROFILE CARD WITH EDIT BUTTON RIGHT NEAR PROFILE */}
        <div
          className="driver-profile-primary-card"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          {/* Identity Row: Avatar, Name, and Quick Edit Button directly alongside avatar */}
          <div
            style={{
              padding: '18px 18px 14px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.22)',
                  flexShrink: 0,
                }}
              >
                {customerInitial}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {customerName}
                  </h2>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isPaused ? '#f59e0b' : '#10b981',
                      display: 'inline-block',
                    }}
                    title={isPaused ? 'Delivery paused' : 'Subscription active'}
                  />
                </div>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 6px 0' }}>
                  {customerPhone} {customerEmail && customerEmail !== 'Not provided' ? `• ${customerEmail}` : ''}
                </p>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: isPaused ? '#fef3c7' : '#ecfdf5',
                    color: isPaused ? '#92400e' : '#065f46',
                    border: `1px solid ${isPaused ? '#fde68a' : '#a7f3d0'}`,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  {isPaused ? '⏸ Delivery Paused' : '✓ Subscription Active'}
                </span>
              </div>
            </div>

            {/* Direct Edit Button positioned near profile */}
            <button
              type="button"
              onClick={() => openProfileDetail('personal-info')}
              style={{
                background: '#f0fdf4',
                color: '#059669',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Edit2 size={13} />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Clean Summary Grid with User Data and Modules */}
          <div
            className="driver-profile-summary-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
              padding: '16px 18px',
            }}
          >
            <div
              className="driver-profile-summary-item"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                Full name
              </div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>{customerName}</div>
            </div>

            <div
              className="driver-profile-summary-item"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                Mobile number
              </div>
              <a
                href={`tel:${customerPhone}`}
                style={{ fontSize: '0.94rem', fontWeight: 800, color: '#315a42', textDecoration: 'none' }}
              >
                {customerPhone}
              </a>
            </div>

            <div
              className="driver-profile-summary-item"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                Email address
              </div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>{customerEmail}</div>
            </div>

            <div
              className="driver-profile-summary-item"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                City / Area
              </div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>{customerArea}</div>
            </div>

            <div
              className="driver-profile-summary-item"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                Customer ID
              </div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#059669' }}>{customerId}</div>
            </div>

            <div
              className="driver-profile-summary-item"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                WhatsApp
              </div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>{customerWhatsapp}</div>
            </div>

            <div
              className="driver-profile-summary-item"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px',
                gridColumn: '1 / -1',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                Doorstep delivery address
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>{customerAddress}</div>
            </div>
          </div>
        </div>

        {/* 2. SUBSCRIPTIONS & BOOKINGS MODULE (MATCHING DRIVER BOOKINGS STYLE) */}
        <div
          onClick={() => openProfileDetail('subscription')}
          className="driver-profile-bookings"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#059669')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CalendarDays size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  My Subscriptions
                </h3>
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  {milkQuantity} {milkUnit} · {isPaused ? 'Paused' : 'Active'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Daily milk plan & doorstep delivery schedule • Tap to view & edit
              </p>
            </div>
          </div>

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <ChevronRight size={18} />
          </div>
        </div>

        {/* 3. SAVED DELIVERIES MODULE */}
        <div
          onClick={() => openProfileDetail('deliveries')}
          className="driver-profile-bookings"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#059669')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Truck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Saved Deliveries
                </h3>
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  {totalDeliveries} Drops Completed
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Doorstep delivery history, proofs & timing logs • Tap to view all
              </p>
            </div>
          </div>

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <ChevronRight size={18} />
          </div>
        </div>

        {/* 4. REFUND WALLET & BALANCE MODULE */}
        <div
          onClick={() => openProfileDetail('wallet')}
          className="driver-profile-bookings"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#059669')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Wallet size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Refund Wallet & Balance
                </h3>
                <span
                  style={{
                    background: balance > 0 ? '#fef2f2' : '#ecfdf5',
                    color: balance > 0 ? '#dc2626' : '#065f46',
                    border: `1px solid ${balance > 0 ? '#fecaca' : '#a7f3d0'}`,
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  ₹{balance.toLocaleString('en-IN')} Due
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Outstanding dues, ledger statement & UPI payments • Tap to manage
              </p>
            </div>
          </div>

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <ChevronRight size={18} />
          </div>
        </div>

        {/* 5. DELIVERY SCHEDULE & CONTROLS (MATCHING DRIVER BIKE & FLEET CARD) */}
        <div
          className="driver-profile-vehicle-card"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div
            className="driver-profile-card-heading"
            style={{
              background: 'linear-gradient(90deg, #f0fdf4 0%, #ecfdf5 100%)',
              borderBottom: '1px solid #e2e8f0',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="#059669" />
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#065f46',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Delivery Schedule & Controls
              </span>
            </div>
          </div>

          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div
                onClick={() => openProfileDetail('pause')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#059669')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PauseCircle size={16} color="#059669" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>Cancel / Pause</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#065f46', background: '#ecfdf5', padding: '2px 6px', borderRadius: '6px' }}>
                    100% Free
                  </span>
                </div>
                <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                  Set vacation dates without any cancellation fee
                </p>
              </div>

              <div
                onClick={() => openProfileDetail('quantity')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#059669')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={16} color="#059669" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>Update Quantity</span>
                  </div>
                  <ChevronRight size={14} color="#94a3b8" />
                </div>
                <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                  Change tomorrow's milk quantity or extra packets
                </p>
              </div>

              <div
                onClick={() => openProfileDetail('delivery-window')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#059669')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock3 size={16} color="#059669" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>Delivery Window</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0284c7', background: '#f0f9ff', padding: '2px 6px', borderRadius: '6px' }}>
                    Before 6:30 AM
                  </span>
                </div>
                <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                  Silent early morning doorstep delivery guarantee
                </p>
              </div>

              <div
                onClick={() => openProfileDetail('personal-info')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#059669')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="#059669" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>Drop Instructions</span>
                  </div>
                  <ChevronRight size={14} color="#94a3b8" />
                </div>
                <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                  Gate codes, milk bag placement & special notes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. SUPPORT & HELPLINES (MATCHING DRIVER SUPPORT CARD) */}
        <div
          className="driver-profile-support-card"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '18px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Headphones size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Customer Care & Helplines
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                Instant contact for delivery timings, milk quality, or account help
              </p>
            </div>
          </div>

          <div
            className="driver-profile-support-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}
          >
            {/* Supervisor Hotline */}
            <a
              href="tel:9876543210"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>Hub Care Hotline</span>
                <PhoneCall size={16} color="#059669" />
              </div>
              <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>+91 98765 43210</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Delivery queries, address changes & urgent issues
              </span>
            </a>

            {/* WhatsApp Support Desk */}
            <a
              href={`https://wa.me/919876543210?text=Hello%20Natural%20Milk%20Dairy%20Support,%20Customer%20${customerId}%20needs%20assistance.`}
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>WhatsApp Desk</span>
                <MessageCircle size={16} color="#059669" />
              </div>
              <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>Chat with Support</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Send doorstep delivery notes or feedback
              </span>
            </a>

            {/* Farm Story & Purity */}
            <div
              onClick={() => openProfileDetail('about')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>Our Farm Story</span>
                <Info size={16} color="#059669" />
              </div>
              <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>100% Pure A2 Milk</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Sterilized glass bottles & grass-fed farm promise
              </span>
            </div>
          </div>
        </div>

        {/* 7. ACCOUNT ACTIONS (MATCHING DRIVER ACCOUNT ACTIONS CARD) */}
        <div
          className="driver-profile-account-actions"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '18px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            <LogOut size={16} />
            <span>Sign Out of Customer Account</span>
          </button>

          {/* Delete Account Button */}
          <button
            type="button"
            onClick={() => openProfileDetail('delete-account')}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '10px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ffe4e6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff1f2')}
          >
            <Trash2 size={16} />
            <span>Delete Customer Account</span>
          </button>

          <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '0.72rem', color: '#94a3b8' }}>
            Natural Milk Dairy — Hyderabad Direct Farm Delivery System
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    if (isEditingProfile || profileDetailView === 'personal-info') {
      return renderModernEditProfile();
    }
    if (profileDetailView) {
      return renderProfileDetailView();
    }
    return renderModernCustomerProfile();
  };

  const renderPage = () => {
    if (activePage === 'subscription') {
      return (
        <section className="customer-dashboard-main customer-subscription-page">
          {renderPlanCard()}
          {renderDeliveryActions()}
        </section>
      );
    }
    if (activePage === 'deliveries') return renderDeliveryHistory('Your deliveries');
    if (activePage === 'profile') return renderProfile();
    return renderDashboard();
  };

  return (
    <div className="customer-dashboard-layout">
      <aside className="customer-app-sidebar">
        <button
          type="button"
          className="customer-app-brand customer-app-brand-btn"
          onClick={() => { setActivePage('dashboard'); setActiveTab('home'); }}
          aria-label="Go to home page"
          title="Go to home page"
        >
          <span className="customer-app-logo">
            <img
              src={CLOUDINARY_MEDIA.logo}
              alt="Natural Milk Dairy"
              onError={(event) => { event.currentTarget.src = '/logo.png'; }}
            />
          </span>
          <span className="customer-app-brand-copy">
            <strong>Natural Milk Dairy</strong>
            <small><span /> Customer Console</small>
          </span>
        </button>

        <div className="customer-app-sidebar-nav">
          <span className="customer-app-nav-caption">Navigation</span>
          <CustomerBottomNav
            className="customer-sidebar-nav"
            activePage={activePage}
            onNavigate={navigateToPage}
          />
        </div>

        <div className="customer-app-sidebar-footer">
          <div className="customer-sidebar-user">
            <span className="customer-sidebar-avatar">{(user?.name || currentCustomer.name || 'C').charAt(0).toUpperCase()}</span>
            <span className="customer-sidebar-user-copy">
              <strong>{user?.name || currentCustomer.name}</strong>
              <small>Customer account</small>
            </span>
          </div>
          <div className="customer-sidebar-footer-actions">
            <button
              type="button"
              className="customer-sidebar-logout"
              title="Sign out"
              aria-label="Sign out"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="customer-sidebar-delete-btn"
              title="Delete account"
              aria-label="Delete account"
              onClick={() => {
                setDeleteConfirmation('');
                setDeletePassword('');
                setDeleteError('');
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="customer-app-main">
        <header className={`customer-app-header${activePage === 'profile' && isMobile ? ' is-profile-mobile-hidden' : ''}`}>
          <button
            type="button"
            className="customer-app-header-title customer-app-header-brand-btn"
            onClick={() => { setActivePage('dashboard'); setActiveTab('home'); }}
            aria-label="Go to home"
            title="Go to home"
          >
            <span className="customer-app-header-logo">
              <img src={CLOUDINARY_MEDIA.logo} alt="" onError={(event) => { event.currentTarget.src = '/logo.png'; }} />
            </span>
            <span className="customer-app-header-copy">
              <strong>Natural Milk Dairy</strong>
              <small>Customer portal · {user?.name || currentCustomer.name}</small>
            </span>
          </button>
          <div className="customer-app-header-actions">
            <button
              type="button"
              className={`customer-page-status${isPaused ? ' is-paused is-interactive' : ''}`}
              onClick={isPaused ? handleRestartDelivery : () => onOpenPauseModal?.(currentCustomer)}
              title={isPaused ? 'Click to restart deliveries' : 'Manage delivery schedule'}
              style={{ cursor: 'pointer', font: 'inherit' }}
            >
              <span />
              {isPaused ? (restartingDelivery ? 'Restarting...' : 'Delivery paused · Click to restart') : 'Subscription active'}
            </button>
            <button
              type="button"
              className="customer-header-alerts"
              onClick={() => setIsNotificationOpen(true)}
              aria-label={`View notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell size={17} aria-hidden="true" />
              <span>Alerts</span>
              {unreadCount > 0 && <span className="customer-header-alert-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            <button
              type="button"
              className="customer-header-profile"
              onClick={() => navigateToPage('profile')}
              aria-label="Open profile"
            >
              <span>{(user?.name || currentCustomer.name || 'C').charAt(0).toUpperCase()}</span>
              <strong>{user?.name || currentCustomer.name}</strong>
            </button>
          </div>
        </header>

        <div className="customer-dashboard-content">
          {(!isMobile || activePage !== 'profile') && (
            <div className="customer-page-heading">
              <div>
                <span className="customer-section-kicker">CUSTOMER PORTAL · ID {currentCustomer.customerId || 'CUST-101'}</span>
                <h1>{activePage === 'profile' ? 'Profile & Settings' : currentPage.label}</h1>
                <p>
                  {activePage === 'dashboard' && 'Your daily essentials, all in one place.'}
                  {activePage === 'subscription' && 'Review your plan and manage your upcoming delivery.'}
                  {activePage === 'deliveries' && 'Track your latest doorstep deliveries and payments.'}
                  {activePage === 'profile' && 'Manage your personal details, subscription plan, and doorstep preferences.'}
                </p>
              </div>
            </div>
          )}
          {renderPage()}
        </div>
      </div>

      {isMobile && (
        <CustomerBottomNav
          className="customer-bottom-nav customer-home-bottom-nav"
          ariaLabel="Main navigation"
          items={CUSTOMER_HOME_NAV_ITEMS}
          activePage={activePage === 'profile' ? 'profile' : 'home'}
          onNavigate={(page) => {
            if (page === 'profile') {
              navigateToPage('profile');
            } else {
              if (page === 'products') {
                localStorage.removeItem('nmd_selected_product_id');
                window.dispatchEvent(new CustomEvent('nmd_reset_products_page'));
              }
              setActiveTab(page);
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', padding: '26px 24px', borderRadius: '18px', textAlign: 'center' }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <LogOut size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              Sign Out of Account?
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 22px 0', lineHeight: 1.5 }}>
              Are you sure you want to sign out of your Natural Milk Dairy customer account? You can log back in anytime.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                  setActiveTab('home');
                }}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => !deletingAccount && setShowDeleteConfirm(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '26px 24px', borderRadius: '18px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Trash2 size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', margin: '0 0 6px 0' }}>
                Delete Account?
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                This action is permanent and cannot be undone. All your milk subscriptions, delivery records, and profile details will be permanently removed.
              </p>
            </div>

            <form onSubmit={deleteAccount}>
              {deleteError && (
                <div className="mobile-profile-alert is-error" style={{ marginBottom: '14px' }}>
                  <AlertCircle size={16} />
                  <span>{deleteError}</span>
                </div>
              )}

              <label style={{ display: 'block', marginBottom: '12px' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Enter your password:
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Your account password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  disabled={deletingAccount}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '18px' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Type <strong style={{ color: '#dc2626' }}>DELETE</strong> to confirm:
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  required
                  placeholder="DELETE"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  disabled={deletingAccount}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  disabled={deletingAccount}
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount || deleteConfirmation !== 'DELETE' || !deletePassword}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    border: 'none',
                    background: deletingAccount || deleteConfirmation !== 'DELETE' || !deletePassword ? '#fca5a5' : '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: deletingAccount || deleteConfirmation !== 'DELETE' || !deletePassword ? 'not-allowed' : 'pointer',
                  }}
                >
                  {deletingAccount ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
