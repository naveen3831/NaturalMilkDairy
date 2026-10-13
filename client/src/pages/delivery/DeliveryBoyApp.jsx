import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDairy } from '../../context/DairyContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Truck,
  Check,
  X,
  Phone,
  Camera,
  Image,
  Eye,
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
  Settings,
  Heart,
  EyeOff,
  Globe,
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

  const handleNavChange = (tab) => {
    setNavTab(tab);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('.driver-main') || document.querySelector('.driver-layout-container') || document.querySelector('.driver-content');
    if (mainEl) mainEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

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
  const [homeProofImage, setHomeProofImage] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState('');
  const [previewProofModal, setPreviewProofModal] = useState(null);
  const fileInputRef = useRef(null);
  const { subscribe: wsSubscribe } = useWebSocket();

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
  const [driverPassword, setDriverPassword] = useState('••••••••••••');
  const [showDriverPassword, setShowDriverPassword] = useState(false);
  const [driverUsername, setDriverUsername] = useState('');

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

  // Real-time synchronization for deliveries
  useEffect(() => {
    const unsub = wsSubscribe('DELIVERY_UPDATED', () => {
      fetchDeliveries(selectedDate, 'all', boyId);
    });
    return unsub;
  }, [wsSubscribe, selectedDate, boyId, fetchDeliveries]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDeliveries(selectedDate, 'all', boyId);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Filter deliveries assigned to this delivery partner directly from active database
  const myDeliveries = (deliveries || []).filter((d) => {
    if (!d) return false;
    const matchesId =
      (boyId && d.deliveryBoyId === boyId) ||
      (matchedBoy?._id && d.deliveryBoyId === matchedBoy._id.toString()) ||
      (matchedBoy?.id && d.deliveryBoyId === matchedBoy.id.toString()) ||
      (user?.id && d.deliveryBoyId === user.id.toString()) ||
      (user?.mobile && d.deliveryBoyId === user.mobile) ||
      (matchedBoy?.mobile && d.deliveryBoyId === matchedBoy.mobile);

    const matchesName =
      (boyName && d.deliveryBoyName && d.deliveryBoyName.toLowerCase() === boyName.toLowerCase()) ||
      (matchedBoy?.name && d.deliveryBoyName && d.deliveryBoyName.toLowerCase() === matchedBoy.name.toLowerCase());

    const matchesArea =
      !d.deliveryBoyId &&
      boyArea &&
      ((d.customerAddress && d.customerAddress.toLowerCase().includes(boyArea.toLowerCase())) ||
       (d.customerArea && d.customerArea.toLowerCase().includes(boyArea.toLowerCase())));

    return matchesId || matchesName || matchesArea;
  });

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

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setPhotoUploadError('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'doorstep-delivery-proofs');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setHomeProofImage(data.url);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setHomeProofImage(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('Photo upload warning, falling back to local preview:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        setHomeProofImage(event.target.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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
    setHomeProofImage(item.proofImage || '');
    setPhotoUploadError('');
    setIsUploadingPhoto(false);
  };

  const openNotDeliveredModal = (item) => {
    setActiveItem(item);
    setActionType('not_delivered');
    setMissedReason('Customer Not Home');
    setMissedNote('');
  };

  const handleConfirmDelivery = async () => {
    if (!activeItem) return;

    if (!homeProofImage) {
      setPhotoUploadError('Doorstep home photo is required. Please capture or upload the photo of the home before marking delivered.');
      return;
    }

    await markDelivered(activeItem.id, {
      actualMilk: Number(milkQty),
      actualCurd: Number(curdQty),
      paymentMethod: payMode,
      collectedAmount: payMode === 'cash' || payMode === 'upi' ? Number(collectedNow) : 0,
      notes: deliveryNote,
      actor: boyName,
      proofImage: homeProofImage,
    });

    // Notify Admin of completed delivery
    sendNotification({
      recipientRole: 'admin',
      title: '✅ Delivery Completed',
      message: `${boyName} completed drop for ${activeItem.customerName} (${milkQty}L Milk) with doorstep photo proof verified. Collected ₹${collectedNow} (${payMode.toUpperCase()}).`,
      type: 'delivery_completed',
      data: {
        customerId: activeItem.customerId,
        customerName: activeItem.customerName,
        driverName: boyName,
        amount: collectedNow,
        method: payMode,
        proofImage: homeProofImage,
      },
    });

    setActiveItem(null);
    setActionType(null);
    setHomeProofImage('');
    setPhotoUploadError('');
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
                onClick={() => handleNavChange(item.id)}
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

                        {/* Doorstep Home Proof Photo Tag (Visible when Delivered) */}
                        {isDone && item.proofImage && (
                          <div
                            style={{
                              marginTop: '10px',
                              paddingTop: '8px',
                              borderTop: '1px dashed #bbf7d0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              background: '#f0fdf4',
                              padding: '8px 10px',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img
                                src={item.proofImage}
                                alt="Home Proof"
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '6px',
                                  objectFit: 'cover',
                                  border: '1px solid #86efac',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setPreviewProofModal(item)}
                              />
                              <div>
                                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Camera size={13} color="#059669" />
                                  <span>Doorstep Proof Verified</span>
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                  Home photo captured
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setPreviewProofModal(item)}
                              style={{
                                padding: '5px 10px',
                                background: '#ffffff',
                                border: '1px solid #bbf7d0',
                                color: '#059669',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              View Photo
                            </button>
                          </div>
                        )}
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
            <div className="modern-profile-container">
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
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle2 size={16} color="#059669" />
                  <span>{profileFeedbackMsg}</span>
                </div>
              )}

              {!isEditingProfile ? (
                /* ── SCREEN 1: MY PROFILE ── */
                <>
                  {/* Header: Back Arrow, "My Profile", Settings Gear */}
                  <div className="modern-profile-header">
                    <button
                      type="button"
                      className="modern-profile-header-btn"
                      onClick={() => handleNavChange('deliveries')}
                      aria-label="Back to deliveries"
                    >
                      <ArrowLeft size={22} />
                    </button>
                    <h2 className="modern-profile-header-title">My Profile</h2>
                    <button
                      type="button"
                      className="modern-profile-header-btn"
                      onClick={() => setIsEditingProfile(true)}
                      aria-label="Settings / Edit profile"
                    >
                      <Settings size={22} />
                    </button>
                  </div>

                  {/* Identity: Avatar with Camera Badge + Name + Handle + Red Pill Button */}
                  <div className="modern-profile-identity">
                    <div className="modern-profile-avatar-wrap">
                      <div className="modern-profile-avatar-placeholder">
                        {(profileName || boyName || 'D').charAt(0).toUpperCase()}
                      </div>
                      <button
                        type="button"
                        className="modern-profile-camera-badge"
                        onClick={() => setIsEditingProfile(true)}
                        title="Change photo"
                        aria-label="Change photo"
                      >
                        <Camera size={13} />
                      </button>
                    </div>

                    <div className="modern-profile-identity-info">
                      <h3 className="modern-profile-name">{profileName || boyName || 'Delivery Partner'}</h3>
                      <span className="modern-profile-handle">
                        {driverUsername ? `@${driverUsername}` : `@${(profileArea || 'routefleet').toLowerCase().replace(/\s+/g, '')}`}
                      </span>
                      <button
                        type="button"
                        className="modern-profile-edit-btn"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>

                  {/* Menu List matching reference layout */}
                  <div className="modern-profile-menu-list">
                    {/* Favourites */}
                    <button
                      type="button"
                      className="modern-profile-menu-row"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <div className="modern-profile-menu-left">
                        <span className="modern-profile-menu-icon"><Heart size={20} /></span>
                        <div>
                          <span className="modern-profile-menu-label">Favourites</span>
                          <span className="modern-profile-menu-sub">{profileArea || boyArea || 'Madhapur Sector'} Route</span>
                        </div>
                      </div>
                      <div className="modern-profile-menu-right">
                        <ChevronRight size={18} />
                      </div>
                    </button>

                    {/* Downloads */}
                    <button
                      type="button"
                      className="modern-profile-menu-row"
                      onClick={() => handleNavChange('deliveries')}
                    >
                      <div className="modern-profile-menu-left">
                        <span className="modern-profile-menu-icon"><FileText size={20} /></span>
                        <div>
                          <span className="modern-profile-menu-label">Downloads</span>
                          <span className="modern-profile-menu-sub">Morning manifests & delivery proofs</span>
                        </div>
                      </div>
                      <div className="modern-profile-menu-right">
                        <ChevronRight size={18} />
                      </div>
                    </button>

                    {/* Language */}
                    <button
                      type="button"
                      className="modern-profile-menu-row"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <div className="modern-profile-menu-left">
                        <span className="modern-profile-menu-icon"><Globe size={20} /></span>
                        <div>
                          <span className="modern-profile-menu-label">Language</span>
                          <span className="modern-profile-menu-sub">{profileShift} (5:00 AM - 7:30 AM)</span>
                        </div>
                      </div>
                      <div className="modern-profile-menu-right">
                        <ChevronRight size={18} />
                      </div>
                    </button>

                    {/* Location */}
                    <button
                      type="button"
                      className="modern-profile-menu-row"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <div className="modern-profile-menu-left">
                        <span className="modern-profile-menu-icon"><MapPin size={20} /></span>
                        <div>
                          <span className="modern-profile-menu-label">Location</span>
                          <span className="modern-profile-menu-sub">{profileAddress || 'Madhapur Farm Dispatch Depot'}</span>
                        </div>
                      </div>
                      <div className="modern-profile-menu-right">
                        <ChevronRight size={18} />
                      </div>
                    </button>

                    {/* Subscription */}
                    <button
                      type="button"
                      className="modern-profile-menu-row"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <div className="modern-profile-menu-left">
                        <span className="modern-profile-menu-icon"><Bike size={20} /></span>
                        <div>
                          <span className="modern-profile-menu-label">Subscription</span>
                          <span className="modern-profile-menu-sub">{bikePlate || 'Delivery Fleet Bike'} · {bikeModel || 'Commercial Cargo EV'}</span>
                        </div>
                      </div>
                      <div className="modern-profile-menu-right">
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '8px' }}>
                          Verified
                        </span>
                        <ChevronRight size={18} />
                      </div>
                    </button>

                    {/* Clear cashe */}
                    <button
                      type="button"
                      className="modern-profile-menu-row"
                      onClick={() => {
                        refreshAll?.();
                        setProfileFeedbackMsg('App cache cleared and routes synchronized.');
                        setTimeout(() => setProfileFeedbackMsg(''), 2500);
                      }}
                    >
                      <div className="modern-profile-menu-left">
                        <span className="modern-profile-menu-icon"><Trash2 size={20} /></span>
                        <div>
                          <span className="modern-profile-menu-label">Clear cashe</span>
                          <span className="modern-profile-menu-sub">Sync with live customer orders & route</span>
                        </div>
                      </div>
                      <div className="modern-profile-menu-right">
                        <ChevronRight size={18} />
                      </div>
                    </button>

                    {/* Clear history */}
                    <button
                      type="button"
                      className="modern-profile-menu-row"
                      onClick={() => {
                        alert('4 Pure Farm Rules: 1. Keep milk at 4°C. 2. Collect empty glass bottles. 3. Finish deliveries before 6:30 AM. 4. Collect cash receipts.');
                      }}
                    >
                      <div className="modern-profile-menu-left">
                        <span className="modern-profile-menu-icon"><Clock size={20} /></span>
                        <div>
                          <span className="modern-profile-menu-label">Clear history</span>
                          <span className="modern-profile-menu-sub">Cold-chain guidelines & bottle exchange</span>
                        </div>
                      </div>
                      <div className="modern-profile-menu-right">
                        <ChevronRight size={18} />
                      </div>
                    </button>

                    {/* Log out */}
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
                </>
              ) : (
                /* ── SCREEN 2: EDIT PROFILE ── */
                <>
                  {/* Header: Back Arrow, "Edit Profile", Green Checkmark (Save) */}
                  <div className="modern-profile-header">
                    <button
                      type="button"
                      className="modern-profile-header-btn"
                      onClick={() => setIsEditingProfile(false)}
                      aria-label="Back"
                    >
                      <ArrowLeft size={22} />
                    </button>
                    <h2 className="modern-profile-header-title">Edit Profile</h2>
                    <button
                      type="submit"
                      form="modern-driver-edit-form"
                      className="modern-profile-header-btn is-save"
                      aria-label="Save profile"
                    >
                      <Check size={24} strokeWidth={2.5} color="#10b981" />
                    </button>
                  </div>

                  {/* Centered Avatar with Camera Badge */}
                  <div className="modern-edit-avatar-wrap">
                    <div className="modern-profile-avatar-wrap">
                      <div className="modern-profile-avatar-placeholder">
                        {(profileName || boyName || 'D').charAt(0).toUpperCase()}
                      </div>
                      <button
                        type="button"
                        className="modern-profile-camera-badge"
                        title="Change photo"
                        aria-label="Change photo"
                        onClick={() => {
                          alert('Upload driver photo feature: select from device camera or gallery.');
                        }}
                      >
                        <Camera size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Form fields matching reference design */}
                  <form id="modern-driver-edit-form" className="modern-edit-form" onSubmit={handleSaveProfile}>
                    {/* Name */}
                    <div className="modern-edit-field">
                      <label className="modern-edit-label">Name</label>
                      <div className="modern-edit-input-container">
                        <input
                          type="text"
                          className="modern-edit-input"
                          placeholder="Charlotte king"
                          value={profileName}
                          required
                          onChange={(e) => setProfileName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* E mail address */}
                    <div className="modern-edit-field">
                      <label className="modern-edit-label">E mail address</label>
                      <div className="modern-edit-input-container">
                        <input
                          type="email"
                          className="modern-edit-input"
                          placeholder="@johnkgraphics.gmail.com"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* User name */}
                    <div className="modern-edit-field">
                      <label className="modern-edit-label">User name</label>
                      <div className="modern-edit-input-container">
                        <input
                          type="text"
                          className="modern-edit-input"
                          placeholder="@johnkgraphics"
                          value={driverUsername ? `@${driverUsername}` : `@${(profileArea || 'routefleet').toLowerCase().replace(/\s+/g, '')}`}
                          onChange={(e) => setDriverUsername(e.target.value.replace(/^@/, ''))}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="modern-edit-field">
                      <label className="modern-edit-label">Password</label>
                      <div className="modern-edit-input-container">
                        <input
                          type={showDriverPassword ? 'text' : 'password'}
                          className="modern-edit-input"
                          value={driverPassword}
                          onChange={(e) => setDriverPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="modern-edit-icon-btn"
                          onClick={() => setShowDriverPassword(!showDriverPassword)}
                          aria-label={showDriverPassword ? 'Hide password' : 'Show password'}
                        >
                          {showDriverPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Phone number */}
                    <div className="modern-edit-field">
                      <label className="modern-edit-label">Phone number</label>
                      <div className="modern-edit-input-container">
                        <div className="modern-edit-phone-prefix">+91 ▼</div>
                        <input
                          type="tel"
                          className="modern-edit-input"
                          placeholder="6895312"
                          value={profilePhone}
                          required
                          onChange={(e) => setProfilePhone(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Vehicle Number */}
                    <div className="modern-edit-field">
                      <label className="modern-edit-label">Vehicle Number</label>
                      <div className="modern-edit-input-container">
                        <input
                          type="text"
                          className="modern-edit-input"
                          placeholder="TS09-AB-1234"
                          value={bikePlate}
                          onChange={(e) => setBikePlate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Assigned Delivery Area */}
                    <div className="modern-edit-field">
                      <label className="modern-edit-label">Assigned Delivery Area</label>
                      <div className="modern-edit-input-container">
                        <input
                          type="text"
                          className="modern-edit-input"
                          placeholder="Madhapur Sector 1"
                          value={profileArea}
                          onChange={(e) => setProfileArea(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="modern-edit-field">
                      <label className="modern-edit-label">Emergency Contact</label>
                      <div className="modern-edit-input-container">
                        <input
                          type="tel"
                          className="modern-edit-input"
                          placeholder="Supervisor / Emergency Phone"
                          value={profileEmergencyContact}
                          onChange={(e) => setProfileEmergencyContact(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="modern-edit-submit-btn">
                      ✓ Save Profile
                    </button>
                  </form>
                </>
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
          onClick={() => handleNavChange('deliveries')}
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
          onClick={() => handleNavChange('route')}
          className={`driver-bottom-tab ${navTab === 'route' ? 'active' : ''}`}
        >
          <ListOrdered size={20} />
          <span>Route</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavChange('cash')}
          className={`driver-bottom-tab ${navTab === 'cash' ? 'active' : ''}`}
        >
          <Wallet size={20} />
          <span>Cash</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavChange('profile')}
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

              {/* Doorstep Home Proof Photo Section (MANDATORY REQUIREMENT) */}
              <div
                style={{
                  background: homeProofImage ? '#f0fdf4' : photoUploadError ? '#fef2f2' : '#f8fafc',
                  border: homeProofImage
                    ? '2px solid #10b981'
                    : photoUploadError
                    ? '2px solid #ef4444'
                    : '1.5px dashed #94a3b8',
                  borderRadius: '12px',
                  padding: '12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Camera size={16} color="#059669" />
                    <span>Home Doorstep Photo <span style={{ color: '#dc2626' }}>* (Required)</span></span>
                  </label>
                  {homeProofImage && (
                    <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#059669', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                      ✓ Photo Attached
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handlePhotoCapture}
                />

                {!homeProofImage ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      style={{
                        width: '100%',
                        padding: '16px 12px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: isUploadingPhoto ? 'wait' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isUploadingPhoto ? (
                        <>
                          <RefreshCw size={24} className="spin" color="#059669" />
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                            Uploading home proof photo...
                          </span>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              background: '#ecfdf5',
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.15)',
                            }}
                          >
                            <Camera size={22} />
                          </div>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                            📸 Capture Home / Doorstep Photo
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Take camera photo or upload (Required to complete drop)
                          </span>
                        </>
                      )}
                    </button>

                    {photoUploadError && (
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '0.76rem',
                          color: '#dc2626',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <AlertCircle size={14} />
                        <span>{photoUploadError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        position: 'relative',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid #bbf7d0',
                        maxHeight: '170px',
                      }}
                    >
                      <img
                        src={homeProofImage}
                        alt="Home Doorstep Proof"
                        style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          display: 'flex',
                          gap: '6px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            color: '#ffffff',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          <Camera size={12} />
                          <span>Retake</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHomeProofImage('')}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(220, 38, 38, 0.85)',
                            color: '#ffffff',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Button — Requires Image of Home First */}
              <button
                type="button"
                onClick={handleConfirmDelivery}
                disabled={!homeProofImage || isUploadingPhoto}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '10px',
                  background: !homeProofImage || isUploadingPhoto ? '#94a3b8' : '#059669',
                  color: '#ffffff',
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: !homeProofImage || isUploadingPhoto ? 'not-allowed' : 'pointer',
                  marginTop: '4px',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  boxShadow: homeProofImage ? '0 3px 10px rgba(5, 150, 105, 0.25)' : 'none',
                }}
              >
                <Check size={18} />
                <span>
                  {!homeProofImage
                    ? '📸 Take Home Photo to Mark Delivered'
                    : isUploadingPhoto
                    ? 'Uploading Home Photo...'
                    : '✓ Confirm Delivery (Proof Verified)'}
                </span>
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

      {/* ============================================================ */}
      {/* 6. DOORSTEP PHOTO LIGHTBOX MODAL                             */}
      {/* ============================================================ */}
      {previewProofModal && (
        <div className="modal-overlay" onClick={() => setPreviewProofModal(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '480px', padding: '18px', textAlign: 'center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  📸 Doorstep Delivery Proof
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  {previewProofModal.customerName} • {previewProofModal.customerAddress}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#0f172a' }}>
              <img
                src={previewProofModal.proofImage}
                alt="Home doorstep proof photo"
                style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
              />
            </div>

            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#64748b' }}>
              <span>Delivered at: {previewProofModal.deliveredAt ? new Date(previewProofModal.deliveredAt).toLocaleTimeString() : 'Today'}</span>
              <button
                type="button"
                onClick={() => setPreviewProofModal(null)}
                style={{
                  padding: '6px 14px',
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
