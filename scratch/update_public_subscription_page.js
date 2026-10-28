const fs = require('fs');
const path = require('path');

const filePath = path.resolve('client/src/pages/SubscriptionPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure imports
const oldImports = `import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  PauseCircle,
  PlayCircle,
  Milk,
  RotateCcw,
  Check,
  ChevronRight,
  HelpCircle,
  Package,
} from 'lucide-react';`;

const newImports = `import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Clock3,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  PauseCircle,
  PlayCircle,
  Milk,
  RotateCcw,
  Check,
  ChevronRight,
  HelpCircle,
  Package,
  Truck,
  Snowflake,
  Leaf,
  MapPin,
  Eye,
  Settings,
  Bell,
  Home,
  Edit3,
  X,
  LayoutGrid,
  UserRound,
} from 'lucide-react';`;

content = content.replace(oldImports, newImports);

// Add mobile state and details modal
const oldStart = `export default function SubscriptionPage({ setActiveTab }) {
  const { user } = useAuth();
  const isLoggedInCustomer = user?.role === 'customer';

  const [selectedPlan, setSelectedPlan] = useState('cow-daily');
  const [selectedFrequency, setSelectedFrequency] = useState('daily');
  const [milkQuantity, setMilkQuantity] = useState(1);`;

const newStart = `export default function SubscriptionPage({ setActiveTab }) {
  const { user } = useAuth();
  const isLoggedInCustomer = user?.role === 'customer';

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [selectedWeekdayIndex, setSelectedWeekdayIndex] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedPlan, setSelectedPlan] = useState('cow-daily');
  const [selectedFrequency, setSelectedFrequency] = useState('daily');
  const [milkQuantity, setMilkQuantity] = useState(1);`;

content = content.replace(oldStart, newStart);

// Before return, add mobile renderers: renderMobileSubscription() and renderMobileDetails()
const oldReturn = `  return (
    <div className="subscription-public-page" style={{ minHeight: '100vh', background: '#fafbfc', paddingBottom: '90px' }}>`;

const newReturn = `  // Mobile Subscription Details Screen (Image 2)
  const renderMobileDetails = () => {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div style={{ minHeight: '100vh', background: '#f9faf9', padding: '16px 16px 90px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
          <button
            type="button"
            onClick={() => setShowMobileDetails(false)}
            aria-label="Back"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#ffffff',
              border: '1.2px solid #e2ebe5',
              color: '#0c2340',
              fontWeight: 700,
              fontSize: '0.80rem',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0c2340', textAlign: 'center' }}>
            Subscription Details
          </h3>

          <div
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '1.2px solid #e2ebe5',
              color: '#0d5c3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#e53935',
              }}
            />
          </div>
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
              src="/sub_active_thumb.png"
              onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}
              alt="Farm Pure Milk"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                objectFit: 'cover',
                border: '1px solid #e2ebe5',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0c2340', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    background: '#e2f1ea',
                    color: '#0d5c3a',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0d5c3a' }} />
                  Active
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 600 }}>
                ID: {user?.customerId || 'CUST-101'} • Daily Morning
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
                  1 L / day
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
              <span>Partner Naveen</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="#6b7280" />
              <span>Delivery Area {user?.area || 'Madhupur'}</span>
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
              <CalendarDays size={18} color="#0d5c3a" />
              <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0c2340' }}>Order Schedule</strong>
            </div>
            <span style={{ color: '#0d5c3a', fontSize: '0.78rem', fontWeight: 800 }}>Change →</span>
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
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2ebe5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
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
                  {user?.address || 'Madhupur, Hyderabad, Telangana - 500081'}
                </span>
              </div>
            </div>
            <ChevronRight size={19} color="#9ca3af" />
          </div>
        </div>

        {/* 4. Next Delivery (Mint card matching Image 2) */}
        <div
          style={{
            background: '#e8f5ee',
            borderRadius: '20px',
            border: '1.2px solid #c8e6d5',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(13, 92, 58, 0.04)',
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
                  borderRadius: '50%',
                  background: '#d4ede0',
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
                <span style={{ fontSize: '0.76rem', color: '#4b5563' }}>Before 6:30 AM</span>
              </div>
            </div>
            <ChevronRight size={19} color="#0d5c3a" />
          </div>
        </div>

        {/* 5. Manage Subscription (4 Tinted Action Cards) */}
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
            {/* Card 1: Pause */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#fef9ee',
                border: '1.1px solid #fde68a',
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

            {/* Card 2: Quantity */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#f0fdf4',
                border: '1.1px solid #bbf7d0',
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

            {/* Card 3: Address */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#f0f9ff',
                border: '1.1px solid #bae6fd',
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

            {/* Card 4: Stop */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#fef2f2',
                border: '1.1px solid #fecaca',
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
            setShowMobileDetails(false);
            if (typeof setActiveTab === 'function') setActiveTab('products');
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
            boxShadow: '0 4px 12px rgba(13, 92, 58, 0.25)',
          }}
        >
          <LayoutGrid size={18} />
          <span>Explore More Plans</span>
        </button>
      </div>
    );
  };

  // Mobile Subscription Overview Screen (Image 1)
  const renderMobileOverview = () => {
    return (
      <div style={{ minHeight: '100vh', background: '#f9faf9', padding: '16px 16px 90px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Title & Subtitle matching Image 1 */}
        <div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0c2340', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Subscription
          </h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
            Manage your daily dairy plans and upcoming deliveries.
          </p>
        </div>

        {/* Hero Banner Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #e8f6ed 0%, #d3efe0 100%)',
            borderRadius: '22px',
            padding: '18px',
            border: '1px solid #cee7d9',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.06)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '65%', zIndex: 2, position: 'relative' }}>
            <span
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid #bce3ce',
                borderRadius: '20px',
                padding: '4px 10px',
                fontSize: '0.62rem',
                fontWeight: 900,
                color: '#0d5c3a',
                letterSpacing: '0.04em',
                marginBottom: '8px',
              }}
            >
              DOORSTEP DELIVERY PLANS
            </span>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.2 }}>
              Fresh Dairy Every Morning
            </h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.74rem', color: '#4b5563', lineHeight: 1.35 }}>
              Healthy milk, curd, paneer and more delivered to your doorstep before 6:30 AM.
            </p>
            <button
              type="button"
              onClick={() => {
                if (typeof setActiveTab === 'function') setActiveTab('products');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0d5c3a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '24px',
                padding: '8px 16px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(13, 92, 58, 0.25)',
              }}
            >
              <span>Explore Plans</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ position: 'absolute', right: '4px', bottom: '0px', width: '120px', height: '130px', zIndex: 1 }}>
            <img
              src="/sub_hero_milk.png"
              onError={(e) => { e.currentTarget.src = '/cat_img_milk.png'; }}
              alt="Fresh Dairy"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* 4 Feature Badges (Single Card with 4 Columns matching Image 1) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2ebe5',
            padding: '12px 4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={16} />
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>100%<br />Pure & Natural</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#e5ede7' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Snowflake size={16} />
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>Chilled<br />to 4°C</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#e5ede7' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} />
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>Doorstep<br />Delivery</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#e5ede7' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2f1ea', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={16} />
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0c2340', lineHeight: 1.15 }}>Flexible<br />Plans</span>
          </div>
        </div>

        {/* Active Subscriptions Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0c2340' }}>
              Active Subscriptions
            </h3>
            <button
              type="button"
              onClick={() => setShowMobileDetails(true)}
              style={{ background: 'none', border: 'none', color: '#0d5c3a', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              View All →
            </button>
          </div>

          <div
            onClick={() => setShowMobileDetails(true)}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2ebe5',
              padding: '16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <img
                src="/sub_active_thumb.png"
                onError={(e) => { e.currentTarget.src = '/product-cow-milk.jpg'; }}
                alt="Plan Thumbnail"
                style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0c2340', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Daily Farm Pure Milk Plan
                  </h4>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '20px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      background: '#e2f1ea',
                      color: '#0d5c3a',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0d5c3a' }} />
                    Active
                  </span>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 600 }}>
                  ID: {user?.customerId || 'CUST-101'} • Daily Morning
                </span>
              </div>
            </div>

            {/* 3 Metric Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <div
                style={{
                  background: '#f2f8f4',
                  borderRadius: '10px',
                  border: '1px solid #deede2',
                  padding: '7px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Milk size={14} color="#0d5c3a" />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.70rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    1 L / day
                  </strong>
                  <span style={{ fontSize: '0.60rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>Pure A2 Milk</span>
                </div>
              </div>

              <div
                style={{
                  background: '#f2f8f4',
                  borderRadius: '10px',
                  border: '1px solid #deede2',
                  padding: '7px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Clock3 size={14} color="#0d5c3a" />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.70rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Before 6:30 AM
                  </strong>
                  <span style={{ fontSize: '0.60rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>Morning Delivery</span>
                </div>
              </div>

              <div
                style={{
                  background: '#f2f8f4',
                  borderRadius: '10px',
                  border: '1px solid #deede2',
                  padding: '7px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <MapPin size={14} color="#0d5c3a" />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.70rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.area || 'Madhupur'}
                  </strong>
                  <span style={{ fontSize: '0.60rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>Delivery Area</span>
                </div>
              </div>
            </div>

            {/* Two Action Buttons matching Image 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '2px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileDetails(true);
                }}
                style={{
                  height: '38px',
                  borderRadius: '12px',
                  border: '1.2px solid #0d5c3a',
                  background: '#ffffff',
                  color: '#0d5c3a',
                  fontWeight: 700,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                }}
              >
                View Details
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileDetails(true);
                }}
                style={{
                  height: '38px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(13, 92, 58, 0.25)',
                }}
              >
                Manage Plan
              </button>
            </div>
          </div>
        </div>

        {/* More Subscription Plans Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0c2340' }}>
              More Subscription Plans
            </h3>
            <button
              type="button"
              onClick={() => {
                if (typeof setActiveTab === 'function') setActiveTab('products');
              }}
              style={{ background: 'none', border: 'none', color: '#0d5c3a', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              View All →
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: '4px',
            }}
          >
            {/* Card 1: Milk Plans */}
            <div
              onClick={() => {
                if (typeof setActiveTab === 'function') setActiveTab('products');
              }}
              style={{
                flex: '0 0 134px',
                background: '#edf7f1',
                borderRadius: '16px',
                border: '1px solid #dbeee2',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/cat_img_milk.png" alt="Milk Plans" style={{ maxHeight: '64px', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <strong style={{ fontSize: '0.78rem', color: '#0c2340', fontWeight: 800 }}>Milk Plans</strong>
                <ChevronRight size={14} color="#0d5c3a" />
              </div>
            </div>

            {/* Card 2: Curd Plans */}
            <div
              onClick={() => {
                if (typeof setActiveTab === 'function') setActiveTab('products');
              }}
              style={{
                flex: '0 0 134px',
                background: '#f7f7f4',
                borderRadius: '16px',
                border: '1px solid #e7ebe5',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/cat_img_curd.png" alt="Curd Plans" style={{ maxHeight: '64px', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <strong style={{ fontSize: '0.78rem', color: '#0c2340', fontWeight: 800 }}>Curd Plans</strong>
                <ChevronRight size={14} color="#0d5c3a" />
              </div>
            </div>

            {/* Card 3: Ghee Plans */}
            <div
              onClick={() => {
                if (typeof setActiveTab === 'function') setActiveTab('products');
              }}
              style={{
                flex: '0 0 134px',
                background: '#fef8ec',
                borderRadius: '16px',
                border: '1px solid #fae8c6',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/cat_img_ghee.png" alt="Ghee Plans" style={{ maxHeight: '64px', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <strong style={{ fontSize: '0.78rem', color: '#0c2340', fontWeight: 800 }}>Ghee Plans</strong>
                <ChevronRight size={14} color="#0d5c3a" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return showMobileDetails ? renderMobileDetails() : renderMobileOverview();
  }

  return (
    <div className="subscription-public-page" style={{ minHeight: '100vh', background: '#fafbfc', paddingBottom: '90px' }}>`;

content = content.replace(oldReturn, newReturn);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SubscriptionPage.jsx updated successfully!');
