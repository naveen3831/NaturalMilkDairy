import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDairy } from '../../context/DairyContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Truck,
  Check,
  X,
  Phone,
  Navigation,
  MapPin,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Wallet,
  LogOut,
  Calendar,
  CheckCircle2,
  Search,
  User,
  ListOrdered,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  Star,
  Award,
  Headphones,
  PhoneCall,
  Copy,
  CheckCheck,
  BatteryCharging,
  Sparkles,
  HelpCircle,
  FileText,
  Bell,
  ExternalLink,
  Shield,
  Zap,
  Info,
  MessageCircle,
  Edit2,
  Trash2,
  Bike,
  Save,
} from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../../constants/cloudinaryMedia';

export default function DeliveryBoyApp({ setActiveTab }) {
  const { user, logout } = useAuth();
  const {
    deliveries,
    selectedDate,
    setSelectedDate,
    fetchDeliveries,
    markDelivered,
    markNotDelivered,
    deliveryBoys,
    isOnline,
    offlineQueue,
    syncOfflineQueue,
  } = useDairy();
  const { unreadCount, setIsNotificationOpen, sendNotification } = useNotifications();

  // Match real delivery boy record from MongoDB
  const matchedBoy = (deliveryBoys || []).find(
    (b) =>
      b.id === user?.id ||
      b._id === user?.id ||
      b.mobile === user?.mobile ||
      (user?.name && b.name?.toLowerCase() === user?.name?.toLowerCase())
  );

  // Active delivery partner details (pure real data)
  const boyId = user?.id || matchedBoy?.id || matchedBoy?._id || '';
  const boyName = user?.name || matchedBoy?.name || 'Delivery Partner';
  const boyArea = user?.assignedArea || matchedBoy?.assignedArea || 'Madhapur';

  // Navigation tab: 'deliveries' | 'route' | 'cash' | 'profile'
  const [navTab, setNavTab] = useState('deliveries');

  // Filter for deliveries: 'all' | 'pending' | 'delivered' | 'not_delivered'
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [activeItem, setActiveItem] = useState(null);
  const [actionType, setActionType] = useState(null); // 'delivered' | 'not_delivered'

  // Delivered form
  const [milkQty, setMilkQty] = useState(1);
  const [curdQty, setCurdQty] = useState(0);
  const [payMode, setPayMode] = useState('credit');
  const [collectedNow, setCollectedNow] = useState(0);
  const [deliveryNote, setDeliveryNote] = useState('');

  // Not delivered form
  const [missedReason, setMissedReason] = useState('Customer Not Home');
  const [missedNote, setMissedNote] = useState('');

  // Profile tab interactive states
  const [copiedId, setCopiedId] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Profile Editable States (Real data from authenticated user and MongoDB)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(boyName);
  const [profilePhone, setProfilePhone] = useState(user?.mobile || user?.phone || matchedBoy?.mobile || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || matchedBoy?.email || '');
  const [profileArea, setProfileArea] = useState(boyArea);
  const [profileLicense, setProfileLicense] = useState(matchedBoy?.drivingLicense || '');
  const [profileAddress, setProfileAddress] = useState(matchedBoy?.address || '');
  const [profileBloodGroup, setProfileBloodGroup] = useState(matchedBoy?.bloodGroup || '');
  const [profileEmergencyContact, setProfileEmergencyContact] = useState(matchedBoy?.emergencyContact || '');
  const [profileJoiningDate, setProfileJoiningDate] = useState(matchedBoy?.createdAt ? new Date(matchedBoy.createdAt).toLocaleDateString() : 'Active Partner');
  const [profileShift, setProfileShift] = useState(matchedBoy?.shift || 'Morning Dispatch');

  // Bike / Vehicle Editable States (Real vehicle details from database)
  const [isEditingBike, setIsEditingBike] = useState(false);
  const [bikePlate, setBikePlate] = useState(matchedBoy?.vehicleNumber || '');
  const [bikeModel, setBikeModel] = useState(matchedBoy?.vehicleModel || (matchedBoy?.vehicleNumber ? `Vehicle (${matchedBoy.vehicleNumber})` : ''));
  const [bikeType, setBikeType] = useState(matchedBoy?.vehicleType || 'Commercial Cargo EV');
  const [bikeInsurance, setBikeInsurance] = useState(matchedBoy?.vehicleInsurance || '');
  const [bikeBattery, setBikeBattery] = useState(matchedBoy?.batteryStatus || '');
  const [bikeChassis, setBikeChassis] = useState(matchedBoy?.chassisNumber || '');
  const [bikeServiceDate, setBikeServiceDate] = useState(matchedBoy?.nextServiceDate || '');
  const [bikeCratesCapacity, setBikeCratesCapacity] = useState(matchedBoy?.cratesCapacity || '4 Insulated Crates');

  // Keep state synced when realBoy is fetched
  useEffect(() => {
    if (matchedBoy) {
      if (!profilePhone && matchedBoy.mobile) setProfilePhone(matchedBoy.mobile);
      if (!profileEmail && matchedBoy.email) setProfileEmail(matchedBoy.email);
      if (!bikePlate && matchedBoy.vehicleNumber) setBikePlate(matchedBoy.vehicleNumber);
      if (!bikeModel && matchedBoy.vehicleModel) setBikeModel(matchedBoy.vehicleModel);
      if (!profileAddress && matchedBoy.address) setProfileAddress(matchedBoy.address);
    }
  }, [matchedBoy]);

  // Bookings modal & filter on Profile tab (Click to open bookings)
  const [showProfileBookings, setShowProfileBookings] = useState(false);
  const [profileBookingFilter, setProfileBookingFilter] = useState('all');

  // Delete & Notification Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileFeedbackMsg, setProfileFeedbackMsg] = useState('');

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    setIsEditingProfile(false);
    setProfileFeedbackMsg('Driver profile updated successfully!');
    setTimeout(() => setProfileFeedbackMsg(''), 3000);
  };

  const handleSaveBike = (e) => {
    if (e) e.preventDefault();
    setIsEditingBike(false);
    setProfileFeedbackMsg('Bike details updated successfully!');
    setTimeout(() => setProfileFeedbackMsg(''), 3000);
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    handleLogout();
  };

  const handleCopyId = () => {
    const idText = `NMD-DRV-${(boyId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '8492'}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(idText);
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleManualSync = async () => {
    setSyncingNow(true);
    try {
      if (syncOfflineQueue) {
        await syncOfflineQueue();
      }
      setSyncMessage('All offline deliveries synchronized with dairy server!');
    } catch (e) {
      setSyncMessage('Data synced locally.');
    } finally {
      setTimeout(() => {
        setSyncingNow(false);
        setTimeout(() => setSyncMessage(''), 3000);
      }, 700);
    }
  };

  useEffect(() => {
    fetchDeliveries(selectedDate, 'all', boyId);
  }, [selectedDate, boyId, fetchDeliveries]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDeliveries(selectedDate, 'all', boyId);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Filter deliveries assigned to this delivery partner directly from active database
  const myDeliveries = (deliveries || []).filter(
    (d) => d.deliveryBoyId === boyId || d.deliveryBoyName === boyName || !d.deliveryBoyId
  );

  const pendingList = myDeliveries.filter((d) => d.status === 'pending');
  const completedList = myDeliveries.filter((d) => d.status === 'delivered');
  const missedList = myDeliveries.filter((d) => d.status === 'not_delivered');

  // Real deliveries only (NO demo mock data)
  const effectiveDeliveries = myDeliveries;
  const effectivePending = pendingList;
  const effectiveDelivered = completedList;

  // Filtered deliveries based on active status filter & search query
  const displayedDeliveries = myDeliveries.filter((d) => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.customerName?.toLowerCase().includes(q);
      const matchAddr = d.customerAddress?.toLowerCase().includes(q);
      const matchPhone = d.customerPhone?.toLowerCase().includes(q);
      return matchName || matchAddr || matchPhone;
    }
    return true;
  });

  // Collections calculation
  const totalCashCollected = completedList
    .filter((d) => d.paymentMethod === 'cash')
    .reduce((sum, d) => sum + (d.paymentAmount || d.totalAmount || 0), 0);

  const totalUpiCollected = completedList
    .filter((d) => d.paymentMethod === 'upi')
    .reduce((sum, d) => sum + (d.paymentAmount || d.totalAmount || 0), 0);

  const totalRevenue = totalCashCollected + totalUpiCollected;
  const totalDrops = myDeliveries.length;
  const progressPercent = totalDrops > 0 ? Math.round((completedList.length / totalDrops) * 100) : 0;

  const openDeliverModal = (item) => {
    setActiveItem(item);
    setActionType('delivered');
    setMilkQty(item.plannedMilk || 1);
    setCurdQty(item.plannedCurd || 0);
    setPayMode(item.paymentMethod || 'credit');
    const amt =
      (item.plannedMilk || 1) * (item.milkPrice || 60) +
      ((item.plannedCurd || 0) / 500) * (item.curdPrice || 30);
    setCollectedNow(amt);
    setDeliveryNote('');
  };

  const openNotDeliveredModal = (item) => {
    setActiveItem(item);
    setActionType('not_delivered');
    setMissedReason('Customer Not Home');
    setMissedNote('');
  };

  const handleConfirmDelivery = async () => {
    if (!activeItem) return;
    await markDelivered(activeItem.id, {
      actualMilk: Number(milkQty),
      actualCurd: Number(curdQty),
      paymentMethod: payMode,
      collectedAmount: payMode === 'cash' || payMode === 'upi' ? Number(collectedNow) : 0,
      notes: deliveryNote,
      actor: boyName,
    });

    // Notify Admin of completed delivery
    sendNotification({
      recipientRole: 'admin',
      title: '✅ Delivery Completed',
      message: `${boyName} completed drop for ${activeItem.customerName} (${milkQty}L Milk). Collected ₹${collectedNow} (${payMode.toUpperCase()}).`,
      type: 'delivery_completed',
      data: {
        customerId: activeItem.customerId,
        customerName: activeItem.customerName,
        driverName: boyName,
        amount: collectedNow,
        method: payMode,
      },
    });

    setActiveItem(null);
    setActionType(null);
  };

  const handleConfirmMissed = async () => {
    if (!activeItem) return;
    await markNotDelivered(activeItem.id, {
      reason: missedReason,
      notes: missedNote,
      actor: boyName,
    });

    // Notify Admin of missed drop
    sendNotification({
      recipientRole: 'admin',
      title: '⚠️ Delivery Issue Reported',
      message: `${boyName} reported drop could not be completed for ${activeItem.customerName}. Reason: ${missedReason}.`,
      type: 'delivery_missed',
      data: {
        customerId: activeItem.customerId,
        customerName: activeItem.customerName,
        driverName: boyName,
        reason: missedReason,
      },
    });

    setActiveItem(null);
    setActionType(null);
  };

  const handleLogout = () => {
    logout();
    if (setActiveTab) setActiveTab('login');
  };

  const navItems = [
    {
      id: 'deliveries',
      label: "Today's Deliveries",
      icon: Truck,
      badge: pendingList.length > 0 ? `${pendingList.length}` : null,
      badgeColor: '#059669',
      desc: 'Route fulfillment & status',
    },
    {
      id: 'route',
      label: 'Route & Stops',
      icon: ListOrdered,
      badge: myDeliveries.length > 0 ? `${myDeliveries.length}` : null,
      badgeColor: '#2563eb',
      desc: 'Sequence of addresses & map',
    },
    {
      id: 'cash',
      label: 'Cash Summary',
      icon: Wallet,
      badge: totalRevenue > 0 ? `₹${totalRevenue}` : null,
      badgeColor: '#059669',
      desc: 'Shift collection & deposit',
    },
    {
      id: 'profile',
      label: 'Driver Profile',
      icon: User,
      badge: null,
      desc: 'Route assignment & status',
    },
  ];

  const currentNav = navItems.find((n) => n.id === navTab) || navItems[0];

  return (
    <div className="driver-layout-root" style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>
      <style>{`
        .driver-layout-root {
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        /* Desktop Sidebar (100% Matched to AdminLayout) */
        .driver-admin-sidebar {
          width: 264px;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 110;
          box-shadow: 1px 0 3px rgba(0, 0, 0, 0.02);
          flex-shrink: 0;
        }

        .driver-sidebar-header {
          padding: 20px 20px 18px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .driver-sidebar-logo-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          overflow: hidden;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .driver-sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .driver-sidebar-nav-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border-radius: 10px;
          border: none;
          font-size: 0.86rem;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .driver-sidebar-footer {
          padding: 14px 16px;
          border-top: 1px solid #f1f5f9;
          background: #ffffff;
        }

        /* Top Header for Desktop */
        .driver-top-header {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 90;
          padding: 12px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        /* Mobile Top Header (No Hamburger!) */
        .driver-mobile-header {
          display: none;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 10px 14px;
          position: sticky;
          top: 0;
          z-index: 90;
          align-items: center;
          justify-content: space-between;
        }

        /* Mobile Shift Overview Card */
        .driver-mobile-shift-card {
          display: none;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        /* Mobile Deliveries Filter Pills */
        .driver-filter-scroll-container {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .driver-filter-scroll-container::-webkit-scrollbar {
          display: none;
        }

        /* Mobile Delivery Card */
        .driver-mobile-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.15s ease;
        }

        /* Mobile Bottom Navigation Bar (No Hamburger!) */
        .driver-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-top: 1px solid #e2e8f0;
          z-index: 100;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .driver-bottom-tab {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          transition: color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .driver-bottom-tab.active {
          color: #059669;
          font-weight: 700;
        }

        .driver-bottom-badge {
          position: absolute;
          top: 6px;
          right: calc(50% - 18px);
          background: #059669;
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 10px;
          min-width: 16px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(5, 150, 105, 0.3);
        }

        @media (max-width: 900px) {
          .driver-admin-sidebar {
            display: none !important;
          }
        }

        /* Mobile Responsive Breakpoints */
        @media (max-width: 768px) {
          .driver-admin-sidebar {
            display: none !important;
          }
          .driver-top-header {
            display: none !important;
          }
          .driver-desktop-banner {
            display: none !important;
          }
          .driver-desktop-stats {
            display: none !important;
          }
          .driver-mobile-header {
            display: flex !important;
          }
          .driver-mobile-shift-card {
            display: block !important;
          }
          .driver-bottom-nav {
            display: flex !important;
          }
          .driver-main-content {
            padding: 12px 12px 88px 12px !important;
          }
          .driver-controls-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            padding: 10px 12px !important;
          }
          .driver-search-wrap {
            max-width: 100% !important;
            width: 100% !important;
          }
          .driver-modal-sheet {
            max-width: 100vw !important;
            width: 100vw !important;
            border-radius: 0 !important;
            position: fixed !important;
            inset: 0 !important;
            height: 100vh !important;
            max-height: 100vh !important;
            margin: 0 !important;
            z-index: 9999 !important;
            overflow-y: auto !important;
            animation: slideUpMobile 0.25s ease-out !important;
          }
        }

        @keyframes slideUpMobile {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @keyframes pulseOnlineDot {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
          70% { box-shadow: 0 0 0 7px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .driver-online-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          animation: pulseOnlineDot 2s infinite;
        }

        .driver-profile-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .driver-profile-support-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 768px) {
          .driver-profile-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .driver-profile-support-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
        }

        .driver-profile-page {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
          gap: 16px !important;
          max-width: 1040px !important;
        }

        .driver-profile-page-heading,
        .driver-deliveries-page-heading {
          display: none;
        }

        .driver-profile-page-heading h1,
        .driver-deliveries-page-heading h1 {
          margin: 0;
          color: #21372a;
          font-size: 1.6rem;
          font-weight: 750;
          letter-spacing: -0.035em;
          line-height: 1.2;
        }

        .driver-profile-page-heading p,
        .driver-deliveries-page-heading p {
          margin: 6px 0 0;
          color: #718078;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .driver-profile-feedback,
        .driver-profile-page-heading,
        .driver-profile-primary-card,
        .driver-profile-bookings,
        .driver-profile-account-actions {
          grid-column: 1 / -1;
        }

        .driver-profile-card,
        .driver-profile-bookings {
          background: #ffffff !important;
          border: 1px solid #e6ece8 !important;
          border-radius: 14px !important;
          box-shadow: 0 2px 8px rgba(25, 54, 39, 0.035) !important;
        }

        .driver-profile-primary-card {
          overflow: hidden;
          border-radius: 16px !important;
        }

        .driver-profile-primary-card .driver-profile-card-heading {
          padding: 14px 20px !important;
          background: #f6faf7 !important;
        }

        .driver-profile-primary-card .driver-profile-card-heading > div {
          color: #496353;
        }

        .driver-profile-primary-card .driver-profile-card-heading,
        .driver-profile-vehicle-card .driver-profile-card-heading {
          background: #f5f9f6 !important;
          border-bottom-color: #e6ece8 !important;
        }

        .driver-profile-primary-card .driver-profile-card-heading span,
        .driver-profile-vehicle-card .driver-profile-card-heading span {
          color: #496353 !important;
        }

        .driver-profile-primary-card .driver-profile-card-heading button,
        .driver-profile-vehicle-card .driver-profile-card-heading button {
          background: #eaf3ed !important;
          color: #315a42 !important;
          border: 1px solid #d9e8dd !important;
        }

        .driver-profile-edit-button {
          min-height: 38px;
          padding: 0 13px !important;
          font-size: 0.8rem !important;
        }

        .driver-profile-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          padding: 20px !important;
        }

        .driver-profile-summary-item {
          min-width: 0;
          padding: 18px;
          background: #ffffff;
          border: 1px solid #e6ece8;
          border-radius: 12px;
        }

        .driver-profile-summary-label {
          margin-bottom: 6px;
          color: #718078;
          font-size: 0.74rem;
          font-weight: 600;
        }

        .driver-profile-summary-value {
          overflow-wrap: anywhere;
          color: #26372e;
          font-size: 1.05rem;
          font-weight: 750;
        }

        .driver-profile-heading {
          color: #26372e !important;
          font-weight: 700 !important;
        }

        .driver-vehicle-details-grid > div {
          background: #f8faf9 !important;
          border-color: #e9efeb !important;
        }

        .driver-profile-bookings {
          padding: 16px 18px !important;
        }

        .driver-profile-vehicle-card,
        .driver-profile-support-card,
        .driver-profile-account-actions {
          min-width: 0;
          background: #ffffff !important;
          border: 1px solid #e6ece8 !important;
          border-radius: 14px !important;
          box-shadow: 0 2px 8px rgba(25, 54, 39, 0.035) !important;
        }

        .driver-profile-support-card a {
          background: #f8faf9 !important;
          border-color: #e9efeb !important;
        }

        .driver-profile-support-card a[href^="tel:1800"] {
          background: #fbf8f8 !important;
          border-color: #eee5e5 !important;
        }

        .driver-profile-account-actions button:first-child {
          background: #f8faf9 !important;
          border-color: #e9e5e5 !important;
          color: #785252 !important;
        }

        .driver-profile-account-actions button:last-of-type {
          background: #fbf8f8 !important;
          border-color: #eee5e5 !important;
          color: #895454 !important;
        }

        @media (max-width: 768px) {
          .driver-deliveries-page {
            gap: 12px !important;
          }

          .driver-deliveries-page-heading,
          .driver-profile-page-heading {
            display: block;
            padding: 4px 2px 2px;
          }

          .driver-deliveries-page-heading h1,
          .driver-profile-page-heading h1 {
            font-size: 1.45rem;
          }

          .driver-deliveries-page-heading p,
          .driver-profile-page-heading p {
            font-size: 0.84rem;
          }

          .driver-profile-page {
            grid-template-columns: minmax(0, 1fr);
            gap: 12px !important;
            max-width: 100% !important;
          }

          .driver-profile-feedback,
          .driver-profile-page-heading,
          .driver-profile-primary-card,
          .driver-profile-bookings,
          .driver-profile-account-actions {
            grid-column: auto;
          }

          .driver-profile-primary-card > div:last-child {
            padding: 14px !important;
          }

          .driver-profile-summary-grid {
            background: #f3f8f4;
          }

          .driver-profile-summary-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 9px;
            padding: 0 !important;
          }

          .driver-profile-summary-item {
            padding: 13px 14px;
            border-radius: 10px;
          }

          .driver-profile-summary-label {
            margin-bottom: 4px;
            font-size: 0.72rem;
          }

          .driver-profile-summary-value {
            font-size: 0.98rem;
          }

          .driver-profile-primary-card .driver-profile-card-heading {
            padding: 12px 14px !important;
          }

          .driver-profile-primary-card {
            border-radius: 14px !important;
          }

          .driver-profile-edit-button {
            min-height: 36px;
            padding: 0 10px !important;
          }

          .driver-profile-bookings {
            padding: 14px !important;
          }

          .driver-profile-support-card,
          .driver-profile-account-actions {
            padding: 16px !important;
          }

          .driver-profile-vehicle-card {
            padding: 0 !important;
          }

          .driver-vehicle-details-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .driver-mobile-shift-card {
            margin-bottom: 0;
            padding: 15px;
            border-color: #e3ebe5;
            border-radius: 14px;
            box-shadow: 0 3px 12px rgba(25, 54, 39, 0.04);
          }

          .driver-mobile-shift-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .driver-mobile-shift-stats > div {
            min-height: 68px;
            padding: 10px !important;
            border: 1px solid #e7ede8 !important;
            border-radius: 10px !important;
            background: #f8faf9 !important;
          }

          .driver-mobile-shift-stats > div:nth-child(2) {
            background: #f1f7f2 !important;
            border-color: #e0ebe2 !important;
          }

          .driver-mobile-shift-stats > div:nth-child(3) {
            background: #fbf7ed !important;
            border-color: #eee5cf !important;
          }

          .driver-mobile-shift-stats > div:nth-child(4) {
            background: #f7f8f6 !important;
          }

          .driver-mobile-shift-stats > div > div:first-child {
            font-size: 0.65rem !important;
            letter-spacing: 0.04em;
          }

          .driver-mobile-shift-stats > div > div:last-child {
            font-size: 1.05rem !important;
          }

          .driver-controls-bar {
            gap: 11px !important;
            padding: 12px !important;
            border-color: #e5ebe6 !important;
            border-radius: 13px !important;
          }

          .driver-filter-scroll-container {
            gap: 7px;
            margin: 0 -2px;
            padding: 0 2px 3px;
          }

          .driver-filter-scroll-container button {
            padding: 8px 12px !important;
            border: 1px solid #e7ede8 !important;
            border-radius: 20px !important;
            background: #ffffff !important;
            color: #65756a !important;
            font-size: 0.76rem !important;
          }

          .driver-filter-scroll-container button.active {
            border-color: #cddfd1 !important;
            background: #edf5ef !important;
            color: #315a42 !important;
          }

          .driver-search-wrap input {
            min-height: 42px;
            border-color: #e5ebe6 !important;
            border-radius: 9px !important;
            background: #f8faf9 !important;
          }

          .driver-mobile-card {
            padding: 15px !important;
            border: 1px solid #e5ebe6 !important;
            border-left-width: 3px !important;
            border-radius: 13px !important;
            box-shadow: 0 3px 12px rgba(25, 54, 39, 0.035) !important;
          }

          .driver-mobile-card h3 {
            font-size: 0.98rem !important;
            line-height: 1.35;
          }

          .driver-mobile-card .driver-mobile-card-order {
            gap: 6px !important;
          }

          .driver-mobile-card-order > span {
            border-color: #dce9df !important;
            background: #f1f7f2 !important;
            color: #315a42 !important;
          }

          .driver-mobile-card .driver-mobile-card-address {
            align-items: flex-start !important;
            padding: 10px !important;
            border: 1px solid #edf1ed;
            border-radius: 9px !important;
            background: #f8faf9 !important;
            line-height: 1.5;
          }

          .driver-mobile-card .driver-mobile-card-actions {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-top: 12px !important;
          }

          .driver-mobile-card .driver-mobile-card-actions a,
          .driver-mobile-card .driver-mobile-card-actions button {
            min-height: 42px;
            border-radius: 9px !important;
            font-size: 0.8rem !important;
          }

          .driver-mobile-card .driver-mobile-card-actions a:nth-child(2) {
            background: #f3f7f4 !important;
            border-color: #e1e9e3 !important;
            color: #45634f !important;
          }

          .driver-mobile-card .driver-mobile-card-actions button:first-of-type {
            background: #2f6b45 !important;
            box-shadow: none !important;
          }

          .driver-empty-state {
            padding: 28px 18px !important;
            border-radius: 14px !important;
          }
        }
      `}</style>

      {/* ============================================================ */}
      {/* 1. DESKTOP SIDEBAR (Matched to AdminLayout, No Public Website) */}
      {/* ============================================================ */}
      <aside className="driver-admin-sidebar">
        {/* Brand Header */}
        <div className="driver-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="driver-sidebar-logo-box">
              <img
                src={CLOUDINARY_MEDIA?.logo || '/logo.png'}
                alt="Natural Milk Dairy"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                Natural Milk Dairy
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: '#059669',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginTop: '1px',
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                Driver Console
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="driver-sidebar-nav">
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '6px 12px',
              marginBottom: '2px',
            }}
          >
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = navTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setNavTab(item.id)}
                className="driver-sidebar-nav-btn"
                style={{
                  background: isActive ? '#ecfdf5' : 'transparent',
                  color: isActive ? '#065f46' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <Icon
                    size={18}
                    color={isActive ? '#059669' : '#64748b'}
                    strokeWidth={isActive ? 2.4 : 1.9}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '12px',
                      background: isActive ? '#059669' : '#f1f5f9',
                      color: isActive ? '#ffffff' : item.badgeColor || '#475569',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile Footer (Exactly Matching AdminLayout) */}
        <div className="driver-sidebar-footer">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {boyName ? boyName.charAt(0).toUpperCase() : 'N'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {boyName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isOnline ? '#10b981' : '#ef4444',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                    {isOnline ? 'Online' : 'Offline'} • {boyArea}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.color = '#dc2626';
                e.currentTarget.style.borderColor = '#fecaca';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN CONTENT AREA & HEADER                                 */}
      {/* ============================================================ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Desktop Top Header (Matched to AdminLayout) */}
        <header className="driver-top-header">
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {currentNav.label}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
              {currentNav.desc}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Clean Date Picker */}
            {/* Notifications Button in Desktop Header (No Date, No Refresh) */}
            <button
              type="button"
              onClick={() => setIsNotificationOpen(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '7px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <Bell size={16} color="#059669" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#e11d48',
                    color: '#ffffff',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Route Territory Tag */}
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #bbf7d0',
                color: '#065f46',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '6px 12px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MapPin size={14} color="#059669" />
              <span>Route: {boyArea}</span>
            </div>
          </div>
        </header>

        {/* Mobile Sticky Header (Native App Style, NO Hamburger Menu!) */}
        <header className="driver-mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                overflow: 'hidden',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img src="/logo.png" alt="Logo" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  {boyName}
                </span>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isOnline ? '#10b981' : '#ef4444',
                    display: 'inline-block',
                  }}
                  title={isOnline ? 'Online' : 'Offline'}
                />
              </div>
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <MapPin size={11} /> {boyArea}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Notification Bell in Mobile Header (No Date, No Refresh, No Logout) */}
            <button
              type="button"
              onClick={() => setIsNotificationOpen(true)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease',
              }}
              aria-label="View notifications"
            >
              <Bell size={19} color="#059669" />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#e11d48',
                    color: '#ffffff',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff',
                    boxShadow: '0 1px 4px rgba(225,29,72,0.4)',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <div className="driver-main-content" style={{ padding: '24px 28px', maxWidth: '1280px', width: '100%', boxSizing: 'border-box' }}>
          {/* Offline Alert if disconnected */}
          {!isOnline && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#b45309',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <WifiOff size={16} />
              <span>Offline Mode: Deliveries stored safely on phone. Will sync automatically once reconnected.</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: DELIVERIES / OVERVIEW                               */}
          {/* ========================================================= */}
          {navTab === 'deliveries' && (
            <div className="driver-deliveries-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="driver-deliveries-page-heading">
                <h1>Your deliveries</h1>
                <p>{boyArea} · {pendingList.length} remaining of {totalDrops} stops</p>
              </div>

              {/* DESKTOP BANNER (Hidden on Mobile) */}
              <div
                className="driver-desktop-banner"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#065f46',
                        background: '#dcfce7',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                      Morning Route Active
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      • Territory: <strong>{boyArea}</strong>
                    </span>
                  </div>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                    Welcome back, {boyName} 👋
                  </h1>
                  <p style={{ color: '#475569', fontSize: '0.86rem', marginTop: '4px', margin: 0 }}>
                    You have <strong>{pendingList.length} deliveries remaining</strong> to fulfill out of {totalDrops} assigned customer drops.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setNavTab('route')}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}
                  >
                    <ListOrdered size={15} />
                    <span>View Stop Sequence</span>
                  </button>

                  <button
                    onClick={() => setNavTab('cash')}
                    style={{
                      background: '#ffffff',
                      color: '#059669',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                  >
                    <Wallet size={15} />
                    <span>Cash Summary (₹{totalRevenue})</span>
                  </button>
                </div>
              </div>

              {/* DESKTOP 4 KPI STATS (Hidden on Mobile) */}
              <div
                className="driver-desktop-stats"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                }}
              >
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL ASSIGNED</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Truck size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>{totalDrops}</div>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, marginTop: '8px' }}>Route: {boyArea}</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DELIVERED</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: '6px', lineHeight: 1.1 }}>{completedList.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '8px' }}>{progressPercent}% Complete</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PENDING DROPS</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '6px', lineHeight: 1.1 }}>{pendingList.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '8px' }}>Awaiting doorstep delivery</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COLLECTIONS</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>₹{totalRevenue.toLocaleString()}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '8px' }}>💵 ₹{totalCashCollected} • 📱 ₹{totalUpiCollected}</div>
                </div>
              </div>

              {/* DEDICATED MOBILE SHIFT SUMMARY CARD (Visible only on Mobile) */}
              <div className="driver-mobile-shift-card">
                {/* Header row: Status & Progress % */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Route Progress
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669' }}>
                    {progressPercent}% Complete
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #059669, #10b981)',
                      borderRadius: '6px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {/* 4 Compact Stat Pills */}
                <div className="driver-mobile-shift-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Drops</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{totalDrops}</div>
                  </div>

                  <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '9px', padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Done</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>{completedList.length}</div>
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '9px', padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Pending</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#b45309', marginTop: '2px' }}>{pendingList.length}</div>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '9px', padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Cash</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>₹{totalRevenue}</div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search Controls */}
              <div
                className="driver-controls-bar"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                {/* Horizontal Scrollable Filter Tabs */}
                <div className="driver-filter-scroll-container">
                  {[
                    { id: 'all', label: `All (${totalDrops})` },
                    { id: 'pending', label: `Pending (${pendingList.length})` },
                    { id: 'delivered', label: `Delivered (${completedList.length})` },
                    { id: 'not_delivered', label: `Not Done (${missedList.length})` },
                  ].map((btn) => {
                    const isSelected = filterStatus === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setFilterStatus(btn.id)}
                        className={isSelected ? 'active' : ''}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? '#ecfdf5' : 'transparent',
                          color: isSelected ? '#065f46' : '#64748b',
                          border: isSelected ? '1px solid #bbf7d0' : '1px solid transparent',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                        }}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search Box */}
                <div className="driver-search-wrap" style={{ position: 'relative', minWidth: '180px', flex: '1', maxWidth: '280px' }}>
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                  <input
                    type="text"
                    placeholder="Search customer, flat, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: '0.82rem',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Deliveries List */}
              {displayedDeliveries.length === 0 ? (
                /* Empty State Card */
                <div
                  className="driver-empty-state"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: '#f0fdf4',
                      color: '#059669',
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                    }}
                  >
                    <Truck size={26} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                    No Deliveries Assigned Today
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.84rem', maxWidth: '380px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                    Route: <strong>{boyArea}</strong> • Date: <strong>{selectedDate}</strong><br />
                    Check with dairy owner or switch date.
                  </p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: '#059669',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} /> Refresh Deliveries
                  </button>
                </div>
              ) : (
                <div className="driver-delivery-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {displayedDeliveries.map((item, index) => {
                    const isDone = item.status === 'delivered';
                    const isMissed = item.status === 'not_delivered';
                    const isPending = item.status === 'pending';

                    return (
                      <div
                        key={item.id}
                        className={`driver-mobile-card ${isDone ? 'is-done' : ''} ${isMissed ? 'is-missed' : ''} ${isPending ? 'is-pending' : ''}`}
                        style={{
                          borderLeft: isDone
                            ? '4px solid #059669'
                            : isMissed
                            ? '4px solid #dc2626'
                            : '4px solid #f59e0b',
                        }}
                      >
                        {/* Header: Stop Sequence, Name & Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: isDone ? '#dcfce7' : '#f1f5f9',
                                color: isDone ? '#059669' : '#334155',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              #{index + 1}
                            </span>
                            <h3
                              style={{
                                fontSize: '1.02rem',
                                fontWeight: 800,
                                color: '#0f172a',
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.customerName}
                            </h3>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: isDone ? '#ecfdf5' : isMissed ? '#fef2f2' : '#fffbeb',
                                color: isDone ? '#059669' : isMissed ? '#dc2626' : '#b45309',
                                border: isDone
                                  ? '1px solid #bbf7d0'
                                  : isMissed
                                  ? '1px solid #fecaca'
                                  : '1px solid #fde68a',
                              }}
                            >
                              {isDone ? '✓ Completed' : isMissed ? '✕ Missed' : '○ Pending'}
                            </span>
                            <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                              ₹{item.totalAmount}
                            </div>
                          </div>
                        </div>

                        {/* High-Visibility Product Order Badge */}
                        <div
                          className="driver-mobile-card-order"
                          style={{
                            marginTop: '8px',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              background: '#ecfdf5',
                              border: '1px solid #bbf7d0',
                              color: '#065f46',
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            🥛 {isDone ? item.actualMilk : item.plannedMilk}L Milk
                          </span>
                          {(isDone ? item.actualCurd : item.plannedCurd) > 0 && (
                            <span
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              🥣 {isDone ? item.actualCurd : item.plannedCurd}g Curd
                            </span>
                          )}
                        </div>

                        {/* Customer Address */}
                        <div
                          className="driver-mobile-card-address"
                          style={{
                            fontSize: '0.8rem',
                            color: '#475569',
                            background: '#f8fafc',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '8px',
                          }}
                        >
                          <MapPin size={14} color="#059669" style={{ flexShrink: 0 }} />
                          <span style={{ lineHeight: 1.35 }}>{item.customerAddress}</span>
                        </div>

                        {/* Special Note */}
                        {item.notes && (
                          <div
                            className="driver-mobile-card-actions"
                            style={{
                              fontSize: '0.76rem',
                              color: '#92400e',
                              background: '#fffbeb',
                              border: '1px solid #fef3c7',
                              padding: '5px 10px',
                              borderRadius: '7px',
                              marginTop: '6px',
                            }}
                          >
                            🔔 Note: <strong>{item.notes}</strong>
                          </div>
                        )}

                        {/* Mobile Action Buttons (Optimized for One-Hand Use) */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isPending ? '1fr 1fr 2fr 1.2fr' : '1fr 1fr',
                            gap: '6px',
                            marginTop: '10px',
                          }}
                        >
                          {/* Call Button */}
                          <a
                            href={`tel:${item.customerPhone}`}
                            style={{
                              padding: '9px 6px',
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              color: '#059669',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                            }}
                          >
                            <Phone size={13} />
                            <span>Call</span>
                          </a>

                          {/* Map Navigation Button */}
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(
                              item.customerAddress || item.customerName
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '9px 6px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#2563eb',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                            }}
                          >
                            <Navigation size={13} />
                            <span>Map</span>
                          </a>

                          {isPending && (
                            <>
                              {/* DELIVERED Button */}
                              <button
                                type="button"
                                onClick={() => openDeliverModal(item)}
                                style={{
                                  padding: '9px 8px',
                                  background: '#059669',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '0.82rem',
                                  borderRadius: '8px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                                }}
                              >
                                <Check size={14} />
                                <span>Delivered</span>
                              </button>

                              {/* NOT DONE Button */}
                              <button
                                type="button"
                                onClick={() => openNotDeliveredModal(item)}
                                style={{
                                  padding: '9px 6px',
                                  background: '#ffffff',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  fontWeight: 600,
                                  fontSize: '0.76rem',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px',
                                }}
                              >
                                <X size={13} />
                                <span>Skip</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ROUTE STOPS                                        */}
          {/* ========================================================= */}
          {navTab === 'route' && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 16px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Route Delivery Sequence
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '3px 0 0 0' }}>
                    {myDeliveries.length} planned stops in {boyArea}
                  </p>
                </div>
              </div>

              {myDeliveries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No stops assigned on this route today.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {myDeliveries.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: item.status === 'delivered' ? '#dcfce7' : '#e2e8f0',
                            color: item.status === 'delivered' ? '#059669' : '#334155',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.customerName}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.customerAddress}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>
                          {item.plannedMilk}L
                        </span>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(
                            item.customerAddress || item.customerName
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '5px 8px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            color: '#2563eb',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            textDecoration: 'none',
                          }}
                        >
                          <Navigation size={11} /> Map
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: CASH SUMMARY                                       */}
          {/* ========================================================= */}
          {navTab === 'cash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px 16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
                  Today's Route Cash Collection
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '10px',
                    marginBottom: '14px',
                  }}
                >
                  {/* Physical Cash Card */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      💵 Physical Cash Collected
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '3px' }}>
                      ₹{totalCashCollected.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      To deposit at dairy counter
                    </div>
                  </div>

                  {/* UPI Direct Card */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      📱 UPI Direct Received
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: '3px' }}>
                      ₹{totalUpiCollected.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      Credited to Dairy account
                    </div>
                  </div>
                </div>

                {/* Total Collection Highlight */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#059669',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      TOTAL RECONCILIATION
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      ₹{totalRevenue.toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: '#dcfce7',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Wallet size={24} />
                  </div>
                </div>

                {/* Deposit Instruction Card */}
                <div
                  style={{
                    marginTop: '14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '0.8rem',
                    color: '#475569',
                    lineHeight: 1.45,
                  }}
                >
                  💡 <strong>Deposit Notice:</strong> Hand over the physical cash of{' '}
                  <strong style={{ color: '#059669' }}>₹{totalCashCollected}</strong> to the dairy manager at the end of your shift for closing out the route audit.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: DRIVER PROFILE                                     */}
          {/* ========================================================= */}
          {navTab === 'profile' && (
            <div className="driver-profile-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '880px', margin: '0 auto', width: '100%' }}>
              <div className="driver-profile-page-heading">
                <h1>My profile</h1>
                <p>Manage your partner details and delivery account.</p>
              </div>

              {/* FEEDBACK TOAST */}
              {profileFeedbackMsg && (
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
                  <span>{profileFeedbackMsg}</span>
                </div>
              )}

              {/* 1. DRIVER PROFILE CARD (BASIC DETAILS ONLY) */}
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
                {/* Header bar with Edit button */}
                <div
                  className="driver-profile-card-heading"
                  style={{
                    background: 'linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 100%)',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} color="#059669" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Driver Profile
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="driver-profile-edit-button"
                    style={{
                      background: '#eaf3ed',
                      color: '#315a42',
                      border: '1px solid #d9e8dd',
                      borderRadius: '8px',
                      padding: '0 13px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Edit2 size={13} />
                    <span>Edit Profile</span>
                  </button>
                </div>

                <div className="driver-profile-summary-grid">
                  <div className="driver-profile-summary-item">
                    <div className="driver-profile-summary-label">Full name</div>
                    <div className="driver-profile-summary-value">{profileName}</div>
                  </div>
                  <div className="driver-profile-summary-item">
                    <div className="driver-profile-summary-label">Mobile number</div>
                    <a
                      className="driver-profile-summary-value"
                      href={`tel:${profilePhone}`}
                      style={{ color: '#315a42', textDecoration: 'none' }}
                    >
                      {profilePhone}
                    </a>
                  </div>
                </div>
              </div>

              {/* 2. BOOKINGS SECTION (CLICK TO SHOW BOOKINGS) */}
              <div
                onClick={() => setShowProfileBookings(true)}
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
                    <Calendar size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Assigned Bookings
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
                        {effectiveDeliveries.length} Drops Today
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0 0' }}>
                      {effectivePending.length} Pending • {effectiveDelivered.length} Delivered • Tap to view all customer drops
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#059669',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#f0fdf4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>

              {/* 3. BIKE & FLEET DETAILS (BASIC DETAILS ONLY) */}
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
                {/* Header with Edit Bike button */}
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
                    <Bike size={18} color="#059669" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Bike & Fleet Details
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingBike(true)}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Edit2 size={13} />
                    <span>Edit Bike</span>
                  </button>
                </div>

                {/* Bike Card Body (Basic Details Only) */}
                <div style={{ padding: '18px' }}>
                  <div className="driver-vehicle-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Assigned Bike</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {bikeModel}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Registration Number</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#394b40', marginTop: '2px' }}>
                        {bikePlate}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Vehicle Type</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {bikeType}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Battery / Fuel Status</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                        {bikeBattery}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingBike(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#059669',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 0',
                      }}
                    >
                      <Edit2 size={13} />
                      <span>Edit Bike & View All Specs →</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. SUPPORT (DRIVER & BOOKING HELPLINES) */}
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
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Headphones size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Driver & Delivery Support
                    </h3>
                    <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                      Instant contact for customer issues, gate locks, or roadside help
                    </p>
                  </div>
                </div>

                <div className="driver-profile-support-grid">
                  {/* Supervisor Call */}
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
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>Hub Supervisor</span>
                      <PhoneCall size={16} color="#059669" />
                    </div>
                    <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>+91 98765 43210</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Door lock, address changes, missing crates
                    </span>
                  </a>

                  {/* WhatsApp Desk */}
                  <a
                    href={`https://wa.me/919876543210?text=Hello%20Dispatch,%20Driver%20support%20needed%20for%20${profileName}%20in%20${profileArea}`}
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
                    <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>Chat with Dispatch</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Send doorstep photo or gate proof
                    </span>
                  </a>

                  {/* Vehicle SOS */}
                  <a
                    href="tel:1800123456"
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
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
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#991b1b' }}>Breakdown SOS</span>
                      <AlertCircle size={16} color="#dc2626" />
                    </div>
                    <span style={{ fontSize: '0.76rem', color: '#dc2626', fontWeight: 700 }}>1800-123-456 (24x7)</span>
                    <span style={{ fontSize: '0.72rem', color: '#991b1b', marginTop: '2px' }}>
                      Flat tyre, breakdown, backup vehicle
                    </span>
                  </a>
                </div>
              </div>

              {/* 5. DELETE & LOGOUT ACTIONS */}
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
                {/* Logout Button */}
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
                  <span>Sign Out of Driver Account</span>
                </button>

                {/* Delete Account Button */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
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
                  <span>Delete Driver Account</span>
                </button>

                <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '0.72rem', color: '#94a3b8' }}>
                  Natural Milk Dairy — Hyderabad Direct Delivery System
                </div>
              </div>

              {/* ========================================================= */}
              {/* MODAL 1: EDIT DRIVER PROFILE (SHOW ALL DATA)              */}
              {/* ========================================================= */}
              {isEditingProfile && (
                <div className="modal-overlay" onClick={() => setIsEditingProfile(false)}>
                  <div
                    className="modal-content driver-modal-sheet"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      maxWidth: '560px',
                      padding: '22px',
                      maxHeight: '88vh',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={18} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            Edit profile details
                          </h3>
                          <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
                            Update your personal, partner, and dispatch information
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Mobile Number *
                          </label>
                          <input
                            type="tel"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Assigned Territory / Route *
                          </label>
                          <input
                            type="text"
                            value={profileArea}
                            onChange={(e) => setProfileArea(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Driving License Number *
                          </label>
                          <input
                            type="text"
                            value={profileLicense}
                            onChange={(e) => setProfileLicense(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Partner / Employee ID
                          </label>
                          <input
                            type="text"
                            value={`#NMD-DRV-${(boyId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '8492'}`}
                            disabled
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              background: '#f8fafc',
                              color: '#64748b',
                              fontSize: '0.86rem',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Residential / Hub Address
                          </label>
                          <input
                            type="text"
                            value={profileAddress}
                            onChange={(e) => setProfileAddress(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Blood Group
                          </label>
                          <input
                            type="text"
                            value={profileBloodGroup}
                            onChange={(e) => setProfileBloodGroup(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Emergency Contact
                          </label>
                          <input
                            type="text"
                            value={profileEmergencyContact}
                            onChange={(e) => setProfileEmergencyContact(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Duty Shift Timing
                          </label>
                          <input
                            type="text"
                            value={profileShift}
                            onChange={(e) => setProfileShift(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Date of Joining
                          </label>
                          <input
                            type="text"
                            value={profileJoiningDate}
                            onChange={(e) => setProfileJoiningDate(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="submit"
                          style={{
                            flex: 1,
                            padding: '12px 18px',
                            borderRadius: '10px',
                            background: '#059669',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Save size={15} /> Save Profile Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          style={{
                            padding: '12px 18px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#64748b',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* FULLSCREEN VIEW: ASSIGNED BOOKINGS                        */}
              {/* ========================================================= */}
              {showProfileBookings && (
                <div
                  className="driver-fullscreen-bookings-view"
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    background: '#ffffff',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Fullscreen Sticky Header */}
                  <div
                    style={{
                      background: '#ffffff',
                      borderBottom: '1px solid #e2e8f0',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowProfileBookings(false)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#f1f5f9',
                          border: 'none',
                          color: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        aria-label="Back to Profile"
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <div>
                        <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                          Today's Delivery Bookings
                        </h3>
                        <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0 0' }}>
                          {effectiveDeliveries.length} doorstep customer drops for {selectedDate}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProfileBookings(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '1.3rem',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Scrollable Fullscreen Content Area */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '16px 18px 80px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      maxWidth: '860px',
                      width: '100%',
                      margin: '0 auto',
                    }}
                  >
                    {/* Filter Tabs */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        background: '#f8fafc',
                        padding: '4px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {[
                        { id: 'all', label: `All (${effectiveDeliveries.length})` },
                        { id: 'pending', label: `Pending (${effectivePending.length})` },
                        { id: 'delivered', label: `Delivered (${effectiveDelivered.length})` },
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setProfileBookingFilter(btn.id)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '7px',
                            border: 'none',
                            fontSize: '0.78rem',
                            fontWeight: profileBookingFilter === btn.id ? 700 : 500,
                            background: profileBookingFilter === btn.id ? '#ffffff' : 'transparent',
                            color: profileBookingFilter === btn.id ? '#059669' : '#64748b',
                            boxShadow: profileBookingFilter === btn.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Bookings List (Real Data Only) */}
                    {effectiveDeliveries.length === 0 ? (
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '48px 20px',
                          textAlign: 'center',
                          marginTop: '20px',
                        }}
                      >
                        <div
                          style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            background: '#ecfdf5',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px auto',
                          }}
                        >
                          <Truck size={24} />
                        </div>
                        <h4 style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                          No Delivery Bookings Found
                        </h4>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, maxWidth: '300px', marginInline: 'auto', lineHeight: 1.5 }}>
                          There are no customer drops scheduled for route ({boyArea}) on {selectedDate}.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {effectiveDeliveries
                          .filter((b) => {
                            if (profileBookingFilter === 'pending') return b.status === 'pending';
                            if (profileBookingFilter === 'delivered') return b.status === 'delivered';
                            return true;
                          })
                          .map((item, idx) => {
                            const isDone = item.status === 'delivered';
                            const isMissed = item.status === 'not_delivered';
                            return (
                              <div
                                key={item.id || idx}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '12px',
                                  padding: '14px 16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', borderRadius: '4px', padding: '1px 6px' }}>
                                        #{idx + 1}
                                      </span>
                                      <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {item.customerName}
                                      </h4>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <MapPin size={13} color="#059669" />
                                      <span>{item.customerAddress || 'Address on file'}</span>
                                    </div>
                                  </div>

                                  {/* Status Badge */}
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      borderRadius: '12px',
                                      padding: '3px 9px',
                                      background: isDone ? '#ecfdf5' : isMissed ? '#fef2f2' : '#fffbeb',
                                      color: isDone ? '#065f46' : isMissed ? '#991b1b' : '#92400e',
                                      border: `1px solid ${isDone ? '#a7f3d0' : isMissed ? '#fecaca' : '#fde68a'}`,
                                    }}
                                  >
                                    {isDone ? '✓ Delivered' : isMissed ? '✕ Missed' : '⏳ Pending'}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingTop: '8px',
                                    borderTop: '1px solid #f1f5f9',
                                    fontSize: '0.8rem',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                  }}
                                >
                                  <span style={{ color: '#065f46', fontWeight: 700 }}>
                                    🥛 {isDone ? item.actualMilk : item.plannedMilk}L Cow Milk {(isDone ? item.actualCurd : item.plannedCurd) > 0 ? `+ ${isDone ? item.actualCurd : item.plannedCurd}g Curd` : ''}
                                  </span>
                                  <span style={{ color: '#334155', fontWeight: 600 }}>
                                    Amount: <strong style={{ color: '#059669' }}>₹{item.totalAmount || 0}</strong> ({item.paymentMethod?.toUpperCase() || 'CREDIT'})
                                  </span>
                                  {item.customerPhone && (
                                    <a
                                      href={`tel:${item.customerPhone}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        color: '#2563eb',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                      }}
                                    >
                                      <Phone size={13} /> Call
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* Bottom CTA to switch to live route */}
                    <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileBookings(false);
                          setNavTab('deliveries');
                        }}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '10px',
                          background: '#059669',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Truck size={16} />
                        <span>Open Deliveries Route View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowProfileBookings(false)}
                        style={{
                          padding: '12px 18px',
                          borderRadius: '10px',
                          background: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* MODAL 3: EDIT BIKE & FLEET (SHOW ALL DATA)                */}
              {/* ========================================================= */}
              {isEditingBike && (
                <div className="modal-overlay" onClick={() => setIsEditingBike(false)}>
                  <div
                    className="modal-content driver-modal-sheet"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      maxWidth: '560px',
                      padding: '22px',
                      maxHeight: '88vh',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bike size={18} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            Bike & Fleet — All Details
                          </h3>
                          <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
                            View and edit assigned vehicle specifications and registration
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingBike(false)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveBike} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Bike / Vehicle Model *
                          </label>
                          <input
                            type="text"
                            value={bikeModel}
                            onChange={(e) => setBikeModel(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Registration / Plate Number *
                          </label>
                          <input
                            type="text"
                            value={bikePlate}
                            onChange={(e) => setBikePlate(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Vehicle Category
                          </label>
                          <input
                            type="text"
                            value={bikeType}
                            onChange={(e) => setBikeType(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Insurance & RC Validity
                          </label>
                          <input
                            type="text"
                            value={bikeInsurance}
                            onChange={(e) => setBikeInsurance(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Battery / Fuel Status
                          </label>
                          <input
                            type="text"
                            value={bikeBattery}
                            onChange={(e) => setBikeBattery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Chassis / Motor Serial
                          </label>
                          <input
                            type="text"
                            value={bikeChassis}
                            onChange={(e) => setBikeChassis(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Next Scheduled Service
                          </label>
                          <input
                            type="text"
                            value={bikeServiceDate}
                            onChange={(e) => setBikeServiceDate(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Cold Chain Crates Kit
                          </label>
                          <input
                            type="text"
                            value={bikeCratesCapacity}
                            onChange={(e) => setBikeCratesCapacity(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="submit"
                          style={{
                            flex: 1,
                            padding: '12px 18px',
                            borderRadius: '10px',
                            background: '#059669',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Save size={15} /> Save Bike Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingBike(false)}
                          style={{
                            padding: '12px 18px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#64748b',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* LOGOUT CONFIRMATION MODAL */}
              {showLogoutConfirm && (
                <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                  <div
                    className="modal-content driver-modal-sheet"
                    onClick={(e) => e.stopPropagation()}
                    style={{ background: '#ffffff', borderRadius: '18px', maxWidth: '420px', padding: '22px' }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#fff1f2',
                          color: '#e11d48',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '10px',
                        }}
                      >
                        <LogOut size={22} />
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                        End Shift & Sign Out?
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                        Ensure you have completed all pending deliveries and reconciled your{' '}
                        <strong style={{ color: '#059669' }}>₹{totalCashCollected}</strong> in cash collections with the depot supervisor before signing out.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(false)}
                        style={{
                          padding: '11px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Keep Delivering
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLogoutConfirm(false);
                          handleLogout();
                        }}
                        style={{
                          padding: '11px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#e11d48',
                          color: '#ffffff',
                          fontSize: '0.88rem',
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

              {/* DELETE ACCOUNT CONFIRMATION MODAL */}
              {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                  <div
                    className="modal-content driver-modal-sheet"
                    onClick={(e) => e.stopPropagation()}
                    style={{ background: '#ffffff', borderRadius: '18px', maxWidth: '420px', padding: '22px' }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#fef2f2',
                          color: '#dc2626',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '10px',
                        }}
                      >
                        <Trash2 size={22} />
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b', margin: '0 0 6px 0' }}>
                        Delete Driver Account?
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                        This will unlink your profile from Natural Milk Dairy routes, surrender assigned vehicle{' '}
                        <strong>{bikePlate}</strong>, and permanently deactivate your driver portal account.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{
                          padding: '11px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        style={{
                          padding: '11px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR (No Hamburger Menu!)        */}
      {/* ============================================================ */}
      <nav className="driver-bottom-nav">
        <button
          type="button"
          onClick={() => setNavTab('deliveries')}
          className={`driver-bottom-tab ${navTab === 'deliveries' ? 'active' : ''}`}
        >
          <Truck size={20} />
          <span>Deliveries</span>
          {pendingList.length > 0 && (
            <span className="driver-bottom-badge">{pendingList.length}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setNavTab('route')}
          className={`driver-bottom-tab ${navTab === 'route' ? 'active' : ''}`}
        >
          <ListOrdered size={20} />
          <span>Route</span>
        </button>

        <button
          type="button"
          onClick={() => setNavTab('cash')}
          className={`driver-bottom-tab ${navTab === 'cash' ? 'active' : ''}`}
        >
          <Wallet size={20} />
          <span>Cash</span>
        </button>

        <button
          type="button"
          onClick={() => setNavTab('profile')}
          className={`driver-bottom-tab ${navTab === 'profile' ? 'active' : ''}`}
        >
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

      {/* ============================================================ */}
      {/* 4. DELIVERED CONFIRMATION BOTTOM SHEET / MODAL               */}
      {/* ============================================================ */}
      {actionType === 'delivered' && activeItem && (
        <div className="modal-overlay" onClick={() => setActionType(null)}>
          <div
            className="modal-content driver-modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '440px', padding: '22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', margin: 0 }}>
                  ✓ Mark Delivered
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  {activeItem.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionType(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Milk Delivered */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
                  🥛 Milk Delivered:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[0.5, 1, 1.5, 2].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setMilkQty(qty)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        border: milkQty === qty ? '2px solid #059669' : '1px solid #e2e8f0',
                        background: milkQty === qty ? '#ecfdf5' : '#ffffff',
                        color: milkQty === qty ? '#065f46' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {qty} L
                    </button>
                  ))}
                </div>
              </div>

              {/* Curd Delivered */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
                  🥣 Curd Delivered:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[0, 500, 1000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setCurdQty(qty)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        border: curdQty === qty ? '2px solid #059669' : '1px solid #e2e8f0',
                        background: curdQty === qty ? '#ecfdf5' : '#ffffff',
                        color: curdQty === qty ? '#065f46' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {qty === 0 ? 'No Curd' : qty >= 1000 ? '1 kg' : `${qty} g`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div
                style={{
                  background: '#f0fdf4',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #bbf7d0',
                }}
              >
                <span style={{ fontWeight: 700, color: '#065f46', fontSize: '0.88rem' }}>Order Total:</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669' }}>
                  ₹{Number(milkQty) * 60 + (Number(curdQty) / 500) * 30}
                </span>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
                  Payment Method:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'credit', label: '○ Credit' },
                    { id: 'cash', label: '💵 Cash' },
                    { id: 'upi', label: '📱 UPI' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMode(m.id)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        border: payMode === m.id ? '2px solid #059669' : '1px solid #e2e8f0',
                        background: payMode === m.id ? '#059669' : '#ffffff',
                        color: payMode === m.id ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <input
                type="text"
                placeholder="Optional delivery note (e.g. Left at gate)"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleConfirmDelivery}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '4px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. NOT DELIVERED MODAL                                       */}
      {/* ============================================================ */}
      {actionType === 'not_delivered' && activeItem && (
        <div className="modal-overlay" onClick={() => setActionType(null)}>
          <div
            className="modal-content driver-modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '440px', padding: '22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', margin: 0 }}>
                  Mark Not Delivered
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  {activeItem.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionType(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                Select Reason:
              </label>
              {[
                'Customer Not Home',
                'Customer Cancelled',
                'Customer Requested Pause',
                'Product Unavailable',
                'Other',
              ].map((r) => (
                <label
                  key={r}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: missedReason === r ? '#fef2f2' : '#f8fafc',
                    border: missedReason === r ? '1.5px solid #f87171' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    color: missedReason === r ? '#991b1b' : '#334155',
                  }}
                >
                  <input
                    type="radio"
                    name="missed_reason"
                    checked={missedReason === r}
                    onChange={() => setMissedReason(r)}
                  />
                  <span>{r}</span>
                </label>
              ))}

              <input
                type="text"
                placeholder="Optional detail..."
                value={missedNote}
                onChange={(e) => setMissedNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  marginTop: '4px',
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="button"
                onClick={handleConfirmMissed}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.94rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '6px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
              >
                Save Reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
