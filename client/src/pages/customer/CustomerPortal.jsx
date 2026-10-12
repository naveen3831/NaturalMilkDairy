import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDairy } from '../../context/DairyContext';
import { useNotifications } from '../../context/NotificationContext';
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
  const { customers, deliveries, refreshAll, notifyRealtimeSync } = useDairy();
  const { unreadCount, setIsNotificationOpen } = useNotifications();
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [supportTopic, setSupportTopic] = useState('delivery');
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

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
    return () => {
      if (bc) bc.close();
    };
  }, [reloadLedger]);

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

  const navigateToPage = (page) => {
    localStorage.setItem('nmd_customer_page', page);
    setActivePage(page);
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
        <button
          type="button"
          className="customer-action-button customer-action-pause"
          onClick={() => onOpenPauseModal?.(currentCustomer)}
        >
          <span className="customer-action-icon"><PauseCircle size={19} aria-hidden="true" /></span>
          <span>{isPaused ? 'Manage delivery pause' : 'Pause delivery for a trip'}</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
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
                        {delivery.status === 'delivered' ? 'Delivered' : 'Pending'}
                      </span>
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
              <button
                type="button"
                className="mobile-detail-big-action-btn"
                onClick={() => onOpenPauseModal?.(currentCustomer)}
              >
                <PauseCircle size={18} />
                <span>{isPaused ? 'Update Vacation Dates / Resume' : 'Set Vacation Schedule Now'}</span>
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

  const renderProfile = () => {
    if (profileDetailView) {
      return renderProfileDetailView();
    }

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
      <div className="profile-full-page">
        {/* Page Title Row */}
        <div className="profile-page-title-row">
          <div className="profile-page-title-left">
            <span className="customer-section-kicker">MY ACCOUNT · {customerId}</span>
            <h1>My Profile</h1>
          </div>
          <button
            type="button"
            className="profile-page-edit-btn"
            onClick={() => openProfileDetail('personal-info')}
          >
            <Edit3 size={15} />
            Edit Profile
          </button>
        </div>

        {/* Success message */}
        {profileMessage && (
          <div className="mobile-profile-alert is-success" role="status" style={{ marginBottom: '20px' }}>
            <CheckCircle2 size={16} />
            <span>{profileMessage}</span>
          </div>
        )}

        {/* Two-column layout */}
        <div className="profile-two-col">

          {/* ── LEFT PANEL ── */}
          <div className="profile-left-panel">

            {/* Identity Card */}
            <div className="profile-identity-card">
              <div className="profile-avatar-large">{customerInitial}</div>
              <div className="profile-identity-meta">
                <div className="profile-identity-name-row">
                  <h2 className="profile-identity-name">{customerName}</h2>
                  <span
                    className={`profile-identity-dot${isPaused ? ' is-paused' : ''}`}
                    title={isPaused ? 'Delivery paused' : 'Subscription active'}
                  />
                </div>
                <p className="profile-identity-phone">{customerPhone}</p>
                <span className={`profile-identity-status${isPaused ? ' is-paused' : ''}`}>
                  {isPaused ? '⏸ Delivery Paused' : '✓ Subscription Active'}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="profile-info-card">
              <h3 className="profile-card-title">Contact & Location</h3>
              <div className="profile-info-grid">
                <div className="profile-info-field" onClick={() => openProfileDetail('personal-info')} style={{ cursor: 'pointer' }}>
                  <div className="profile-field-icon"><Mail size={15} /></div>
                  <div>
                    <span className="profile-field-label">EMAIL</span>
                    <span className="profile-field-value" title={customerEmail}>{customerEmail}</span>
                  </div>
                </div>
                <div className="profile-info-field" onClick={() => openProfileDetail('personal-info')} style={{ cursor: 'pointer' }}>
                  <div className="profile-field-icon"><Phone size={15} /></div>
                  <div>
                    <span className="profile-field-label">PHONE</span>
                    <span className="profile-field-value">{customerPhone}</span>
                  </div>
                </div>
                <div className="profile-info-field" onClick={() => openProfileDetail('personal-info')} style={{ cursor: 'pointer' }}>
                  <div className="profile-field-icon"><MapPin size={15} /></div>
                  <div>
                    <span className="profile-field-label">CITY / AREA</span>
                    <span className="profile-field-value" title={customerArea}>{customerArea}</span>
                  </div>
                </div>
                <div className="profile-info-field" onClick={() => openProfileDetail('personal-info')} style={{ cursor: 'pointer' }}>
                  <div className="profile-field-icon"><UserRound size={15} /></div>
                  <div>
                    <span className="profile-field-label">CUSTOMER ID</span>
                    <span className="profile-field-value">{customerId}</span>
                  </div>
                </div>
                <div className="profile-info-field is-full" onClick={() => openProfileDetail('personal-info')} style={{ cursor: 'pointer' }}>
                  <div className="profile-field-icon"><Home size={15} /></div>
                  <div>
                    <span className="profile-field-label">DELIVERY ADDRESS</span>
                    <span className="profile-field-value" style={{ whiteSpace: 'normal', lineHeight: 1.4 }} title={customerAddress}>{customerAddress}</span>
                  </div>
                </div>
                <div className="profile-info-field is-full" onClick={() => openProfileDetail('personal-info')} style={{ cursor: 'pointer' }}>
                  <div className="profile-field-icon"><MessageSquare size={15} /></div>
                  <div>
                    <span className="profile-field-label">WHATSAPP</span>
                    <span className="profile-field-value">{customerWhatsapp}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="profile-stats-row">
              <div className="profile-stat-card">
                <span className="profile-stat-num" style={{ color: '#2563eb' }}>{milkQuantity} {milkUnit}</span>
                <span className="profile-stat-lbl">Daily Milk</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-num" style={{ color: '#059669' }}>{totalDeliveries}</span>
                <span className="profile-stat-lbl">Deliveries</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-num" style={{ color: balance > 0 ? '#dc2626' : '#059669' }}>₹{balance.toLocaleString('en-IN')}</span>
                <span className="profile-stat-lbl">Balance Due</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="profile-right-panel">

            {/* Subscriptions & Wallet */}
            <div className="profile-section-card">
              <div className="profile-section-kicker">SUBSCRIPTIONS &amp; WALLET</div>
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('subscription')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><CalendarDays size={18} /></div>
                  <div>
                    <span className="profile-menu-label">My subscriptions</span>
                    <span className="profile-menu-desc">Daily milk plan &amp; delivery schedule</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <span className="profile-menu-badge">{milkQuantity} {milkUnit} · {isPaused ? 'Paused' : 'Active'}</span>
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
              <div className="profile-row-divider" />
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('deliveries')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><Truck size={18} /></div>
                  <div>
                    <span className="profile-menu-label">Saved deliveries</span>
                    <span className="profile-menu-desc">View your doorstep delivery history</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <span className="profile-menu-badge">{totalDeliveries} drops</span>
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
              <div className="profile-row-divider" />
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('wallet')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><Wallet size={18} /></div>
                  <div>
                    <span className="profile-menu-label">Refund wallet &amp; balance</span>
                    <span className="profile-menu-desc">Outstanding dues &amp; UPI payments</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <span className="profile-menu-badge">₹{balance.toLocaleString('en-IN')}</span>
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
            </div>

            {/* Delivery Control & Help */}
            <div className="profile-section-card">
              <div className="profile-section-kicker">DELIVERY CONTROL &amp; HELP</div>
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('pause')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><PauseCircle size={18} /></div>
                  <div>
                    <span className="profile-menu-label">Cancel / Pause schedule</span>
                    <span className="profile-menu-desc">Set vacation dates — 100% free, no penalty</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <span className="profile-menu-badge">100% free</span>
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
              <div className="profile-row-divider" />
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('quantity')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><RefreshCw size={18} /></div>
                  <div>
                    <span className="profile-menu-label">Reschedule / Update quantity</span>
                    <span className="profile-menu-desc">Change tomorrow&apos;s delivery quantity</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
              <div className="profile-row-divider" />
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('support')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><HelpCircle size={18} /></div>
                  <div>
                    <span className="profile-menu-label">24/7 helpline &amp; support</span>
                    <span className="profile-menu-desc">WhatsApp, call or raise a support ticket</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
            </div>

            {/* Preferences */}
            <div className="profile-section-card">
              <div className="profile-section-kicker">PREFERENCES</div>
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('delivery-window')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><Clock3 size={18} /></div>
                  <div>
                    <span className="profile-menu-label">Morning delivery window</span>
                    <span className="profile-menu-desc">Doorstep delivery schedule</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <span className="profile-menu-badge">Before 6:30 AM</span>
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
              <div className="profile-row-divider" />
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('personal-info')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><ShieldCheck size={18} /></div>
                  <div>
                    <span className="profile-menu-label">Doorstep delivery instructions</span>
                    <span className="profile-menu-desc">Gate code, bag placement &amp; notes</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <span className="profile-menu-badge">Active</span>
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
              <div className="profile-row-divider" />
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('about')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><Info size={18} /></div>
                  <div>
                    <span className="profile-menu-label">About Natural Milk Dairy</span>
                    <span className="profile-menu-desc">Our farm story &amp; pure A2 milk promise</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
            </div>

            {/* Account Actions */}
            <div className="profile-section-card">
              <div className="profile-section-kicker">ACCOUNT</div>
              <button
                type="button"
                className="profile-menu-row"
                onClick={() => { logout(); setActiveTab('home'); }}
              >
                <div className="profile-menu-left">
                  <div className="profile-menu-icon"><LogOut size={18} /></div>
                  <div>
                    <span className="profile-menu-label">Log out</span>
                    <span className="profile-menu-desc">Sign out of your customer account</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
              <div className="profile-row-divider" />
              <button type="button" className="profile-menu-row" onClick={() => openProfileDetail('delete-account')}>
                <div className="profile-menu-left">
                  <div className="profile-menu-icon" style={{ background: '#fff5f5', color: '#dc2626' }}><Trash2 size={18} /></div>
                  <div>
                    <span className="profile-menu-label" style={{ color: '#dc2626' }}>Delete account</span>
                    <span className="profile-menu-desc">Permanently remove your account &amp; data</span>
                  </div>
                </div>
                <div className="profile-menu-right">
                  <ChevronRight size={17} className="mobile-profile-row-chevron" />
                </div>
              </button>
            </div>

          </div>
        </div>
      </div>
    );
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
          <button
            type="button"
            className="customer-sidebar-logout"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => {
              logout();
              setActiveTab('home');
            }}
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="customer-app-main">
        <header className={`customer-app-header${activePage === 'profile' ? ' is-profile-mobile-hidden' : ''}`}>
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
            <span className={`customer-page-status${isPaused ? ' is-paused' : ''}`}>
              <span />
              {isPaused ? 'Delivery paused' : 'Subscription active'}
            </span>
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
          {activePage !== 'profile' && (
            <div className="customer-page-heading">
              <div>
                <span className="customer-section-kicker">CUSTOMER PORTAL · ID {currentCustomer.customerId || 'CUST-101'}</span>
                <h1>{currentPage.label}</h1>
                <p>
                  {activePage === 'dashboard' && 'Your daily essentials, all in one place.'}
                  {activePage === 'subscription' && 'Review your plan and manage your upcoming delivery.'}
                  {activePage === 'deliveries' && 'Track your latest doorstep deliveries and payments.'}
                </p>
              </div>
            </div>
          )}
          {renderPage()}
        </div>
      </div>

      <CustomerBottomNav
        className={`customer-bottom-nav customer-home-bottom-nav${activePage === 'profile' ? ' is-profile-mobile-hidden' : ''}`}
        ariaLabel="Main navigation"
        items={CUSTOMER_HOME_NAV_ITEMS}
        activePage={activePage === 'profile' ? 'profile' : 'home'}
        onNavigate={(page) => {
          if (page === 'profile') {
            navigateToPage('profile');
          } else {
            setActiveTab(page);
          }
        }}
      />
    </div>
  );
}
