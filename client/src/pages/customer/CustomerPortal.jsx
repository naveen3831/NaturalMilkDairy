import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../../constants/cloudinaryMedia';
import CustomerBottomNav, {
  CUSTOMER_HOME_NAV_ITEMS,
  CUSTOMER_PORTAL_ITEMS,
} from '../../components/CustomerBottomNav';
import ProductDetailsView from '../ProductDetailsView';

const CUSTOMER_PROFILE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: Home },
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

const getCustomerRoute = () => {
  const [section, page, detail] = window.location.pathname.split('/').filter(Boolean);
  if (section !== 'customer' || !['dashboard', 'products', 'subscription', 'deliveries', 'profile'].includes(page)) {
    return null;
  }
  const profileViews = [
    'personal-info', 'subscription', 'deliveries', 'wallet', 'pause', 'quantity',
    'delivery-window', 'drop-instructions', 'support', 'about', 'delete-account',
    'delivery-address',
  ];
  return {
    page,
    detail: page === 'profile' && profileViews.includes(detail) ? detail : null,
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
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [profileDetailView, setProfileDetailView] = useState(() => getCustomerRoute()?.detail || null);

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
    if (view === 'personal-info' || view === 'delivery-address') {
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
      if (typeof fetchLocations === 'function') {
        fetchLocations();
      }
    }
    localStorage.setItem('nmd_customer_page', 'profile');
    setActivePage('profile');
    setProfileDetailView(view);
    setCustomerPath(`/customer/profile/${view}`);
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

  const navigateToPage = (page) => {
    if (page === 'home') {
      if (typeof setActiveTab === 'function') {
        setActiveTab('home');
      } else {
        window.location.href = '/';
      }
      return;
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
    const isSubActive = sub.status === 'active';
    const isSubPaused = sub.status === 'paused' || sub.status === 'stopped';
    const plan = sub.plan || {};
    const planMilk = plan.milkQty || milkQuantity || 1;
    const planMilkUnit = plan.milkUnit || milkUnit || 'L';
    const planCurd = plan.curdQty || curdQuantity || 0;
    const planCurdUnit = plan.curdUnit || curdUnit || 'g';
    const freqLabel = plan.frequency === 'selected'
      ? `Selected Days (${(plan.deliveryDays || []).join(', ')})`
      : (plan.frequency === 'alternate' ? 'Alternate Days Delivery' : 'Everyday Morning Delivery');
    const partnerName = sub.deliveryBoyName || currentCustomer.deliveryPlan?.deliveryBoyName || 'Assigned Route Partner';
    const dropAddress = sub.deliveryAddress || currentCustomer.address || 'Doorstep drop';
    const areaName = sub.area || currentCustomer.area || '';
    const landmarkName = sub.landmark || currentCustomer.landmark || '';
    const phoneContact = sub.whatsapp || currentCustomer.whatsapp || currentCustomer.mobile || user?.mobile || '';

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
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '20px',
            background: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '24px',
            position: 'relative',
          }}
        >
          {/* Modal Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                <BadgeCheck size={14} />
                <span>Subscription Details</span>
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Daily Farm Fresh Dairy Plan
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Customer ID: <strong>{sub.customerId || currentCustomer.customerId || 'CUST-101'}</strong> · {sub._id && sub._id.length === 24 ? `Order ID: #${sub._id.slice(-6).toUpperCase()}` : 'Standard Daily Route'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedSubForDetails(null)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '1rem',
              }}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Status Alert Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: isSubActive ? '#ecfdf5' : '#fffbeb',
              border: `1.5px solid ${isSubActive ? '#86efac' : '#fde68a'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isSubActive ? '#10b981' : '#f59e0b',
                }}
              />
              <div>
                <strong style={{ fontSize: '0.88rem', color: isSubActive ? '#065f46' : '#92400e', display: 'block' }}>
                  {isSubActive ? 'Subscription is Active' : 'Subscription is Stopped / Paused'}
                </strong>
                <span style={{ fontSize: '0.74rem', color: isSubActive ? '#047857' : '#b45309' }}>
                  {isSubActive ? 'Daily morning doorstep delivery is confirmed.' : 'Daily morning doorstep deliveries are temporarily on hold.'}
                </span>
              </div>
            </div>

            {/* Quick Stop/Start in banner */}
            <button
              type="button"
              disabled={subToggling}
              onClick={() => handleToggleCustomerSub(sub, isSubActive ? 'stop' : 'start')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: isSubActive ? '#b45309' : '#059669',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: subToggling ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0,
              }}
            >
              {isSubActive ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
              <span>{subToggling ? 'Updating...' : (isSubActive ? 'Stop Sub' : 'Start Sub')}</span>
            </button>
          </div>

          {/* Section 1: Dairy Items */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              Daily Dairy Quota
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.70rem', color: '#64748b', display: 'block' }}>Fresh A2 Cow Milk</span>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{planMilk} {planMilkUnit}</strong>
                <span style={{ fontSize: '0.70rem', color: '#059669', display: 'block', marginTop: '2px' }}>Chilled Glass Bottle · 4°C</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.70rem', color: '#64748b', display: 'block' }}>Fresh Desi Curd / Dahi</span>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{planCurd > 0 ? `${planCurd} ${planCurdUnit}` : 'None Included'}</strong>
                <span style={{ fontSize: '0.70rem', color: '#059669', display: 'block', marginTop: '2px' }}>Traditional Clay Pot Set</span>
              </div>
            </div>
          </div>

          {/* Section 2: Schedule & Delivery Route */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              Delivery Schedule & Drop Details
            </span>
            <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.80rem' }}>Delivery Timing:</span>
                <strong style={{ color: '#0f172a', fontSize: '0.82rem' }}>5:00 AM – 6:30 AM (Early Morning)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.80rem' }}>Delivery Frequency:</span>
                <strong style={{ color: '#0f172a', fontSize: '0.82rem' }}>{freqLabel}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.80rem' }}>Assigned Partner:</span>
                <strong style={{ color: '#059669', fontSize: '0.82rem' }}>{partnerName}</strong>
              </div>
              <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'block', marginBottom: '2px' }}>Doorstep Drop Address:</span>
                <div style={{ color: '#0f172a', fontSize: '0.82rem', fontWeight: 600 }}>
                  {dropAddress} {areaName ? `· ${areaName}` : ''} {landmarkName ? `(Near ${landmarkName})` : ''}
                </div>
                {phoneContact && (
                  <span style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '2px', display: 'block' }}>
                    Phone for drop updates: {phoneContact}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Billing & Validity */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              Billing & Validity
            </span>
            <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Subscription Duration</span>
                <strong style={{ color: '#0f172a', fontSize: '0.82rem' }}>
                  {formatProfileDate(sub.startDate)} – {formatProfileDate(sub.endDate || subscriptionThrough)}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Payment Reference</span>
                <strong style={{ color: '#0f172a', fontSize: '0.82rem' }}>
                  {sub.providerPaymentId || currentCustomer.subscription?.paymentId || 'Prepaid Account'}
                </strong>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            {isSubActive ? (
              <button
                type="button"
                disabled={subToggling}
                onClick={() => handleToggleCustomerSub(sub, 'stop')}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1.5px solid #fde68a',
                  background: '#fffbeb',
                  color: '#b45309',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: subToggling ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <PauseCircle size={16} />
                <span>{subToggling ? 'Updating...' : 'Stop Subscription'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={subToggling}
                onClick={() => handleToggleCustomerSub(sub, 'start')}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: subToggling ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <PlayCircle size={16} />
                <span>{subToggling ? 'Updating...' : 'Start Subscription'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedSubForDetails(null)}
              style={{
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 750,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSubscriptionPage = () => {
    return (
      <section className="customer-dashboard-main customer-subscription-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Banner with stats */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d5c3a 0%, #064e3b 100%)',
            borderRadius: '18px',
            padding: '24px',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(13, 92, 58, 0.18)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
              <Sparkles size={12} />
              <span>Doorstep Delivery Plans</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>
              My Dairy Subscriptions
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#d1fae5', maxWidth: '520px', lineHeight: 1.5 }}>
              Review your active daily morning milk drop, tap any card to view full delivery details, or stop & restart anytime.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '10px 16px', textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>{allCustomerSubscriptions.length}</div>
              <div style={{ fontSize: '0.70rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 700 }}>Total Plans</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '10px 16px', textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>{milkQuantity} <span style={{ fontSize: '0.85rem' }}>{milkUnit}</span></div>
              <div style={{ fontSize: '0.70rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 700 }}>Daily Milk</div>
            </div>
          </div>
        </div>

        {/* Subscription Cards List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Active & Scheduled Subscriptions
            </h3>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
              Tap any card to view complete details
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {allCustomerSubscriptions.map((sub, index) => {
              const isSubActive = sub.status === 'active';
              const isSubPaused = sub.status === 'paused' || sub.status === 'stopped';
              const plan = sub.plan || {};
              const planMilk = plan.milkQty || milkQuantity || 1;
              const planMilkUnit = plan.milkUnit || milkUnit || 'L';
              const planCurd = plan.curdQty || curdQuantity || 0;
              const planCurdUnit = plan.curdUnit || curdUnit || 'g';
              const freqLabel = plan.frequency === 'selected'
                ? `Days: ${(plan.deliveryDays || []).join(', ')}`
                : (plan.frequency === 'alternate' ? 'Alternate Days' : 'Daily Morning');
              const partnerName = sub.deliveryBoyName || currentCustomer.deliveryPlan?.deliveryBoyName || 'Assigned Route Partner';

              return (
                <div
                  key={sub._id || sub.id || index}
                  onClick={() => setSelectedSubForDetails(sub)}
                  style={{
                    background: '#ffffff',
                    border: isSubActive ? '1.5px solid #86efac' : isSubPaused ? '1.5px solid #fde68a' : '1.5px solid #e2e8f0',
                    borderRadius: '18px',
                    padding: '20px',
                    boxShadow: '0 4px 18px rgba(15, 23, 42, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.09)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 18px rgba(15, 23, 42, 0.05)';
                  }}
                >
                  {/* Card Header */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: isSubActive ? '#ecfdf5' : isSubPaused ? '#fffbeb' : '#f1f5f9',
                            color: isSubActive ? '#059669' : isSubPaused ? '#d97706' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Milk size={22} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                            Daily Farm Pure Milk Plan
                          </h4>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            ID: {sub.customerId || currentCustomer.customerId || 'CUST-101'} · {freqLabel}
                          </span>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.72rem',
                          fontWeight: 750,
                          background: isSubActive ? '#ecfdf5' : isSubPaused ? '#fffbeb' : '#f1f5f9',
                          color: isSubActive ? '#047857' : isSubPaused ? '#b45309' : '#475569',
                          border: `1px solid ${isSubActive ? '#a7f3d0' : isSubPaused ? '#fde68a' : '#e2e8f0'}`,
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: isSubActive ? '#10b981' : isSubPaused ? '#f59e0b' : '#94a3b8',
                          }}
                        />
                        {isSubActive ? 'Active' : isSubPaused ? 'Stopped' : toTitle(sub.status || 'Active')}
                      </span>
                    </div>

                    {/* Quantity Chips */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.70rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Pure A2 Milk</span>
                        <strong style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 800 }}>{planMilk} <small style={{ fontSize: '0.76rem', color: '#059669' }}>{planMilkUnit}/day</small></strong>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.70rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Fresh Dahi/Curd</span>
                        <strong style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 800 }}>{planCurd > 0 ? `${planCurd} ` : 'None'}<small style={{ fontSize: '0.76rem', color: '#059669' }}>{planCurd > 0 ? planCurdUnit : ''}</small></strong>
                      </div>
                    </div>

                    {/* Key Plan Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '0.80rem', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock3 size={14} color="#059669" />
                        <span>Morning Delivery: <strong>Before 6:30 AM</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Truck size={14} color="#059669" />
                        <span>Partner: <strong>{partnerName}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="#059669" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Drop: {sub.deliveryAddress || currentCustomer.address || 'Doorstep drop'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom / Action Row */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      paddingTop: '14px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSubForDetails(sub)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#059669',
                        fontSize: '0.78rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Eye size={14} />
                      <span>View all details</span>
                      <ChevronRight size={14} />
                    </button>

                    {/* Option to Stop or Start Subscription */}
                    {isSubActive ? (
                      <button
                        type="button"
                        disabled={subToggling}
                        onClick={() => handleToggleCustomerSub(sub, 'stop')}
                        style={{
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1.5px solid #fde68a',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 750,
                          cursor: subToggling ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 1px 2px rgba(180, 83, 9, 0.08)',
                        }}
                      >
                        <PauseCircle size={14} />
                        <span>{subToggling ? 'Updating...' : 'Stop Subscription'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={subToggling}
                        onClick={() => handleToggleCustomerSub(sub, 'start')}
                        style={{
                          background: '#f0fdf4',
                          color: '#15803d',
                          border: '1.5px solid #86efac',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 750,
                          cursor: subToggling ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 1px 2px rgba(21, 128, 61, 0.12)',
                        }}
                      >
                        <PlayCircle size={14} />
                        <span>{subToggling ? 'Updating...' : 'Start Subscription'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
    else if (profileDetailView === 'delivery-address') viewTitle = 'Delivery Address & Locations';
    else if (profileDetailView === 'subscription') viewTitle = 'My Subscriptions';
    else if (profileDetailView === 'deliveries') viewTitle = 'Saved Deliveries';
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

        {/* DELIVERY ADDRESS & AVAILABLE LOCATIONS VIEW */}
        {profileDetailView === 'delivery-address' && (
          <div className="mobile-detail-body">
            {/* Feedback alert toasts */}
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

            {/* 1. CURRENT ACTIVE DELIVERY DESTINATION CARD */}
            <div className="delivery-address-hero-card">
              <div className="delivery-address-hero-header">
                <div>
                  <div className="delivery-status-pill">
                    <span className="delivery-pulse-dot" />
                    <span>Active Morning Drop Destination</span>
                  </div>
                  <h3 style={{ margin: '8px 0 2px', fontSize: '1.22rem', fontWeight: 800, color: '#064e3b' }}>
                    {customerName}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#047857' }}>
                    Customer ID: {customerId} · Ph: {customerPhone}
                  </p>
                </div>
                <div style={{ background: '#d1fae5', padding: '10px', borderRadius: '12px', color: '#059669' }}>
                  <MapPin size={26} strokeWidth={2.2} />
                </div>
              </div>

              <div className="delivery-address-highlight-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#0d5c3a', fontSize: '0.78rem', fontWeight: 800 }}>
                  <Navigation size={14} />
                  <span>CURRENT DOORSTEP ADDRESS:</span>
                </div>
                <p className="delivery-address-highlight-text">
                  {currentCustomer.address || user?.address || 'Flat / House details not yet specified'}
                </p>
                <div style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>
                  <strong>Area:</strong> {currentCustomer.area || user?.area || user?.assignedArea || 'Madhapur'}, Hyderabad
                </div>
                {currentCustomer.landmark && (
                  <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: '4px' }}>
                    <strong>Landmark / Instructions:</strong> {currentCustomer.landmark}
                  </div>
                )}
              </div>

              <div className="delivery-address-chips-row">
                <span className="delivery-address-sub-chip is-green">
                  <Clock3 size={12} /> 5:00 AM – 6:30 AM Morning Slot
                </span>
                <span className="delivery-address-sub-chip is-blue">
                  <Truck size={12} /> {currentCustomer.deliveryPlan?.deliveryBoyName ? `Route Partner: ${currentCustomer.deliveryPlan.deliveryBoyName}` : 'Dedicated Route Specialist'}
                </span>
                <span className="delivery-address-sub-chip">
                  <ShieldCheck size={12} /> Synced with Admin & Driver
                </span>
              </div>
            </div>

            {/* 2. AVAILABLE SERVICEABLE LOCATIONS */}
            <div className="mobile-detail-card" style={{ marginBottom: '18px' }}>
              <div className="mobile-detail-card-head">
                <div className="mobile-detail-card-icon is-green">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Available Service Locations
                    <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '999px', border: '1px solid #a7f3d0' }}>
                      {serviceableLocations.length} Active Zones
                    </span>
                  </h4>
                  <p>We deliver fresh morning A2 milk and dairy across these verified locations. Tap any location to select it for your address.</p>
                </div>
              </div>

              {/* Location Search Bar */}
              <div style={{ position: 'relative', margin: '8px 0 14px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter available locations (e.g. Madhapur, Gachibowli, Hitec City...)"
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.84rem',
                    background: '#f8fafc',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Locations Grid */}
              <div className="locations-grid-container">
                {serviceableLocations
                  .filter((loc) => {
                    if (!locationSearchQuery.trim()) return true;
                    const q = locationSearchQuery.toLowerCase();
                    return (
                      loc.name.toLowerCase().includes(q) ||
                      (loc.pincode && loc.pincode.includes(q)) ||
                      (loc.city && loc.city.toLowerCase().includes(q))
                    );
                  })
                  .map((loc) => {
                    const isCurrentArea = (profileForm.area || currentCustomer.area || '').toLowerCase().trim() === loc.name.toLowerCase().trim();
                    return (
                      <div
                        key={loc.id || loc._id || loc.name}
                        className={`location-item-card ${isCurrentArea ? 'is-selected' : ''}`}
                        onClick={() => {
                          setProfileForm((prev) => ({
                            ...prev,
                            area: loc.name,
                          }));
                          const formEl = document.getElementById('delivery-address-update-form');
                          if (formEl) {
                            formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                      >
                        <div>
                          <div className="location-item-head">
                            <span className="location-item-name">
                              <MapPin size={15} color={isCurrentArea ? '#059669' : '#64748b'} />
                              {loc.name}
                            </span>
                            {isCurrentArea ? (
                              <span className="location-item-badge">✓ Selected</span>
                            ) : (
                              <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                {loc.pincode || 'Active'}
                              </span>
                            )}
                          </div>
                          <div className="location-item-slot">
                            <Clock3 size={13} color="#94a3b8" />
                            <span>{loc.deliverySlot || 'Morning 5:00 AM - 7:30 AM'}</span>
                          </div>
                          {loc.assignedPartnerName && (
                            <div style={{ fontSize: '0.72rem', color: '#0d5c3a', fontWeight: 650, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Truck size={12} /> Partner: {loc.assignedPartnerName}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="location-item-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileForm((prev) => ({
                              ...prev,
                              area: loc.name,
                            }));
                            const formEl = document.getElementById('delivery-address-update-form');
                            if (formEl) {
                              formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                        >
                          {isCurrentArea ? (
                            <>
                              <CheckCircle2 size={14} />
                              <span>Current Selected Area</span>
                            </>
                          ) : (
                            <>
                              <Plus size={14} />
                              <span>Select {loc.name}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 3. OPTION TO UPDATE DELIVERY ADDRESS */}
            <div className="mobile-detail-card" id="delivery-address-update-form">
              <div className="mobile-detail-card-head">
                <div className="mobile-detail-card-icon is-green">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h4>Update Delivery Address</h4>
                  <p>Updates sync in real time across the Admin portal and your Delivery Partner's mobile app.</p>
                </div>
              </div>

              <form className="customer-profile-edit-form" onSubmit={saveProfile}>
                {/* 1. Selected Area / Locality */}
                <label>
                  <span>Service Area / Locality *</span>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={profileForm.area || ''}
                      required
                      onChange={(e) => setProfileForm((cur) => ({ ...cur, area: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.90rem',
                        background: '#ffffff',
                        fontWeight: 650,
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">-- Choose an Available Delivery Location --</option>
                      {serviceableLocations.map((loc) => (
                        <option key={loc.id || loc._id || loc.name} value={loc.name}>
                          {loc.name} {loc.pincode ? `(${loc.pincode})` : ''} - {loc.deliverySlot || 'Morning Delivery'}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                {/* 2. Doorstep Delivery Address */}
                <label style={{ marginTop: '12px' }}>
                  <span>Doorstep Delivery Address * (Flat / House No, Wing, Building / Society, Street)</span>
                  <textarea
                    rows={3}
                    placeholder="e.g. Flat 304, Tower B, My Home Bhooja, Silent Drop Door Hook"
                    value={profileForm.address || ''}
                    required
                    onChange={(e) => setProfileForm((cur) => ({ ...cur, address: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      lineHeight: 1.45,
                    }}
                  />
                </label>

                {/* 3. Landmark & Delivery Partner Drop Instructions */}
                <label style={{ marginTop: '12px' }}>
                  <span>Landmark / Gate Instructions (Visible to Delivery Partner)</span>
                  <input
                    type="text"
                    placeholder="e.g. Near Lift 2, Leave bag on door hook, gate code #4490"
                    value={profileForm.landmark || ''}
                    onChange={(e) => setProfileForm((cur) => ({ ...cur, landmark: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>

                {/* Quick instruction recommendation tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0 14px' }}>
                  {[
                    'Leave in dairy bag on door hook',
                    'Silent drop (Do not ring bell)',
                    'Ring bell once after drop',
                    'Place on shoe rack by door',
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
                        padding: '4px 9px',
                        borderRadius: '7px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                {/* 4. Confirmed Mobile Number */}
                <label style={{ marginTop: '6px' }}>
                  <span>Contact Mobile Number (For morning route coordinator)</span>
                  <input
                    type="tel"
                    value={profileForm.mobile || ''}
                    required
                    onChange={(e) => setProfileForm((cur) => ({ ...cur, mobile: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>

                {/* Submit Actions */}
                <div className="customer-profile-edit-actions" style={{ marginTop: '18px' }}>
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
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#0d5c3a',
                      color: '#ffffff',
                    }}
                  >
                    {profileSaving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Updating & Syncing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Update Address (Sync Admin & Partner)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Sync Guarantee Notice */}
            <div className="mobile-detail-card mobile-detail-notice-card" style={{ marginTop: '16px' }}>
              <div className="mobile-detail-notice-item">
                <ShieldCheck size={22} className="mobile-detail-notice-icon is-green" />
                <div>
                  <strong>Instant Fleet & Admin Synchronization</strong>
                  <p>When you update your delivery address, our backend automatically updates your customer records, pending morning deliveries, and routes. Your assigned delivery partner's app receives the live notification immediately.</p>
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
                      <div className="mobile-detail-drop-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <span>{drop.actualMilk || milkQuantity} {milkUnit}</span>
                          <small>₹{drop.totalAmount || 85}</small>
                        </div>
                        {drop.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUserHistory(drop.id)}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fee2e2',
                              borderRadius: '6px',
                              padding: '5px',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete from your history"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
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
    const customerName = currentCustomer.name || user?.name || 'Naveen';
    const customerPhone = currentCustomer.mobile || user?.mobile || '7702233931';
    const customerId = currentCustomer.customerId || user?.customerId || 'CUST-101';
    const handleTag = `@${customerId.toLowerCase()}`;
    const totalDeliveries = customerDeliveries.length || ledgerEntries.filter((e) => e.type === 'delivery').length || 1;
    const formattedSubDate = subscriptionThrough
      ? subscriptionThrough.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : (currentCustomer.subscription?.endDate
          ? new Date(currentCustomer.subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '13 Nov 2026');
    const displayAddress = address || 'Madhupur, Madhapur';
    const customerArea = currentCustomer.area || user?.area || user?.assignedArea || 'Madhapur';

    return (
      <div className="modern-profile-container customer-profile-mobile">
        {/* Top Header: ← Customer Profile */}
        <div className="modern-profile-header">
          <button
            type="button"
            className="modern-profile-header-btn"
            onClick={() => {
              if (typeof setActiveTab === 'function') {
                setActiveTab('home');
              } else {
                window.location.href = '/';
              }
            }}
            aria-label="Back to home"
          >
            <ArrowLeft size={22} color="#0f172a" strokeWidth={2} />
          </button>
          <h2 className="modern-profile-header-title">Customer Profile</h2>
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
              marginBottom: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <CheckCircle2 size={16} color="#059669" />
            <span>{profileMessage}</span>
          </div>
        )}

        {/* Identity Hero Section */}
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
              <Camera size={12} color="#0d5c3a" />
            </button>
          </div>

          <div className="modern-profile-identity-info">
            <h3 className="modern-profile-name">{customerName}</h3>
            <button
              type="button"
              className="modern-profile-edit-btn"
              onClick={() => openProfileDetail('personal-info')}
            >
              <Edit3 size={12} />
              <span>Edit Profile</span>
            </button>
          </div>

          <div className="customer-profile-chips-row">
            <div className="customer-profile-chip">
              <Milk size={12} color="#0d5c3a" />
              <span>{milkQuantity}L Daily</span>
            </div>
            <div className="customer-profile-chip">
              <MapPin size={12} color="#0d5c3a" />
              <span>{customerArea || 'Madhapur'}</span>
            </div>
            <div className="customer-profile-chip">
              <CheckCircle2 size={12} color="#0d5c3a" />
              <span>{totalDeliveries} Drops Done</span>
            </div>
          </div>
        </div>

        {/* Group 1: Delivery & Schedule */}
        <div className="customer-profile-group">
          <h4 className="customer-profile-group-header">
            <Truck size={14} />
            <span>Delivery & Schedule</span>
          </h4>

          {/* 1. My Milk Subscription */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('subscription')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><Milk size={20} color="#0d5c3a" strokeWidth={1.8} /></span>
              <div>
                <span className="modern-profile-menu-label">My Milk Subscription</span>
                <span className="modern-profile-menu-sub">
                  Prepaid through {formattedSubDate}
                </span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <span className={`customer-profile-badge${isPaused ? ' is-paused' : ''}`}>
                {isPaused ? 'Paused' : 'Active'}
              </span>
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>

          {/* 2. Delivery Address */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('delivery-address')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><MapPin size={20} color="#0d5c3a" strokeWidth={1.8} /></span>
              <div>
                <span className="modern-profile-menu-label">Delivery Address</span>
                <span className="modern-profile-menu-sub">{displayAddress}</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>

          {/* 3. Delivery Window */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('delivery-window')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><Clock3 size={20} color="#0d5c3a" strokeWidth={1.8} /></span>
              <div>
                <span className="modern-profile-menu-label">Delivery Window</span>
                <span className="modern-profile-menu-sub">5:00 AM – 6:30 AM (Silent Early Drop)</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>

          {/* 4. Drop Instructions */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('drop-instructions')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><ShieldCheck size={20} color="#0d5c3a" strokeWidth={1.8} /></span>
              <div>
                <span className="modern-profile-menu-label">Drop Instructions</span>
                <span className="modern-profile-menu-sub">{currentCustomer.landmark || 'Doorstep placement, bell & gate codes'}</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>
        </div>

        {/* Group 2: Account & Billing */}
        <div className="customer-profile-group">
          <h4 className="customer-profile-group-header">
            <CreditCard size={14} />
            <span>Account & Billing</span>
          </h4>

          {/* 5. Account Details */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('account-details')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><UserRound size={20} color="#0d5c3a" strokeWidth={1.8} /></span>
              <div>
                <span className="modern-profile-menu-label">Account Details</span>
                <span className="modern-profile-menu-sub">
                  ID: {customerId} · {customerPhone}
                </span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <span className="customer-profile-badge">
                Active
              </span>
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>

          {/* 6. Past Delivery Receipts & Invoices */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('deliveries')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><FileText size={20} color="#0d5c3a" strokeWidth={1.8} /></span>
              <div>
                <span className="modern-profile-menu-label">Delivery Receipts & History</span>
                <span className="modern-profile-menu-sub">{totalDeliveries} Drops Completed · Daily proof logs</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>

          {/* 7. Subscription Payment */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('wallet')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><Wallet size={20} color="#0d5c3a" strokeWidth={1.8} /></span>
              <div>
                <span className="modern-profile-menu-label">Subscription Payment</span>
                <span className="modern-profile-menu-sub">
                  Prepaid through {formattedSubDate}
                </span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <span className="customer-profile-badge">
                Prepaid
              </span>
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>

          {/* 8. Customer Care & Helplines */}
          <button
            type="button"
            className="modern-profile-menu-row"
            onClick={() => openProfileDetail('support')}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon"><Headphones size={20} color="#0d5c3a" strokeWidth={1.8} /></span>
              <div>
                <span className="modern-profile-menu-label">Customer Care & Helplines</span>
                <span className="modern-profile-menu-sub">WhatsApp chat & 24/7 priority support</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>
        </div>

        {/* Group 3: Account Controls */}
        <div className="customer-profile-group" style={{ marginBottom: '24px' }}>
          <h4 className="customer-profile-group-header">
            <Settings size={14} />
            <span>Account Controls</span>
          </h4>

          {/* 9. Log out */}
          <button
            type="button"
            className="modern-profile-menu-row is-logout"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon" style={{ background: '#fef2f2', color: '#e53935' }}>
                <LogOut size={20} color="#e53935" strokeWidth={1.8} />
              </span>
              <span className="modern-profile-menu-label" style={{ color: '#e53935', fontWeight: 650 }}>Log out</span>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>

          {/* 10. Delete Account Permanently */}
          <button
            type="button"
            className="modern-profile-menu-row is-delete"
            onClick={() => {
              setDeleteError('');
              setShowDeleteConfirm(true);
            }}
          >
            <div className="modern-profile-menu-left">
              <span className="modern-profile-menu-icon" style={{ background: '#fef2f2', color: '#ef4444', borderRadius: '6px', padding: '2px' }}>
                <Trash2 size={20} color="#ef4444" strokeWidth={1.8} />
              </span>
              <div>
                <span className="modern-profile-menu-label" style={{ color: '#ef4444', fontWeight: 650 }}>Delete Account</span>
                <span className="modern-profile-menu-sub">Permanently delete account & records</span>
              </div>
            </div>
            <div className="modern-profile-menu-right">
              <ChevronRight size={17} color="#94a3b8" strokeWidth={2} />
            </div>
          </button>
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
            className={`customer-app-header${activePage === 'profile' && isMobile ? ' is-profile-mobile-hidden' : ''}`}
            style={{ justifyContent: 'flex-end' }}
          >
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
          items={CUSTOMER_HOME_NAV_ITEMS}
          activePage={activePage === 'profile' ? 'profile' : undefined}
          onNavigate={(page) => {
            if (page === 'home') {
              if (typeof setActiveTab === 'function') {
                setActiveTab('home');
              } else {
                window.location.href = '/';
              }
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

    </div>
  );
}
