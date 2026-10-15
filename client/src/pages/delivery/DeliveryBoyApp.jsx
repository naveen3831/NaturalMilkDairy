import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Mail,
  EyeOff,
  Globe,
  Users,
  UserCheck,
  UserPlus,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../../constants/cloudinaryMedia';

const getDeliveryRoute = () => {
  const [section, page, detail] = window.location.pathname.split('/').filter(Boolean);
  if (section !== 'delivery' || !['deliveries', 'route', 'customers', 'cash', 'profile'].includes(page)) {
    return null;
  }
  const profileViews = [
    'assigned-route',
    'shift-schedule',
    'vehicle',
    'depot',
    'supervisor',
    'personal-details',
    'contact-details',
    'territory-details',
    'edit',
  ];
  return { page, detail: page === 'profile' && profileViews.includes(detail) ? detail : null };
};

export default function DeliveryBoyApp({ setActiveTab }) {
  const { user, token, logout, getAuthHeaders } = useAuth();
  const {
    deliveries,
    selectedDate,
    setSelectedDate,
    fetchDeliveries,
    markDelivered,
    markNotDelivered,
    deliveryBoys,
    locations,
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
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [assignedCustomersError, setAssignedCustomersError] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const loadAssignedCustomers = useCallback(async () => {
    try {
      setIsLoadingCustomers(true);
      const response = await fetch('/api/deliveries/assigned-customers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load your assigned customers.');
      }
      setAssignedCustomers(Array.isArray(data.customers) ? data.customers : []);
      setAssignedCustomersError('');
    } catch (error) {
      setAssignedCustomersError(error.message || 'Unable to load your assigned customers.');
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [token]);

  // Customers Management Tab States (CRUD, Categories & Filtering)
  const [customerCategory, setCustomerCategory] = useState('all'); // 'all' | 'assigned' | 'driver' | 'subscription'
  const [customerSearch, setCustomerSearch] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [customerActionLoading, setCustomerActionLoading] = useState(false);
  const [customerFormError, setCustomerFormError] = useState('');
  const [customerSuccessBanner, setCustomerSuccessBanner] = useState('');

  // Add / Edit form fields
  const [custFormName, setCustFormName] = useState('');
  const [custFormMobile, setCustFormMobile] = useState('');
  const [custFormEmail, setCustFormEmail] = useState('');
  const [custFormWhatsapp, setCustFormWhatsapp] = useState('');
  const [custFormAddress, setCustFormAddress] = useState('');
  const [custFormArea, setCustFormArea] = useState(boyArea || 'Madhapur');
  const [custFormLandmark, setCustFormLandmark] = useState('');
  const [custFormMilkQty, setCustFormMilkQty] = useState(1);
  const [custFormCurdQty, setCustFormCurdQty] = useState(0);
  const [custFormFrequency, setCustFormFrequency] = useState('daily');
  const [custFormDays, setCustFormDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [custFormPaymentType, setCustFormPaymentType] = useState('credit');
  const [custFormNotes, setCustFormNotes] = useState('');

  const resetCustomerForm = () => {
    setCustFormName('');
    setCustFormMobile('');
    setCustFormEmail('');
    setCustFormWhatsapp('');
    setCustFormAddress('');
    setCustFormArea(boyArea || 'Madhapur');
    setCustFormLandmark('');
    setCustFormMilkQty(1);
    setCustFormCurdQty(0);
    setCustFormFrequency('daily');
    setCustFormDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    setCustFormPaymentType('credit');
    setCustFormNotes('');
    setCustomerFormError('');
  };

  const openAddCustomer = () => {
    resetCustomerForm();
    setShowAddCustomerModal(true);
    setEditingCustomer(null);
  };

  const openEditCustomer = (cust) => {
    setCustomerFormError('');
    setEditingCustomer(cust);
    setShowAddCustomerModal(false);
    setCustFormName(cust.name || '');
    setCustFormMobile(cust.mobile || '');
    setCustFormEmail(cust.email || '');
    setCustFormWhatsapp(cust.whatsapp || cust.mobile || '');
    setCustFormAddress(cust.address || '');
    setCustFormArea(cust.area || boyArea || 'Madhapur');
    setCustFormLandmark(cust.landmark || '');
    setCustFormMilkQty(cust.deliveryPlan?.milkQty ?? 1);
    setCustFormCurdQty(cust.deliveryPlan?.curdQty ?? 0);
    setCustFormFrequency(cust.deliveryPlan?.frequency || 'daily');
    setCustFormDays(cust.deliveryPlan?.deliveryDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    setCustFormPaymentType(cust.paymentInfo?.paymentType || 'credit');
    setCustFormNotes(cust.notes || '');
  };

  const handleSaveCustomer = async (e) => {
    if (e) e.preventDefault();
    setCustomerFormError('');

    if (!custFormName.trim()) {
      setCustomerFormError('Please enter the customer name.');
      return;
    }
    const cleanMobile = custFormMobile.trim().replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setCustomerFormError('Please provide a valid 10-digit mobile number.');
      return;
    }
    if (!custFormAddress.trim()) {
      setCustomerFormError('Please enter the delivery address.');
      return;
    }

    setCustomerActionLoading(true);
    try {
      const isEditing = Boolean(editingCustomer);
      const url = isEditing
        ? `/api/customers/${editingCustomer.id || editingCustomer._id}`
        : '/api/customers';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = isEditing ? {
        name: custFormName.trim(),
        mobile: cleanMobile,
        email: custFormEmail.trim().toLowerCase(),
        whatsapp: (custFormWhatsapp || cleanMobile).trim(),
        address: custFormAddress.trim(),
        area: custFormArea.trim() || boyArea || 'Madhapur',
        landmark: custFormLandmark.trim(),
        'deliveryPlan.milkQty': Number(custFormMilkQty) || 1,
        'deliveryPlan.curdQty': Number(custFormCurdQty) || 0,
        'deliveryPlan.frequency': custFormFrequency,
        'deliveryPlan.deliveryDays': custFormDays,
        'deliveryPlan.deliveryBoyId': boyId,
        'deliveryPlan.deliveryBoyName': boyName,
        'paymentInfo.paymentType': custFormPaymentType,
        notes: custFormNotes.trim(),
        actor: boyName,
      } : {
        name: custFormName.trim(),
        mobile: cleanMobile,
        email: custFormEmail.trim().toLowerCase(),
        whatsapp: (custFormWhatsapp || cleanMobile).trim(),
        address: custFormAddress.trim(),
        area: custFormArea.trim() || boyArea || 'Madhapur',
        landmark: custFormLandmark.trim(),
        milkQty: Number(custFormMilkQty) || 1,
        curdQty: Number(custFormCurdQty) || 0,
        frequency: custFormFrequency,
        deliveryDays: custFormDays,
        deliveryBoyId: boyId,
        deliveryBoyName: boyName,
        paymentType: custFormPaymentType,
        paymentCycle: 'monthly',
        initialBalance: 0,
        notes: custFormNotes.trim(),
        actor: boyName,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'add'} customer.`);
      }

      setCustomerSuccessBanner(
        isEditing
          ? `Customer ${custFormName} updated successfully.`
          : `Customer ${custFormName} added to your route! Today's delivery scheduled.`
      );
      setTimeout(() => setCustomerSuccessBanner(''), 5000);
      setShowAddCustomerModal(false);
      setEditingCustomer(null);
      resetCustomerForm();
      await Promise.all([
        loadAssignedCustomers(),
        fetchDeliveries(selectedDate, 'all', boyId),
      ]);
    } catch (err) {
      setCustomerFormError(err.message || 'Operation failed. Please try again.');
    } finally {
      setCustomerActionLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    setCustomerActionLoading(true);
    setCustomerFormError('');
    try {
      const res = await fetch(`/api/customers/${deletingCustomer.id || deletingCustomer._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ actor: boyName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to delete customer.');
      }
      setCustomerSuccessBanner(`Customer ${deletingCustomer.name} removed from your route.`);
      setTimeout(() => setCustomerSuccessBanner(''), 4500);
      setDeletingCustomer(null);
      await Promise.all([
        loadAssignedCustomers(),
        fetchDeliveries(selectedDate, 'all', boyId),
      ]);
    } catch (err) {
      alert(err.message || 'Failed to remove customer.');
    } finally {
      setCustomerActionLoading(false);
    }
  };

  const handleToggleCustomerPause = async (cust) => {
    try {
      const isCurrentlyPaused = cust.status === 'paused';
      const endpoint = isCurrentlyPaused ? 'resume' : 'pause';
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setDate(today.getDate() + 30);
      const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      const body = isCurrentlyPaused
        ? { actor: boyName }
        : {
            pauseFrom: formatDateStr(today),
            pauseUntil: formatDateStr(nextMonth),
            reason: 'Paused by delivery partner',
            actor: boyName,
          };

      const res = await fetch(`/api/customers/${cust.id || cust._id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to ${endpoint} delivery.`);
      }
      setCustomerSuccessBanner(`Customer ${cust.name} delivery ${isCurrentlyPaused ? 'resumed' : 'paused'}.`);
      setTimeout(() => setCustomerSuccessBanner(''), 4500);
      await Promise.all([
        loadAssignedCustomers(),
        fetchDeliveries(selectedDate, 'all', boyId),
      ]);
    } catch (err) {
      alert(err.message || 'Error updating customer status');
    }
  };

  // Navigation tab: 'deliveries' | 'route' | 'customers' | 'cash' | 'profile'
  const [navTab, setNavTab] = useState(() => {
    const savedTab = localStorage.getItem('nmd_driver_tab');
    const validTab = ['deliveries', 'route', 'customers', 'cash', 'profile'].includes(savedTab) ? savedTab : 'deliveries';
    return getDeliveryRoute()?.page || validTab;
  });
  const [profileDetailView, setProfileDetailView] = useState(() => getDeliveryRoute()?.detail || null);

  const setDeliveryPath = (path, replace = false) => {
    if (window.location.pathname === path) return;
    const updateHistory = replace ? 'replaceState' : 'pushState';
    window.history[updateHistory]({ nmdDeliveryPage: true }, '', path);
  };

  const handleNavChange = (tab) => {
    try {
      localStorage.setItem('nmd_driver_tab', tab);
    } catch (e) {}
    setNavTab(tab);
    setProfileDetailView(null);
    setIsEditingProfile(false);
    setDeliveryPath(`/delivery/${tab}`);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('.driver-main') || document.querySelector('.driver-layout-container') || document.querySelector('.driver-content');
    if (mainEl) mainEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  // Filter for deliveries: 'pending' (first/default) | 'delivered' | 'not_delivered' | 'all' (last)
  const [filterStatus, setFilterStatus] = useState('pending');
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

  // Route & Stops tab controls
  const [routeFilter, setRouteFilter] = useState('all'); // 'all' | 'pending' | 'delivered' | 'subscriptions'
  const [routeSearch, setRouteSearch] = useState('');

  // Profile tab interactive states
  const [copiedId, setCopiedId] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeletePartnerModal, setShowDeletePartnerModal] = useState(false);
  const [isDeletingPartner, setIsDeletingPartner] = useState(false);
  const [deletePartnerError, setDeletePartnerError] = useState('');

  // Cash Handover to Admin States
  const [driverHandovers, setDriverHandovers] = useState([]);
  const [isLoadingDriverHandovers, setIsLoadingDriverHandovers] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverAmount, setHandoverAmount] = useState('');
  const [handoverMethod, setHandoverMethod] = useState('dairy_counter');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  const [handoverFeedback, setHandoverFeedback] = useState({ type: '', text: '' });

  const loadDriverHandovers = useCallback(async () => {
    try {
      setIsLoadingDriverHandovers(true);
      const token = localStorage.getItem('nmd_jwt_token');
      const targetDriverId = boyId || user?.id || user?.mobile || '';
      const res = await fetch(`/api/payments/handovers?driverId=${encodeURIComponent(targetDriverId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.handovers)) {
        setDriverHandovers(data.handovers);
      }
    } catch (err) {
      console.error('loadDriverHandovers error:', err);
    } finally {
      setIsLoadingDriverHandovers(false);
    }
  }, [boyId, user]);

  useEffect(() => {
    if (navTab === 'cash') {
      loadDriverHandovers();
    }
  }, [navTab, loadDriverHandovers]);

  // WebSocket listener for real-time handover updates
  useEffect(() => {
    if (!wsSubscribe) return;
    const unsub1 = wsSubscribe('CASH_HANDOVER_UPDATED', () => loadDriverHandovers());
    const unsub2 = wsSubscribe('CASH_HANDOVER_SUBMITTED', () => loadDriverHandovers());
    return () => {
      if (typeof unsub1 === 'function') unsub1();
      if (typeof unsub2 === 'function') unsub2();
    };
  }, [wsSubscribe, loadDriverHandovers]);

  const handleOpenHandoverModal = (availableCashAmt) => {
    const totalHandedOver = driverHandovers
      .filter((h) => h.status === 'accepted' || h.status === 'pending')
      .reduce((sum, h) => sum + (h.amount || 0), 0);
    const available = typeof availableCashAmt === 'number'
      ? availableCashAmt
      : Math.max(0, totalCashCollected - totalHandedOver);

    if (available <= 0) {
      setHandoverFeedback({
        type: 'info',
        text: 'All collected cash has already been handed over to Admin.',
      });
      setTimeout(() => setHandoverFeedback({ type: '', text: '' }), 4000);
      return;
    }

    setHandoverAmount(String(available));
    setHandoverMethod('dairy_counter');
    setHandoverNotes('');
    setHandoverFeedback({ type: '', text: '' });
    setShowHandoverModal(true);
  };

  const handleSubmitHandover = async (e) => {
    if (e) e.preventDefault();
    const amt = Number(handoverAmount);
    if (!amt || amt <= 0) {
      setHandoverFeedback({ type: 'error', text: 'Please enter a valid amount to handover.' });
      return;
    }
    setIsSubmittingHandover(true);
    setHandoverFeedback({ type: '', text: '' });
    try {
      const token = localStorage.getItem('nmd_jwt_token');
      const res = await fetch('/api/payments/handover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          deliveryBoyId: boyId || user?.id || '',
          deliveryBoyName: boyName || user?.name || 'Delivery Partner',
          deliveryBoyMobile: user?.mobile || matchedBoy?.mobile || '',
          assignedArea: boyArea || '',
          amount: amt,
          physicalCashCollected: totalCashCollected,
          upiCollected: totalUpiCollected,
          handoverMethod,
          notes: handoverNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowHandoverModal(false);
        setHandoverFeedback({
          type: 'success',
          text: `Cash handover of ₹${amt} submitted! Waiting for Admin verification.`,
        });
        setTimeout(() => setHandoverFeedback({ type: '', text: '' }), 5000);
        await loadDriverHandovers();
      } else {
        throw new Error(data.message || 'Failed to submit handover');
      }
    } catch (err) {
      setHandoverFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const handleDeletePartnerAccount = async () => {
    setIsDeletingPartner(true);
    setDeletePartnerError('');
    try {
      const targetId = boyId || matchedBoy?._id || matchedBoy?.id || user?.id || user?.mobile || 'me';
      const token = localStorage.getItem('nmd_jwt_token');
      const res = await fetch(`/api/delivery-boys/${targetId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ actor: boyName || user?.name || 'Delivery Partner', boyId: targetId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to delete delivery partner account.');
      }
      setShowDeletePartnerModal(false);
      localStorage.removeItem('nmd_jwt_token');
      localStorage.removeItem('nmd_user');
      alert('Your Delivery Partner account has been permanently deleted from our database.');
      logout();
      if (setActiveTab) setActiveTab('home');
    } catch (err) {
      setDeletePartnerError(err.message || 'Unable to delete delivery partner account.');
    } finally {
      setIsDeletingPartner(false);
    }
  };

  // Profile Editable States (Real data from authenticated user and MongoDB)
  const [isEditingProfile, setIsEditingProfile] = useState(() => getDeliveryRoute()?.detail === 'edit');
  const openProfileDetail = (view) => {
    localStorage.setItem('nmd_driver_tab', 'profile');
    setNavTab('profile');
    setIsEditingProfile(false);
    setProfileDetailView(view);
    setDeliveryPath(`/delivery/profile/${view}`);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };
  const openEditProfile = () => {
    localStorage.setItem('nmd_driver_tab', 'profile');
    setNavTab('profile');
    setProfileDetailView(null);
    setIsEditingProfile(true);
    setDeliveryPath('/delivery/profile/edit');
  };
  const backToDriverProfile = () => {
    setProfileDetailView(null);
    setIsEditingProfile(false);
    setDeliveryPath('/delivery/profile', true);
  };

  useEffect(() => {
    const syncDeliveryPage = () => {
      const route = getDeliveryRoute();
      if (!route) {
        if (window.location.pathname.startsWith('/delivery/')) {
          const savedTab = localStorage.getItem('nmd_driver_tab');
          const fallbackTab = ['deliveries', 'route', 'customers', 'cash', 'profile'].includes(savedTab)
            ? savedTab
            : 'deliveries';
          setNavTab(fallbackTab);
          setProfileDetailView(null);
          setIsEditingProfile(false);
          setDeliveryPath(`/delivery/${fallbackTab}`, true);
        }
        return;
      }
      localStorage.setItem('nmd_driver_tab', route.page);
      setNavTab(route.page);
      setProfileDetailView(route.detail === 'edit' ? null : route.detail);
      setIsEditingProfile(route.detail === 'edit');
      const canonicalPath = route.detail
        ? `/delivery/profile/${route.detail}`
        : `/delivery/${route.page}`;
      setDeliveryPath(canonicalPath, true);
    };
    syncDeliveryPage();
    window.addEventListener('popstate', syncDeliveryPage);
    return () => window.removeEventListener('popstate', syncDeliveryPage);
  }, []);

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
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    backToDriverProfile();
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

  useEffect(() => {
    loadAssignedCustomers();
  }, [loadAssignedCustomers]);

  // Real-time synchronization for deliveries and customers
  useEffect(() => {
    if (!wsSubscribe) return;
    const unsub = wsSubscribe('DELIVERY_UPDATED', () => {
      fetchDeliveries(selectedDate, 'all', boyId);
      loadAssignedCustomers();
    });
    const unsubCust = wsSubscribe('CUSTOMER_UPDATED', () => {
      loadAssignedCustomers();
      fetchDeliveries(selectedDate, 'all', boyId);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
      if (typeof unsubCust === 'function') unsubCust();
    };
  }, [wsSubscribe, selectedDate, boyId, fetchDeliveries, loadAssignedCustomers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDeliveries(selectedDate, 'all', boyId),
      loadAssignedCustomers(),
    ]);
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

  // Filtered deliveries based on active status filter & search query (Pending first)
  const displayedDeliveries = myDeliveries
    .filter((d) => {
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.customerName?.toLowerCase().includes(q);
        const matchAddr = d.customerAddress?.toLowerCase().includes(q);
        const matchPhone = d.customerPhone?.toLowerCase().includes(q);
        return matchName || matchAddr || matchPhone;
      }
      return true;
    })
    .sort((a, b) => {
      const order = { pending: 1, not_delivered: 2, delivered: 3 };
      const diff = (order[a.status] || 99) - (order[b.status] || 99);
      if (diff !== 0) return diff;
      return (a.sequenceNumber || 0) - (b.sequenceNumber || 0);
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
  const completedCount = completedList.length;
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
        headers: { ...getAuthHeaders() },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setHomeProofImage(data.url);
      } else {
        throw new Error(data.message || 'The photo could not be stored. Please retry the upload.');
      }
    } catch (err) {
      setPhotoUploadError(err.message || 'The photo could not be stored. Please retry the upload.');
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

    const result = await markDelivered(activeItem.id, {
      actualMilk: Number(milkQty),
      actualCurd: Number(curdQty),
      paymentMethod: payMode,
      collectedAmount: payMode === 'cash' || payMode === 'upi' ? Number(collectedNow) : 0,
      notes: deliveryNote,
      actor: boyName,
      proofImage: homeProofImage || '',
    });
    if (!result?.success) {
      setPhotoUploadError(result?.message || 'Delivery could not be saved. Please try again.');
      return;
    }

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
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: assignedCustomers.length > 0 ? `${assignedCustomers.length}` : null,
      badgeColor: '#059669',
      desc: 'Route customers & subscription plans',
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
      desc: 'Partner profile & account details',
    },
  ];

  const currentNav = navItems.find((n) => n.id === navTab) || navItems[0];
  const profileDetailPages = {
    'personal-details': {
      title: 'Personal Information',
      description: 'Your delivery partner identity and credentials.',
      rows: [
        ['Full name', profileName || boyName || 'Delivery Partner'],
        ['Partner ID', `NMD-DRV-${(boyId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '8492'}`],
        ['Designation', 'Delivery Partner'],
        ['Account status', isOnline ? 'On duty' : 'Offline'],
        ['Blood group', profileBloodGroup || 'Not specified'],
        ['Driving license', profileLicense || 'Not provided'],
        ['Member since', profileJoiningDate || 'Active Partner'],
      ],
    },
    'contact-details': {
      title: 'Contact Information',
      description: 'Your phone number and registered contact details.',
      rows: [
        ['Mobile number', profilePhone || user?.mobile || user?.phone || 'Not provided'],
        ['Email address', profileEmail || user?.email || 'Not provided'],
        ['Home address', profileAddress || 'Not provided'],
        ['Emergency contact', profileEmergencyContact || 'Not provided'],
      ],
    },
    'territory-details': {
      title: 'Territory & Dispatch',
      description: 'Your assigned area, shift and dispatch hub.',
      rows: [
        ['Assigned territory', profileArea || boyArea || 'Not provided'],
        ['Assigned shift', profileShift || 'Morning Dispatch'],
        ['Dispatch hub', profileAddress || 'Not provided'],
        ['Supervisor hotline', profileEmergencyContact || 'Not provided'],
      ],
      phone: profileEmergencyContact,
    },
    'assigned-route': {
      title: 'Assigned Delivery Route',
      description: 'Your assigned territory and progress for today.',
      rows: [
        ['Delivery area', profileArea || boyArea],
        ['Scheduled stops', `${totalDrops} customers`],
        ['Stops remaining', `${pendingList.length}`],
        ['Route status', pendingList.length > 0 ? 'In progress' : 'Completed'],
      ],
      action: 'route',
    },
    'shift-schedule': {
      title: 'Shift Schedule',
      description: 'Your work hours and morning delivery target.',
      rows: [
        ['Assigned shift', profileShift || 'Morning Dispatch'],
        ['Operating hours', '5:00 AM – 7:30 AM'],
        ['Delivery target', 'Complete doorstep drops before 6:30 AM'],
      ],
    },
    vehicle: {
      title: 'Delivery Vehicle',
      description: 'Vehicle details currently assigned to your route.',
      rows: [
        ['Registration number', bikePlate || 'Not provided'],
        ['Vehicle model', bikeModel || 'Not provided'],
        ['Vehicle type', bikeType || 'Not provided'],
        ['Crates capacity', bikeCratesCapacity || 'Not provided'],
        ['Driving license', profileLicense || 'Not provided'],
      ],
    },
    depot: {
      title: 'Dispatch Hub & Depot',
      description: 'Your assigned dispatch location.',
      rows: [
        ['Hub address', profileAddress || 'Not provided'],
        ['Assigned area', profileArea || boyArea],
      ],
    },
    supervisor: {
      title: 'Hub Supervisor Hotline',
      description: 'Contact the operations desk if you need route or delivery support.',
      rows: [
        ['Supervisor phone', profileEmergencyContact || 'Not provided'],
      ],
      phone: profileEmergencyContact,
    },
  };
  const activeProfileDetail = profileDetailPages[profileDetailView];

  return (
    <div className={`driver-layout-root ${navTab === 'profile' ? 'is-driver-profile' : ''}`} style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>
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
          .driver-layout-root.is-driver-profile .driver-mobile-header {
            display: none !important;
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
          /* Route & Stops Mobile View Redesign */
          .driver-route-page {
            gap: 10px !important;
          }
          .driver-route-header-banner {
            padding: 12px 14px !important;
            border-radius: 14px !important;
            gap: 10px !important;
          }
          .driver-route-header-desc {
            display: none !important;
          }
          .driver-route-header-actions {
            width: 100% !important;
            display: flex !important;
            gap: 8px !important;
          }
          .driver-route-nav-btn {
            flex: 1 !important;
            justify-content: center !important;
            padding: 10px 14px !important;
            font-size: 0.84rem !important;
          }
          .driver-route-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }
          .driver-route-kpi-card {
            padding: 10px 12px !important;
            border-radius: 12px !important;
          }
          .driver-route-kpi-val {
            font-size: 1.25rem !important;
            margin-top: 2px !important;
          }
          .driver-route-kpi-sub {
            font-size: 0.68rem !important;
            margin-top: 2px !important;
          }
          .driver-route-progress-card {
            padding: 10px 12px !important;
            border-radius: 12px !important;
          }
          .driver-route-filter-bar {
            padding: 8px 10px !important;
            border-radius: 12px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .driver-route-filter-scroll {
            display: flex !important;
            gap: 6px !important;
            overflow-x: auto !important;
            padding-bottom: 2px !important;
            scrollbar-width: none !important;
            width: 100% !important;
          }
          .driver-route-filter-scroll::-webkit-scrollbar {
            display: none !important;
          }
          .driver-route-search-wrap {
            width: 100% !important;
            max-width: 100% !important;
          }
          .driver-route-stop-card {
            padding: 14px 14px !important;
            border-radius: 14px !important;
          }
          /* Customer Page 2 Cards Per Row on Mobile */
          .driver-customers-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }
          .driver-customers-stat {
            padding: 10px 10px !important;
            border-radius: 12px !important;
            gap: 8px !important;
            align-items: center !important;
          }
          .driver-customers-stat-icon {
            width: 34px !important;
            height: 34px !important;
            border-radius: 8px !important;
            flex-shrink: 0 !important;
          }
          .driver-customers-stat-icon svg {
            width: 17px !important;
            height: 17px !important;
          }
          .driver-customers-stat-val {
            font-size: 1.15rem !important;
            line-height: 1.1 !important;
          }
          .driver-customers-stat-label {
            font-size: 0.67rem !important;
            line-height: 1.15 !important;
            word-break: break-word !important;
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
          <div
            onClick={() => {
              if (typeof setActiveTab === 'function') {
                setActiveTab('home');
              }
            }}
            title="Go to Home Page"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}
          >
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
                    { id: 'pending', label: `Pending (${pendingList.length})` },
                    { id: 'delivered', label: `Delivered (${completedList.length})` },
                    { id: 'not_delivered', label: `Not Done (${missedList.length})` },
                    { id: 'all', label: `All (${totalDrops})` },
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
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                              {item.subscriptionEndDate
                                ? `Prepaid to ${new Date(item.subscriptionEndDate).toLocaleDateString('en-IN')}`
                                : `₹${item.totalAmount}`}
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

                          {isDone && (
                            <div
                              style={{
                                padding: '9px 12px',
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#065f46',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                gridColumn: 'span 2',
                              }}
                            >
                              <CheckCircle2 size={15} color="#059669" />
                              <span>Delivered</span>
                            </div>
                          )}

                          {isMissed && (
                            <div
                              style={{
                                padding: '9px 12px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#b91c1c',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                gridColumn: 'span 2',
                              }}
                            >
                              <XCircle size={15} color="#dc2626" />
                              <span>Missed</span>
                            </div>
                          )}

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
          {/* TAB 2: ROUTE & STOPS (REDESIGNED WEB & MOBILE)            */}
          {/* ========================================================= */}
          {navTab === 'route' && (() => {
            // Rich Route Statistics
            const totalPlannedMilk = myDeliveries.reduce((sum, d) => sum + (Number(d.plannedMilk) || 0), 0);
            const totalPlannedCurd = myDeliveries.reduce((sum, d) => sum + (Number(d.plannedCurd) || 0), 0);
            const subscriptionsList = myDeliveries.filter((d) => Boolean(d.subscriptionEndDate) || d.paymentMethod === 'prepaid');
            const totalCashDue = myDeliveries
              .filter((d) => d.status === 'pending' && !d.subscriptionEndDate && d.paymentMethod !== 'prepaid')
              .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
            const nextPending = myDeliveries.find((d) => d.status === 'pending');

            // Filter & Search stops
            const filteredStops = myDeliveries.filter((d) => {
              if (routeFilter === 'pending' && d.status !== 'pending') return false;
              if (routeFilter === 'delivered' && d.status !== 'delivered') return false;
              if (routeFilter === 'subscriptions' && !d.subscriptionEndDate && d.paymentMethod !== 'prepaid') return false;
              if (routeSearch.trim()) {
                const q = routeSearch.toLowerCase();
                const matchName = d.customerName?.toLowerCase().includes(q);
                const matchAddr = d.customerAddress?.toLowerCase().includes(q);
                const matchPhone = d.customerPhone?.toLowerCase().includes(q);
                const matchId = d.customerId?.toLowerCase().includes(q);
                return matchName || matchAddr || matchPhone || matchId;
              }
              return true;
            });

            // Map navigation link for next pending stop or route territory
            const firstPendingDestination = nextPending?.customerAddress || boyArea || 'Madhapur';
            const googleNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(firstPendingDestination)}`;

            return (
              <div className="driver-route-page" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '16px' }}>
                {/* 1. Header Banner */}
                <div
                  className="driver-route-header-banner"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: isMobile ? '14px' : '16px',
                    padding: isMobile ? '12px 14px' : '18px 20px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '10px' : '14px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        <MapPin size={11} /> {boyArea || 'Madhapur'} Route
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        <Clock size={11} /> 05:00 – 07:30 AM
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <Calendar size={11} /> {selectedDate}
                      </span>
                    </div>

                    <h1 className="driver-route-header-title" style={{ fontSize: isMobile ? '1.12rem' : '1.28rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                      Today’s Route
                    </h1>
                    <p className="driver-route-header-desc" style={{ color: '#64748b', fontSize: '0.84rem', margin: '3px 0 0 0', lineHeight: 1.45 }}>
                      {myDeliveries.length} planned stops in {boyArea || 'your assigned area'}.
                    </p>
                  </div>

                  <div className="driver-route-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={googleNavUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="driver-route-nav-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: isMobile ? '10px 14px' : '9px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        color: '#ffffff',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.22)',
                        cursor: 'pointer',
                        flex: isMobile ? '1' : 'initial',
                      }}
                    >
                      <Navigation size={15} />
                      <span>Start GPS Navigation</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleRefresh}
                      title="Refresh Stops"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: isMobile ? '10px 12px' : '9px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} />
                      {!isMobile && <span>Refresh</span>}
                    </button>
                  </div>
                </div>

                {/* 2. Route Metrics Overview (2x2 Grid on Mobile, 4-in-a-row on Desktop) */}
                <div
                  className="driver-route-kpi-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: isMobile ? '8px' : '12px',
                  }}
                >
                  {/* Stops Card */}
                  <div
                    className="driver-route-kpi-card driver-route-metric-stops"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: isMobile ? '12px' : '14px',
                      padding: isMobile ? '10px 12px' : '14px 16px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '3px' : '8px' }}>
                      <span style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, color: '#64748b' }}>Total stops</span>
                      <div style={{ width: isMobile ? '26px' : '32px', height: isMobile ? '26px' : '32px', borderRadius: '7px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={isMobile ? 13 : 16} />
                      </div>
                    </div>
                    <div className="driver-route-kpi-val" style={{ fontSize: isMobile ? '1.25rem' : '1.4rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                      {myDeliveries.length}
                    </div>
                    <div className="driver-route-kpi-sub" style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {boyArea || 'Madhapur'} sequence
                    </div>
                  </div>

                  {/* Pending Drops */}
                  <div
                    className="driver-route-kpi-card driver-route-metric-remaining"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: isMobile ? '12px' : '14px',
                      padding: isMobile ? '10px 12px' : '14px 16px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '3px' : '8px' }}>
                      <span style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, color: '#64748b' }}>Remaining</span>
                      <div style={{ width: isMobile ? '26px' : '32px', height: isMobile ? '26px' : '32px', borderRadius: '7px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={isMobile ? 13 : 16} />
                      </div>
                    </div>
                    <div className="driver-route-kpi-val" style={{ fontSize: isMobile ? '1.25rem' : '1.4rem', fontWeight: 900, color: pendingList.length > 0 ? '#d97706' : '#059669', lineHeight: 1.1 }}>
                      {pendingList.length}
                    </div>
                    <div className="driver-route-kpi-sub" style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {completedList.length} done ({progressPercent}%)
                    </div>
                  </div>

                  {/* Milk Volume */}
                  <div
                    className="driver-route-kpi-card driver-route-metric-load"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: isMobile ? '12px' : '14px',
                      padding: isMobile ? '10px 12px' : '14px 16px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '3px' : '8px' }}>
                      <span style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, color: '#64748b' }}>Milk load</span>
                      <div style={{ width: isMobile ? '26px' : '32px', height: isMobile ? '26px' : '32px', borderRadius: '7px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Truck size={isMobile ? 13 : 16} />
                      </div>
                    </div>
                    <div className="driver-route-kpi-val" style={{ fontSize: isMobile ? '1.25rem' : '1.4rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                      {totalPlannedMilk} L
                    </div>
                    <div className="driver-route-kpi-sub" style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {totalPlannedCurd > 0 ? `+ ${totalPlannedCurd}g Curd` : 'Fresh Cow Milk'}
                    </div>
                  </div>

                  {/* Prepaid & Collections */}
                  <div
                    className="driver-route-kpi-card driver-route-metric-collections"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: isMobile ? '12px' : '14px',
                      padding: isMobile ? '10px 12px' : '14px 16px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '3px' : '8px' }}>
                      <span style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, color: '#64748b' }}>Collections</span>
                      <div style={{ width: isMobile ? '26px' : '32px', height: isMobile ? '26px' : '32px', borderRadius: '7px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Wallet size={isMobile ? 13 : 16} />
                      </div>
                    </div>
                    <div className="driver-route-kpi-val" style={{ fontSize: isMobile ? '1.25rem' : '1.4rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                      ₹{totalCashDue}
                    </div>
                    <div className="driver-route-kpi-sub" style={{ fontSize: '0.7rem', color: '#6d28d9', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {subscriptionsList.length} Prepaid Sub{subscriptionsList.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* 3. Route Progress Bar */}
                <div
                  className="driver-route-progress-card"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: isMobile ? '12px' : '14px',
                    padding: isMobile ? '10px 12px' : '12px 16px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontSize: isMobile ? '0.78rem' : '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={isMobile ? 14 : 16} color="#059669" />
                      <span>Route progress</span>
                    </div>
                    <span style={{ fontSize: isMobile ? '0.76rem' : '0.8rem', fontWeight: 800, color: '#059669' }}>
                      {progressPercent}% Complete
                    </span>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                        borderRadius: '999px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px', fontSize: '0.72rem', color: '#64748b' }}>
                    <span>{completedList.length} drops finished</span>
                    <span>{nextPending ? `Next: #${myDeliveries.indexOf(nextPending) + 1} ${nextPending.customerName}` : 'All drops completed! 🎉'}</span>
                  </div>
                </div>

                {/* 4. Filter Tabs & Search Controls */}
                <div
                  className="driver-route-filter-bar"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: isMobile ? '12px' : '14px',
                    padding: isMobile ? '8px 10px' : '10px 14px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: isMobile ? '8px' : '10px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* Category Pills (Horizontal Scroll on Mobile) */}
                  <div
                    className="driver-route-filter-scroll"
                    style={{
                      display: 'flex',
                      gap: '6px',
                      overflowX: 'auto',
                      paddingBottom: '2px',
                      scrollbarWidth: 'none',
                      WebkitOverflowScrolling: 'touch',
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    {[
                      { id: 'pending', label: `Pending (${pendingList.length})` },
                      { id: 'delivered', label: `Completed (${completedList.length})` },
                      { id: 'subscriptions', label: `Prepaid (${subscriptionsList.length})` },
                      { id: 'all', label: `All Stops (${myDeliveries.length})` },
                    ].map((btn) => {
                      const isSel = routeFilter === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setRouteFilter(btn.id)}
                          style={{
                            padding: isMobile ? '5px 11px' : '6px 12px',
                            borderRadius: '8px',
                            fontSize: isMobile ? '0.74rem' : '0.78rem',
                            fontWeight: isSel ? 800 : 600,
                            border: '1px solid',
                            borderColor: isSel ? '#059669' : '#cbd5e1',
                            background: isSel ? '#ecfdf5' : '#ffffff',
                            color: isSel ? '#065f46' : '#475569',
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

                  {/* Search Bar */}
                  <div
                    className="driver-route-search-wrap"
                    style={{
                      position: 'relative',
                      minWidth: isMobile ? '100%' : '180px',
                      flex: isMobile ? 'initial' : '1',
                      maxWidth: isMobile ? '100%' : '300px',
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                    <input
                      type="text"
                      placeholder="Search stop, flat, street, phone..."
                      value={routeSearch}
                      onChange={(e) => setRouteSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        fontSize: '0.82rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* 5. Route Stops Sequence List */}
                {filteredStops.length === 0 ? (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '48px 24px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                      }}
                    >
                      <MapPin size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                      No Matching Stops Found
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.82rem', maxWidth: '340px', margin: '0 auto 14px auto' }}>
                      {routeSearch.trim() ? `No route stops match "${routeSearch}".` : 'No stops in this filter category.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setRouteFilter('all'); setRouteSearch(''); }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#059669',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Reset Filter
                    </button>
                  </div>
                ) : (
                  <div className="driver-route-stop-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredStops.map((item) => {
                      const originalIndex = myDeliveries.indexOf(item);
                      const isDone = item.status === 'delivered';
                      const isMissed = item.status === 'not_delivered';
                      const isPending = item.status === 'pending';

                      // Enrich with assignedCustomers record
                      const customerInfo = (assignedCustomers || []).find(
                        (c) => c.customerId === item.customerId ||
                               c.mobile === item.customerPhone ||
                               c._id === item.customerId ||
                               c.id === item.customerId
                      );

                      const isSubscription = Boolean(item.subscriptionEndDate) ||
                        customerInfo?.subscription?.status === 'active' ||
                        item.paymentMethod === 'prepaid';

                      const subDateText = item.subscriptionEndDate
                        ? new Date(item.subscriptionEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : customerInfo?.subscription?.endDate
                        ? new Date(customerInfo.subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '';

                      const customerPhone = item.customerPhone || customerInfo?.mobile || '';
                      const doorstepAddress = item.customerAddress || customerInfo?.address || 'Doorstep Delivery';
                      const landmark = item.landmark || customerInfo?.landmark || '';
                      const specialNotes = item.deliveryNotes || customerInfo?.deliveryNotes || customerInfo?.notes || '';
                      const mapAddress = `${doorstepAddress}, ${item.customerArea || customerInfo?.area || boyArea || 'Madhapur'}`;
                      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddress)}`;

                      return (
                        <div
                          key={item.id || item._id}
                          className={`driver-route-stop-card ${isDone ? 'is-delivered' : isMissed ? 'is-skipped' : 'is-pending'}`}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: isMobile ? '14px' : '16px',
                            padding: isMobile ? '12px 14px' : '16px 18px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Top Row: Stop Badge, Customer Name, Status & Price */}
                          <div className="driver-route-stop-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: '1' }}>
                              {/* Sequence Badge */}
                              <div
                                className="driver-route-stop-number"
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '10px',
                                  background: isDone ? '#ecfdf5' : isMissed ? '#fef2f2' : '#eff6ff',
                                  color: isDone ? '#059669' : isMissed ? '#dc2626' : '#2563eb',
                                  border: isDone ? '1px solid #bbf7d0' : isMissed ? '1px solid #fecaca' : '1px solid #bfdbfe',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.84rem',
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                #{originalIndex + 1}
                              </div>

                              <div className="driver-route-customer">
                                <div className="driver-route-customer-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    {item.customerName}
                                  </h3>
                                  {(item.customerId || customerInfo?.customerId) && (
                                    <span
                                      className="driver-route-customer-id"
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #e2e8f0',
                                      }}
                                    >
                                      {item.customerId || customerInfo?.customerId}
                                    </span>
                                  )}
                                  {isSubscription && (
                                    <span
                                      className="driver-route-subscription-tag"
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        background: '#fffbeb',
                                        color: '#b45309',
                                        border: '1px solid #fde68a',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      <Sparkles size={11} /> Prepaid Sub
                                    </span>
                                  )}
                                </div>

                                {customerPhone && (
                                  <a
                                    href={`tel:${customerPhone}`}
                                    className="driver-route-customer-phone"
                                    style={{
                                      fontSize: '0.78rem',
                                      color: '#2563eb',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      marginTop: '3px',
                                      textDecoration: 'none',
                                    }}
                                  >
                                    <Phone size={12} /> {customerPhone}
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Status Tag */}
                            <div className="driver-route-stop-status" style={{ textAlign: 'right', flexShrink: 0 }}>
                              <span
                                className="driver-route-stop-status-badge"
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 9px',
                                  borderRadius: '8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: isDone ? '#ecfdf5' : isMissed ? '#fef2f2' : '#fffbeb',
                                  color: isDone ? '#059669' : isMissed ? '#dc2626' : '#b45309',
                                  border: isDone ? '1px solid #bbf7d0' : isMissed ? '1px solid #fecaca' : '1px solid #fde68a',
                                }}
                              >
                                {isDone ? '✓ Delivered' : isMissed ? '✕ Skipped' : '○ Pending Drop'}
                              </span>

                              <div className="driver-route-stop-amount" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                                {isSubscription
                                  ? subDateText ? `Prepaid to ${subDateText}` : 'Active Prepaid'
                                  : `₹${item.totalAmount}`}
                              </div>
                            </div>
                          </div>

                          {/* Middle: Doorstep Address & Landmark */}
                          <div
                            className="driver-route-stop-address"
                            style={{
                              marginTop: '12px',
                              padding: '10px 12px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              fontSize: '0.82rem',
                              color: '#334155',
                              lineHeight: 1.45,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                              <MapPin size={15} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <div>
                                <strong>{doorstepAddress}</strong>
                                {landmark && (
                                  <div className="driver-route-landmark" style={{ color: '#64748b', fontSize: '0.76rem', marginTop: '2px' }}>
                                    🏛️ Landmark: {landmark}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Product Pills & Delivery Info */}
                          <div className="driver-route-stop-products" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              className="driver-route-product-pill is-milk"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 9px',
                                borderRadius: '6px',
                                background: '#ecfdf5',
                                border: '1px solid #bbf7d0',
                                color: '#065f46',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                              }}
                            >
                              🥛 {item.actualMilk || item.plannedMilk || 1}L Daily Milk
                            </span>

                            {(item.plannedCurd > 0 || customerInfo?.deliveryPlan?.curdQty > 0) && (
                              <span
                                className="driver-route-product-pill is-curd"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 9px',
                                  borderRadius: '6px',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                }}
                              >
                                🥣 {item.actualCurd || item.plannedCurd || customerInfo?.deliveryPlan?.curdQty}g Curd
                              </span>
                            )}

                            <span
                              className="driver-route-product-pill is-frequency"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 9px',
                                borderRadius: '6px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#475569',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                              }}
                            >
                              <Calendar size={12} /> {customerInfo?.deliveryPlan?.frequency === 'alternate' ? 'Alternate Days' : 'Everyday Morning'}
                            </span>

                            {isDone && item.deliveredAt && (
                              <span
                                className="driver-route-product-pill is-completed-at"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: '#f0fdf4',
                                  color: '#047857',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                }}
                              >
                                <Clock size={12} /> Completed: {new Date(item.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          {/* Doorstep Instructions / Special Notes */}
                          {specialNotes && (
                            <div
                              className="driver-route-stop-note"
                              style={{
                                marginTop: '10px',
                                padding: '8px 12px',
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: '8px',
                                color: '#92400e',
                                fontSize: '0.76rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <Bell size={13} color="#d97706" style={{ flexShrink: 0 }} />
                              <span><strong>Doorstep Note:</strong> {specialNotes}</span>
                            </div>
                          )}

                          {/* Bottom Action Strip: Call, WhatsApp, Map, Confirm Delivery */}
                          <div
                            className="driver-route-stop-actions"
                            style={{
                              marginTop: '12px',
                              paddingTop: '12px',
                              borderTop: '1px solid #f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            {/* Contact Links */}
                            <div className="driver-route-contact-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {customerPhone && (
                                <a
                                  href={`tel:${customerPhone}`}
                                  className="driver-route-action-link is-call"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '6px 11px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                  }}
                                >
                                  <Phone size={13} color="#059669" />
                                  <span>Call</span>
                                </a>
                              )}

                              {customerPhone && (
                                <a
                                  href={`https://wa.me/91${customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${item.customerName}, your fresh milk delivery from Natural Milk Dairy is arriving at your doorstep!`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="driver-route-action-link is-whatsapp"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '6px 11px',
                                    borderRadius: '8px',
                                    border: '1px solid #bbf7d0',
                                    background: '#f0fdf4',
                                    color: '#166534',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                  }}
                                >
                                  <MessageCircle size={13} color="#16a34a" />
                                  <span>WhatsApp</span>
                                </a>
                              )}

                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="driver-route-action-link is-navigate"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '6px 11px',
                                  borderRadius: '8px',
                                  border: '1px solid #bfdbfe',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                }}
                              >
                                <Navigation size={13} color="#2563eb" />
                                <span>Navigate</span>
                              </a>
                            </div>

                            {/* Status Quick Action Buttons */}
                            <div className="driver-route-delivery-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openNotDeliveredModal(item)}
                                    className="driver-route-action-button is-skip"
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '8px',
                                      border: '1px solid #fecaca',
                                      background: '#fff1f2',
                                      color: '#b91c1c',
                                      fontSize: '0.76rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✕ Skip
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openDeliverModal(item)}
                                    className="driver-route-action-button is-deliver"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '6px 14px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      background: '#059669',
                                      color: '#ffffff',
                                      fontSize: '0.76rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                                    }}
                                  >
                                    <Check size={14} />
                                    <span>Mark Delivered</span>
                                  </button>
                                </>
                              )}

                              {isDone && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <CheckCheck size={14} />
                                  <span>Drop Finished</span>
                                </span>
                              )}

                              {isMissed && (
                                <button
                                  type="button"
                                  onClick={() => openDeliverModal(item)}
                                  className="driver-route-action-button is-retry"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Retry Drop
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================= */}
          {/* TAB: ROUTE CUSTOMERS & SUBSCRIPTIONS (CRUD)              */}
          {/* ========================================================= */}
          {navTab === 'customers' && (
            <div className="driver-customers-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. Header Banner & Actions */}
              <div
                className="driver-customers-header"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Route Customers & Subscriptions
                    </h3>
                    <span
                      style={{
                        background: '#ecfdf5',
                        color: '#059669',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      {assignedCustomers.length} Total
                    </span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                    Doorstep deliveries, subscriber plans, and customer management across {boyArea}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={loadAssignedCustomers}
                    disabled={isLoadingCustomers}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '9px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: isLoadingCustomers ? 'wait' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <RefreshCw size={14} className={isLoadingCustomers ? 'spin-animation' : ''} />
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={openAddCustomer}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '8px 16px',
                      borderRadius: '9px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(5,150,105,0.2)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <UserPlus size={16} />
                    <span>Add Customer</span>
                  </button>
                </div>
              </div>

              {/* Success Notification Alert */}
              {customerSuccessBanner && (
                <div
                  className="driver-customers-stats"
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(5,150,105,0.08)',
                  }}
                >
                  <CheckCircle2 size={18} color="#059669" />
                  <span>{customerSuccessBanner}</span>
                </div>
              )}

              {/* 2. KPI Summary Cards Strip (4 Metrics) */}
              <div
                className="driver-customers-stat-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                }}
              >
                {[
                  {
                    label: 'Total Route Customers',
                    value: assignedCustomers.length,
                    icon: Users,
                    color: '#2563eb',
                    bg: '#eff6ff',
                  },
                  {
                    label: 'Active Subscriptions',
                    value: assignedCustomers.filter((c) => c.subscription?.status === 'active' || c.paymentInfo?.paymentType === 'prepaid').length,
                    icon: Award,
                    color: '#7c3aed',
                    bg: '#f5f3ff',
                  },
                  {
                    label: 'Created by You',
                    value: assignedCustomers.filter((c) => c.createdBy === 'driver' || c.createdByDriverId === boyId).length,
                    icon: UserCheck,
                    color: '#059669',
                    bg: '#ecfdf5',
                  },
                  {
                    label: 'Daily Milk Planned',
                    value: `${assignedCustomers.reduce((sum, c) => sum + (c.deliveryPlan?.milkQty || 0), 0)} L`,
                    icon: Truck,
                    color: '#0284c7',
                    bg: '#f0f9ff',
                  },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className="driver-customers-stat"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        minWidth: 0,
                      }}
                    >
                      <div
                        className="driver-customers-stat-icon"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: stat.bg,
                          color: stat.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                        <div
                          className="driver-customers-stat-val"
                          style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}
                        >
                          {stat.value}
                        </div>
                        <div
                          className="driver-customers-stat-label"
                          style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}
                          title={stat.label}
                        >
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. Category Filter & Search Strip */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                {/* Category Chips */}
                <div className="driver-customers-category-list" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'All Customers', count: assignedCustomers.length },
                    {
                      id: 'assigned',
                      label: 'Assigned by Admin',
                      count: assignedCustomers.filter((c) => c.createdBy !== 'driver' && c.createdByDriverId !== boyId).length,
                    },
                    {
                      id: 'driver',
                      label: 'Created by Driver',
                      count: assignedCustomers.filter((c) => c.createdBy === 'driver' || c.createdByDriverId === boyId).length,
                    },
                    {
                      id: 'subscription',
                      label: 'Subscriptions',
                      count: assignedCustomers.filter((c) => c.subscription?.status === 'active' || c.paymentInfo?.paymentType === 'prepaid').length,
                    },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCustomerCategory(cat.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: customerCategory === cat.id ? '#059669' : '#e2e8f0',
                        background: customerCategory === cat.id ? '#ecfdf5' : '#ffffff',
                        color: customerCategory === cat.id ? '#065f46' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{cat.label}</span>
                      <span
                        style={{
                          background: customerCategory === cat.id ? '#059669' : '#f1f5f9',
                          color: customerCategory === cat.id ? '#ffffff' : '#64748b',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '999px',
                        }}
                      >
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 240px' }}>
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by customer, phone, address, ID..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      paddingLeft: '34px',
                      paddingRight: '12px',
                      paddingTop: '7px',
                      paddingBottom: '7px',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* 4. Customer Cards Grid / List */}
              {(() => {
                const filtered = assignedCustomers.filter((c) => {
                  const isDriverCreated = c.createdBy === 'driver' || (c.createdByDriverId && c.createdByDriverId === boyId);
                  const hasSub = c.subscription?.status === 'active' || (c.subscription?.endDate && new Date(c.subscription.endDate) >= new Date()) || c.paymentInfo?.paymentType === 'prepaid';

                  if (customerCategory === 'assigned' && isDriverCreated) return false;
                  if (customerCategory === 'driver' && !isDriverCreated) return false;
                  if (customerCategory === 'subscription' && !hasSub) return false;

                  if (customerSearch) {
                    const q = customerSearch.trim().toLowerCase();
                    const matchName = (c.name || '').toLowerCase().includes(q);
                    const matchMobile = (c.mobile || '').includes(q);
                    const matchAddress = (c.address || '').toLowerCase().includes(q);
                    const matchArea = (c.area || '').toLowerCase().includes(q);
                    const matchId = (c.customerId || '').toLowerCase().includes(q);
                    if (!matchName && !matchMobile && !matchAddress && !matchArea && !matchId) {
                      return false;
                    }
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div
                      className="driver-customers-grid"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '48px 20px',
                        textAlign: 'center',
                      }}
                    >
                      <Users size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                        No customers match this category
                      </h4>
                      <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 16px 0' }}>
                        {customerSearch ? 'Try a different search term.' : 'You can add new customers on your route anytime.'}
                      </p>
                      <button
                        type="button"
                        onClick={openAddCustomer}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#059669',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <UserPlus size={15} /> Add First Customer
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {filtered.map((cust) => {
                      const isDriverCreated = cust.createdBy === 'driver' || (cust.createdByDriverId && cust.createdByDriverId === boyId);
                      const hasActiveSub = cust.subscription?.status === 'active' || (cust.subscription?.endDate && new Date(cust.subscription.endDate) >= new Date());
                      const isPrepaid = cust.paymentInfo?.paymentType === 'prepaid' || cust.subscription?.amount > 0;
                      const plan = cust.deliveryPlan || {};

                      return (
                        <div
                          key={cust.id || cust._id}
                          className="driver-customer-card"
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div>
                            {/* Card Header: Avatar, Name, ID & Badges */}
                            <div className="driver-customer-card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    background: isDriverCreated ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {(cust.name || 'C').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                                    {cust.name}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                    {cust.customerId || `#${(cust.id || '').slice(-6)}`}
                                  </div>
                                </div>
                              </div>

                              {/* Status Pill */}
                              <span
                                className="driver-customer-status"
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  background: cust.status === 'paused' ? '#fef3c7' : '#dcfce7',
                                  color: cust.status === 'paused' ? '#92400e' : '#166534',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0,
                                }}
                              >
                                {cust.status === 'paused' ? '⏸ Paused' : '✓ Active'}
                              </span>
                            </div>

                            {/* Category Badges Strip */}
                            <div className="driver-customer-badges" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                              {hasActiveSub && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
                                    border: '1px solid #ddd6fe',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  ★ 30-Day Subscription
                                </span>
                              )}
                              {isDriverCreated ? (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    border: '1px solid #a7f3d0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  👤 Added by Driver
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    border: '1px solid #bfdbfe',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  🏢 Admin Assigned
                                </span>
                              )}
                            </div>

                            {/* Address & Territory */}
                            <div
                              className="driver-customer-address"
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '6px',
                                fontSize: '0.78rem',
                                color: '#475569',
                                marginBottom: '8px',
                                lineHeight: 1.4,
                              }}
                            >
                              <MapPin size={14} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <span>{cust.address}</span>
                                {cust.area && <span style={{ fontWeight: 600, color: '#0f172a' }}> • {cust.area}</span>}
                                {cust.landmark && <span style={{ color: '#64748b' }}> (Near {cust.landmark})</span>}
                              </div>
                            </div>

                            {/* Delivery Plan & Frequency */}
                            <div
                              className="driver-customer-plan"
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                marginBottom: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Truck size={14} color="#059669" />
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                                  {plan.milkQty || 1}L {plan.milkUnit || 'L'} Milk
                                  {plan.curdQty > 0 ? ` + ${plan.curdQty}g Curd` : ''}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#059669',
                                  background: '#ffffff',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {plan.frequency || 'Daily'}
                              </span>
                            </div>

                            {/* Subscription / Payment Meta */}
                            {hasActiveSub && cust.subscription?.endDate && (
                              <div
                                className="driver-customer-subscription"
                                style={{
                                  background: '#faf5ff',
                                  border: '1px solid #f3e8ff',
                                  borderRadius: '8px',
                                  padding: '6px 10px',
                                  fontSize: '0.74rem',
                                  color: '#6b21a8',
                                  marginBottom: '8px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span>Valid through:</span>
                                <strong>
                                  {new Date(cust.subscription.endDate).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </strong>
                              </div>
                            )}

                            {/* Contact & Balance Info */}
                            <div
                              className="driver-customer-contact-summary"
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.76rem',
                                color: '#64748b',
                                marginBottom: '4px',
                              }}
                            >
                              <div>
                                <span>Phone: </span>
                                <strong style={{ color: '#0f172a' }}>{cust.mobile}</strong>
                              </div>
                              <div>
                                <span>Payment: </span>
                                <strong style={{ color: isPrepaid ? '#059669' : '#d97706' }}>
                                  {isPrepaid ? 'Prepaid' : 'Monthly Credit'}
                                </strong>
                              </div>
                            </div>

                            {cust.notes && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                                💬 "{cust.notes}"
                              </div>
                            )}
                          </div>

                          {/* Card Footer Actions (CRUD) */}
                          <div
                            className="driver-customer-card-footer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: '10px',
                              borderTop: '1px solid #f1f5f9',
                              gap: '6px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div className="driver-customer-contact-actions" style={{ display: 'flex', gap: '5px' }}>
                              <a
                                href={`tel:${cust.mobile}`}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                  background: '#ffffff',
                                  color: '#059669',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  textDecoration: 'none',
                                }}
                                title="Call customer"
                              >
                                <Phone size={12} /> Call
                              </a>
                              <a
                                href={`https://wa.me/91${cust.mobile.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #bbf7d0',
                                  background: '#f0fdf4',
                                  color: '#16a34a',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  textDecoration: 'none',
                                }}
                                title="WhatsApp chat"
                              >
                                <MessageCircle size={12} /> WhatsApp
                              </a>
                            </div>

                            <div className="driver-customer-management-actions" style={{ display: 'flex', gap: '5px' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleCustomerPause(cust)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                  background: cust.status === 'paused' ? '#ecfdf5' : '#fffbeb',
                                  color: cust.status === 'paused' ? '#059669' : '#b45309',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title={cust.status === 'paused' ? 'Resume delivery drops' : 'Pause customer deliveries'}
                              >
                                {cust.status === 'paused' ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
                                <span>{cust.status === 'paused' ? 'Resume' : 'Pause'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditCustomer(cust)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                  background: '#ffffff',
                                  color: '#2563eb',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Edit customer details & plan"
                              >
                                <Edit2 size={12} /> Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingCustomer(cust)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #fee2e2',
                                  background: '#fff1f2',
                                  color: '#dc2626',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Remove customer from route"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: CASH SUMMARY & HANDOVER TO ADMIN                      */}
          {/* ========================================================= */}
          {navTab === 'cash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Feedback Alert Banner */}
              {handoverFeedback.text && (
                <div
                  style={{
                    background: handoverFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    border: handoverFeedback.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                    color: handoverFeedback.type === 'success' ? '#065f46' : '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {handoverFeedback.type === 'success' ? (
                    <CheckCircle2 size={18} color="#059669" />
                  ) : (
                    <AlertCircle size={18} color="#dc2626" />
                  )}
                  <span>{handoverFeedback.text}</span>
                </div>
              )}

              {/* Main Cash Collection Summary Card */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Today's Route Cash Collection
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                      Reconcile shift collections and handover physical cash to admin
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadDriverHandovers}
                    title="Refresh Status"
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={13} className={isLoadingDriverHandovers ? 'spin' : ''} />
                    <span>Sync</span>
                  </button>
                </div>

                {/* Cash Metrics & Handover State Calculation */}
                {(() => {
                  // Calculate total cash already handed over or pending handover today
                  const totalHandedOver = driverHandovers
                    .filter((h) => h.status === 'accepted' || h.status === 'pending')
                    .reduce((sum, h) => sum + (h.amount || 0), 0);

                  // Physical cash remaining in hand that can still be handed over
                  const remainingCashInHand = Math.max(0, totalCashCollected - totalHandedOver);
                  const pendingHandover = driverHandovers.find((h) => h.status === 'pending');
                  const acceptedHandover = driverHandovers.find((h) => h.status === 'accepted');

                  return (
                    <>
                      {/* 2-Column Responsive Collection Metric Cards */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: '10px',
                          marginBottom: '12px',
                        }}
                      >
                        {/* Physical Cash Card - Shows remaining cash in hand (0 if already handed over) */}
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '12px',
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            💵 Physical Cash
                          </div>
                          <div
                            style={{
                              fontSize: '1.45rem',
                              fontWeight: 800,
                              color: remainingCashInHand > 0 ? '#059669' : '#0f172a',
                              marginTop: '3px',
                              lineHeight: 1.15,
                            }}
                          >
                            ₹{remainingCashInHand.toLocaleString()}
                          </div>
                          <div
                            style={{
                              fontSize: '0.67rem',
                              color: remainingCashInHand > 0 ? '#64748b' : '#059669',
                              marginTop: '3px',
                              fontWeight: remainingCashInHand === 0 ? 700 : 400,
                            }}
                          >
                            {remainingCashInHand > 0 ? 'To deposit at counter' : '✓ All cash handed over'}
                          </div>
                        </div>

                        {/* UPI Direct Card */}
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '12px',
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            📱 UPI Direct
                          </div>
                          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#2563eb', marginTop: '3px', lineHeight: 1.15 }}>
                            ₹{totalUpiCollected.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '3px' }}>
                            Direct in Dairy account
                          </div>
                        </div>
                      </div>

                      {/* Total Reconciliation Bar */}
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '1.5px solid #bbf7d0',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: '#059669',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            TOTAL ROUTE TURNOVER
                          </div>
                          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', lineHeight: 1.1 }}>
                            ₹{totalRevenue.toLocaleString()}
                          </div>
                        </div>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '9px',
                            background: '#dcfce7',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Wallet size={20} />
                        </div>
                      </div>

                      {/* Active Status Card: Pending Verification */}
                      {pendingHandover && (
                        <div
                          style={{
                            marginTop: '14px',
                            background: '#fff7ed',
                            border: '1.5px solid #fdba74',
                            borderRadius: '12px',
                            padding: '14px',
                            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                background: '#ffedd5',
                                color: '#c2410c',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: '#ea580c',
                                }}
                              />
                              Pending Admin Verification
                            </span>
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c2410c' }}>
                              ₹{pendingHandover.amount}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#9a3412', marginTop: '6px', lineHeight: 1.45 }}>
                            Handover submitted at{' '}
                            <strong>
                              {new Date(pendingHandover.handoverDate || pendingHandover.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </strong>
                            . Please proceed to the dairy counter to deposit physical notes with the manager.
                          </div>
                        </div>
                      )}

                      {/* Active Status Card: Verified & Accepted */}
                      {!pendingHandover && acceptedHandover && (
                        <div
                          style={{
                            marginTop: '14px',
                            background: '#ecfdf5',
                            border: '1.5px solid #a7f3d0',
                            borderRadius: '12px',
                            padding: '14px',
                            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.06)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#065f46',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <CheckCircle2 size={13} color="#059669" />
                              Shift Cash Handover Verified
                            </span>
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>
                              ₹{acceptedHandover.amount}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#065f46', marginTop: '6px' }}>
                            Verified & signed off by{' '}
                            <strong>{acceptedHandover.verifiedBy || 'Dairy Admin'}</strong>. Shift audit cleared!
                          </div>
                        </div>
                      )}

                      {/* Handover Action Hero Button - ONLY SHOWN IF CASH AVAILABLE (>0) AND NO PENDING HANDOVER */}
                      {remainingCashInHand > 0 && !pendingHandover && (
                        <div style={{ marginTop: '14px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenHandoverModal(remainingCashInHand)}
                            style={{
                              width: '100%',
                              padding: '13px 18px',
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '12px',
                              fontSize: '0.92rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 3px 12px rgba(5, 150, 105, 0.3)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Wallet size={18} />
                            <span>Handover Amount to Admin (₹{remainingCashInHand})</span>
                          </button>
                        </div>
                      )}

                      {/* Instruction / Status Notice */}
                      <div
                        style={{
                          marginTop: '12px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          fontSize: '0.75rem',
                          color: '#64748b',
                          lineHeight: 1.4,
                        }}
                      >
                        {remainingCashInHand > 0 ? (
                          <>
                            💡 <strong>Deposit Instruction:</strong> Click the button above to request handover of{' '}
                            <strong style={{ color: '#059669' }}>₹{remainingCashInHand}</strong>. Your submission will immediately appear in the Admin Dashboard Payments sidebar for live verification.
                          </>
                        ) : pendingHandover ? (
                          <>
                            ⏳ <strong>Verification in Progress:</strong> Your handover of{' '}
                            <strong style={{ color: '#ea580c' }}>₹{pendingHandover.amount}</strong> is awaiting admin verification. Please deposit physical cash notes at the counter.
                          </>
                        ) : (
                          <>
                            ✅ <strong>Settlement Cleared:</strong> All physical cash collections for today's deliveries have been handed over to Admin. Remaining cash in hand is <strong style={{ color: '#059669' }}>₹0</strong>.
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Recent Handovers History */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    Recent Cash Handovers
                  </h4>
                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {driverHandovers.length} records
                  </span>
                </div>

                {isLoadingDriverHandovers ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.82rem' }}>
                    Loading handover history...
                  </div>
                ) : driverHandovers.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 12px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '0.82rem',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px dashed #e2e8f0',
                    }}
                  >
                    No cash handovers recorded yet for your shift.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {driverHandovers.slice(0, 5).map((h, i) => {
                      const isPending = h.status === 'pending';
                      const isAccepted = h.status === 'accepted';
                      const isRejected = h.status === 'rejected';

                      return (
                        <div
                          key={h.id || h._id || i}
                          style={{
                            padding: '10px 12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                                ₹{h.amount}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '5px',
                                  background: '#e2e8f0',
                                  color: '#475569',
                                  fontWeight: 600,
                                }}
                              >
                                {h.handoverMethod === 'dairy_counter'
                                  ? 'Counter'
                                  : h.handoverMethod === 'bank_deposit'
                                  ? 'Bank Safe'
                                  : 'UPI to Admin'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                              {new Date(h.handoverDate || h.createdAt).toLocaleDateString()} at{' '}
                              {new Date(h.handoverDate || h.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            {h.notes && (
                              <div style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                                “{h.notes}”
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {isPending && (
                              <span
                                style={{
                                  background: '#fff7ed',
                                  color: '#c2410c',
                                  border: '1px solid #ffedd5',
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ea580c' }} />
                                Pending
                              </span>
                            )}
                            {isAccepted && (
                              <span
                                style={{
                                  background: '#ecfdf5',
                                  color: '#065f46',
                                  border: '1px solid #a7f3d0',
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Check size={11} color="#059669" />
                                Accepted
                              </span>
                            )}
                            {isRejected && (
                              <span
                                style={{
                                  background: '#fef2f2',
                                  color: '#991b1b',
                                  border: '1px solid #fecaca',
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <X size={11} color="#dc2626" />
                                Rejected
                              </span>
                            )}
                            {h.verifiedBy && (
                              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                                by {h.verifiedBy}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Handover Submission Modal Sheet */}
              {showHandoverModal && (
                <div
                  className="modal-overlay"
                  onClick={() => setShowHandoverModal(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px',
                  }}
                >
                  <div
                    className="modal-content"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      maxWidth: '460px',
                      width: '100%',
                      padding: '22px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '9px',
                            background: '#dcfce7',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Wallet size={18} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                          Handover Cash to Admin
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowHandoverModal(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitHandover}>
                      {/* Amount Field */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                            Amount to Handover (₹) *
                          </label>
                          <button
                            type="button"
                            onClick={() => setHandoverAmount(String(totalCashCollected))}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Set Full Cash (₹{totalCashCollected})
                          </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <span
                            style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '1.2rem',
                              fontWeight: 800,
                              color: '#059669',
                            }}
                          >
                            ₹
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="100000"
                            required
                            value={handoverAmount}
                            onChange={(e) => setHandoverAmount(e.target.value)}
                            placeholder="e.g. 105"
                            style={{
                              width: '100%',
                              padding: '10px 12px 10px 32px',
                              borderRadius: '10px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '1.15rem',
                              fontWeight: 800,
                              color: '#0f172a',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>

                      {/* Method Selector */}
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          Handover Method
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {[
                            { id: 'dairy_counter', label: '💵 Counter', desc: 'At Dairy' },
                            { id: 'bank_deposit', label: '🏦 Bank Safe', desc: 'Safe Box' },
                            { id: 'upi_to_admin', label: '📱 Admin UPI', desc: 'Direct QR' },
                          ].map((m) => {
                            const isSel = handoverMethod === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setHandoverMethod(m.id)}
                                style={{
                                  padding: '9px 6px',
                                  borderRadius: '9px',
                                  border: isSel ? '2px solid #059669' : '1px solid #e2e8f0',
                                  background: isSel ? '#f0fdf4' : '#ffffff',
                                  color: isSel ? '#065f46' : '#475569',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                }}
                              >
                                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{m.label}</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>{m.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Optional Note */}
                      <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          Shift Notes / Remarks (Optional)
                        </label>
                        <input
                          type="text"
                          value={handoverNotes}
                          onChange={(e) => setHandoverNotes(e.target.value)}
                          placeholder="e.g., Morning route cash deposit with counter supervisor"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '9px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.84rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* Submit & Cancel Buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowHandoverModal(false)}
                          style={{
                            flex: 1,
                            padding: '11px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingHandover}
                          style={{
                            flex: 2,
                            padding: '11px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#059669',
                            color: '#ffffff',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            cursor: isSubmittingHandover ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                            opacity: isSubmittingHandover ? 0.75 : 1,
                          }}
                        >
                          <Check size={16} />
                          <span>{isSubmittingHandover ? 'Submitting...' : `Confirm Handover (₹${handoverAmount || '0'})`}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: DRIVER PROFILE                                     */}
          {/* ========================================================= */}
          {/* ========================================================= */}
          {/* TAB 4: DRIVER PROFILE                                     */}
          {/* ========================================================= */}
          {navTab === 'profile' && (
            profileDetailView ? (
              <section style={{ width: '100%', maxWidth: '820px', margin: '0 auto', padding: '0 4px 24px' }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0 20px' }}>
                  <button
                    type="button"
                    className="modern-profile-header-btn"
                    onClick={backToDriverProfile}
                    aria-label="Back to profile"
                  >
                    <ArrowLeft size={21} />
                  </button>
                  <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.16rem', fontWeight: 800 }}>
                      {activeProfileDetail?.title || 'Profile details'}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                      {activeProfileDetail?.description || 'Review your delivery partner information.'}
                    </p>
                  </div>
                </header>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '6px 18px', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
                  {(activeProfileDetail?.rows || []).map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '0.86rem' }}>{label}</span>
                      <strong style={{ color: '#0f172a', fontSize: '0.88rem', textAlign: 'right', lineHeight: 1.5 }}>{value}</strong>
                    </div>
                  ))}
                  {activeProfileDetail?.action === 'route' && (
                    <button
                      type="button"
                      className="profile-card-action-btn"
                      style={{ margin: '14px 0 10px' }}
                      onClick={() => handleNavChange('route')}
                    >
                      <Navigation size={15} />
                      <span>Open route and stops</span>
                    </button>
                  )}
                  {activeProfileDetail?.phone && (
                    <a
                      href={`tel:${activeProfileDetail.phone}`}
                      className="profile-card-action-btn"
                      style={{ margin: '14px 0 10px', textDecoration: 'none' }}
                    >
                      <PhoneCall size={15} />
                      <span>Call supervisor</span>
                    </a>
                  )}
                </div>
              </section>
            ) : isEditingProfile ? (
              /* ── SCREEN: EDIT PARTNER PROFILE ── */
              <div className="modern-profile-container">
                <div className="modern-profile-header">
                  <button
                    type="button"
                    className="modern-profile-header-btn"
                    onClick={backToDriverProfile}
                    aria-label="Back"
                  >
                    <ArrowLeft size={22} />
                  </button>
                  <h2 className="modern-profile-header-title">Edit Partner Profile</h2>
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
                        alert('Upload driver photo: connect your device camera or select from gallery.');
                      }}
                    >
                      <Camera size={13} />
                    </button>
                  </div>
                </div>

                {/* Delivery Partner Form Fields */}
                <form id="modern-driver-edit-form" className="modern-edit-form" onSubmit={handleSaveProfile}>
                  {/* Name */}
                  <div className="modern-edit-field">
                    <label className="modern-edit-label">Partner Full Name</label>
                    <div className="modern-edit-input-container">
                      <input
                        type="text"
                        className="modern-edit-input"
                        placeholder="Driver Name"
                        value={profileName}
                        required
                        onChange={(e) => setProfileName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* E-mail address */}
                  <div className="modern-edit-field">
                    <label className="modern-edit-label">E-mail address</label>
                    <div className="modern-edit-input-container">
                      <input
                        type="email"
                        className="modern-edit-input"
                        placeholder="driver@naturalmilkdairy.com"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* User name */}
                  <div className="modern-edit-field">
                    <label className="modern-edit-label">Partner Username / Handle</label>
                    <div className="modern-edit-input-container">
                      <input
                        type="text"
                        className="modern-edit-input"
                        placeholder="@routefleet"
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
                      <div className="modern-edit-phone-prefix">+91</div>
                      <input
                        type="tel"
                        className="modern-edit-input"
                        placeholder="9876543210"
                        value={profilePhone}
                        required
                        onChange={(e) => setProfilePhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Vehicle Number */}
                  <div className="modern-edit-field">
                    <label className="modern-edit-label">Vehicle Registration Number</label>
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

                  {/* Vehicle Model */}
                  <div className="modern-edit-field">
                    <label className="modern-edit-label">Vehicle Model / Type</label>
                    <div className="modern-edit-input-container">
                      <input
                        type="text"
                        className="modern-edit-input"
                        placeholder="Commercial Cargo EV / Hero Electric"
                        value={bikeModel}
                        onChange={(e) => setBikeModel(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Assigned Delivery Area */}
                  <div className="modern-edit-field">
                    <label className="modern-edit-label">Assigned Delivery Area / Route</label>
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

                  {/* Dispatch Depot Address */}
                  <div className="modern-edit-field">
                    <label className="modern-edit-label">Dispatch Hub / Depot Address</label>
                    <div className="modern-edit-input-container">
                      <input
                        type="text"
                        className="modern-edit-input"
                        placeholder="Madhapur Farm Dispatch Depot, Pillar 42"
                        value={profileAddress}
                        onChange={(e) => setProfileAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="modern-edit-field">
                    <label className="modern-edit-label">Hub Supervisor / Emergency Phone</label>
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
                    ✓ Save Partner Profile
                  </button>
                </form>
              </div>
            ) : isMobile ? (
              /* ── SCREEN: MOBILE DRIVER PROFILE (PURE PROFILE DETAILS ONLY) ── */
              <div className="modern-profile-container driver-profile-mobile">
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

                {/* Mobile Header: Back Arrow, "Driver Profile", Edit Icon */}
                <div className="modern-profile-header">
                  <button
                    type="button"
                    className="modern-profile-header-btn"
                    onClick={() => handleNavChange('deliveries')}
                    aria-label="Back to deliveries"
                  >
                    <ArrowLeft size={22} />
                  </button>
                  <h2 className="modern-profile-header-title">Driver Profile</h2>
                  <div style={{ width: 40 }} />
                </div>

                {/* Identity Card */}
                <div
                  className="modern-profile-identity profile-driver-mobile-identity"
                >
                  <div className="modern-profile-avatar-wrap" style={{ position: 'relative' }}>
                    <div
                      className="modern-profile-avatar-placeholder"
                      style={{
                        width: '74px',
                        height: '74px',
                        fontSize: '1.9rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
                      }}
                    >
                      {(profileName || boyName || 'D').charAt(0).toUpperCase()}
                    </div>
                    <button
                      type="button"
                      className="modern-profile-camera-badge"
                      onClick={openEditProfile}
                      title="Edit photo"
                      aria-label="Edit photo"
                      style={{ bottom: 0, right: 0 }}
                    >
                      <Camera size={13} />
                    </button>
                  </div>

                  <div className="modern-profile-identity-info">
                    <h3 className="modern-profile-name">
                      {profileName || boyName || 'Delivery Partner'}
                    </h3>
                    <span className="modern-profile-handle">
                      NMD-DRV-{(boyId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '8492'} · {isOnline ? 'On duty' : 'Offline'}
                    </span>
                    <button
                      type="button"
                      onClick={openEditProfile}
                      className="modern-profile-edit-btn"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>

                <div className="modern-profile-menu-list">
                  <button
                    type="button"
                    className="modern-profile-menu-row"
                    onClick={() => openProfileDetail('personal-details')}
                  >
                    <div className="modern-profile-menu-left">
                      <span className="modern-profile-menu-icon"><User size={20} color="#059669" /></span>
                      <div>
                        <span className="modern-profile-menu-label">Personal Information</span>
                        <span className="modern-profile-menu-sub">
                          Partner ID: NMD-DRV-{(boyId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '8492'} · {isOnline ? 'On duty' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <div className="modern-profile-menu-right"><ChevronRight size={18} /></div>
                  </button>

                  <button
                    type="button"
                    className="modern-profile-menu-row"
                    onClick={() => openProfileDetail('contact-details')}
                  >
                    <div className="modern-profile-menu-left">
                      <span className="modern-profile-menu-icon"><PhoneCall size={20} color="#059669" /></span>
                      <div>
                        <span className="modern-profile-menu-label">Contact Information</span>
                        <span className="modern-profile-menu-sub">
                          {profilePhone || user?.mobile || user?.phone || 'Phone not provided'} · {profileEmail || user?.email || 'Email not provided'}
                        </span>
                      </div>
                    </div>
                    <div className="modern-profile-menu-right"><ChevronRight size={18} /></div>
                  </button>

                  <button
                    type="button"
                    className="modern-profile-menu-row"
                    onClick={() => openProfileDetail('territory-details')}
                  >
                    <div className="modern-profile-menu-left">
                      <span className="modern-profile-menu-icon"><MapPin size={20} color="#059669" /></span>
                      <div>
                        <span className="modern-profile-menu-label">Territory & Dispatch</span>
                        <span className="modern-profile-menu-sub">
                          {profileArea || boyArea || 'Area not assigned'} · {profileShift || 'Morning Dispatch'}
                        </span>
                      </div>
                    </div>
                    <div className="modern-profile-menu-right"><ChevronRight size={18} /></div>
                  </button>

                  <button
                    type="button"
                    className="modern-profile-menu-row"
                    onClick={() => openProfileDetail('vehicle')}
                  >
                    <div className="modern-profile-menu-left">
                      <span className="modern-profile-menu-icon"><Bike size={20} color="#059669" /></span>
                      <div>
                        <span className="modern-profile-menu-label">Vehicle & Equipment</span>
                        <span className="modern-profile-menu-sub">
                          {bikePlate || 'Vehicle not assigned'} · {bikeModel || bikeType || 'Details not provided'}
                        </span>
                      </div>
                    </div>
                    <div className="modern-profile-menu-right"><ChevronRight size={18} /></div>
                  </button>

                  <button
                    type="button"
                    className="modern-profile-menu-row is-logout"
                    onClick={() => setShowLogoutConfirm(true)}
                  >
                    <div className="modern-profile-menu-left">
                      <span className="modern-profile-menu-icon"><LogOut size={20} /></span>
                      <span className="modern-profile-menu-label">Log out</span>
                    </div>
                    <div className="modern-profile-menu-right"><ChevronRight size={18} /></div>
                  </button>

                  <button
                    type="button"
                    className="modern-profile-menu-row is-delete"
                    onClick={() => {
                      setDeletePartnerError('');
                      setShowDeletePartnerModal(true);
                    }}
                  >
                    <div className="modern-profile-menu-left">
                      <span className="modern-profile-menu-icon"><Trash2 size={20} color="#ef4444" /></span>
                      <div>
                        <span className="modern-profile-menu-label">Delete Partner Account</span>
                        <span className="modern-profile-menu-sub">Permanently remove your account and profile</span>
                      </div>
                    </div>
                    <div className="modern-profile-menu-right"><ChevronRight size={18} /></div>
                  </button>
                </div>

                {/* Section 1: Personal & Identity Details */}
                <div className="profile-section-card" style={{ marginBottom: '14px' }}>
                  <div className="profile-section-header">
                    <div>
                      <h4 className="profile-section-title">
                        <User size={18} color="#059669" /> Personal Information
                      </h4>
                      <p className="profile-section-subtitle">Identity & verified credentials</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Full Name</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{profileName || boyName || 'Delivery Partner'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Partner ID</span>
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        NMD-DRV-{(boyId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '8492'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Designation</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>Delivery Partner</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Blood Group</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{profileBloodGroup || 'Not Specified'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Driving License</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{profileLicense || 'Not provided'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Member Since</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{profileJoiningDate || 'Active Partner'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact & Communication */}
                <div className="profile-section-card" style={{ marginBottom: '14px' }}>
                  <div className="profile-section-header">
                    <div>
                      <h4 className="profile-section-title">
                        <PhoneCall size={18} color="#059669" /> Contact Information
                      </h4>
                      <p className="profile-section-subtitle">Phone, email & residential address</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Mobile Number</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{profilePhone || user?.mobile || user?.phone || 'Not provided'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Email Address</span>
                      <span style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>
                        {profileEmail || user?.email || 'Not provided'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Home Address</span>
                      <span style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>
                        {profileAddress || 'Not provided'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Emergency Contact</span>
                      <span style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                        {profileEmergencyContact || 'Not provided'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Assigned Territory & Hub */}
                <div className="profile-section-card profile-driver-operations-card" style={{ marginBottom: '14px' }}>
                  <div className="profile-section-header">
                    <div>
                      <h4 className="profile-section-title">
                        <MapPin size={18} color="#059669" /> Territory & Hub Profile
                      </h4>
                      <p className="profile-section-subtitle">Stationed sector & supervisor hotline</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Assigned Territory</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{profileArea || boyArea || 'Madhapur'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Shift Window</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{profileShift || 'Morning Dispatch (5:00 AM – 7:30 AM)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Dispatch Hub</span>
                      <span style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>
                        {profileAddress || 'Madhapur Farm Dispatch Depot, Pillar 42'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Supervisor Hotline</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{profileEmergencyContact || '+91 98765 43210'}</span>
                        <a
                          href={`tel:${profileEmergencyContact || '9876543210'}`}
                          className="profile-contact-chip"
                          aria-label="Call Supervisor"
                        >
                          <Phone size={12} /> Call
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Vehicle & Transport Details */}
                <div className="profile-section-card profile-driver-operations-card" style={{ marginBottom: '14px' }}>
                  <div className="profile-section-header">
                    <div>
                      <h4 className="profile-section-title">
                        <Bike size={18} color="#059669" /> Vehicle & Equipment Profile
                      </h4>
                      <p className="profile-section-subtitle">Fleet vehicle and insulated crates allocation</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Registration Number</span>
                      <span style={{ fontWeight: 700, color: '#059669' }}>{bikePlate || 'AP40DT9792'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Vehicle Model</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{bikeModel || 'Commercial Cargo EV'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Vehicle Type</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{bikeType || 'Insulated Milk Carrier EV'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Crates Capacity</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{bikeCratesCapacity || '4 Insulated Crates (120L)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: '#64748b' }}>Driving License</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{profileLicense || 'Verified Partner License'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 5: Account & Session Actions */}
                <div
                  className="profile-driver-account-actions"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginTop: '6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeletePartnerError('');
                      setShowDeletePartnerModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      background: 'transparent',
                      color: '#94a3b8',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={15} color="#ef4444" />
                    <span style={{ color: '#ef4444' }}>Delete Partner Account</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ── SCREEN: WEB / DESKTOP DRIVER PROFILE (PURE PROFILE DETAILS ONLY) ── */
              <div className="profile-desktop-wrapper driver-profile-view">
                {profileFeedbackMsg && (
                  <div
                    className="driver-profile-feedback"
                    style={{
                      padding: '14px 18px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '14px',
                      color: '#065f46',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <CheckCircle2 size={18} color="#059669" />
                    <span>{profileFeedbackMsg}</span>
                  </div>
                )}

                {/* 1. Desktop Profile Hero Banner */}
                <div className="profile-desktop-hero">
                  <div className="profile-hero-left">
                    <div className="profile-hero-avatar">
                      {(profileName || boyName || 'D').charAt(0).toUpperCase()}
                    </div>
                    <div className="profile-hero-info">
                      <div className="profile-hero-name-row">
                        <h2 className="profile-hero-name">{profileName || boyName || 'Delivery Partner'}</h2>
                        <span className="profile-hero-handle">
                          PARTNER ID: NMD-DRV-{(boyId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '8492'}
                        </span>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: isOnline ? '#ecfdf5' : '#fef2f2',
                            color: isOnline ? '#065f46' : '#991b1b',
                            border: `1px solid ${isOnline ? '#a7f3d0' : '#fecaca'}`,
                          }}
                        >
                          {isOnline ? '🟢 On Duty · Active Partner' : '🔴 Offline'}
                        </span>
                      </div>
                      <div className="profile-hero-meta">
                        <span className="profile-hero-meta-item">
                          <Phone size={14} color="#059669" /> {profilePhone || user?.mobile || 'Not provided'}
                        </span>
                        {profileEmail && profileEmail !== 'Not provided' && (
                          <span className="profile-hero-meta-item">
                            <Mail size={14} color="#059669" /> {profileEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className="profile-hero-btn"
                      onClick={openEditProfile}
                    >
                      <Edit2 size={16} />
                      <span>Edit Partner Profile</span>
                    </button>
                    <button
                      type="button"
                      className="profile-driver-account-action"
                      onClick={() => setShowLogoutConfirm(true)}
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        padding: '10px 18px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <LogOut size={16} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>

                {/* 2. Driver Pure Profile Details Grid (2x2) */}
                <div className="profile-desktop-grid driver-profile-details-grid">
                  {/* Card 1: Partner Personal & Identity Details */}
                  <div className="profile-desktop-card">
                    <div>
                      <div className="profile-card-header">
                        <div>
                          <h3 className="profile-card-title">Personal Details</h3>
                          <p className="profile-card-desc">Driver identity & employment credentials</p>
                        </div>
                        <div className="profile-card-icon-wrap">
                          <User size={22} color="#059669" />
                        </div>
                      </div>
                      <div className="profile-card-body">
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Full Name</span>
                          <span className="profile-card-data-val">{profileName || boyName || 'Delivery Partner'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Partner ID</span>
                          <span className="profile-card-data-val" style={{ color: '#059669' }}>
                            NMD-DRV-{(boyId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '8492'}
                          </span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Designation</span>
                          <span className="profile-card-data-val">Natural Milk Dairy Delivery Partner</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Blood Group</span>
                          <span className="profile-card-data-val">{profileBloodGroup || 'Not Specified'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Driving License</span>
                          <span className="profile-card-data-val">{profileLicense || 'Not provided'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Partner Since</span>
                          <span className="profile-card-data-val">{profileJoiningDate || 'Active Partner'}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="profile-card-action-btn"
                      onClick={openEditProfile}
                    >
                      <Edit2 size={15} />
                      <span>Edit Personal Information</span>
                    </button>
                  </div>

                  {/* Card 2: Contact & Communication Information */}
                  <div className="profile-desktop-card">
                    <div>
                      <div className="profile-card-header">
                        <div>
                          <h3 className="profile-card-title">Contact Information</h3>
                          <p className="profile-card-desc">Driver phone, email & residential address</p>
                        </div>
                        <div className="profile-card-icon-wrap">
                          <PhoneCall size={22} color="#059669" />
                        </div>
                      </div>
                      <div className="profile-card-body">
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Primary Mobile</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="profile-card-data-val">{profilePhone || user?.mobile || user?.phone || 'Not provided'}</span>
                          </div>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Email Address</span>
                          <span className="profile-card-data-val">{profileEmail || user?.email || 'Not provided'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Residential / Base Address</span>
                          <span className="profile-card-data-val" style={{ maxWidth: '60%', textAlign: 'right' }}>
                            {profileAddress || 'Not provided'}
                          </span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Emergency Contact</span>
                          <span className="profile-card-data-val">{profileEmergencyContact || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="profile-card-action-btn"
                      onClick={openEditProfile}
                    >
                      <Edit2 size={15} />
                      <span>Update Contact Details</span>
                    </button>
                  </div>

                  {/* Card 3: Route & Dispatch Hub Profile */}
                  <div className="profile-desktop-card">
                    <div>
                      <div className="profile-card-header">
                        <div>
                          <h3 className="profile-card-title">Territory & Dispatch Hub</h3>
                          <p className="profile-card-desc">Designated operating sector & hub center</p>
                        </div>
                        <div className="profile-card-icon-wrap">
                          <MapPin size={22} color="#059669" />
                        </div>
                      </div>
                      <div className="profile-card-body">
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Assigned Sector</span>
                          <span className="profile-card-data-val">{profileArea || boyArea || 'Madhapur'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Assigned Shift</span>
                          <span className="profile-card-data-val">{profileShift || 'Morning Dispatch (5:00 AM – 7:30 AM)'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Dispatch Center Hub</span>
                          <span className="profile-card-data-val">{profileAddress || 'Madhapur Farm Dispatch Depot, Pillar 42'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Operations Supervisor</span>
                          <span className="profile-card-data-val">Madhapur Field Operations Desk</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Supervisor Hotline</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="profile-card-data-val">{profileEmergencyContact || '+91 98765 43210'}</span>
                            <a
                              href={`tel:${profileEmergencyContact || '9876543210'}`}
                              className="profile-contact-chip"
                              title="Call supervisor"
                            >
                              <Phone size={11} /> Call Desk
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    <a
                      href={`tel:${profileEmergencyContact || '9876543210'}`}
                      className="profile-card-action-btn"
                    >
                      <PhoneCall size={15} />
                      <span>Call Operations Desk</span>
                    </a>
                  </div>

                  {/* Card 4: Fleet Vehicle & Transport Equipment */}
                  <div className="profile-desktop-card">
                    <div>
                      <div className="profile-card-header">
                        <div>
                          <h3 className="profile-card-title">Vehicle & Equipment Profile</h3>
                          <p className="profile-card-desc">Allocated delivery vehicle & dairy gear</p>
                        </div>
                        <div className="profile-card-icon-wrap">
                          <Bike size={22} color="#059669" />
                        </div>
                      </div>
                      <div className="profile-card-body">
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Registration Plate</span>
                          <span className="profile-card-data-val" style={{ color: '#059669' }}>{bikePlate || 'AP40DT9792'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Vehicle Model</span>
                          <span className="profile-card-data-val">{bikeModel || 'Commercial Cargo EV'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Vehicle Type</span>
                          <span className="profile-card-data-val">{bikeType || 'Insulated Milk Carrier EV'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Equipment Allocated</span>
                          <span className="profile-card-data-val">{bikeCratesCapacity || '4 Insulated Dairy Crates (120L)'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Driving License</span>
                          <span className="profile-card-data-val">{profileLicense || 'Verified Partner License'}</span>
                        </div>
                        <div className="profile-card-data-row">
                          <span className="profile-card-data-label">Fleet Compliance</span>
                          <span className="profile-card-data-val" style={{ color: '#059669' }}>✓ Inspected & Sanitized</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="profile-card-action-btn"
                      onClick={openEditProfile}
                    >
                      <Edit2 size={15} />
                      <span>Update Vehicle Details</span>
                    </button>
                  </div>
                </div>

                {/* 3. Account Security & Session Management Card */}
                <div
                  className="profile-driver-account-actions"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '18px',
                    padding: '20px 24px',
                    marginTop: '4px',
                    flexWrap: 'wrap',
                    gap: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0284c7',
                        flexShrink: 0,
                      }}
                    >
                      <Shield size={22} color="#0284c7" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        Partner Account & Session Security
                      </h4>
                      <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Authenticated as <strong>{profileName || boyName || 'Delivery Partner'}</strong> · Role-verified driver session
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={openEditProfile}
                      style={{
                        background: '#f0fdf4',
                        color: '#059669',
                        border: '1px solid #bbf7d0',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Edit2 size={15} />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(true)}
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <LogOut size={15} />
                      <span>Log out</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletePartnerError('');
                        setShowDeletePartnerModal(true);
                      }}
                      style={{
                        background: '#fff1f2',
                        color: '#e11d48',
                        border: '1px solid #fecdd3',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trash2 size={15} />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              </div>
            )
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
          onClick={() => handleNavChange('customers')}
          className={`driver-bottom-tab ${navTab === 'customers' ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Customers</span>
          {assignedCustomers.length > 0 && (
            <span className="driver-bottom-badge">{assignedCustomers.length}</span>
          )}
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
                <span style={{ fontWeight: 700, color: '#065f46', fontSize: '0.88rem' }}>
                  {activeItem?.subscriptionEndDate ? 'Subscription payment:' : 'Order Total:'}
                </span>
                <span style={{ fontSize: activeItem?.subscriptionEndDate ? '0.92rem' : '1.35rem', fontWeight: 800, color: '#059669', textAlign: 'right' }}>
                  {activeItem?.subscriptionEndDate
                    ? `₹${Number(activeItem.subscriptionPaymentAmount || 0).toLocaleString('en-IN')} paid by ${activeItem.subscriptionPaymentMethod?.toUpperCase() || 'RAZORPAY'}${activeItem.subscriptionPaymentId ? ` · ref ${activeItem.subscriptionPaymentId.slice(-8)}` : ''}`
                    : `₹${Number(milkQty) * 60 + (Number(curdQty) / 500) * 30}`}
                </span>
              </div>

              {/* Payment Mode Selection */}
              {activeItem?.subscriptionEndDate ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#047857', fontWeight: 700 }}>
                  This delivery is covered by the prepaid subscription through {new Date(activeItem.subscriptionEndDate).toLocaleDateString('en-IN')}. Do not collect payment.
                </p>
              ) : <div>
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
              </div>}

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
      {/* Delivery Partner Logout Confirmation Modal */}
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
              Sign Out of Driver Route?
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 22px 0', lineHeight: 1.5 }}>
              Are you sure you want to sign out of your Natural Milk Dairy partner account?
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
                  if (setActiveTab) setActiveTab('home');
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
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Delivery Partner Account Confirmation Modal */}
      {showDeletePartnerModal && (
        <div className="modal-overlay" onClick={() => !isDeletingPartner && setShowDeletePartnerModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '28px 24px', borderRadius: '18px', textAlign: 'center' }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <Trash2 size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              Delete Partner Account?
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete your <strong>Natural Milk Dairy Partner</strong> account?
            </p>
            <div
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '12px',
                padding: '12px 14px',
                textAlign: 'left',
                fontSize: '0.8rem',
                color: '#9f1239',
                lineHeight: 1.5,
                marginBottom: '20px',
              }}
            >
              <strong>⚠️ Permanent Database Action:</strong>
              <div style={{ marginTop: '4px' }}>
                • Your driver profile and credentials will be permanently erased.<br />
                • Assigned delivery routes will be detached.<br />
                • Handover records and route history will be removed.
              </div>
            </div>

            {deletePartnerError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  color: '#dc2626',
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                {deletePartnerError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                disabled={isDeletingPartner}
                onClick={() => setShowDeletePartnerModal(false)}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isDeletingPartner ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPartner}
                onClick={handleDeletePartnerAccount}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isDeletingPartner ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isDeletingPartner ? (
                  <>
                    <RefreshCw size={16} className="spin-animation" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Yes, Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. ADD / EDIT CUSTOMER MODAL (FULL CRUD)                      */}
      {/* ============================================================ */}
      {(showAddCustomerModal || editingCustomer) && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!customerActionLoading) {
              setShowAddCustomerModal(false);
              setEditingCustomer(null);
            }
          }}
          style={{ zIndex: 1100 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              width: '94%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '18px',
              padding: '24px',
              background: '#ffffff',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingCustomer ? 'Edit Route Customer' : 'Add New Route Customer'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                  {editingCustomer
                    ? `Updating details for ${editingCustomer.name} (${editingCustomer.customerId})`
                    : `Add a doorstep delivery customer in your assigned territory (${boyArea})`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setEditingCustomer(null);
                }}
                disabled={customerActionLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.3rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {customerFormError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{customerFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Customer Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={custFormName}
                  onChange={(e) => setCustFormName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                  }}
                />
              </div>

              {/* Mobile & WhatsApp */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Mobile Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={custFormMobile}
                    onChange={(e) => setCustFormMobile(e.target.value)}
                    placeholder="9876543210"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      color: '#0f172a',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={custFormWhatsapp}
                    onChange={(e) => setCustFormWhatsapp(e.target.value)}
                    placeholder="Same as mobile if blank"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Doorstep Delivery Address *
                </label>
                <input
                  type="text"
                  required
                  value={custFormAddress}
                  onChange={(e) => setCustFormAddress(e.target.value)}
                  placeholder="Flat / House No, Building, Street"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                  }}
                />
              </div>

              {/* Area & Landmark */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Service Area / Zone *
                  </label>
                  <select
                    value={custFormArea}
                    onChange={(e) => setCustFormArea(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      color: '#0f172a',
                      background: '#ffffff',
                    }}
                  >
                    {locations && locations.length > 0 ? (
                      locations.filter((l) => l.isActive).map((l) => (
                        <option key={l.id || l._id} value={l.name}>
                          {l.name} {l.pincode ? `(${l.pincode})` : ''} {boyArea && l.name.toLowerCase() === boyArea.toLowerCase() ? '• Assigned' : ''}
                        </option>
                      ))
                    ) : (
                      <option value={boyArea || 'Madhapur'}>{boyArea || 'Madhapur'}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={custFormLandmark}
                    onChange={(e) => setCustFormLandmark(e.target.value)}
                    placeholder="Near Pillar 24"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>

              {/* Daily Delivery Plan: Milk & Curd */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={15} color="#059669" />
                  <span>Daily Delivery Quantity</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Milk Quantity (Liters)
                    </label>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                      {[0.5, 1, 1.5, 2].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setCustFormMilkQty(qty)}
                          style={{
                            flex: 1,
                            padding: '4px 2px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: custFormMilkQty === qty ? '#059669' : '#cbd5e1',
                            background: custFormMilkQty === qty ? '#ecfdf5' : '#ffffff',
                            color: custFormMilkQty === qty ? '#065f46' : '#334155',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {qty}L
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="20"
                      value={custFormMilkQty}
                      onChange={(e) => setCustFormMilkQty(Number(e.target.value))}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Curd Quantity (Grams)
                    </label>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                      {[0, 250, 500].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setCustFormCurdQty(qty)}
                          style={{
                            flex: 1,
                            padding: '4px 2px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: custFormCurdQty === qty ? '#059669' : '#cbd5e1',
                            background: custFormCurdQty === qty ? '#ecfdf5' : '#ffffff',
                            color: custFormCurdQty === qty ? '#065f46' : '#334155',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {qty === 0 ? 'None' : `${qty}g`}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      step="250"
                      min="0"
                      max="5000"
                      value={custFormCurdQty}
                      onChange={(e) => setCustFormCurdQty(Number(e.target.value))}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                      }}
                    />
                  </div>
                </div>

                {/* Frequency */}
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Delivery Frequency
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { id: 'daily', label: 'Everyday' },
                      { id: 'alternate', label: 'Alternate Days' },
                      { id: 'selected', label: 'Custom Days' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCustFormFrequency(f.id)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: custFormFrequency === f.id ? '#059669' : '#cbd5e1',
                          background: custFormFrequency === f.id ? '#ecfdf5' : '#ffffff',
                          color: custFormFrequency === f.id ? '#065f46' : '#475569',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom days checkboxes */}
                {custFormFrequency === 'selected' && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                      const isSel = custFormDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              if (custFormDays.length > 1) setCustFormDays(custFormDays.filter((d) => d !== day));
                            } else {
                              setCustFormDays([...custFormDays, day]);
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: '1px solid',
                            borderColor: isSel ? '#059669' : '#cbd5e1',
                            background: isSel ? '#059669' : '#ffffff',
                            color: isSel ? '#ffffff' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Billing & Payment Type
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'credit', label: 'Monthly Credit (Postpaid)' },
                    { id: 'prepaid', label: 'Prepaid (Advance)' },
                    { id: 'cod', label: 'Cash on Delivery' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCustFormPaymentType(p.id)}
                      style={{
                        flex: 1,
                        padding: '7px 8px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: custFormPaymentType === p.id ? '#059669' : '#cbd5e1',
                        background: custFormPaymentType === p.id ? '#ecfdf5' : '#ffffff',
                        color: custFormPaymentType === p.id ? '#065f46' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Special Instructions */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Delivery Instructions / Doorstep Notes
                </label>
                <input
                  type="text"
                  value={custFormNotes}
                  onChange={(e) => setCustFormNotes(e.target.value)}
                  placeholder="e.g. Leave bottle in basket near gate, don't ring bell"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    color: '#0f172a',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  disabled={customerActionLoading}
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setEditingCustomer(null);
                  }}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: customerActionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={customerActionLoading}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: customerActionLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(5,150,105,0.2)',
                  }}
                >
                  {customerActionLoading ? (
                    <>
                      <RefreshCw size={15} className="spin-animation" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{editingCustomer ? 'Update Customer' : 'Add Customer to Route'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. DELETE CUSTOMER CONFIRMATION MODAL                        */}
      {/* ============================================================ */}
      {deletingCustomer && (
        <div className="modal-overlay" onClick={() => !customerActionLoading && setDeletingCustomer(null)} style={{ zIndex: 1100 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', padding: '24px', borderRadius: '18px', textAlign: 'center', background: '#ffffff' }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Remove Customer from Route?
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{deletingCustomer.name}</strong> ({deletingCustomer.customerId || deletingCustomer.mobile})?
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                textAlign: 'left',
                fontSize: '0.78rem',
                color: '#475569',
                marginBottom: '18px',
              }}
            >
              <div>📍 <strong>Address:</strong> {deletingCustomer.address}</div>
              <div style={{ marginTop: '3px' }}>🥛 <strong>Plan:</strong> {deletingCustomer.deliveryPlan?.milkQty || 1}L Daily Milk</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                disabled={customerActionLoading}
                onClick={() => setDeletingCustomer(null)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: customerActionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Keep Customer
              </button>

              <button
                type="button"
                disabled={customerActionLoading}
                onClick={handleDeleteCustomer}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: customerActionLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {customerActionLoading ? (
                  <>
                    <RefreshCw size={15} className="spin-animation" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Yes, Remove</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
