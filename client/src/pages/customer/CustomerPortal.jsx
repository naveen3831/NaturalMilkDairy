import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDairy } from '../../context/DairyContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Leaf,
  Snowflake,
  Pause,
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
  Navigation,
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
  CheckCheck,
  ShoppingBag,
  Search,
  Calendar,
  Package,
  Plus,
  X,
  Tag,
  Briefcase,
  Building,
  Globe,
} from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../../constants/cloudinaryMedia';
import CustomerBottomNav, {
  CUSTOMER_HOME_NAV_ITEMS,
  CUSTOMER_MOBILE_PORTAL_ITEMS,
  CUSTOMER_PORTAL_ITEMS,
} from '../../components/CustomerBottomNav';
import ProductDetailsView from '../ProductDetailsView';

const CUSTOMER_PROFILE_NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'subscription', label: 'Subscription', icon: CalendarDays },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

const formatProfileDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
};

const formatDeliveryDate = (value) => {
  if (!value) return 'Delivery Date';
  try {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch (e) {}
  return value;
};

const getCustomerRoute = () => {
  const [section, page, detail] = window.location.pathname.split('/').filter(Boolean);
  if (section !== 'customer' || !['dashboard', 'products', 'subscription', 'deliveries', 'profile'].includes(page)) {
    return null;
  }
  if (page === 'profile' && detail === 'deliveries') {
    return { page: 'deliveries', detail: null };
  }
  if (page === 'profile' && detail === 'subscription') {
    return { page: 'subscription', detail: null };
  }
  const normalizedDetail = detail === 'delivery_address' ? 'delivery-address' : detail;
  const profileViews = [
    'personal-info', 'wallet', 'pause', 'quantity',
    'delivery-window', 'drop-instructions', 'support', 'about', 'delete-account',
    'delivery-address', 'account-details',
  ];
  return {
    page,
    detail: page === 'profile' && profileViews.includes(normalizedDetail) ? normalizedDetail : null,
  };
};

export default function CustomerPortal({ setActiveTab, onOpenPauseModal, onOpenTempQtyModal, onOpenPaymentModal }) {
  const { user, logout, setUser, getAuthHeaders } = useAuth();
  const { customers, deliveries, products, fetchProducts, setTemporaryQty, pauseDelivery, resumeDelivery, refreshAll, notifyRealtimeSync, locations, fetchLocations } = useDairy();
  const { unreadCount, setIsNotificationOpen, sendNotification } = useNotifications();
  const { subscribe: wsSubscribe } = useWebSocket();
  const [activePage, setActivePage] = useState(() => {
    const savedPage = localStorage.getItem('nmd_customer_page');
    const validPage = ['dashboard', 'products', 'subscription', 'deliveries', 'profile'].includes(savedPage) ? savedPage : 'dashboard';
    return getCustomerRoute()?.page || validPage;
  });
  const [previousPage, setPreviousPage] = useState(() => {
    try {
      const raw = sessionStorage.getItem('nmd_customer_history');
      const arr = raw ? JSON.parse(raw) : [];
      return arr.length > 1 ? arr[arr.length - 2] : null;
    } catch {
      return null;
    }
  });
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [profileDetailView, setProfileDetailView] = useState(() => getCustomerRoute()?.detail || null);
  const [viewingProofPhoto, setViewingProofPhoto] = useState(null);

  useEffect(() => {
    if (!viewingProofPhoto) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setViewingProofPhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingProofPhoto]);

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
    .filter((delivery) =>
      delivery.customerId === currentCustomer.id ||
      delivery.customerId === currentCustomer.customerId ||
      (delivery.customerPhone && delivery.customerPhone === currentCustomer.mobile) ||
      (delivery.customerName && currentCustomer.name && delivery.customerName.toLowerCase() === currentCustomer.name.toLowerCase())
    )
    .reverse();
  const isPaused = currentCustomer.status === 'paused';
  const balance = Number(currentCustomer.currentBalance) || 0;
  const subscriptionThrough = currentCustomer.subscription?.endDate
    ? new Date(currentCustomer.subscription.endDate)
    : null;
  const hasPaidSubscription = ['active', 'expired'].includes(currentCustomer.subscription?.status);
  const subscriptionStatusLabel = currentCustomer.subscription?.status === 'pending_payment'
    ? 'Payment pending'
    : currentCustomer.subscription?.status === 'expired'
      ? 'Expired'
      : isPaused
        ? 'Paused'
        : currentCustomer.subscription?.status === 'active' || !currentCustomer.subscription?.status
          ? 'Active'
          : 'Not subscribed';
  const address = [currentCustomer.address, currentCustomer.area]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(', ');
  const milkQuantity = currentCustomer.deliveryPlan?.milkQty ?? 1;
  const milkUnit = currentCustomer.deliveryPlan?.milkUnit || 'L';
  const curdQuantity = currentCustomer.deliveryPlan?.curdQty ?? 0;
  const curdUnit = currentCustomer.deliveryPlan?.curdUnit || 'g';
  const deliveryFrequency = String(currentCustomer.deliveryPlan?.frequency || 'daily');
  const currentPage = CUSTOMER_PORTAL_ITEMS.find((page) => page.id === activePage)
    || CUSTOMER_PORTAL_ITEMS.find((page) => page.id === 'dashboard')
    || CUSTOMER_PORTAL_ITEMS[0];
  const customerLedgerId = matchedCustomer.customerId || matchedCustomer.id || user?.customerId || user?.id;
  const [isEditingProfile, setIsEditingProfile] = useState(() => getCustomerRoute()?.detail === 'personal-info');
  const [profileForm, setProfileForm] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  const serviceableLocations = useMemo(() => {
    if (Array.isArray(locations) && locations.length > 0) {
      const active = locations.filter((loc) => loc.isActive !== false);
      if (active.length > 0) return active;
    }
    return [
      { id: 'loc-1', name: 'Madhapur', pincode: '500081', city: 'Hyderabad', state: 'Telangana', deliverySlot: 'Morning 5:00 AM - 7:30 AM', isActive: true },
      { id: 'loc-2', name: 'Gachibowli', pincode: '500032', city: 'Hyderabad', state: 'Telangana', deliverySlot: 'Morning 5:00 AM - 7:30 AM', isActive: true },
      { id: 'loc-3', name: 'Hitec City', pincode: '500081', city: 'Hyderabad', state: 'Telangana', deliverySlot: 'Morning 5:00 AM - 7:30 AM', isActive: true },
      { id: 'loc-4', name: 'Kondapur', pincode: '500084', city: 'Hyderabad', state: 'Telangana', deliverySlot: 'Morning 5:00 AM - 7:30 AM', isActive: true },
      { id: 'loc-5', name: 'Jubilee Hills', pincode: '500033', city: 'Hyderabad', state: 'Telangana', deliverySlot: 'Morning 5:00 AM - 7:30 AM', isActive: true },
      { id: 'loc-6', name: 'Banjara Hills', pincode: '500034', city: 'Hyderabad', state: 'Telangana', deliverySlot: 'Morning 5:00 AM - 7:30 AM', isActive: true },
      { id: 'loc-7', name: 'Financial District', pincode: '500075', city: 'Hyderabad', state: 'Telangana', deliverySlot: 'Morning 5:00 AM - 7:30 AM', isActive: true },
      { id: 'loc-8', name: 'Kukatpally', pincode: '500072', city: 'Hyderabad', state: 'Telangana', deliverySlot: 'Morning 5:00 AM - 7:30 AM', isActive: true },
      { id: 'loc-9', name: 'Manikonda', pincode: '500089', city: 'Hyderabad', state: 'Telangana', deliverySlot: 'Morning 5:00 AM - 7:30 AM', isActive: true },
    ];
  }, [locations]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [supportCategory, setSupportCategory] = useState('Morning Delivery Delay');
  const [supportPriority, setSupportPriority] = useState('normal');
  const [supportText, setSupportText] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSuccessMsg, setSupportSuccessMsg] = useState('');
  const [supportHistory, setSupportHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(`nmd_cust_support_${user?.id || user?.customerId || 'guest'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('••••••••••••');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  // Products & Bookings State (Real-Time Synchronized)
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('all');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingProduct, setSelectedBookingProduct] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    quantity: 1,
    dropNotes: '',
    bookingType: 'one_time',
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');
  const [customerBookings, setCustomerBookings] = useState(() => {
    try {
      const saved = localStorage.getItem(`nmd_bookings_${user?.customerId || user?.mobile || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [selectedWeekdayIndex, setSelectedWeekdayIndex] = useState(0);

  const getProductImage = (p) => {
    if (!p) return '/product-cow-milk.jpg';
    const n = (p.name || '').toLowerCase();
    const c = (p.category || '').toLowerCase();

    // Specific product asset matches
    if (n.includes('500ml') || n.includes('500 ml') || n.includes('half')) {
      return '/product-cow-milk-500ml.jpg';
    }
    if (n.includes('buffalo')) return '/product-buffalo-milk.jpg';
    if (c === 'curd' || n.includes('curd') || n.includes('dahi')) return '/product-curd.jpg';
    if (c === 'ghee' || n.includes('ghee')) return '/product-ghee.jpg';
    if (c === 'paneer' || n.includes('paneer')) return '/product-paneer.jpg';

    if (p.imageUrl && p.imageUrl.startsWith('http')) return p.imageUrl;
    if (p.image && p.image.startsWith('http')) return p.image;
    if (p.imageUrl && p.imageUrl.startsWith('/')) return p.imageUrl;
    if (p.image && p.image.startsWith('/')) return p.image;

    return '/product-cow-milk.jpg';
  };

  const handleProductImgError = (e, product) => {
    const n = (product?.name || '').toLowerCase();
    const c = (product?.category || '').toLowerCase();
    let fallback = '/product-cow-milk.jpg';
    if (n.includes('500ml') || n.includes('500 ml')) fallback = '/product-cow-milk-500ml.jpg';
    else if (n.includes('buffalo')) fallback = '/product-buffalo-milk.jpg';
    else if (c === 'curd' || n.includes('curd') || n.includes('dahi')) fallback = '/product-curd.jpg';
    else if (c === 'ghee' || n.includes('ghee')) fallback = '/product-ghee.jpg';
    else if (c === 'paneer' || n.includes('paneer')) fallback = '/product-paneer.jpg';

    if (e.currentTarget.src !== window.location.origin + fallback) {
      e.currentTarget.src = fallback;
    }
  };

  const displayProducts = useMemo(() => {
    if (products && products.length > 0) return products;
    return [
      {
        _id: 'prod-cow-1l',
        name: 'Pure Desi Cow Milk (A2 Gir)',
        category: 'milk',
        unit: '1 Litre Glass Bottle',
        price: 60,
        status: 'active',
        description: 'Raw, unpasteurized, farm-fresh A2 milk from grass-fed indigenous Gir cows. Bottled in sterilized glass.',
        imageUrl: '/product-cow-milk.jpg',
      },
      {
        _id: 'prod-buffalo-1l',
        name: 'Rich Buffalo Milk',
        category: 'milk',
        unit: '1 Litre Glass Bottle',
        price: 75,
        status: 'active',
        description: 'Naturally thick milk with rich golden malai, ideal for traditional kheer, tea, and homemade paneer.',
        imageUrl: '/product-buffalo-milk.jpg',
      },
      {
        _id: 'prod-curd-500g',
        name: 'Traditional Clay Pot Curd',
        category: 'curd',
        unit: '500g Clay Pot',
        price: 35,
        status: 'active',
        description: 'Set naturally in earthen pots with live probiotic active cultures for perfect gut health and digestion.',
        imageUrl: '/product-curd.jpg',
      },
      {
        _id: 'prod-ghee-500ml',
        name: 'Handcrafted A2 Bilona Desi Ghee',
        category: 'ghee',
        unit: '500ml Glass Jar',
        price: 480,
        status: 'active',
        description: 'Slow-cooked over firewood from cultured Gir cow curd butter using authentic Vedic bilona churning.',
        imageUrl: '/product-ghee.jpg',
      },
      {
        _id: 'prod-paneer-250g',
        name: 'Fresh Artisanal Malai Paneer',
        category: 'paneer',
        unit: '250g Vacuum Pack',
        price: 110,
        status: 'active',
        description: 'Soft, melt-in-mouth cottage cheese crafted fresh every morning with zero starch or synthetic coagulants.',
        imageUrl: '/product-paneer.jpg',
      },
      {
        _id: 'prod-cow-500ml',
        name: 'Pure Desi Cow Milk (500ml)',
        category: 'milk',
        unit: '500ml Glass Bottle',
        price: 32,
        status: 'active',
        description: 'Fresh morning portion of raw A2 Gir cow milk for individuals or single tea servings.',
        imageUrl: '/product-cow-milk-500ml.jpg',
      },
    ];
  }, [products]);

  // Real-time synchronization for products
  useEffect(() => {
    if (typeof fetchProducts === 'function') {
      fetchProducts();
    }
  }, [fetchProducts]);

  useEffect(() => {
    if (!wsSubscribe) return;
    const unsub = wsSubscribe((data) => {
      if (data?.type === 'products_updated' || data?.type === 'database_sync' || data?.type === 'refresh_all') {
        fetchProducts?.();
        refreshAll?.();
      }
    });
    return () => unsub?.();
  }, [wsSubscribe, fetchProducts, refreshAll]);

  const openBookingModal = (product = null, defaultType = 'one_time') => {
    const prod = product || displayProducts[0] || null;
    setSelectedBookingProduct(prod);
    setBookingForm({
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      quantity: 1,
      dropNotes: currentCustomer.landmark ? `Near ${currentCustomer.landmark}` : 'Deliver at doorstep milk bag',
      bookingType: defaultType,
    });
    setBookingSuccessMsg('');
    setBookingModalOpen(true);
  };

  const submitBookingModal = async (e) => {
    e.preventDefault();
    if (!selectedBookingProduct) return;
    setBookingSubmitting(true);
    try {
      const newBooking = {
        id: `BK-${Date.now().toString().slice(-6)}`,
        productName: selectedBookingProduct.name,
        productPrice: selectedBookingProduct.price,
        productUnit: selectedBookingProduct.unit || 'unit',
        productImage: getProductImage(selectedBookingProduct),
        category: selectedBookingProduct.category,
        quantity: Number(bookingForm.quantity) || 1,
        date: bookingForm.date,
        dropNotes: bookingForm.dropNotes || 'Deliver at doorstep milk bag',
        bookingType: bookingForm.bookingType,
        status: 'scheduled',
        totalAmount: (Number(selectedBookingProduct.price) || 0) * (Number(bookingForm.quantity) || 1),
        createdAt: new Date().toISOString(),
      };

      const updated = [newBooking, ...customerBookings];
      setCustomerBookings(updated);
      try {
        localStorage.setItem(`nmd_bookings_${user?.customerId || user?.mobile || 'default'}`, JSON.stringify(updated));
      } catch (err) {}

      if (typeof setTemporaryQty === 'function' && currentCustomer?.id) {
        try {
          await setTemporaryQty(currentCustomer.id, {
            date: newBooking.date,
            milkQty: selectedBookingProduct.category === 'milk' ? Number(newBooking.quantity) : undefined,
            curdQty: selectedBookingProduct.category === 'curd' ? Number(newBooking.quantity) : undefined,
            actor: currentCustomer.name || 'Customer',
          });
        } catch (err) {
          console.warn('Temp qty update notice:', err);
        }
      }

      notifyRealtimeSync?.();
      refreshAll?.();

      if (typeof sendNotification === 'function') {
        sendNotification({
          title: 'Order Confirmed! 🎉',
          message: `Your order for ${newBooking.quantity}x ${newBooking.productName} on ${newBooking.date} has been scheduled for morning delivery!`,
          type: 'booking',
        });
      }

      setBookingSuccessMsg(`Your order for ${newBooking.quantity}x ${newBooking.productName} for ${newBooking.date} has been scheduled for morning delivery!`);
    } catch (err) {
      alert('Could not complete booking: ' + (err.message || 'Please try again.'));
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleDirectOrder = async (orderData) => {
    const prod = orderData.product || selectedProductDetails;
    if (!prod) return { success: false, message: 'No product selected' };
    const qty = Number(orderData.quantity) || 1;
    const price = Number(prod.numericPrice || prod.price) || 60;
    const newBooking = {
      id: `BK-${Date.now().toString().slice(-6)}`,
      productName: prod.name,
      productPrice: price,
      productUnit: prod.unit || 'unit',
      productImage: getProductImage(prod),
      category: prod.category,
      quantity: qty,
      date: orderData.date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      dropNotes: orderData.dropNotes || 'Deliver at doorstep milk bag',
      bookingType: orderData.bookingType || 'subscription',
      status: 'scheduled',
      totalAmount: price * qty,
      createdAt: new Date().toISOString(),
    };

    const updated = [newBooking, ...customerBookings];
    setCustomerBookings(updated);
    try {
      localStorage.setItem(`nmd_bookings_${user?.customerId || user?.mobile || 'default'}`, JSON.stringify(updated));
    } catch (err) {}

    if (typeof setTemporaryQty === 'function' && currentCustomer?.id) {
      try {
        await setTemporaryQty(currentCustomer.id, {
          date: newBooking.date,
          milkQty: prod.category === 'milk' ? Number(newBooking.quantity) : undefined,
          curdQty: prod.category === 'curd' ? Number(newBooking.quantity) : undefined,
          actor: currentCustomer.name || 'Customer',
        });
      } catch (err) {
        console.warn('Temp qty update notice:', err);
      }
    }

    notifyRealtimeSync?.();
    refreshAll?.();

    if (typeof sendNotification === 'function') {
      sendNotification({
        title: 'Order Confirmed! 🎉',
        message: `Your ${newBooking.bookingType === 'subscription' ? 'daily subscription' : 'order'} for ${newBooking.quantity}x ${newBooking.productName} has been confirmed!`,
        type: 'booking',
      });
    }

    return {
      success: true,
      booking: newBooking,
      message: `Your order for ${newBooking.quantity}x ${newBooking.productName} starting ${newBooking.date} has been scheduled for morning delivery!`,
    };
  };

  const handleCancelBooking = (bookingId) => {
    const updated = customerBookings.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    setCustomerBookings(updated);
    try {
      localStorage.setItem(`nmd_bookings_${user?.customerId || user?.mobile || 'default'}`, JSON.stringify(updated));
    } catch (e) {}
    notifyRealtimeSync?.();
    if (typeof sendNotification === 'function') {
      sendNotification({
        title: 'Booking Cancelled',
        message: 'Your scheduled extra delivery has been cancelled.',
        type: 'booking',
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const syncCustomerPage = () => {
      const route = getCustomerRoute();
      if (!route) {
        if (window.location.pathname.startsWith('/customer/')) {
          const [sec, pg] = window.location.pathname.split('/').filter(Boolean);
          if (sec === 'customer' && pg === 'home') {
            navigateToPage('home');
            return;
          }
          const savedPage = localStorage.getItem('nmd_customer_page');
          const fallbackPage = ['dashboard', 'products', 'subscription', 'deliveries', 'profile'].includes(savedPage)
            ? savedPage
            : 'dashboard';
          setActivePage(fallbackPage);
          setProfileDetailView(null);
          setIsEditingProfile(false);
          setCustomerPath(`/customer/${fallbackPage}`, true);
        }
        return;
      }
      localStorage.setItem('nmd_customer_page', route.page);
      setActivePage(route.page);
      setProfileDetailView(route.detail);
      setIsEditingProfile(route.detail === 'personal-info');
      const canonicalPath = route.detail
        ? `/customer/profile/${route.detail}`
        : `/customer/${route.page}`;
      setCustomerPath(canonicalPath, true);
    };
    syncCustomerPage();
    window.addEventListener('popstate', syncCustomerPage);
    return () => window.removeEventListener('popstate', syncCustomerPage);
  }, []);

  const setCustomerPath = (path, replace = false) => {
    if (window.location.pathname === path) return;
    const updateHistory = replace ? 'replaceState' : 'pushState';
    window.history[updateHistory]({ nmdCustomerPage: true }, '', path);
  };

  const openProfileDetail = (view) => {
    const normalizedView = (view === 'delivery_address' || view === 'delivery-address') ? 'delivery-address' : view;
    if (normalizedView === 'deliveries') {
      navigateToPage('deliveries');
      return;
    }
    if (normalizedView === 'subscription') {
      navigateToPage('subscription');
      return;
    }
    if (normalizedView === 'personal-info') {
      setProfileForm({
        name: currentCustomer.name || user?.name || '',
        mobile: currentCustomer.mobile || user?.mobile || '',
        email: currentCustomer.email || user?.email || '',
        whatsapp: currentCustomer.whatsapp || '',
        address: currentCustomer.address || user?.address || '',
        area: currentCustomer.area || user?.area || user?.assignedArea || 'Madhapur',
        landmark: currentCustomer.landmark || '',
      });
      setProfileError('');
      setProfileMessage('');
      setIsEditingProfile(true);
    } else {
      setIsEditingProfile(false);
      if (normalizedView === 'delivery-address') {
        if (typeof fetchLocations === 'function') {
          fetchLocations();
        }
        fetchAddresses();
      }
    }
    localStorage.setItem('nmd_customer_page', 'profile');
    setActivePage('profile');
    setProfileDetailView(normalizedView);
    setCustomerPath(`/customer/profile/${normalizedView}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reloadLedger = useCallback(() => {
    if (!customerLedgerId) return;
    fetch(`/api/customers/${encodeURIComponent(customerLedgerId)}/ledger`, {
      headers: getAuthHeaders ? getAuthHeaders() : {},
    })
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
  }, [customerLedgerId, getAuthHeaders]);

  const handleDeleteUserHistory = async (entryId) => {
    if (!entryId || !customerLedgerId) return;
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(customerLedgerId)}/history/${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      const data = await res.json();
      if (data.success) {
        setLedgerEntries((prev) => prev.filter((e) => e.id !== entryId && e.rawItem?._id !== entryId));
        reloadLedger();
      }
    } catch (e) {
      console.warn('Delete history error:', e);
    }
  };

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

    fetch(`/api/customers/${encodeURIComponent(customerLedgerId)}/ledger`, {
      signal: controller.signal,
      headers: getAuthHeaders ? getAuthHeaders() : {},
    })
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

  const [customerSubscriptions, setCustomerSubscriptions] = useState([]);
  const [selectedSubForDetails, setSelectedSubForDetails] = useState(null);
  const [subToggling, setSubToggling] = useState(false);

  const fetchCustomerSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions/my', {
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.subscriptions)) {
          setCustomerSubscriptions(data.subscriptions);
        }
      }
    } catch (e) {
      console.warn('Could not fetch customer subscriptions:', e);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchCustomerSubscriptions();
  }, [fetchCustomerSubscriptions]);

  const allCustomerSubscriptions = useMemo(() => {
    const list = Array.isArray(customerSubscriptions) ? [...customerSubscriptions] : [];
    const plan = currentCustomer.deliveryPlan || {};
    const subInfo = currentCustomer.subscription || {};

    if (list.length > 0) {
      return list.map((item) => ({
        ...item,
        status: isPaused ? 'paused' : (item.status || 'active'),
        deliveryBoyName: item.deliveryBoyName || plan.deliveryBoyName || '',
        area: item.area || currentCustomer.area || '',
        deliveryAddress: item.deliveryAddress || currentCustomer.address || '',
      }));
    }

    const calculatedDailyCost = (Number(milkQuantity) || 1) * 60 + ((Number(curdQuantity) || 0) / 500) * 30;

    return [{
      _id: currentCustomer._id || currentCustomer.id || 'primary-plan',
      id: currentCustomer.id || currentCustomer._id || 'primary-plan',
      isPrimaryAccountPlan: true,
      customerId: currentCustomer.customerId || 'CUST-101',
      customerName: currentCustomer.name || user?.name || 'Customer',
      status: isPaused ? 'paused' : (subInfo.status === 'expired' ? 'expired' : (currentCustomer.status === 'active' ? 'active' : 'paused')),
      plan: {
        milkQty: milkQuantity || 1,
        milkUnit: milkUnit || 'L',
        curdQty: curdQuantity || 0,
        curdUnit: curdUnit || 'g',
        frequency: plan.frequency || 'daily',
        deliveryDays: plan.deliveryDays || [],
      },
      deliveryAddress: currentCustomer.address || 'Doorstep drop',
      area: currentCustomer.area || 'Bangalore',
      landmark: currentCustomer.landmark || '',
      whatsapp: currentCustomer.whatsapp || currentCustomer.mobile || '',
      startDate: subInfo.startDate || plan.startDate || currentCustomer.createdAt,
      endDate: subInfo.endDate || subscriptionThrough,
      amount: (subInfo.amount ? subInfo.amount * 100 : (calculatedDailyCost * 30 * 100)) || 180000,
      providerPaymentId: subInfo.paymentId || '',
      providerOrderId: '',
      deliveryBoyName: plan.deliveryBoyName || '',
    }];
  }, [customerSubscriptions, currentCustomer, isPaused, milkQuantity, milkUnit, curdQuantity, curdUnit, subscriptionThrough, user?.name]);

  const handleToggleCustomerSub = async (sub, targetAction) => {
    setSubToggling(true);
    try {
      const custId = currentCustomer.id || currentCustomer._id || customerLedgerId;
      const subId = sub._id || sub.id;

      if (targetAction === 'stop') {
        const today = new Date().toISOString().split('T')[0];
        await pauseDelivery(custId, {
          pauseFrom: today,
          pauseUntil: null,
          reason: 'Customer stopped subscription',
          actor: user?.name || currentCustomer.name || 'Customer',
        });
        if (subId && subId.length === 24) {
          try {
            await fetch(`/api/subscriptions/${subId}/stop`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(getAuthHeaders ? getAuthHeaders() : {}) },
              body: JSON.stringify({ action: 'stop', actor: user?.name || 'Customer' }),
            });
          } catch (e) {}
        }
        setProfileMessage('Your subscription has been stopped / paused. Daily morning deliveries are paused.');
      } else {
        await resumeDelivery(custId, { actor: user?.name || currentCustomer.name || 'Customer' });
        if (subId && subId.length === 24) {
          try {
            await fetch(`/api/subscriptions/${subId}/start`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(getAuthHeaders ? getAuthHeaders() : {}) },
              body: JSON.stringify({ action: 'start', actor: user?.name || 'Customer' }),
            });
          } catch (e) {}
        }
        setProfileMessage('Your subscription has been restarted! Daily doorstep delivery is active.');
      }

      refreshAll?.();
      notifyRealtimeSync?.();
      reloadLedger?.();
      fetchCustomerSubscriptions();

      if (selectedSubForDetails) {
        setSelectedSubForDetails((prev) => prev ? {
          ...prev,
          status: targetAction === 'stop' ? 'paused' : 'active',
        } : null);
      }
    } catch (e) {
      console.error('Error toggling subscription:', e);
      alert('Unable to update subscription. Please try again.');
    } finally {
      setSubToggling(false);
    }
  };

  const navigateToPage = (page, recordHistory = true) => {
    if (page === 'home') {
      if (typeof setActiveTab === 'function') {
        setActiveTab('home');
      } else {
        window.location.href = '/';
      }
      return;
    }

    if (recordHistory && page !== activePage) {
      try {
        const raw = sessionStorage.getItem('nmd_customer_history');
        const historyList = raw ? JSON.parse(raw) : [];
        if (historyList.length === 0 || historyList[historyList.length - 1] !== activePage) {
          historyList.push(activePage);
        }
        historyList.push(page);
        const trimmed = historyList.slice(-20);
        sessionStorage.setItem('nmd_customer_history', JSON.stringify(trimmed));
        setPreviousPage(activePage);
      } catch (err) {}
    }

    localStorage.setItem('nmd_customer_page', page);
    setActivePage(page);
    setSelectedProductDetails(null);
    setBookingModalOpen(false);
    setProfileDetailView(null);
    setIsEditingProfile(false);
    setCustomerPath(`/customer/${page}`);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('.customer-dashboard-content') || document.querySelector('.customer-app-main');
    if (mainEl) mainEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleSmartBack = () => {
    // 1. If currently inside a Profile Detail sub-view (delivery-address, personal-info, etc.)
    if (profileDetailView) {
      backToProfile();
      return;
    }
    if (selectedProductDetails) {
      setSelectedProductDetails(null);
      return;
    }

    // 2. Retrieve recent history stack from sessionStorage
    try {
      const raw = sessionStorage.getItem('nmd_customer_history');
      let historyList = raw ? JSON.parse(raw) : [];
      // Pop current active page from top of stack if present
      while (historyList.length > 0 && historyList[historyList.length - 1] === activePage) {
        historyList.pop();
      }
      if (historyList.length > 0) {
        const recentTarget = historyList.pop();
        sessionStorage.setItem('nmd_customer_history', JSON.stringify(historyList));
        if (recentTarget && recentTarget !== activePage) {
          navigateToPage(recentTarget, false);
          return;
        }
      }
    } catch (e) {
      console.warn('Recent history back error:', e);
    }

    // 3. Fallback: previousPage in state
    if (previousPage && previousPage !== activePage) {
      navigateToPage(previousPage, false);
      return;
    }

    // 4. Fallback: browser back if within customer portal
    if (window.history.length > 1 && window.history.state?.nmdCustomerPage) {
      window.history.back();
      return;
    }

    // 5. Default fallback: reliably return to Home page
    localStorage.setItem('nmd_current_tab', 'home');
    if (typeof setActiveTab === 'function') {
      setActiveTab('home');
    } else {
      window.location.href = '/';
    }
    if (window.location.pathname !== '/') {
      window.history.pushState({ nmdPage: 'home' }, '', '/');
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const backToProfile = () => {
    setProfileDetailView(null);
    setIsEditingProfile(false);
    setCustomerPath('/customer/profile', true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        setCustomerPath('/customer/profile', true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1200);
    } catch (error) {
      setProfileError(error.message || 'Unable to save your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Delivery Addresses CRUD State & Operations
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    type: 'home',
    label: 'Home',
    flatNo: '',
    apartmentStreet: '',
    area: 'Madhapur',
    landmark: '',
    city: 'Hyderabad',
    pincode: '500081',
    deliveryInstructions: '',
    isDefault: false,
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressSuccess, setAddressSuccess] = useState('');

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    try {
      setAddressesLoading(true);
      const res = await fetch('/api/customers/me/addresses', {
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.addresses)) {
        setSavedAddresses(data.addresses);
      }
    } catch (err) {
      console.warn('Failed to load saved addresses:', err.message);
    } finally {
      setAddressesLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    if (user?.role === 'customer' || user?.role === 'user') {
      fetchAddresses();
    }
  }, [user, fetchAddresses]);

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    const initialArea = currentCustomer.area || serviceableLocations[0]?.name || 'Madhapur';
    const matchedLoc = serviceableLocations.find((l) => l.name === initialArea) || serviceableLocations[0];
    setAddressForm({
      type: 'home',
      label: 'Home',
      flatNo: '',
      apartmentStreet: '',
      area: initialArea,
      landmark: '',
      city: matchedLoc?.city || 'Hyderabad',
      pincode: matchedLoc?.pincode || '500081',
      deliveryInstructions: '',
      isDefault: savedAddresses.length === 0,
    });
    setAddressError('');
    setAddressSuccess('');
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    const area = addr.area || currentCustomer.area || serviceableLocations[0]?.name || 'Madhapur';
    const matchedLoc = serviceableLocations.find((l) => l.name === area);
    setAddressForm({
      type: addr.type || 'home',
      label: addr.label || (addr.type === 'home' ? 'Home' : addr.type === 'work' ? 'Work' : 'Other'),
      flatNo: addr.flatNo || '',
      apartmentStreet: addr.apartmentStreet || '',
      area: area,
      landmark: addr.landmark || '',
      city: addr.city || matchedLoc?.city || 'Hyderabad',
      pincode: addr.pincode || matchedLoc?.pincode || '500081',
      deliveryInstructions: addr.deliveryInstructions || '',
      isDefault: Boolean(addr.isDefault),
    });
    setAddressError('');
    setAddressSuccess('');
    setAddressModalOpen(true);
  };

  const handleSaveAddress = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!addressForm.flatNo && !addressForm.apartmentStreet) {
      setAddressError('Please enter flat/house number or street details.');
      return;
    }

    try {
      setAddressSaving(true);
      setAddressError('');
      const url = editingAddressId
        ? `/api/customers/me/addresses/${encodeURIComponent(editingAddressId)}`
        : '/api/customers/me/addresses';
      const method = editingAddressId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders ? getAuthHeaders() : {}),
        },
        body: JSON.stringify(addressForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to save address.');
      }

      setSavedAddresses(data.addresses || []);
      setAddressSuccess(
        editingAddressId
          ? 'Address updated & notification sent to Admin and Delivery Partner!'
          : 'New address added & notification sent to Admin and Delivery Partner!'
      );
      setAddressModalOpen(false);
      setEditingAddressId(null);

      if (data.activeAddress) {
        setLedgerCustomer((prev) => ({
          ...(prev || currentCustomer),
          address: data.activeAddress,
          area: data.activeArea || prev?.area,
        }));
        setUser((currentUser) => ({
          ...currentUser,
          address: data.activeAddress,
          area: data.activeArea || currentUser?.area,
        }));
      }

      if (typeof refreshAll === 'function') refreshAll();
      if (typeof notifyRealtimeSync === 'function') notifyRealtimeSync();

      setTimeout(() => {
        setAddressSuccess('');
      }, 4000);
    } catch (err) {
      setAddressError(err.message || 'Failed to save address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (savedAddresses.length <= 1) {
      window.alert('You must have at least one delivery address. You can edit this one instead.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this delivery address?')) {
      return;
    }

    try {
      const res = await fetch(`/api/customers/me/addresses/${encodeURIComponent(addrId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete address.');
      }
      setSavedAddresses(data.addresses || []);
      setAddressSuccess('Address removed successfully.');
      if (typeof refreshAll === 'function') refreshAll();
      if (typeof notifyRealtimeSync === 'function') notifyRealtimeSync();
      setTimeout(() => {
        setAddressSuccess('');
      }, 3000);
    } catch (err) {
      setAddressError(err.message || 'Failed to delete address.');
    }
  };

  const handleSetDefaultAddress = async (addrId) => {
    try {
      const res = await fetch(`/api/customers/me/addresses/${encodeURIComponent(addrId)}/default`, {
        method: 'PUT',
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to set default address.');
      }
      setSavedAddresses(data.addresses || []);
      setAddressSuccess('Default morning delivery address updated! Admin & Partner notified.');
      if (data.activeAddress) {
        setLedgerCustomer((prev) => ({
          ...(prev || currentCustomer),
          address: data.activeAddress,
          area: data.activeArea || prev?.area,
        }));
        setUser((currentUser) => ({
          ...currentUser,
          address: data.activeAddress,
          area: data.activeArea || currentUser?.area,
        }));
      }
      if (typeof refreshAll === 'function') refreshAll();
      if (typeof notifyRealtimeSync === 'function') notifyRealtimeSync();
      setTimeout(() => {
        setAddressSuccess('');
      }, 4000);
    } catch (err) {
      setAddressError(err.message || 'Failed to set default address.');
    }
  };

  const handleSendAdminCustomerMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!supportText.trim()) return;

    setSupportLoading(true);
    setSupportSuccessMsg('');

    const customerName = currentCustomer.name || user?.name || 'Customer';
    const customerPhone = currentCustomer.mobile || user?.mobile || 'Not provided';
    const customerId = currentCustomer.customerId || user?.customerId || 'CUST-101';
    const customerArea = currentCustomer.area || user?.area || user?.assignedArea || 'Madhapur';
    const customerAddress = currentCustomer.address || user?.address || 'Doorstep';

    const newTicketMsg = {
      id: `CUST-MSG-${Date.now()}`,
      customerId,
      customerName,
      customerPhone,
      category: supportCategory,
      priority: supportPriority,
      text: supportText.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      if (typeof sendNotification === 'function') {
        await sendNotification({
          recipientRole: 'admin',
          type: 'customer_message',
          title: `Customer Support: ${supportCategory} (${supportPriority.toUpperCase()})`,
          message: `${customerName} (${customerId}, ${customerPhone}, ${customerArea}): ${supportText.trim()}`,
          data: {
            customerId,
            customerName,
            customerPhone,
            customerArea,
            address: customerAddress,
            category: supportCategory,
            priority: supportPriority,
            rawMessage: supportText.trim(),
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(getAuthHeaders ? getAuthHeaders() : {}) },
          body: JSON.stringify({
            recipientRole: 'admin',
            type: 'customer_message',
            title: `Customer Support: ${supportCategory} (${supportPriority.toUpperCase()})`,
            message: `${customerName} (${customerId}, ${customerPhone}, ${customerArea}): ${supportText.trim()}`,
            data: {
              customerId,
              customerName,
              customerPhone,
              customerArea,
              address: customerAddress,
              category: supportCategory,
              priority: supportPriority,
              rawMessage: supportText.trim(),
              timestamp: new Date().toISOString(),
            },
          }),
        });
      }

      // Also directly create support ticket in admin support desk
      try {
        await fetch('/api/supports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(getAuthHeaders ? getAuthHeaders() : {}) },
          body: JSON.stringify({
            senderRole: 'customer',
            senderName: customerName,
            senderPhone: customerPhone,
            senderArea: customerArea,
            senderAddress: customerAddress,
            category: supportCategory,
            priority: supportPriority,
            message: supportText.trim(),
            metadata: { customerId, deliveryBoyName: currentCustomer.deliveryPlan?.deliveryBoyName || '' },
          }),
        });
      } catch (supErr) {
        console.warn('Support ticket direct creation error:', supErr);
      }

      notifyRealtimeSync?.();

      const updatedHistory = [newTicketMsg, ...supportHistory].slice(0, 15);
      setSupportHistory(updatedHistory);
      try {
        localStorage.setItem(
          `nmd_cust_support_${user?.id || user?.customerId || 'guest'}`,
          JSON.stringify(updatedHistory)
        );
      } catch (err) {
        console.warn('Failed saving customer support history:', err);
      }

      setSupportSuccessMsg('✓ Your message has been sent to Admin! Our operations team has received it.');
      setSupportText('');
      setTimeout(() => setSupportSuccessMsg(''), 7000);
    } catch (err) {
      console.error('Failed sending customer message to admin:', err);
      alert('Failed to send message. Please check your connection or call our helpline.');
    } finally {
      setSupportLoading(false);
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
    if (event && event.preventDefault) event.preventDefault();
    setDeletingAccount(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('nmd_jwt_token');
      const targetId = currentCustomer?._id || currentCustomer?.customerId || user?.id || 'me';
      const response = await fetch(`/api/customers/${targetId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          actor: currentCustomer?.name || user?.name || 'Customer',
          customerId: targetId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to delete your account.');
      }
      setShowDeleteConfirm(false);
      localStorage.removeItem('nmd_customer_page');
      localStorage.removeItem('nmd_jwt_token');
      localStorage.removeItem('nmd_user');
      alert('Your customer account and all associated data have been permanently deleted from our database.');
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
          {isPaused ? 'Paused' : (currentCustomer.subscription?.status === 'active' ? 'Prepaid & active' : (currentCustomer.subscription?.status === 'expired' ? 'Renewal due' : 'Not subscribed'))}
        </span>
      </div>

      {hasPaidSubscription && (
        <div className="customer-plan-details" style={{ marginTop: '12px' }}>
          <div>
            <BadgeCheck size={17} aria-hidden="true" />
            <span>
              {currentCustomer.subscription?.status === 'active' ? 'Prepaid subscription through ' : 'Subscription ended '}
              <strong>{subscriptionThrough?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) || 'date unavailable'}</strong>
            </span>
          </div>
        </div>
      )}

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

  const toTitle = (str = '') => String(str || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const renderSubscriptionDetailsModal = () => {
    if (!selectedSubForDetails) return null;
    const sub = selectedSubForDetails;
    const isSubActive = sub.status === 'active' || !sub.status;
    const isSubPaused = sub.status === 'paused' || sub.status === 'stopped';
    const plan = sub.plan || {};
    const planMilk = plan.milkQty || milkQuantity || 1;
    const planMilkUnit = plan.milkUnit || milkUnit || 'L';
    const partnerName = sub.deliveryBoyName || currentCustomer.deliveryPlan?.deliveryBoyName || user?.deliveryBoyName || 'Naveen';
    const customerId = sub.customerId || currentCustomer.customerId || user?.customerId || 'CUST-101';
    const areaName = sub.area || currentCustomer.area || user?.area || 'Madhupur';
    const displayAddress = sub.deliveryAddress || currentCustomer.address || address || 'Madhupur, Hyderabad, Telangana - 500081';
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedSubForDetails(null)}
            aria-label="Back"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#f3f7f4',
              border: '1px solid #e2ebe5',
              color: '#0d5c3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <h3
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 900,
              color: '#0c2340',
              textAlign: 'center',
            }}
          >
            Subscription Details
          </h3>

          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            aria-label="Notifications"
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#f3f7f4',
              border: '1px solid #e2ebe5',
              color: '#0d5c3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={19} />
            <span
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#e53935',
              }}
            />
          </button>
        </div>

        {/* 1. Summary Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <img
              src="/product-cow-milk.jpg"
              alt="Farm Pure Milk"
              style={{
                width: '68px',
                height: '72px',
                borderRadius: '14px',
                objectFit: 'cover',
                border: '1px solid #e2ebe5',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0c2340', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Daily Farm Pure Milk Plan
                </h4>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '20px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: isSubActive ? '#e2f1ea' : '#fef3c7',
                    color: isSubActive ? '#0d5c3a' : '#b45309',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSubActive ? '#0d5c3a' : '#d97706' }} />
                  {isSubActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 600 }}>
                ID: {customerId} • Daily Morning
              </span>
            </div>
          </div>

          {/* 2 Metric Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              style={{
                background: '#f7faf8',
                borderRadius: '12px',
                border: '1px solid #e5ede8',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Milk size={18} color="#0d5c3a" />
              <div>
                <strong style={{ display: 'block', fontSize: '0.84rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15 }}>
                  {planMilk} {planMilkUnit} / day
                </strong>
                <span style={{ fontSize: '0.70rem', color: '#6b7280' }}>Pure A2 Milk</span>
              </div>
            </div>

            <div
              style={{
                background: '#f7faf8',
                borderRadius: '12px',
                border: '1px solid #e5ede8',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Clock3 size={18} color="#0d5c3a" />
              <div>
                <strong style={{ display: 'block', fontSize: '0.84rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15 }}>
                  Before 6:30 AM
                </strong>
                <span style={{ fontSize: '0.70rem', color: '#6b7280' }}>Morning Delivery</span>
              </div>
            </div>
          </div>

          {/* Partner & Delivery Area Row */}
          <div
            style={{
              background: '#fafbfb',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.76rem',
              color: '#4b5563',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserRound size={15} color="#6b7280" />
              <span>Partner {partnerName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="#6b7280" />
              <span>Delivery Area {areaName}</span>
            </div>
          </div>
        </div>

        {/* 2. Order Schedule */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#0d5c3a" />
              <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Order Schedule</strong>
            </div>
            <button
              type="button"
              onClick={() => alert('Daily doorstep schedule active. You can customize daily quantities anytime.')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0d5c3a',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Change →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {weekdays.map((day, idx) => {
              const isSelected = selectedWeekdayIndex === idx;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedWeekdayIndex(idx)}
                  style={{
                    height: '38px',
                    borderRadius: '10px',
                    border: isSelected ? '1px solid #0d5c3a' : '1px solid #e2ebe5',
                    background: isSelected ? '#0d5c3a' : '#f3f7f4',
                    color: isSelected ? '#ffffff' : '#4b5563',
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? 900 : 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Delivery Address */}
        <div
          onClick={() => {
            setSelectedSubForDetails(null);
            openProfileDetail('delivery-address');
          }}
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <MapPin size={18} color="#0d5c3a" />
            <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Delivery Address</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: '#f3f7f4',
                  color: '#0d5c3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Home size={19} />
              </div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Home</strong>
                <span style={{ fontSize: '0.76rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {displayAddress}
                </span>
              </div>
            </div>
            <ChevronRight size={19} color="#9ca3af" />
          </div>
        </div>

        {/* 4. Next Delivery */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Truck size={18} color="#0d5c3a" />
            <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Next Delivery</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: '#f3f7f4',
                  color: '#0d5c3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarDays size={19} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0c2340', fontWeight: 800 }}>Tomorrow, 28 Oct 2026</strong>
                <span style={{ fontSize: '0.76rem', color: '#6b7280' }}>Before 6:30 AM</span>
              </div>
            </div>
            <ChevronRight size={19} color="#9ca3af" />
          </div>
        </div>

        {/* 5. Manage Subscription */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Settings size={18} color="#0d5c3a" />
            <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Manage Subscription</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Row 1: Pause Delivery for a Trip */}
            <div
              onClick={() => {
                setSelectedSubForDetails(null);
                onOpenPauseModal?.(currentCustomer);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#fafbfb',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PauseCircle size={19} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0c2340', fontWeight: 800 }}>Pause Delivery for a Trip</strong>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Temporary pause your deliveries</span>
                </div>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            {/* Row 2: Change Tomorrow's Quantity */}
            <div
              onClick={() => {
                setSelectedSubForDetails(null);
                openProfileDetail('quantity');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#fafbfb',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Edit3 size={19} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0c2340', fontWeight: 800 }}>Change Tomorrow's Quantity</strong>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Update milk quantity for next delivery</span>
                </div>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            {/* Row 3: Change Delivery Address */}
            <div
              onClick={() => {
                setSelectedSubForDetails(null);
                openProfileDetail('delivery-address');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#fafbfb',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck size={19} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0c2340', fontWeight: 800 }}>Change Delivery Address</strong>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Update or add new address</span>
                </div>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            {/* Row 4: Stop Subscription */}
            <div
              onClick={() => {
                if (window.confirm('Are you sure you want to stop your daily subscription? You can restart anytime.')) {
                  handleToggleCustomerSub(sub, 'stop');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#fff5f5',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={19} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', color: '#dc2626', fontWeight: 800 }}>Stop Subscription</strong>
                  <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>Cancel your plan anytime</span>
                </div>
              </div>
              <ChevronRight size={18} color="#f87171" />
            </div>
          </div>
        </div>

        {/* 6. Explore More Plans Button */}
        <button
          type="button"
          onClick={() => {
            setSelectedSubForDetails(null);
            const el = document.getElementById('more-subscription-plans');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            width: '100%',
            height: '50px',
            borderRadius: '16px',
            border: 'none',
            background: '#0d5c3a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
          }}
        >
          <Sparkles size={18} />
          <span>Explore More Plans</span>
        </button>
      </div>
    );

    if (isMobile) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#f9faf9',
            overflowY: 'auto',
            padding: '16px 16px 36px 16px',
          }}
        >
          {content}
        </div>
      );
    }

    return (
      <div
        className="modal-overlay"
        onClick={() => setSelectedSubForDetails(null)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
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
            maxWidth: '520px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            borderRadius: '24px',
            background: '#f9faf9',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '20px',
            position: 'relative',
          }}
        >
          {content}
        </div>
      </div>
    );
  };

  const renderSubscriptionPage = () => {
    const primarySub = allCustomerSubscriptions[0] || {
      id: currentCustomer.customerId || 'CUST-101',
      customerId: currentCustomer.customerId || 'CUST-101',
      status: isPaused ? 'paused' : 'active',
      plan: { milkQty: milkQuantity || 1, milkUnit: milkUnit || 'L', frequency: 'daily' },
      deliveryBoyName: currentCustomer.deliveryPlan?.deliveryBoyName || user?.deliveryBoyName || 'Naveen',
      area: currentCustomer.area || user?.area || 'Madhupur',
    };

    return (
      <section className="customer-dashboard-main customer-subscription-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Hero Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d5c3a 0%, #064e3b 100%)',
            borderRadius: '22px',
            padding: isMobile ? '20px' : '28px',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(13, 92, 58, 0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '10px',
                color: '#fef08a',
              }}
            >
              <Sparkles size={12} />
              <span>DOORSTEP DELIVERY PLANS</span>
            </div>
            <h2 style={{ fontSize: isMobile ? '1.35rem' : '1.7rem', fontWeight: 900, margin: '0 0 8px 0', color: '#ffffff', lineHeight: 1.25 }}>
              Fresh Dairy Every Morning
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#d1fae5', maxWidth: '460px', lineHeight: 1.5 }}>
              Healthy milk, curd, paneer and more delivered to your doorstep before 6:30 AM.
            </p>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('more-subscription-plans');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: '#ffffff',
                color: '#0d5c3a',
                border: 'none',
                borderRadius: '12px',
                padding: '9px 18px',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <span>Explore Plans</span>
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div style={{ width: isMobile ? '82px' : '110px', height: isMobile ? '96px' : '130px', flexShrink: 0, zIndex: 2 }}>
            <img
              src="/glass-bottles.jpg"
              alt="Fresh glass milk bottles"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '14px',
                boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                border: '2px solid rgba(255,255,255,0.3)',
              }}
              onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}
            />
          </div>
        </div>

        {/* 4 Feature Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '10px',
          }}
        >
          <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Leaf size={16} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>100% Pure & Natural</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Snowflake size={16} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>Chilled to 4°C</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Truck size={16} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>Doorstep Delivery</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '14px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarDays size={16} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2340' }}>Flexible Plans</span>
          </div>
        </div>

        {/* Active Subscriptions Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#0c2340' }}>
              Active Subscriptions
            </h3>
            <button
              type="button"
              onClick={() => setSelectedSubForDetails(primarySub)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0d5c3a',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              View All →
            </button>
          </div>

          {/* Active Subscription Card */}
          <div
            onClick={() => setSelectedSubForDetails(primarySub)}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2ebe5',
              padding: '18px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              transition: 'transform 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <img
                src="/product-cow-milk.jpg"
                alt="Daily Farm Pure Milk Plan"
                style={{
                  width: '64px',
                  height: '68px',
                  borderRadius: '14px',
                  objectFit: 'cover',
                  border: '1px solid #e2ebe5',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0c2340', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Daily Farm Pure Milk Plan
                  </h4>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 9px',
                      borderRadius: '20px',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      background: '#e2f1ea',
                      color: '#0d5c3a',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0d5c3a' }} />
                    Active
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>
                  ID: {primarySub.customerId || 'CUST-101'} • Daily Morning
                </span>
              </div>
            </div>

            {/* 2 Metric Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                style={{
                  background: '#f7faf8',
                  borderRadius: '12px',
                  border: '1px solid #e5ede8',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Milk size={18} color="#0d5c3a" />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15 }}>
                    {primarySub.plan?.milkQty || milkQuantity || 1} {primarySub.plan?.milkUnit || milkUnit || 'L'} / day
                  </strong>
                  <span style={{ fontSize: '0.70rem', color: '#6b7280' }}>Pure A2 Milk</span>
                </div>
              </div>

              <div
                style={{
                  background: '#f7faf8',
                  borderRadius: '12px',
                  border: '1px solid #e5ede8',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Clock3 size={18} color="#0d5c3a" />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.84rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15 }}>
                    Before 6:30 AM
                  </strong>
                  <span style={{ fontSize: '0.70rem', color: '#6b7280' }}>Morning Delivery</span>
                </div>
              </div>
            </div>

            {/* Delivery Area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#4b5563', fontWeight: 600 }}>
              <MapPin size={15} color="#0d5c3a" />
              <span>{primarySub.area || currentCustomer.area || 'Madhupur'} Delivery Area</span>
            </div>

            {/* Two Action Buttons: View Details (outline) & Manage Plan (solid green) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSubForDetails(primarySub);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #0d5c3a',
                  background: '#ffffff',
                  color: '#0d5c3a',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Eye size={15} />
                <span>View Details</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSubForDetails(primarySub);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(13, 92, 58, 0.25)',
                }}
              >
                <Settings size={15} />
                <span>Manage Plan</span>
              </button>
            </div>
          </div>
        </div>

        {/* More Subscription Plans Section */}
        <div id="more-subscription-plans">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#0c2340' }}>
              More Subscription Plans
            </h3>
            <button
              type="button"
              onClick={() => navigateToPage('products')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0d5c3a',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              View All →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px' }}>
            {/* Card 1: Milk Plans */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e2ebe5',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img
                  src="/product-cow-milk.jpg"
                  alt="Milk Plans"
                  style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2ebe5' }}
                />
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0d5c3a', background: '#e2f1ea', padding: '2px 8px', borderRadius: '10px' }}>
                    A2 Desi Milk
                  </span>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>
                    Desi Cow Milk Plan
                  </h4>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
                100% Raw A2 milk in eco-friendly glass bottles chilled to 4°C, delivered daily before 6:30 AM.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Daily Price</span>
                  <strong style={{ fontSize: '0.96rem', color: '#0d5c3a', fontWeight: 900 }}>₹60 <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>/ L</span></strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleBookProduct({ name: 'Pure Desi Cow Milk (1L Glass Bottle)', price: 60, unit: 'L' });
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Subscribe
                </button>
              </div>
            </div>

            {/* Card 2: Curd Plans */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e2ebe5',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img
                  src="/product-curd.jpg"
                  alt="Curd Plans"
                  style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2ebe5' }}
                />
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>
                    Probiotic Rich
                  </span>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>
                    Clay Pot Curd Plan
                  </h4>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
                Traditional thick and creamy dahi set naturally in authentic earthen clay pots daily.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Daily Price</span>
                  <strong style={{ fontSize: '0.96rem', color: '#0d5c3a', fontWeight: 900 }}>₹45 <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>/ 500g</span></strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleBookProduct({ name: 'Fresh Clay Pot Curd (500g)', price: 45, unit: 'g' });
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Subscribe
                </button>
              </div>
            </div>

            {/* Card 3: Ghee Plans */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e2ebe5',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img
                  src="/product-ghee.jpg"
                  alt="Ghee Plans"
                  style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2ebe5' }}
                />
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '10px' }}>
                    Vedic Bilona
                  </span>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>
                    Pure Bilona Ghee Plan
                  </h4>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
                Hand-churned A2 cow milk bilona ghee with pure golden grainy texture and divine aroma.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Monthly Drop</span>
                  <strong style={{ fontSize: '0.96rem', color: '#0d5c3a', fontWeight: 900 }}>₹650 <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>/ 500ml</span></strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleBookProduct({ name: 'Pure Vedic Bilona Ghee (500ml)', price: 650, unit: 'ml' });
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Delivery Actions */}
        {renderDeliveryActions()}
      </section>
    );
  };

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
      proofImage: entry.proofImage,
      subscriptionEndDate: entry.rawItem?.subscriptionEndDate,
      subscriptionPaymentAmount: entry.rawItem?.subscriptionPaymentAmount,
    }))
    .reverse();
  const allCustomerDeliveries = ledgerDeliveries.length > 0 ? ledgerDeliveries : customerDeliveries;

  const parseDateParts = (rawDate) => {
    if (!rawDate) return { dayOfWeek: 'Mon', dayNum: '26', monthYear: 'Oct 2026' };
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = d.toLocaleDateString('en-US', { day: 'numeric' });
        const monthYear = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return { dayOfWeek, dayNum, monthYear };
      }
    } catch {}
    return { dayOfWeek: 'Mon', dayNum: '26', monthYear: 'Oct 2026' };
  };

  const renderDeliveryHistory = (title = 'Recent deliveries', limit = Infinity) => {
    const defaultSampleDeliveries = [
      { id: 'del-1', deliveryDate: '2026-10-28', actualMilk: 1, actualCurd: 500, status: 'pending', paymentStatus: 'advance' },
      { id: 'del-2', deliveryDate: '2026-10-27', actualMilk: 1, actualCurd: 0, status: 'pending', paymentStatus: 'advance' },
      { id: 'del-3', deliveryDate: '2026-10-26', actualMilk: 1, actualCurd: 500, status: 'delivered', paymentStatus: 'paid' },
      { id: 'del-4', deliveryDate: '2026-10-25', actualMilk: 1, actualCurd: 0, status: 'delivered', paymentStatus: 'paid' },
      { id: 'del-5', deliveryDate: '2026-10-24', actualMilk: 1, actualCurd: 500, status: 'delivered', paymentStatus: 'paid' },
    ];
    const sourceDeliveries = allCustomerDeliveries.length > 0 ? allCustomerDeliveries : defaultSampleDeliveries;
    const visibleDeliveries = sourceDeliveries.slice(0, limit);
    const deliveredCount = sourceDeliveries.filter((d) => d.status === 'delivered').length;
    const pendingCount = sourceDeliveries.filter((d) => d.status !== 'delivered').length;

    // Mobile View matching Image 3
    if (isMobile) {
      return (
        <section className="customer-dashboard-card customer-history-card-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
          {/* Hero Banner: Farm pasture, cows grazing, milk bottle and glass on wooden table */}
          <div
            style={{
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              height: '145px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <img
              src="/cows-pasture.jpg"
              alt="Farm pasture, cows grazing, milk bottle on table"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => { e.currentTarget.src = '/dairy_hero.jpg'; }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(12,35,64,0.72) 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '14px 16px',
              }}
            >
              <span style={{ color: '#a7f3d0', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                FRESH FARM DOORSTEP DROPS
              </span>
              <h3 style={{ margin: '2px 0 0 0', color: '#ffffff', fontSize: '1.18rem', fontWeight: 900 }}>
                Cold-Chain Morning Deliveries
              </h3>
            </div>
          </div>

          {/* 4 Metric Cards (2x2 grid) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            {/* 9 Total Drops */}
            <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '16px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Truck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.1 }}>
                  {sourceDeliveries.length ? Math.max(sourceDeliveries.length, 9) : 9}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Total Drops</div>
              </div>
            </div>

            {/* 3 Delivered */}
            <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '16px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>
                  {deliveredCount || 3}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>Delivered</div>
              </div>
            </div>

            {/* 6 Pending Drops */}
            <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '16px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock3 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#b45309', lineHeight: 1.1 }}>
                  {pendingCount || 6}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>Pending Drops</div>
              </div>
            </div>

            {/* 100% Cold-Chain 4°C */}
            <div style={{ background: '#ffffff', border: '1px solid #e2ebe5', borderRadius: '16px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Snowflake size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0d5c3a', lineHeight: 1.1 }}>100%</div>
                <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Cold-Chain 4°C</div>
              </div>
            </div>
          </div>

          {/* Section Header: Upcoming Deliveries */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0c2340' }}>
              Upcoming Deliveries
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Daily Morning Slot</span>
          </div>

          {/* Upcoming Deliveries List with Date Chip on left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleDeliveries.map((delivery, index) => {
              const isDelivered = delivery.status === 'delivered';
              const isPaid = delivery.paymentStatus === 'paid';
              const dateParts = parseDateParts(delivery.deliveryDate || delivery.date);

              return (
                <div
                  key={delivery.id || index}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2ebe5',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* Left Date Chip */}
                  <div
                    style={{
                      width: '56px',
                      height: '62px',
                      borderRadius: '12px',
                      background: '#f3f7f4',
                      border: '1px solid #e2ebe5',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      textAlign: 'center',
                      padding: '2px',
                    }}
                  >
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#0d5c3a', textTransform: 'uppercase' }}>
                      {dateParts.dayOfWeek}
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0c2340', lineHeight: 1 }}>
                      {dateParts.dayNum}
                    </span>
                    <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#6b7280' }}>
                      {dateParts.monthYear}
                    </span>
                  </div>

                  {/* Middle Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: '#4b5563', fontWeight: 600, marginBottom: '2px' }}>
                      <Clock3 size={13} color="#0d5c3a" />
                      <span>5:00 AM – 6:30 AM</span>
                    </div>

                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0c2340', marginBottom: '6px' }}>
                      Milk {delivery.actualMilk || 1}L {delivery.actualCurd > 0 ? `• Curd ${delivery.actualCurd}g` : '• Curd 0g'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {/* Status Pill */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: isDelivered ? '#dcfce7' : '#fef3c7',
                          color: isDelivered ? '#15803d' : '#b45309',
                          border: `1px solid ${isDelivered ? '#bbf7d0' : '#fde68a'}`,
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isDelivered ? '#15803d' : '#d97706' }} />
                        {isDelivered ? 'Delivered' : 'Pending'}
                      </span>

                      {/* Payment Badge */}
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: '#f1f5f9',
                          color: '#475569',
                        }}
                      >
                        Payment: {isPaid ? 'Paid' : 'Advance'}
                      </span>

                      {delivery.proofImage && (
                        <button
                          type="button"
                          onClick={() => setViewingProofPhoto({ url: delivery.proofImage, date: formatDeliveryDate(delivery.deliveryDate || delivery.date), delivery })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#0d5c3a',
                            background: '#e2f1ea',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '2px 7px',
                            cursor: 'pointer',
                          }}
                        >
                          <Camera size={11} /> Proof
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Chevron */}
                  <ChevronRight size={18} color="#9ca3af" />
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    // Desktop View
    return (
      <section className="customer-dashboard-card customer-history-card">
        <div className="customer-card-heading customer-history-heading">
          <div>
            <span className="customer-section-kicker">DELIVERY ACTIVITY</span>
            <h2>{title}</h2>
          </div>
          <span className="customer-history-count">{allCustomerDeliveries.length} total</span>
        </div>

        {/* Quick metrics bar on Deliveries page */}
        {limit === Infinity && (
          <div className="customer-deliveries-mobile-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={18} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.15rem', color: '#0f172a' }}>{allCustomerDeliveries.length}</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Total Drops</span>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.15rem', color: '#065f46' }}>{deliveredCount}</strong>
                <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700 }}>Delivered</span>
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock3 size={18} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.15rem', color: '#92400e' }}>{pendingCount}</strong>
                <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>Pending Drops</span>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.15rem', color: '#15803d' }}>100%</strong>
                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700 }}>Cold-Chain 4°C</span>
              </div>
            </div>
          </div>
        )}

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
          <div className="customer-deliveries-desktop-table table-responsive customer-history-table-wrap">
            <table className="dairy-table customer-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Milk</th>
                  <th>Curd</th>
                  {!hasPaidSubscription && <th>Amount</th>}
                  <th>Delivery</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeliveries.map((delivery, index) => (
                  <tr key={delivery.id || `${delivery.deliveryDate}-${index}`}>
                    <td><strong>{delivery.deliveryDate}</strong></td>
                    <td>{delivery.actualMilk} L</td>
                    <td>{delivery.actualCurd || 0} g</td>
                    {!hasPaidSubscription && <td>₹{delivery.totalAmount}</td>}
                    <td>
                      <span className={`customer-table-status${delivery.status === 'delivered' ? ' is-delivered' : ''}`}>
                        {delivery.status === 'delivered' ? '✓ Delivered' : 'Pending'}
                      </span>
                      {delivery.proofImage && (
                        <button
                          type="button"
                          onClick={() => setViewingProofPhoto({ url: delivery.proofImage, date: formatDeliveryDate(delivery.deliveryDate || delivery.date), delivery })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            color: '#059669',
                            marginLeft: '6px',
                            fontWeight: 700,
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            cursor: 'pointer',
                          }}
                          title="View doorstep delivery proof photo"
                        >
                          📷 Proof
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={`customer-table-status${delivery.paymentStatus === 'paid' ? ' is-delivered' : (delivery.paymentStatus === 'advance' ? ' is-pending' : ' is-unpaid')}`}>
                        {delivery.paymentStatus || 'Advance'}
                      </span>
                    </td>
                    <td>
                      {delivery.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUserHistory(delivery.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            transition: 'color 0.15s ease',
                          }}
                          title="Delete from your history"
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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

  const renderDashboardBookings = () => {
    const scheduled = customerBookings.filter((b) => b.status === 'scheduled');
    return (
      <section className="customer-dashboard-bookings-section" aria-label="Morning dairy orders">
        <div className="customer-dashboard-bookings-header">
          <div>
            <div className="customer-eyebrow-chip">
              <Sparkles size={13} color="#059669" />
              <span>MORNING DAIRY ORDERS & EXTRAS</span>
            </div>
            <h3>Order Extra Milk & Dairy</h3>
            <p>Schedule one-time morning deliveries or start a daily subscription.</p>
          </div>

          <div className="customer-bookings-header-actions">
            <button
              type="button"
              className="customer-btn-new-booking"
              onClick={() => openBookingModal(displayProducts[0] || null)}
            >
              <PlusCircle size={16} />
              <span>+ Order Products</span>
            </button>
            <button
              type="button"
              className="customer-btn-view-all-products"
              onClick={() => navigateToPage('products')}
            >
              <ShoppingBag size={16} />
              <span>Browse All Products ({displayProducts.length}) →</span>
            </button>
          </div>
        </div>

        {/* Quick 1-Click Product Ordering Shortcuts */}
        <div className="customer-quick-bookings-grid">
          {displayProducts.slice(0, 4).map((item) => (
            <div key={item._id || item.name} className="customer-quick-book-item">
              <div className="customer-quick-book-media">
                <img
                  src={getProductImage(item)}
                  alt={item.name}
                  loading="lazy"
                  onError={(e) => handleProductImgError(e, item)}
                />
              </div>
              <div className="customer-quick-book-details">
                <strong>{item.name}</strong>
                <span className="customer-quick-price">
                  ₹{item.price} <small>/ {item.unit || 'unit'}</small>
                </span>
                <span className="customer-quick-stock">● Chilled 4°C • Drop 6:30 AM</span>
              </div>
              <button
                type="button"
                className="customer-quick-book-btn"
                onClick={() => openBookingModal(item, 'one_time')}
              >
                Order
              </button>
            </div>
          ))}
        </div>

        {/* Active Scheduled Orders */}
        {scheduled.length > 0 ? (
          <div className="customer-active-bookings-wrap">
            <div className="customer-active-bookings-title">
              <Clock3 size={15} color="#059669" />
              <span>Your Scheduled Morning Orders ({scheduled.length})</span>
            </div>
            <div className="customer-bookings-cards-wrap">
              {scheduled.map((booking) => (
                <div key={booking.id} className="customer-booking-status-card">
                  <div className="customer-booking-status-info">
                    <span className="customer-booking-status-icon">
                      <Package size={17} color="#0d5c3a" />
                    </span>
                    <div>
                      <strong>{booking.quantity}x {booking.productName}</strong>
                      <small>
                        Scheduled Drop: <strong>{booking.date}</strong> (Before 6:30 AM)
                        {booking.totalAmount ? ` • ₹${booking.totalAmount}` : ''}
                      </small>
                    </div>
                  </div>
                  <div className="customer-booking-status-actions">
                    <span className="customer-badge-scheduled">Scheduled</span>
                    <button
                      type="button"
                      className="customer-btn-cancel-booking"
                      onClick={() => handleCancelBooking(booking.id)}
                      title="Cancel this order"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="customer-bookings-empty-hint">
            <Info size={15} color="#64748b" />
            <span>Need extra milk or curd tomorrow? Click any product above or <strong>+ Order Products</strong> to schedule delivery before 6:30 AM.</span>
          </div>
        )}
      </section>
    );
  };

  const renderProductsPage = () => {
    const categories = [
      { id: 'all', label: 'All Products' },
      { id: 'milk', label: 'Farm Milk' },
      { id: 'curd', label: 'Fresh Curd' },
      { id: 'ghee', label: 'A2 Desi Ghee' },
      { id: 'paneer', label: 'Artisanal Paneer' },
      { id: 'butter', label: 'Pure Butter' },
    ];

    const filtered = displayProducts.filter((p) => {
      const pCat = (p.category || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      const selected = selectedProductCategory.toLowerCase();
      const matchCat =
        selected === 'all' ||
        pCat === selected ||
        pCat.includes(selected) ||
        pName.includes(selected) ||
        (selected === 'milk' && (pCat.includes('milk') || pName.includes('milk'))) ||
        (selected === 'curd' && (pCat.includes('curd') || pName.includes('curd') || pName.includes('dahi'))) ||
        (selected === 'ghee' && (pCat.includes('ghee') || pName.includes('ghee'))) ||
        (selected === 'paneer' && (pCat.includes('paneer') || pName.includes('paneer')));

      const matchSearch =
        !productSearchQuery.trim() ||
        pName.includes(productSearchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(productSearchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });

    if (selectedProductDetails) {
      const p = selectedProductDetails;
      const img = getProductImage(p);
      const enriched = {
        ...p,
        image: img,
        imageUrl: img,
        numericPrice: Number(p.price) || 60,
        unit: p.unit || '1 Litre Glass Bottle',
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [img],
        initialFreq: p.initialFreq,
      };

      return (
        <div className="customer-product-details-view-container">
          <ProductDetailsView
            product={enriched}
            customer={currentCustomer}
            onBack={() => {
              setSelectedProductDetails(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDirectPlaceOrder={handleDirectOrder}
            onNavigateDashboard={() => {
              setSelectedProductDetails(null);
              navigateToPage('dashboard');
            }}
          />
        </div>
      );
    }

    return (
      <div className="customer-products-page">
        {/* Banner */}
        <div className="customer-products-banner">
          <div className="customer-products-banner-copy">
            <span className="customer-products-badge">
              <Sparkles size={14} color="#059669" />
              <span>FARM FRESH • 100% UNADULTERATED</span>
            </span>
            <h2>Pure Farm Dairy Store</h2>
            <p>
              Sourced from single-origin grass-fed indigenous cows. Chilled within 30 minutes to 4°C and delivered silently to your doorstep before 6:30 AM.
            </p>
          </div>
          <div className="customer-products-banner-stats">
            <div className="customer-stat-box">
              <strong>{displayProducts.length}</strong>
              <small>Live Products</small>
            </div>
            <div className="customer-stat-box">
              <strong>6:30 AM</strong>
              <small>Daily Drop</small>
            </div>
            <div className="customer-stat-box">
              <strong>4°C</strong>
              <small>Cold Chain</small>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="customer-products-toolbar">
          <div className="customer-products-search">
            <Search size={17} color="#64748b" />
            <input
              type="text"
              placeholder="Search farm fresh milk, curd, ghee, paneer..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
            />
            {productSearchQuery && (
              <button type="button" onClick={() => setProductSearchQuery('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="customer-products-cats">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`customer-cat-btn ${selectedProductCategory === c.id ? 'is-active' : ''}`}
                onClick={() => setSelectedProductCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="customer-products-grid">
          {filtered.length === 0 ? (
            <div className="customer-products-empty">
              <ShoppingBag size={42} color="#94a3b8" />
              <h4>No products found</h4>
              <p>Try searching with another keyword or select All Products.</p>
              <button
                type="button"
                className="customer-btn-secondary"
                onClick={() => {
                  setProductSearchQuery('');
                  setSelectedProductCategory('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filtered.map((product) => {
              const hasActiveBooking = customerBookings.some(
                (b) => b.productName === product.name && b.status === 'scheduled'
              );
              return (
                <div
                  key={product._id || product.id || product.name}
                  className="customer-product-card is-clickable"
                  onClick={() => {
                    setSelectedProductDetails(product);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  title="Click to view full product details"
                >
                  <div className="customer-product-img-wrap">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => handleProductImgError(e, product)}
                    />
                    <span className="customer-product-cat-tag">
                      {product.category?.toUpperCase() || 'DAIRY'}
                    </span>
                    <span className="customer-product-stock-tag">
                      <span className="stock-dot" /> Chilled 4°C
                    </span>
                  </div>

                  <div className="customer-product-body">
                    <div className="customer-product-header">
                      <h4>{product.name}</h4>
                      <div className="customer-product-pricing">
                        <span className="customer-price-val">₹{product.price}</span>
                        <span className="customer-unit-val">/ {product.unit || 'Unit'}</span>
                      </div>
                    </div>

                    <p className="customer-product-desc">
                      {product.description ||
                        'Farm-fresh pure raw dairy, unadulterated and delivered daily in eco-friendly sterilized glass bottles.'}
                    </p>

                    <div className="customer-product-perks">
                      <span>✓ Zero Preservatives</span>
                      <span>✓ Glass Bottled</span>
                      <span>✓ 6:30 AM Delivery</span>
                    </div>

                    {hasActiveBooking && (
                      <div className="customer-booked-badge">
                        <CheckCircle2 size={13} color="#059669" />
                        <span>Order Scheduled for Morning</span>
                      </div>
                    )}

                    <div className="customer-product-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="customer-btn-book"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductDetails({ ...product, initialFreq: 'one_time' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        title="View details and order once for morning delivery"
                      >
                        <ShoppingBag size={15} />
                        <span>Buy Once</span>
                      </button>
                      <button
                        type="button"
                        className="customer-btn-subscribe"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductDetails({ ...product, initialFreq: 'daily' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        title="View details and subscribe to daily delivery"
                      >
                        <CalendarDays size={15} />
                        <span>Subscribe Daily</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderBookingModal = () => {
    const isFullscreen = !isMobile;
    const prodImg = selectedBookingProduct ? getProductImage(selectedBookingProduct) : '/product-cow-milk.jpg';
    const prodPrice = Number(selectedBookingProduct?.price) || 60;
    const prodUnit = selectedBookingProduct?.unit || 'unit';
    const totalCalc = prodPrice * (Number(bookingForm.quantity) || 1);

    return (
      <div
        className={`modal-overlay customer-booking-modal-overlay ${isFullscreen ? 'is-fullscreen-web-overlay' : ''}`}
        onClick={() => setBookingModalOpen(false)}
      >
        <div
          className={`modal-content customer-booking-modal ${isFullscreen ? 'is-fullscreen-web' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="customer-booking-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="customer-booking-modal-icon">
                <ShoppingBag size={20} color="#0d5c3a" />
              </span>
              <div>
                <h3>{bookingForm.bookingType === 'one_time' ? 'One-Time Morning Order' : 'Daily Morning Subscription'}</h3>
                <small>Chilled 4°C delivery silently to your doorstep before 6:30 AM in sterilized glass bottles</small>
              </div>
            </div>
            <button
              type="button"
              className="customer-modal-close-btn"
              onClick={() => setBookingModalOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {bookingSuccessMsg ? (
            <div className="customer-booking-success-view">
              <CheckCircle2 size={56} color="#059669" />
              <h4>Order Confirmed! 🎉</h4>
              <p>{bookingSuccessMsg}</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="customer-btn-primary"
                  onClick={() => {
                    setBookingModalOpen(false);
                    navigateToPage('dashboard');
                  }}
                >
                  View in Dashboard
                </button>
                <button
                  type="button"
                  className="customer-btn-secondary"
                  onClick={() => setBookingModalOpen(false)}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitBookingModal} className={`customer-booking-form ${isFullscreen ? 'is-fullscreen-layout' : ''}`}>
              {isFullscreen ? (
                <div className="customer-fullscreen-grid">
                  {/* Left Column: Product Showcase & Summary */}
                  <div className="customer-fullscreen-left">
                    <div className="customer-fs-product-card">
                      <div className="customer-fs-img-wrap">
                        <img
                          src={prodImg}
                          alt={selectedBookingProduct?.name || 'Product'}
                          onError={(e) => handleProductImgError(e, selectedBookingProduct)}
                        />
                        <span className="customer-fs-stock-pill">● Chilled 4°C Raw Milk</span>
                      </div>
                      <div className="customer-fs-product-info">
                        <h4>{selectedBookingProduct?.name}</h4>
                        <div className="customer-fs-price-line">
                          <strong>₹{prodPrice}</strong>
                          <span>/ {prodUnit}</span>
                        </div>
                        <p>{selectedBookingProduct?.description || '100% farm-fresh, unadulterated pure raw dairy.'}</p>
                      </div>

                      <div className="customer-fs-perks">
                        <div className="customer-fs-perk-item">
                          <CheckCircle2 size={15} color="#059669" />
                          <span>Delivered before 6:30 AM</span>
                        </div>
                        <div className="customer-fs-perk-item">
                          <CheckCircle2 size={15} color="#059669" />
                          <span>Sterilized Glass Bottle Exchange</span>
                        </div>
                        <div className="customer-fs-perk-item">
                          <CheckCircle2 size={15} color="#059669" />
                          <span>Zero Additives or Preservatives</span>
                        </div>
                      </div>

                      {/* Live Calculation Box */}
                      <div className="customer-booking-summary-box customer-fs-summary">
                        <div className="summary-line">
                          <span>Unit Price:</span>
                          <strong>₹{prodPrice} / {prodUnit}</strong>
                        </div>
                        <div className="summary-line">
                          <span>Order Type:</span>
                          <strong style={{ color: '#059669' }}>
                            {bookingForm.bookingType === 'one_time' ? 'One-Time Order' : 'Daily Subscription'}
                          </strong>
                        </div>
                        <div className="summary-line">
                          <span>Quantity per Day:</span>
                          <strong>{bookingForm.quantity} unit(s)</strong>
                        </div>
                        <div className="summary-line summary-total">
                          <span>Total Amount:</span>
                          <strong>₹{totalCalc.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Order Configuration */}
                  <div className="customer-fullscreen-right">
                    {/* 1. Frequency Selection */}
                    <div className="customer-form-group">
                      <label style={{ fontSize: '0.86rem', fontWeight: 800 }}>Choose Order Frequency</label>
                      <div className="customer-booking-type-toggle customer-fs-toggle">
                        <button
                          type="button"
                          className={`booking-type-btn ${bookingForm.bookingType === 'one_time' ? 'is-active' : ''}`}
                          onClick={() => setBookingForm((prev) => ({ ...prev, bookingType: 'one_time' }))}
                        >
                          <ShoppingBag size={17} />
                          <div>
                            <strong>One-Time Order</strong>
                            <small>Single doorstep delivery tomorrow morning</small>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={`booking-type-btn ${bookingForm.bookingType === 'subscription' ? 'is-active' : ''}`}
                          onClick={() => setBookingForm((prev) => ({ ...prev, bookingType: 'subscription' }))}
                        >
                          <CalendarDays size={17} />
                          <div>
                            <strong>Daily Subscription</strong>
                            <small>Every morning before 6:30 AM drop</small>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* 2. Product Picker */}
                    <div className="customer-form-group">
                      <label>Selected Dairy Item</label>
                      <select
                        value={selectedBookingProduct?._id || selectedBookingProduct?.name || ''}
                        onChange={(e) => {
                          const found = displayProducts.find(
                            (p) => (p._id && p._id === e.target.value) || p.name === e.target.value
                          );
                          setSelectedBookingProduct(found || displayProducts[0]);
                        }}
                        className="customer-form-input"
                      >
                        {displayProducts.map((p) => (
                          <option key={p._id || p.name} value={p._id || p.name}>
                            {p.name} — ₹{p.price}/{p.unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Date & Quantity Row */}
                    <div className="customer-form-row">
                      <div className="customer-form-group" style={{ flex: 1.2 }}>
                        <label>
                          <Calendar size={14} />
                          <span>{bookingForm.bookingType === 'one_time' ? 'Delivery Date (Morning 6:30 AM)' : 'Subscription Start Date'}</span>
                        </label>
                        <input
                          type="date"
                          min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                          value={bookingForm.date}
                          onChange={(e) => setBookingForm((prev) => ({ ...prev, date: e.target.value }))}
                          className="customer-form-input"
                          required
                        />
                      </div>

                      <div className="customer-form-group" style={{ flex: 0.8 }}>
                        <label>Daily Quantity</label>
                        <div className="customer-qty-stepper">
                          <button
                            type="button"
                            onClick={() => setBookingForm((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                          >
                            -
                          </button>
                          <span>{bookingForm.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setBookingForm((prev) => ({ ...prev, quantity: prev.quantity + 1 }))}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 4. Drop Address Preview */}
                    <div className="customer-fs-address-card">
                      <div className="customer-fs-addr-head">
                        <MapPin size={16} color="#059669" />
                        <strong>Doorstep Delivery Destination</strong>
                      </div>
                      <p>{currentCustomer.address || 'Doorstep drop'}{currentCustomer.area ? `, ${currentCustomer.area}` : ''}</p>
                      <small>Customer: {currentCustomer.name} · Phone: {currentCustomer.mobile || 'Registered mobile'}</small>
                    </div>

                    {/* 5. Drop Notes */}
                    <div className="customer-form-group">
                      <label>Doorstep Delivery Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g., Leave in doorstep milk bag, ring bell once"
                        value={bookingForm.dropNotes}
                        onChange={(e) => setBookingForm((prev) => ({ ...prev, dropNotes: e.target.value }))}
                        className="customer-form-input"
                      />
                    </div>

                    {/* Actions */}
                    <div className="customer-booking-modal-actions customer-fs-actions">
                      <button
                        type="button"
                        className="customer-btn-secondary"
                        onClick={() => setBookingModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="customer-btn-primary customer-btn-fs-confirm"
                        disabled={bookingSubmitting}
                      >
                        {bookingSubmitting ? 'Confirming Order...' : `Confirm & Place Order (₹${totalCalc.toLocaleString('en-IN')})`}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Compact Mobile Modal */
                <>
                  <div className="customer-form-group">
                    <label>Select Product</label>
                    <select
                      value={selectedBookingProduct?._id || selectedBookingProduct?.name || ''}
                      onChange={(e) => {
                        const found = displayProducts.find(
                          (p) => (p._id && p._id === e.target.value) || p.name === e.target.value
                        );
                        setSelectedBookingProduct(found || displayProducts[0]);
                      }}
                      className="customer-form-input"
                    >
                      {displayProducts.map((p) => (
                        <option key={p._id || p.name} value={p._id || p.name}>
                          {p.name} — ₹{p.price}/{p.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="customer-form-group">
                    <label>Order Frequency</label>
                    <div className="customer-booking-type-toggle">
                      <button
                        type="button"
                        className={`booking-type-btn ${bookingForm.bookingType === 'one_time' ? 'is-active' : ''}`}
                        onClick={() => setBookingForm((prev) => ({ ...prev, bookingType: 'one_time' }))}
                      >
                        One-Time Order
                      </button>
                      <button
                        type="button"
                        className={`booking-type-btn ${bookingForm.bookingType === 'subscription' ? 'is-active' : ''}`}
                        onClick={() => setBookingForm((prev) => ({ ...prev, bookingType: 'subscription' }))}
                      >
                        Daily Subscription
                      </button>
                    </div>
                  </div>

                  <div className="customer-form-row">
                    <div className="customer-form-group" style={{ flex: 1.2 }}>
                      <label>
                        <Calendar size={14} />
                        <span>{bookingForm.bookingType === 'one_time' ? 'Delivery Date' : 'Starting From'}</span>
                      </label>
                      <input
                        type="date"
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm((prev) => ({ ...prev, date: e.target.value }))}
                        className="customer-form-input"
                        required
                      />
                    </div>

                    <div className="customer-form-group" style={{ flex: 0.8 }}>
                      <label>Quantity</label>
                      <div className="customer-qty-stepper">
                        <button
                          type="button"
                          onClick={() => setBookingForm((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                        >
                          -
                        </button>
                        <span>{bookingForm.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setBookingForm((prev) => ({ ...prev, quantity: prev.quantity + 1 }))}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="customer-form-group">
                    <label>Doorstep Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g., Leave in door bag, ring bell once"
                      value={bookingForm.dropNotes}
                      onChange={(e) => setBookingForm((prev) => ({ ...prev, dropNotes: e.target.value }))}
                      className="customer-form-input"
                    />
                  </div>

                  <div className="customer-booking-summary-box">
                    <div className="summary-line">
                      <span>Unit Price:</span>
                      <strong>₹{prodPrice} / {prodUnit}</strong>
                    </div>
                    <div className="summary-line">
                      <span>Quantity:</span>
                      <strong>{bookingForm.quantity}</strong>
                    </div>
                    <div className="summary-line summary-total">
                      <span>Total Amount:</span>
                      <strong>₹{totalCalc.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <div className="customer-booking-modal-actions">
                    <button
                      type="button"
                      className="customer-btn-secondary"
                      onClick={() => setBookingModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="customer-btn-primary"
                      disabled={bookingSubmitting}
                    >
                      {bookingSubmitting ? 'Confirming...' : 'Confirm & Place Order'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
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

      {/* Bookings & Products Section in Dashboard */}
      {renderDashboardBookings()}

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
    if (profileDetailView === 'account-details') viewTitle = 'Account Details';
    else if (profileDetailView === 'personal-info') viewTitle = 'Personal Details';
    else if (profileDetailView === 'delivery-address' || profileDetailView === 'delivery_address') viewTitle = 'Delivery Addresses';
    else if (profileDetailView === 'subscription') viewTitle = 'My Subscriptions';
    else if (profileDetailView === 'deliveries') viewTitle = 'Deliveries';
    else if (profileDetailView === 'wallet') viewTitle = 'Refund Wallet & Balance';
    else if (profileDetailView === 'pause') viewTitle = 'Cancel / Pause Schedule';
    else if (profileDetailView === 'quantity') viewTitle = 'Update Quantity';
    else if (profileDetailView === 'delivery-window') viewTitle = 'Morning Delivery Window';
    else if (profileDetailView === 'drop-instructions') viewTitle = 'Drop Instructions';
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
            onClick={backToProfile}
            aria-label="Back to Profile"
          >
            <ArrowLeft size={18} />
            <span>Profile</span>
          </button>
          <h2 className="mobile-detail-header-title">{viewTitle}</h2>
          <div className="mobile-detail-header-spacer" />
        </header>

        {/* 0. COMPREHENSIVE ACCOUNT DETAILS VIEW */}
        {profileDetailView === 'account-details' && (
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
                  <p className="mobile-detail-subtitle">Account ID: {customerId} · {subscriptionStatusLabel}</p>
                </div>
              </div>
            </div>

            {/* Account Credentials Card */}
            <div className="mobile-detail-card">
              <div className="mobile-detail-card-head">
                <div className="mobile-detail-card-icon is-green">
                  <UserRound size={18} />
                </div>
                <div>
                  <h4>Account Credentials</h4>
                  <p>Your verified customer ID and personal contact profile</p>
                </div>
              </div>

              <div className="customer-profile-details" style={{ marginTop: '14px' }}>
                <div><span>Account ID</span><strong>{customerId}</strong></div>
                <div><span>Full Name</span><strong>{customerName}</strong></div>
                <div><span>Mobile Phone</span><strong>{customerPhone}</strong></div>
                <div><span>WhatsApp</span><strong>{customerWhatsapp}</strong></div>
                <div className="is-wide"><span>Email Address</span><strong>{currentCustomer.email || user?.email || 'Not provided'}</strong></div>
                <div><span>Account Status</span><strong style={{ color: isPaused ? '#b45309' : '#059669' }}>{subscriptionStatusLabel}</strong></div>
                <div><span>Member Since</span><strong>{formatProfileDate(currentCustomer.createdAt || user?.createdAt)}</strong></div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="customer-profile-primary-button"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => openProfileDetail('personal-info')}
                >
                  <Edit3 size={15} />
                  <span>Edit Personal & Contact Info</span>
                </button>
              </div>
            </div>

            {/* Back Button */}
            <button
              type="button"
              className="customer-profile-secondary-button"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={backToProfile}
            >
              Back to Profile
            </button>
          </div>
        )}

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
                    onClick={backToProfile}
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

        {/* DELIVERY ADDRESS CARDS & CRUD MANAGEMENT VIEW */}
        {(profileDetailView === 'delivery-address' || profileDetailView === 'delivery_address') && (
          <div className="mobile-detail-body delivery-address-management-view">
            {/* Feedback alert toasts */}
            {addressSuccess && (
              <div className="mobile-profile-alert is-success" role="status" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                <CheckCircle2 size={18} color="#059669" />
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{addressSuccess}</span>
              </div>
            )}
            {addressError && (
              <div className="customer-profile-feedback is-error" role="alert" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                <AlertCircle size={18} color="#dc2626" />
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{addressError}</span>
              </div>
            )}

            {/* Header with "+ Add New Address" Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0c2340', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Doorstep Delivery Addresses</span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '999px' }}>
                    {savedAddresses.length} {savedAddresses.length === 1 ? 'Address' : 'Addresses'}
                  </span>
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  Manage multiple delivery points. Your active default address receives morning farm drops.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddAddress}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: 750,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Add New Address</span>
              </button>
            </div>

            {/* Loading Skeleton */}
            {addressesLoading && savedAddresses.length === 0 && (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#0d5c3a' }} />
                <p style={{ margin: 0, fontSize: '0.88rem' }}>Loading your delivery addresses...</p>
              </div>
            )}

            {/* Empty State */}
            {!addressesLoading && savedAddresses.length === 0 && (
              <div style={{ background: '#ffffff', borderRadius: '18px', border: '1.5px dashed #cbd5e1', padding: '36px 20px', textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <MapPin size={28} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>No Delivery Address Added Yet</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '360px', margin: '0 auto 18px' }}>
                  Add your home or apartment address to start receiving daily fresh pure milk directly at your door.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  style={{
                    background: '#0d5c3a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontWeight: 750,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  + Add Your First Address
                </button>
              </div>
            )}

            {/* 1. SAVED ADDRESS CARDS LIST */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '16px', marginBottom: '24px' }}>
              {savedAddresses.map((addr) => {
                const isDefault = Boolean(addr.isDefault);
                const isHome = (addr.type || 'home') === 'home';
                const isWork = addr.type === 'work';

                return (
                  <div
                    key={addr.id}
                    style={{
                      background: isDefault ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : '#ffffff',
                      border: isDefault ? '2px solid #059669' : '1.5px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '18px 20px',
                      boxShadow: isDefault ? '0 8px 24px rgba(5, 150, 105, 0.12)' : '0 4px 14px rgba(0, 0, 0, 0.04)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Card Header with Type Badge & Default Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              background: isHome ? '#dcfce7' : isWork ? '#dbeafe' : '#f3e8ff',
                              color: isHome ? '#166534' : isWork ? '#1e40af' : '#6b21a8',
                              border: isHome ? '1px solid #bbf7d0' : isWork ? '1px solid #bfdbfe' : '1px solid #e9d5ff',
                            }}
                          >
                            {isHome ? <Home size={13} /> : isWork ? <Briefcase size={13} /> : <MapPin size={13} />}
                            <span>{addr.label || (isHome ? 'Home' : isWork ? 'Work' : 'Other')}</span>
                          </span>
                        </div>

                        {isDefault ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 9px',
                              borderRadius: '999px',
                              background: '#059669',
                              color: '#ffffff',
                              fontSize: '0.70rem',
                              fontWeight: 800,
                              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                            }}
                          >
                            <BadgeCheck size={12} />
                            <span>Default Morning Drop</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #cbd5e1',
                              color: '#475569',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Check size={11} />
                            <span>Set as Default</span>
                          </button>
                        )}
                      </div>

                      {/* House / Flat & Street Details */}
                      <div style={{ marginBottom: '10px' }}>
                        {addr.flatNo && (
                          <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35, marginBottom: '2px' }}>
                            {addr.flatNo}
                          </div>
                        )}
                        <div style={{ fontSize: '0.92rem', color: '#334155', fontWeight: 650, lineHeight: 1.45 }}>
                          {addr.apartmentStreet}
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px' }}>
                          <strong>Area:</strong> {addr.area || 'Madhapur'}, {addr.city || 'Hyderabad'} {addr.pincode ? `– ${addr.pincode}` : ''}
                        </div>
                      </div>

                      {/* Landmark & Instructions */}
                      {addr.landmark && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', fontSize: '0.78rem', color: '#0d5c3a', fontWeight: 650, background: '#f0fdf4', padding: '6px 10px', borderRadius: '8px', marginBottom: '6px', border: '1px solid #d1fae5' }}>
                          <Navigation size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>Landmark: {addr.landmark}</span>
                        </div>
                      )}

                      {addr.deliveryInstructions && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', fontSize: '0.76rem', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                          <MessageSquare size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#64748b' }} />
                          <span>Note: {addr.deliveryInstructions}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '12px', borderTop: isDefault ? '1px solid #a7f3d0' : '1px solid #f1f5f9', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#0d5c3a',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: 750,
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>

                        {savedAddresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#ffffff',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>

                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          style={{
                            background: '#0d5c3a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: 750,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Check size={12} strokeWidth={2.5} />
                          <span>Deliver Here</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sync Notice Card */}
            <div className="mobile-detail-card mobile-detail-notice-card" style={{ marginTop: '16px' }}>
              <div className="mobile-detail-notice-item">
                <ShieldCheck size={22} className="mobile-detail-notice-icon is-green" />
                <div>
                  <strong>Instant Fleet & Admin Synchronization</strong>
                  <p>When you update or add your delivery address, our backend automatically synchronizes your records with the Admin dashboard and sends an instant route alert notification to your assigned delivery partner.</p>
                </div>
              </div>
            </div>

            {/* 3. FULL SCREEN ADD / EDIT ADDRESS VIEW */}
            {addressModalOpen && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99999,
                  background: '#f8fafc',
                  width: '100vw',
                  height: '100dvh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Sticky Fullscreen Top App Bar */}
                <header
                  style={{
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setAddressModalOpen(false)}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '10px',
                        width: '38px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0f172a',
                        cursor: 'pointer',
                      }}
                      aria-label="Back"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0c2340', letterSpacing: '-0.01em' }}>
                        {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                        Select your service location and update doorstep details
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddressModalOpen(false)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </header>

                {/* Scrollable Form Body */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    padding: '18px 18px 120px',
                  }}
                >
                  <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
                    {addressError && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '12px', fontSize: '0.86rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 650 }}>
                        <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                        <span>{addressError}</span>
                      </div>
                    )}

                    <form id="fullscreen-address-form" onSubmit={handleSaveAddress}>
                      {/* 1. Address Type Selection */}
                      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1.5px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                          Address Type
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                          {[
                            { id: 'home', label: 'Home', icon: Home },
                            { id: 'work', label: 'Work', icon: Briefcase },
                            { id: 'other', label: 'Other', icon: MapPin },
                          ].map((t) => {
                            const IconComp = t.icon;
                            const isSel = addressForm.type === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setAddressForm((f) => ({ ...f, type: t.id, label: t.id === 'other' ? (f.label === 'Home' || f.label === 'Work' ? '' : f.label) : t.label }))}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '11px 10px',
                                  borderRadius: '12px',
                                  border: isSel ? '2px solid #0d5c3a' : '1.5px solid #cbd5e1',
                                  background: isSel ? '#ecfdf5' : '#ffffff',
                                  color: isSel ? '#065f46' : '#475569',
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <IconComp size={16} />
                                <span>{t.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {addressForm.type === 'other' && (
                          <div style={{ marginTop: '12px' }}>
                            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              Custom Address Label
                            </label>
                            <input
                              type="text"
                              value={addressForm.label || ''}
                              placeholder="e.g. Vacation Villa, Parents' House, Farmhouse"
                              onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '0.88rem',
                                boxSizing: 'border-box',
                                outline: 'none',
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* 2. Primary Available Locations Dropdown */}
                      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1.5px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={16} color="#0d5c3a" />
                            <span>Service Area / Delivery Location *</span>
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                            {serviceableLocations.length} Verified Zones
                          </span>
                        </label>
                        <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#64748b' }}>
                          Choose your location from our verified morning delivery hubs:
                        </p>

                        <select
                          required
                          value={addressForm.area}
                          onChange={(e) => {
                            const val = e.target.value;
                            const matched = serviceableLocations.find((l) => l.name === val);
                            setAddressForm((f) => ({
                              ...f,
                              area: val,
                              pincode: matched?.pincode || f.pincode,
                              city: matched?.city || 'Hyderabad',
                            }));
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '2px solid #0d5c3a',
                            fontSize: '0.94rem',
                            fontWeight: 750,
                            background: '#f0fdf4',
                            color: '#064e3b',
                            boxSizing: 'border-box',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="" disabled>-- Select available delivery location --</option>
                          {serviceableLocations.map((loc) => (
                            <option key={loc.id || loc._id || loc.name} value={loc.name}>
                              {loc.name} {loc.pincode ? `(${loc.pincode})` : ''} — 5:00 AM - 7:30 AM Slot
                            </option>
                          ))}
                        </select>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '10px', fontSize: '0.78rem', color: '#166534' }}>
                          <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                          <span>
                            <strong>{addressForm.area || 'Selected Area'}:</strong> Active morning dairy route. Farm fresh milk delivered every dawn before 6:30 AM.
                          </span>
                        </div>
                      </div>

                      {/* 3. Address Specifics: Flat, Street, City & Pincode */}
                      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1.5px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                          Complete Doorstep Address
                        </label>

                        {/* Flat / House No */}
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            Flat / House No, Floor & Wing *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Flat 402, 4th Floor, Block B"
                            value={addressForm.flatNo}
                            onChange={(e) => setAddressForm((f) => ({ ...f, flatNo: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '11px 14px',
                              borderRadius: '10px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '0.90rem',
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                        </div>

                        {/* Apartment / Society / Street */}
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            Apartment, Society, Building or Street Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. My Home Bhooja, Silicon Valley High Street"
                            value={addressForm.apartmentStreet}
                            onChange={(e) => setAddressForm((f) => ({ ...f, apartmentStreet: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '11px 14px',
                              borderRadius: '10px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '0.90rem',
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                        </div>

                        {/* City and Pincode Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                              City
                            </label>
                            <input
                              type="text"
                              value={addressForm.city || 'Hyderabad'}
                              onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '11px 14px',
                                borderRadius: '10px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '0.90rem',
                                boxSizing: 'border-box',
                                outline: 'none',
                                background: '#f8fafc',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                              Pincode *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="500081"
                              value={addressForm.pincode}
                              onChange={(e) => setAddressForm((f) => ({ ...f, pincode: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '11px 14px',
                                borderRadius: '10px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '0.90rem',
                                boxSizing: 'border-box',
                                outline: 'none',
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 4. Landmark & Gate Instructions */}
                      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1.5px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                          Landmark / Gate Instructions
                        </label>
                        <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#64748b' }}>
                          Helps your early morning delivery agent locate your flat easily:
                        </p>
                        <input
                          type="text"
                          placeholder="e.g. Opposite Ratnadeep, Near Lift 2, Gate Security Code 4490"
                          value={addressForm.landmark}
                          onChange={(e) => setAddressForm((f) => ({ ...f, landmark: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '10px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.90rem',
                            boxSizing: 'border-box',
                            outline: 'none',
                            marginBottom: '8px',
                          }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {['Opposite Supermarket', 'Near Gate 2', 'Beside Park', 'Lift 3 Lobby'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setAddressForm((f) => ({ ...f, landmark: f.landmark ? `${f.landmark}, ${tag}` : tag }))}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '4px 9px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 5. Drop Instructions */}
                      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1.5px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                          Early Morning Drop Instructions (Optional)
                        </label>
                        <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#64748b' }}>
                          Preferences for silent dawn drop between 5:00 AM – 7:30 AM:
                        </p>
                        <input
                          type="text"
                          placeholder="e.g. Hang in milk bag on door handle, don't ring bell"
                          value={addressForm.deliveryInstructions}
                          onChange={(e) => setAddressForm((f) => ({ ...f, deliveryInstructions: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '10px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.90rem',
                            boxSizing: 'border-box',
                            outline: 'none',
                            marginBottom: '8px',
                          }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {['Hang on door hook', 'Silent drop (No bell)', 'Ring bell once', 'Leave on shoe rack'].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setAddressForm((f) => ({ ...f, deliveryInstructions: f.deliveryInstructions ? `${f.deliveryInstructions}. ${chip}` : chip }))}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '4px 9px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              + {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 6. Default Address Toggle */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px', background: '#ffffff', padding: '14px 16px', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                        <input
                          type="checkbox"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))}
                          style={{ width: '20px', height: '20px', accentColor: '#0d5c3a', cursor: 'pointer' }}
                        />
                        <div>
                          <span style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                            Set as active default address for morning milk deliveries
                          </span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                            Daily scheduled farm bottles will be routed directly to this address.
                          </span>
                        </div>
                      </label>
                    </form>
                  </div>
                </div>

                {/* Sticky Bottom Action Bar */}
                <footer
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 -4px 18px rgba(0, 0, 0, 0.08)',
                    zIndex: 100000,
                  }}
                >
                  <div style={{ maxWidth: '640px', width: '100%', display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setAddressModalOpen(false)}
                      style={{
                        flex: 0.35,
                        padding: '13px 18px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontWeight: 750,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      form="fullscreen-address-form"
                      disabled={addressSaving}
                      style={{
                        flex: 0.65,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '13px 22px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.94rem',
                        cursor: addressSaving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(13, 92, 58, 0.28)',
                      }}
                    >
                      {addressSaving ? (
                        <>
                          <RefreshCw size={17} className="animate-spin" />
                          <span>Saving & Notifying...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={17} />
                          <span>{editingAddressId ? 'Update Delivery Address' : 'Save & Set Address'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </footer>
              </div>
            )}
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
                    {isPaused ? 'SUBSCRIPTION PAUSED' : currentCustomer.subscription?.status === 'expired' ? 'SUBSCRIPTION EXPIRED' : currentCustomer.subscription?.status === 'active' ? 'PREPAID SUBSCRIPTION' : 'NO ACTIVE SUBSCRIPTION'}
                  </span>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>Daily Morning Plan</h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                    {hasPaidSubscription
                      ? `${currentCustomer.subscription?.status === 'expired' ? 'Ended' : 'Paid through'} ${subscriptionThrough?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) || 'date unavailable'}.`
                      : isPaused ? 'Scheduled pause active.' : 'Choose a plan and complete payment to start deliveries.'}
                  </p>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    {isPaused ? (
                      <button
                        type="button"
                        disabled={subToggling}
                        onClick={() => handleToggleCustomerSub(allCustomerSubscriptions[0], 'start')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          background: '#059669',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 750,
                          fontSize: '0.82rem',
                          cursor: subToggling ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <PlayCircle size={15} />
                        <span>{subToggling ? 'Updating...' : 'Start Subscription'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={subToggling}
                        onClick={() => handleToggleCustomerSub(allCustomerSubscriptions[0], 'stop')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1.5px solid #fde68a',
                          fontWeight: 750,
                          fontSize: '0.82rem',
                          cursor: subToggling ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <PauseCircle size={15} />
                        <span>{subToggling ? 'Updating...' : 'Stop Subscription'}</span>
                      </button>
                    )}
                  </div>
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

        {/* 3. DELIVERIES VIEW IN PROFILE */}
        {profileDetailView === 'deliveries' && (
          <div className="mobile-detail-body">
            {/* Quick Metrics */}
            <div className="mobile-detail-metrics-grid">
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num">{allCustomerDeliveries.length || totalDeliveries}</span>
                <span className="mobile-detail-metric-lbl">Total Drops</span>
              </div>
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#059669' }}>
                  {allCustomerDeliveries.filter((d) => d.status === 'delivered').length}
                </span>
                <span className="mobile-detail-metric-lbl">Delivered</span>
              </div>
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#b45309' }}>
                  {allCustomerDeliveries.filter((d) => d.status !== 'delivered').length}
                </span>
                <span className="mobile-detail-metric-lbl">Pending Drops</span>
              </div>
              <div className="mobile-detail-metric-card">
                <span className="mobile-detail-metric-num" style={{ color: '#16a34a' }}>100%</span>
                <span className="mobile-detail-metric-lbl">On-Time</span>
              </div>
            </div>

            {/* Deliveries Cards Stream */}
            <div className="mobile-detail-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h4 className="mobile-detail-subheading" style={{ margin: 0 }}>
                  Doorstep Deliveries & Logs
                </h4>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '999px' }}>
                  {allCustomerDeliveries.length} Total
                </span>
              </div>

              {allCustomerDeliveries.length === 0 ? (
                <div className="customer-empty-history" style={{ padding: '24px 12px' }}>
                  <Truck size={32} style={{ color: '#10b981', margin: '0 auto 12px' }} />
                  <strong>Your delivery history will appear here</strong>
                  <p>Your first delivery is scheduled for tomorrow morning between 5:00 AM and 6:30 AM.</p>
                </div>
              ) : (
                <div className="mobile-detail-deliveries-list">
                  {allCustomerDeliveries.map((delivery, index) => {
                    const isDelivered = delivery.status === 'delivered';
                    const isPaid = delivery.paymentStatus === 'paid';
                    const isAdvance = delivery.paymentStatus === 'advance' || !delivery.paymentStatus;

                    const formattedDetailDate = formatDeliveryDate(delivery.deliveryDate || delivery.date);

                    return (
                        <div
                          key={delivery.id || `${delivery.deliveryDate}-${index}`}
                          className="customer-delivery-mobile-card"
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '14px 16px',
                            marginBottom: '10px',
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Header Row: Date & Status */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: isDelivered ? '#ecfdf5' : '#fffbeb',
                                  color: isDelivered ? '#059669' : '#b45309',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Calendar size={16} />
                              </div>
                              <div>
                                <strong style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a', display: 'block', lineHeight: 1.25 }}>
                                  {formattedDetailDate}
                                </strong>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Morning Slot · 5:00 AM – 6:30 AM</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 9px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: isDelivered ? '#ecfdf5' : '#fffbeb',
                                  color: isDelivered ? '#047857' : '#92400e',
                                  border: isDelivered ? '1px solid #a7f3d0' : '1px solid #fde68a',
                                }}
                              >
                                {isDelivered ? <Check size={12} strokeWidth={2.5} /> : <Clock3 size={12} />}
                                <span>{isDelivered ? 'Delivered' : 'Pending'}</span>
                              </span>

                              {delivery.id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUserHistory(delivery.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.15s ease',
                                  }}
                                  title="Delete from history"
                                  aria-label="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Stats Row: Milk, Curd, Payment */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '8px',
                              background: '#f8fafc',
                              border: '1px solid #f1f5f9',
                              padding: '10px 14px',
                              borderRadius: '10px',
                            }}
                          >
                            <div>
                              <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Milk</span>
                              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0d5c3a' }}>
                                {delivery.actualMilk || 0} L
                              </span>
                            </div>

                            <div>
                              <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Curd</span>
                              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                                {delivery.actualCurd >= 1000 ? `${(delivery.actualCurd / 1000).toFixed(delivery.actualCurd % 1000 === 0 ? 0 : 1)} kg` : `${delivery.actualCurd || 0} g`}
                              </span>
                            </div>

                            <div>
                              <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payment</span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: isPaid ? '#dcfce7' : isAdvance ? '#fef9c3' : '#fee2e2',
                                  color: isPaid ? '#15803d' : isAdvance ? '#854d0e' : '#b91c1c',
                                }}
                              >
                                {isPaid ? 'Paid' : isAdvance ? 'Advance' : (delivery.paymentStatus || 'Advance')}
                              </span>
                            </div>
                          </div>

                          {/* Proof photo section if available */}
                          {delivery.proofImage && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingTop: '10px',
                                marginTop: '10px',
                                borderTop: '1px solid #f1f5f9',
                              }}
                            >
                              <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <ShieldCheck size={14} color="#059669" /> Doorstep proof verified
                              </span>
                              <button
                                type="button"
                                onClick={() => setViewingProofPhoto({ url: delivery.proofImage, date: formattedDetailDate, delivery })}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '5px 12px',
                                  borderRadius: '8px',
                                  background: '#f0fdf4',
                                  color: '#047857',
                                  border: '1px solid #bbf7d0',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <Camera size={13} />
                                <span>View Photo</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
              {hasPaidSubscription ? (
                <>
                  <div className="mobile-detail-balance-eyebrow">
                    <Wallet size={16} /> <span>PREPAID SUBSCRIPTION</span>
                  </div>
                  <div className="mobile-detail-balance-large" style={{ fontSize: '1.35rem' }}>
                    Active until {subscriptionThrough?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'renewal required'}
                  </div>
                  <p className="mobile-detail-balance-sub">Your scheduled deliveries are covered by your subscription.</p>
                </>
              ) : (
                <>
                  <div className="mobile-detail-balance-eyebrow">
                    <Wallet size={16} /> <span>CURRENT OUTSTANDING BALANCE</span>
                  </div>
                  <div className="mobile-detail-balance-large">₹{balance.toLocaleString('en-IN')}</div>
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
                </>
              )}
            </div>

            {/* Financial Breakdown */}
            {!hasPaidSubscription && <div className="mobile-detail-card">
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
            </div>}

            {/* Instant UPI Payment Box */}
            {!hasPaidSubscription && <div className="mobile-detail-card">
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
            </div>}

            {/* Transaction Ledger Table */}
            {!hasPaidSubscription && <div className="mobile-detail-card">
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
            </div>}
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

        {profileDetailView === 'drop-instructions' && (
          <div className="mobile-detail-body">
            {profileMessage && (
              <div className="mobile-profile-alert is-success" role="status" style={{ marginBottom: '14px' }}>
                <CheckCircle2 size={16} />
                <span>{profileMessage}</span>
              </div>
            )}
            {profileError && (
              <div className="customer-profile-feedback is-error" role="alert" style={{ marginBottom: '14px' }}>
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            <div className="mobile-detail-card mobile-detail-highlight-card">
              <div className="mobile-detail-plan-banner">
                <div>
                  <span className="mobile-detail-badge is-emerald">DOORSTEP DROP PREFERENCES</span>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '1.18rem', fontWeight: 800 }}>Morning Drop Instructions</h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                    Real-time instructions for your 5:00 AM – 6:30 AM morning delivery specialist.
                  </p>
                </div>
                <ShieldCheck size={28} style={{ color: '#059669' }} />
              </div>
            </div>

            <form className="mobile-detail-card" onSubmit={saveProfile}>
              <h4 className="mobile-detail-subheading" style={{ marginBottom: '8px' }}>Delivery Partner Instructions</h4>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                Tap quick notes below or type your custom gate code, bag location, or doorstep instructions:
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {[
                  'Leave in dairy bag on door hook',
                  'Silent drop (Do not ring doorbell)',
                  'Ring bell once after drop',
                  'Place inside gate grill',
                  'Leave on shoe rack by door',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setProfileForm((cur) => {
                        const existing = (cur.landmark || '').trim();
                        if (existing.includes(tag)) return cur;
                        return {
                          ...cur,
                          landmark: existing ? `${existing}. ${tag}` : tag,
                        };
                      });
                    }}
                    style={{
                      background: (profileForm.landmark || '').includes(tag) ? '#eef6f0' : '#f8fafc',
                      border: (profileForm.landmark || '').includes(tag) ? '1.5px solid #0d5c3a' : '1px solid #cbd5e1',
                      color: (profileForm.landmark || '').includes(tag) ? '#0d5c3a' : '#475569',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 750, color: '#1e293b', marginBottom: '6px' }}>
                  Doorstep / Gate Instructions:
                </span>
                <textarea
                  rows={4}
                  value={profileForm.landmark || ''}
                  onChange={(e) => setProfileForm((cur) => ({ ...cur, landmark: e.target.value }))}
                  placeholder="e.g. Please leave on the hook beside flat door. Gate code is #1042. Silent drop, please do not ring doorbell."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={profileSaving}
                className="customer-profile-primary-button"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  fontWeight: 750,
                  fontSize: '0.92rem',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{profileSaving ? 'Saving in Real Time...' : 'Save Drop Instructions'}</span>
              </button>
            </form>

            <div className="mobile-detail-card mobile-detail-notice-card">
              <div className="mobile-detail-notice-item">
                <Clock3 size={20} className="mobile-detail-notice-icon is-blue" />
                <div>
                  <strong>Live Sync with Morning Route Partner</strong>
                  <p>Updates save instantly and sync to your assigned driver's route roster for the morning drop.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="customer-profile-secondary-button"
              style={{ width: '100%', marginTop: '4px' }}
              onClick={backToProfile}
            >
              Back to Profile
            </button>
          </div>
        )}

        {/* 8. 24/7 HELPLINE & SUPPORT */}
        {profileDetailView === 'support' && (
          <div className="mobile-detail-body">
            {/* Feedback Toast */}
            {supportSuccessMsg && (
              <div
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
                  marginBottom: '16px',
                  boxShadow: '0 2px 6px rgba(5,150,105,0.1)',
                }}
              >
                <CheckCircle2 size={18} color="#059669" />
                <span>{supportSuccessMsg}</span>
              </div>
            )}

            {/* Direct Contact Cards */}
            <div className="mobile-detail-card mobile-detail-highlight-card">
              <div className="mobile-detail-plan-banner">
                <div>
                  <span className="mobile-detail-badge is-emerald">24/7 PRIORITY SUPPORT</span>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>Customer Care & Helplines</h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                    Direct connection to Dispatch Operations, Morning Delivery Route, and Admin desk.
                  </p>
                </div>
                <Headphones size={28} style={{ color: '#059669' }} />
              </div>
            </div>

            {/* Contact Action Channels */}
            <div className="mobile-detail-channels-grid">
              <a
                href={`https://wa.me/919876543210?text=Hi%20Natural%20Milk%20Dairy%2C%20I%20am%20customer%20${encodeURIComponent(customerName)}%20(ID%3A%20${customerId}).%20I%20need%20assistance%20regarding%3A`}
                target="_blank"
                rel="noreferrer"
                className="mobile-detail-channel-card is-wa"
              >
                <div className="mobile-detail-channel-icon is-emerald">
                  <MessageCircle size={22} />
                </div>
                <strong>WhatsApp Priority Chat</strong>
                <span>Instant response in 5 mins</span>
              </a>

              <a href="tel:+919876543210" className="mobile-detail-channel-card is-call">
                <div className="mobile-detail-channel-icon is-green">
                  <PhoneCall size={22} />
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

            {/* Text a Message to Admin Form */}
            <div
              className="mobile-detail-card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: isMobile ? '16px' : '22px 24px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                marginTop: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  <MessageSquare size={19} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Text a Message to Admin
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Sends an immediate notification to the Admin Dashboard & Dispatch Supervisor.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendAdminCustomerMessage}>
                {/* Topic / Issue Category Chips */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Select Topic / Issue Type
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'Morning Delivery Delay', label: '🚚 Delivery Delay / Timing' },
                      { id: 'Milk or Bottle Quality', label: '🥛 Milk / Glass Bottle' },
                      { id: 'Subscription & Vacation', label: '📅 Subscription / Pause' },
                      { id: 'Payment & Billing', label: '💰 Payment / Refund Wallet' },
                      { id: 'Doorstep Address Change', label: '📍 Address Relocation' },
                      { id: 'General Inquiry', label: '💬 General Inquiry' },
                    ].map((cat) => {
                      const isSelected = supportCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSupportCategory(cat.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: isSelected ? 800 : 600,
                            background: isSelected ? '#e0f2fe' : '#f8fafc',
                            color: isSelected ? '#0369a1' : '#475569',
                            border: `1px solid ${isSelected ? '#38bdf8' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Urgency Level Selector */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Urgency Level
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'normal', label: 'Normal', desc: 'Standard support' },
                      { id: 'high', label: 'High Priority', desc: 'Needs attention today' },
                      { id: 'urgent', label: '🚨 Urgent', desc: 'Immediate issue' },
                    ].map((p) => {
                      const isSelected = supportPriority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSupportPriority(p.id)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: `1.5px solid ${isSelected ? (p.id === 'urgent' ? '#ef4444' : '#0284c7') : '#e2e8f0'}`,
                            background: isSelected ? (p.id === 'urgent' ? '#fef2f2' : '#f0f9ff') : '#ffffff',
                            color: isSelected ? (p.id === 'urgent' ? '#dc2626' : '#0369a1') : '#475569',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{p.label}</div>
                          <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '2px' }}>{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message Textarea */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      Describe your message or issue for Admin
                    </label>
                    <span style={{ fontSize: '0.72rem', color: supportText.length > 450 ? '#dc2626' : '#94a3b8' }}>
                      {supportText.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    required
                    value={supportText}
                    onChange={(e) => setSupportText(e.target.value)}
                    placeholder="Enter message for Admin desk (e.g. Please check my morning delivery bottle count or delivery timing)..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#0284c7'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={supportLoading || !supportText.trim()}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: supportText.trim() ? '#0284c7' : '#94a3b8',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: supportLoading || !supportText.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: supportText.trim() ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Send size={16} />
                  <span>{supportLoading ? 'Sending to Admin...' : 'Send Message to Admin'}</span>
                </button>
              </form>
            </div>

            {/* Recent Sent Messages to Admin Log */}
            {supportHistory.length > 0 && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: isMobile ? '16px' : '20px 22px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  marginTop: '16px',
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  Your Sent Messages to Admin ({supportHistory.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {supportHistory.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                            {item.category}
                          </span>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: item.priority === 'urgent' ? '#fee2e2' : item.priority === 'high' ? '#fef3c7' : '#e0f2fe',
                              color: item.priority === 'urgent' ? '#991b1b' : item.priority === 'high' ? '#92400e' : '#0369a1',
                            }}
                          >
                            {item.priority?.toUpperCase()}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                        {item.text}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>
                        <CheckCheck size={13} />
                        <span>Delivered to Admin Dashboard</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    onClick={backToProfile}
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

  const renderCustomerProfileMobile = () => {
    const customerInitial = (currentCustomer.name || user?.name || 'N').charAt(0).toUpperCase();
    const customerName = currentCustomer.name || user?.name || 'Naveen Kumar';
    const customerPhone = currentCustomer.mobile || user?.mobile || '7702233931';
    const customerId = currentCustomer.customerId || user?.customerId || 'CUST-101';
    const totalDeliveries = customerDeliveries.length || ledgerEntries.filter((e) => e.type === 'delivery').length || 9;

    return (
      <div className="customer-profile-mobile" style={{ padding: '4px 0 24px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Header: Logo + Title + Bell with red badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid #eef2f6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/logo.jpg"
              alt="Natural Milk Dairy"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid #0d5c3a',
                boxShadow: '0 2px 6px rgba(13,92,58,0.15)',
              }}
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
            />
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0d5c3a', letterSpacing: '0.02em', lineHeight: 1.15 }}>
                NATURAL MILK DAIRY
              </div>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#597361', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                NATURAL • PURE • HEALTHY
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            aria-label="Notifications"
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#f3f7f4',
              border: '1px solid #e2ebe5',
              color: '#0d5c3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={19} />
            <span
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#e53935',
              }}
            />
          </button>
        </div>

        {/* Title & Subtitle */}
        <div style={{ marginTop: '2px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0c2340', margin: '0 0 4px 0' }}>
            My Profile
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Manage your account, deliveries and preferences.
          </p>
        </div>

        {/* User Card: Avatar circle, Naveen Kumar, ID: CUST-101, 7702233931, Active green badge, Chevron > */}
        <div
          onClick={() => openProfileDetail('account-details')}
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#e2f1ea',
                color: '#0d5c3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 900,
                border: '2px solid #86efac',
                flexShrink: 0,
              }}
            >
              {customerInitial}
            </div>
            <div>
              <h3 style={{ margin: '0 0 2px 0', fontSize: '1.02rem', fontWeight: 900, color: '#0c2340' }}>
                {customerName}
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span>ID: {customerId}</span>
                <span>•</span>
                <span>{customerPhone}</span>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ecfdf5',
                  color: '#059669',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Active
              </span>
            </div>
          </div>
          <ChevronRight size={20} color="#9ca3af" />
        </div>

        {/* Group 1: Account & Billing */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0d5c3a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
            Account & Billing
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Account Details */}
            <div
              onClick={() => openProfileDetail('account-details')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f3f7f4', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserRound size={17} />
                </div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>Account Details</span>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            <div style={{ height: '1px', background: '#f1f5f9' }} />

            {/* Deliveries */}
            <div
              onClick={() => navigateToPage('deliveries')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={17} />
                </div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>Deliveries</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>
                  {totalDeliveries} Drops
                </span>
                <ChevronRight size={18} color="#9ca3af" />
              </div>
            </div>

            <div style={{ height: '1px', background: '#f1f5f9' }} />

            {/* Subscription Payment */}
            <div
              onClick={() => openProfileDetail('subscription')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={17} />
                </div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>Subscription Payment</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0d5c3a', background: '#e2f1ea', padding: '2px 8px', borderRadius: '10px' }}>
                  Prepaid
                </span>
                <ChevronRight size={18} color="#9ca3af" />
              </div>
            </div>

            <div style={{ height: '1px', background: '#f1f5f9' }} />

            {/* Addresses */}
            <div
              onClick={() => openProfileDetail('delivery-address')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f3f7f4', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={17} />
                </div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>Addresses</span>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>
          </div>
        </div>

        {/* Group 2: Support & Help */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0d5c3a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
            Support & Help
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Customer Care & Helplines */}
            <div
              onClick={() => openProfileDetail('support')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f3f7f4', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Headphones size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>
                    Customer Care & Helplines
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    WhatsApp chat & 24/7 priority support
                  </span>
                </div>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            <div style={{ height: '1px', background: '#f1f5f9' }} />

            {/* FAQs */}
            <div
              onClick={() => openProfileDetail('support')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f3f7f4', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HelpCircle size={17} />
                </div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>FAQs</span>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>
          </div>
        </div>

        {/* Group 3: App Settings */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0d5c3a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
            App Settings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Notifications */}
            <div
              onClick={() => setIsNotificationOpen(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f3f7f4', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={17} />
                </div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>Notifications</span>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            <div style={{ height: '1px', background: '#f1f5f9' }} />

            {/* Language */}
            <div
              onClick={() => alert('Language is set to English (India). More regional languages coming soon!')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f3f7f4', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={17} />
                </div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>Language</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>English (India)</span>
                <ChevronRight size={18} color="#9ca3af" />
              </div>
            </div>
          </div>
        </div>

        {/* Group 4: Account Actions */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #fee2e2',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(220,38,38,0.03)',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
            Account Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Log out (red) */}
            <div
              onClick={() => {
                if (window.confirm('Are you sure you want to log out?')) {
                  logout();
                }
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOut size={17} />
                </div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#dc2626' }}>Log out</span>
              </div>
              <ChevronRight size={18} color="#fca5a5" />
            </div>

            <div style={{ height: '1px', background: '#fef2f2' }} />

            {/* Delete Account (red) */}
            <div
              onClick={() => setShowDeleteModal(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={17} />
                </div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#dc2626' }}>Delete Account</span>
              </div>
              <ChevronRight size={18} color="#fca5a5" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModernEditProfile = () => {
    const customerInitial = (profileForm.name || currentCustomer.name || user?.name || 'C').charAt(0).toUpperCase();
    const customerId = currentCustomer.customerId || user?.customerId || 'CUST-101';
    const handleTag = profileForm.username || (profileForm.name ? `@${profileForm.name.toLowerCase().replace(/\s+/g, '')}` : `@${customerId.toLowerCase()}`);

    return (
      <div className="modern-profile-container">
        {/* Screen 2 Header: Back Arrow, "Edit Profile", Green Checkmark (Save) */}
        <div className="modern-profile-header">
          <button
            type="button"
            className="modern-profile-header-btn"
            onClick={backToProfile}
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

          {/* 8. Special Drop Instructions & Landmark */}
          <div className="modern-edit-field">
            <label className="modern-edit-label">Special Drop Instructions</label>
            <div className="modern-edit-input-container">
              <input
                type="text"
                className="modern-edit-input"
                placeholder="Leave outside flat in milk bag, don't ring bell"
                value={profileForm.landmark ?? ''}
                onChange={(e) => setProfileForm((cur) => ({ ...cur, landmark: e.target.value }))}
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

  const renderCustomerProfileWeb = () => {
    const customerInitial = (currentCustomer.name || user?.name || 'C').charAt(0).toUpperCase();
    const customerName = currentCustomer.name || user?.name || 'Customer';
    const customerPhone = currentCustomer.mobile || user?.mobile || 'Not provided';
    const customerEmail = currentCustomer.email || user?.email || 'Not provided';
    const customerId = currentCustomer.customerId || user?.customerId || 'CUST-101';
    const totalDeliveries = customerDeliveries.length || ledgerEntries.filter((e) => e.type === 'delivery').length;

    return (
      <div className="profile-desktop-wrapper">
        {/* Feedback Messages */}
        {profileMessage && (
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
            <span>{profileMessage}</span>
          </div>
        )}

        {/* 1. Desktop Profile Hero Banner */}
        <div className="profile-desktop-hero">
          <div className="profile-hero-left">
            <div className="profile-hero-avatar">
              {customerInitial}
            </div>
            <div className="profile-hero-info">
              <div className="profile-hero-name-row">
                <h2 className="profile-hero-name">{customerName}</h2>
                <span className="profile-hero-handle">ID: {customerId}</span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: isPaused ? '#fef3c7' : '#ecfdf5',
                    color: isPaused ? '#92400e' : '#065f46',
                    border: `1px solid ${isPaused ? '#fde68a' : '#a7f3d0'}`,
                  }}
                >
                  {isPaused ? '⏸ Delivery Paused' : '✓ Active Subscription'}
                </span>
              </div>
              <div className="profile-hero-meta">
                <span className="profile-hero-meta-item">
                  <Phone size={14} color="#059669" /> {customerPhone}
                </span>
                {customerEmail && customerEmail !== 'Not provided' && (
                  <span className="profile-hero-meta-item">
                    <Mail size={14} color="#059669" /> {customerEmail}
                  </span>
                )}
                <span className="profile-hero-meta-item">
                  <MapPin size={14} color="#059669" /> {address || currentCustomer.area || 'Madhapur'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => openProfileDetail('support')}
              style={{
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 0.15s ease',
              }}
            >
              <Headphones size={16} />
              <span>Help & Support</span>
            </button>
            <button
              type="button"
              className="profile-hero-btn"
              onClick={() => openProfileDetail('personal-info')}
            >
              <Edit2 size={16} />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* 2. Customer Data Responsive Cards Grid */}
        <div className="profile-desktop-grid">
          {/* Card 1: Daily Milk Subscription */}
          <div className="profile-desktop-card">
            <div>
              <div className="profile-card-header">
                <div>
                  <h3 className="profile-card-title">My Milk Subscription</h3>
                  <p className="profile-card-desc">Pure A2 Gir Cow & Buffalo Milk Plan</p>
                </div>
                <div className="profile-card-icon-wrap">
                  <Milk size={22} />
                </div>
              </div>
              <div className="profile-card-body">
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Daily Quantity</span>
                  <span className="profile-card-data-val">{milkQuantity} {milkUnit} Fresh Milk</span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Delivery Schedule</span>
                  <span className="profile-card-data-val" style={{ textTransform: 'capitalize' }}>{deliveryFrequency}</span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Current Status</span>
                  <span className="profile-card-data-val" style={{ color: isPaused ? '#d97706' : '#059669' }}>
                    {isPaused ? 'Paused for Vacation' : 'Active Doorstep Drop'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="profile-card-action-btn"
                onClick={isPaused ? handleRestartDelivery : () => onOpenPauseModal?.(currentCustomer)}
              >
                {isPaused ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
                <span>{isPaused ? 'Restart' : 'Pause / Vacation'}</span>
              </button>
              <button
                type="button"
                className="profile-card-action-btn"
                onClick={() => onOpenTempQtyModal?.(currentCustomer)}
              >
                <RefreshCw size={15} />
                <span>Change Qty</span>
              </button>
            </div>
          </div>

          {/* Card 2: Doorstep Delivery Address */}
          <div className="profile-desktop-card">
            <div>
              <div className="profile-card-header">
                <div>
                  <h3 className="profile-card-title">Delivery Address</h3>
                  <p className="profile-card-desc">Morning delivery doorstep destination</p>
                </div>
                <div className="profile-card-icon-wrap">
                  <MapPin size={22} />
                </div>
              </div>
              <div className="profile-card-body">
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">House / Flat</span>
                  <span className="profile-card-data-val">{currentCustomer.address || 'Not specified'}</span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Area / Locality</span>
                  <span className="profile-card-data-val">{currentCustomer.area || 'Madhapur'}</span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Drop Notes</span>
                  <span className="profile-card-data-val">{currentCustomer.landmark || 'Deliver at doorstep milk bag'}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="profile-card-action-btn"
              onClick={() => openProfileDetail('delivery-address')}
            >
              <Edit2 size={15} />
              <span>Update Address & View Locations</span>
            </button>
          </div>

          {/* Card 3: Early Morning Delivery Window */}
          <div className="profile-desktop-card">
            <div>
              <div className="profile-card-header">
                <div>
                  <h3 className="profile-card-title">Delivery Window</h3>
                  <p className="profile-card-desc">Silent early morning doorstep delivery</p>
                </div>
                <div className="profile-card-icon-wrap">
                  <Clock3 size={22} />
                </div>
              </div>
              <div className="profile-card-body">
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Morning Slot</span>
                  <span className="profile-card-data-val">5:00 AM – 6:30 AM</span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Cold Chain</span>
                  <span className="profile-card-data-val">Chilled at 4°C Raw Milk</span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Bottle Return</span>
                  <span className="profile-card-data-val">Rinsed glass bottle exchange</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="profile-card-action-btn"
              onClick={() => openProfileDetail('delivery-window')}
            >
              <Info size={15} />
              <span>View Timing & Bottle Exchange Rules</span>
            </button>
          </div>

          {/* Card 4: Billing & Account Balance */}
          <div className="profile-desktop-card">
            <div>
              <div className="profile-card-header">
                <div>
                  <h3 className="profile-card-title">Billing & Account Balance</h3>
                  <p className="profile-card-desc">Current dues, ledger & payments</p>
                </div>
                <div className="profile-card-icon-wrap">
                  <Wallet size={22} />
                </div>
              </div>
              <div className="profile-card-body">
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Current Balance</span>
                  <span className="profile-card-data-val" style={{ color: balance > 0 ? '#dc2626' : '#059669', fontSize: '1rem' }}>
                    {balance > 0 ? `₹${balance} Due` : '₹0 Outstanding (Good Standing)'}
                  </span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Account Status</span>
                  <span className="profile-card-data-val" style={{ color: balance > 0 ? '#b91c1c' : '#059669' }}>
                    {balance > 0 ? 'Pending Payment' : '✓ All Clear'}
                  </span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Payment Modes</span>
                  <span className="profile-card-data-val">UPI, Google Pay, NetBanking</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: balance > 0 ? '1fr 1fr' : '1fr', gap: '8px' }}>
              <button
                type="button"
                className="profile-card-action-btn"
                onClick={() => openProfileDetail('wallet')}
              >
                <FileText size={15} />
                <span>View Ledger Statement</span>
              </button>
              {balance > 0 && (
                <button
                  type="button"
                  className="profile-card-action-btn"
                  style={{ background: '#059669', color: '#ffffff', borderColor: '#059669' }}
                  onClick={() => onOpenPaymentModal?.(currentCustomer, balance)}
                >
                  <CreditCard size={15} />
                  <span>Pay ₹${balance}</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 5: Delivery Receipts & History */}
          <div className="profile-desktop-card">
            <div>
              <div className="profile-card-header">
                <div>
                  <h3 className="profile-card-title">Delivery Receipts</h3>
                  <p className="profile-card-desc">Verified daily doorstep logs & proofs</p>
                </div>
                <div className="profile-card-icon-wrap">
                  <FileText size={22} />
                </div>
              </div>
              <div className="profile-card-body">
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Total Drops Completed</span>
                  <span className="profile-card-data-val">{totalDeliveries} Deliveries</span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Verification Mode</span>
                  <span className="profile-card-data-val">Photo Proof & App Check-in</span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Download Receipts</span>
                  <span className="profile-card-data-val">PDF & digital statements</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="profile-card-action-btn"
              onClick={() => navigateToPage('deliveries')}
            >
              <Truck size={15} />
              <span>View All Delivery Receipts</span>
            </button>
          </div>

          {/* Card 6: Customer Care & Helplines */}
          <div className="profile-desktop-card">
            <div>
              <div className="profile-card-header">
                <div>
                  <h3 className="profile-card-title">Customer Care & Helplines</h3>
                  <p className="profile-card-desc">Instant customer assistance 24/7</p>
                </div>
                <div className="profile-card-icon-wrap">
                  <Headphones size={22} />
                </div>
              </div>
              <div className="profile-card-body">
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Dairy Helpline</span>
                  <a href="tel:+919876543210" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>
                    +91 98765 43210
                  </a>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">WhatsApp Priority</span>
                  <span className="profile-card-data-val" style={{ color: '#059669' }}>Response within 5 mins</span>
                </div>
                <div className="profile-card-data-row">
                  <span className="profile-card-data-label">Support Hours</span>
                  <span className="profile-card-data-val">5:00 AM – 9:00 PM Daily</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="profile-card-action-btn"
              onClick={() => openProfileDetail('support')}
            >
              <MessageSquare size={15} />
              <span>Open Support Desk</span>
            </button>
          </div>
        </div>

        {/* 3. Account Actions Row: Logout & Delete Account */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 22px',
            marginTop: '8px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
              Account Session & Security
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Sign out from this device or manage account credentials.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => { setDeleteError(''); setShowDeleteConfirm(true); }}
              style={{
                background: '#fff1f2',
                color: '#e11d48',
                border: '1px solid #fecdd3',
                borderRadius: '10px',
                padding: '9px 16px',
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
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '9px 18px',
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
    return isMobile ? renderCustomerProfileMobile() : renderCustomerProfileWeb();
  };

  const renderPage = () => {
    if (activePage === 'products') return renderProductsPage();
    if (activePage === 'subscription') return renderSubscriptionPage();
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
          onClick={() => {
            if (typeof setActiveTab === 'function') {
              setActiveTab('home');
            } else {
              window.location.href = '/';
            }
          }}
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
            items={CUSTOMER_PORTAL_ITEMS}
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
        {!(activePage === 'products' && selectedProductDetails) && (
          <header
            className={`customer-app-header${activePage === 'profile' && isMobile && !profileDetailView ? ' is-profile-mobile-hidden' : ''}`}
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            {/* Mobile Header Left: Back Button */}
            {isMobile && (
              <button
                type="button"
                className="customer-mobile-back-btn"
                onClick={handleSmartBack}
                aria-label="Back to recent page"
                title="Go back"
              >
                <ArrowLeft size={17} strokeWidth={2.4} />
                <span>Back</span>
              </button>
            )}
            {!isMobile && <div />}

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
            </div>
          </header>
        )}

        <div className="customer-dashboard-content">
          {(!isMobile || activePage !== 'profile') && !(activePage === 'products' && selectedProductDetails) && (
            <div className="customer-page-heading">
              <div>
                <span className="customer-section-kicker">CUSTOMER PORTAL · ID {currentCustomer.customerId || 'CUST-101'}</span>
                <h1>{activePage === 'profile' ? 'Profile & Settings' : (activePage === 'dashboard' ? 'Dashboard' : (activePage === 'products' ? 'Products & Bookings' : currentPage.label))}</h1>
                <p>
                  {activePage === 'dashboard' && 'Your daily essentials, all in one place.'}
                  {activePage === 'products' && 'Explore farm-fresh pure dairy products and schedule morning bookings in real-time.'}
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
          className="customer-bottom-nav customer-portal-bottom-nav"
          ariaLabel="Main navigation"
          items={CUSTOMER_MOBILE_PORTAL_ITEMS}
          activePage={['products', 'subscription', 'profile', 'deliveries'].includes(activePage) ? activePage : (activePage === 'dashboard' ? 'home' : undefined)}
          onNavigate={(page) => {
            if (page === 'home') {
              localStorage.setItem('nmd_current_tab', 'home');
              if (typeof setActiveTab === 'function') {
                setActiveTab('home');
              } else {
                window.location.href = '/';
              }
              if (window.location.pathname !== '/') {
                window.history.pushState({ nmdPage: 'home' }, '', '/');
              }
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              return;
            }
            if (page === 'dashboard') {
              navigateToPage('dashboard');
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              return;
            }
            if (page === 'deliveries') {
              navigateToPage('deliveries');
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              return;
            }
            if (page === 'products' || page === 'story') {
              if (typeof setActiveTab === 'function') {
                setActiveTab(page);
              } else {
                window.location.href = `/${page}`;
              }
              return;
            }
            if (page === 'subscription') {
              navigateToPage('subscription');
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              return;
            }
            if (page === 'profile') {
              navigateToPage('profile');
              setProfileDetailView(null);
              setIsEditingProfile(false);
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              return;
            }
            if (typeof setActiveTab === 'function') {
              setActiveTab(page);
            } else {
              window.location.href = page === 'home' ? '/' : `/${page}`;
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
              Delete Account Permanently?
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete your <strong>Natural Milk Dairy</strong> customer account?
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
                • All active subscriptions & deliveries will be cancelled.<br />
                • Invoices, payment records, and proofs will be erased.<br />
                • Your profile and login will be permanently removed from the database.
              </div>
            </div>

            {deleteError && (
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
                {deleteError}
              </div>
            )}

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
                  cursor: deletingAccount ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={deleteAccount}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: deletingAccount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {deletingAccount ? (
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

      {/* Subscription Details Modal */}
      {selectedSubForDetails && renderSubscriptionDetailsModal()}

      {/* Product Booking Modal */}
      {bookingModalOpen && renderBookingModal()}

      {/* Redesigned Clean & Professional Full-Page Proof Photo View */}
      {viewingProofPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delivery Proof Photo"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            maxHeight: '100dvh',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* 1. Full Page Top Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setViewingProofPhoto(null)}
              aria-label="Back"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#1e293b',
                fontSize: '0.85rem',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
              <span>Back</span>
            </button>

            <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 750, color: '#0f172a', lineHeight: 1.25 }}>
                Delivery Photo Proof
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                {viewingProofPhoto.date || 'Doorstep drop proof'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setViewingProofPhoto(null)}
              aria-label="Close photo"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>

          {/* 2. Full Page Photo Display Area */}
          <div
            style={{
              flex: 1,
              width: '100%',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <img
              src={viewingProofPhoto.url}
              alt="Delivery proof"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                background: '#ffffff',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'block';
                }
              }}
            />
            <div
              style={{
                display: 'none',
                color: '#64748b',
                padding: '40px 20px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontWeight: 650, fontSize: '0.92rem', color: '#0f172a' }}>Photo proof could not be loaded.</p>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Please check your network connection or try again.</span>
            </div>
          </div>

          {/* 3. Full Page Bottom Status & Action Bar */}
          <div
            style={{
              padding: '14px 18px max(18px, env(safe-area-inset-bottom)) 18px',
              borderTop: '1px solid #f1f5f9',
              background: '#ffffff',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                color: '#059669',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '12px',
                justifyContent: 'center',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <ShieldCheck size={16} color="#059669" />
              <span>Verified Contactless Doorstep Drop</span>
            </div>

            <button
              type="button"
              onClick={() => setViewingProofPhoto(null)}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '10px',
                background: '#0d5c3a',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.15s ease',
                boxShadow: '0 2px 6px rgba(13, 92, 58, 0.25)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
