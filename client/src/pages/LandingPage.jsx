import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDairy } from '../context/DairyContext';
import {
  Milk,
  CheckCircle,
  Truck,
  Calendar,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  Clock,
  Sparkles,
  Award,
  ArrowRight,
  ArrowUpRight,
  Sun,
  Droplets,
  HeartHandshake,
  Check,
  ChevronDown,
  Phone,
  MapPin,
  Mail,
  MessageSquare,
  Database,
} from 'lucide-react';
import SubscribeModal from '../components/SubscribeModal';
import StaffLoginModal from '../components/StaffLoginModal';

export default function LandingPage({ setActiveTab }) {
  const { switchUser } = useAuth();
  const { products, deliveryBoys } = useDairy();

  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isStaffLoginOpen, setIsStaffLoginOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [openFaq, setOpenFaq] = useState(0);

  const handleOpenSubscribe = (prod = null) => {
    setSelectedProduct(prod);
    setIsSubscribeOpen(true);
  };

  const handleAdminLaunch = () => {
    switchUser('admin');
    setActiveTab('dashboard');
  };

  const handleDeliveryLaunch = () => {
    switchUser('usr_boy_1');
    setActiveTab('delivery-boy-app');
  };

  const catalogProducts = [
    {
      id: 'p1',
      name: 'Farm Fresh Cow Milk 1L',
      category: 'milk',
      desc: 'Pure, sweet cow milk freshly drawn and chilled within 30 minutes of milking in sterilized glass bottles.',
      price: '₹60',
      unit: 'per 1 Litre',
      badge: 'Bestseller',
      tagColor: '#0d5c3a',
      tagBg: '#eaf5ee',
      fat: '4.2% Fat • 8.5% SNF',
    },
    {
      id: 'p2',
      name: 'Farm Fresh Cow Milk 500ml',
      category: 'milk',
      desc: 'Convenient daily half-litre pack, perfect for morning tea, filter coffee, and young children.',
      price: '₹30',
      unit: 'per 500 ml',
      badge: 'Daily Pack',
      tagColor: '#0c2340',
      tagBg: '#edf4fc',
      fat: '4.2% Fat • 8.5% SNF',
    },
    {
      id: 'p3',
      name: 'Pure Buffalo Milk 1L',
      category: 'milk',
      desc: 'Thick, creamy high-fat buffalo milk. Yields golden yellow malai, ideal for kheer, ghee and paneer.',
      price: '₹75',
      unit: 'per 1 Litre',
      badge: 'High Cream',
      tagColor: '#d98a0d',
      tagBg: '#fef8eb',
      fat: '7.5% Fat • 9.0% SNF',
    },
    {
      id: 'p4',
      name: 'Traditional Farm Curd 500g',
      category: 'curd',
      desc: 'Natural probiotic curd set with grandmother cultures. Thick, velvety texture without sourness.',
      price: '₹35',
      unit: 'per 500 g',
      badge: 'Probiotic',
      tagColor: '#0d5c3a',
      tagBg: '#eaf5ee',
      fat: 'Clay-pot styled',
    },
    {
      id: 'p5',
      name: 'Traditional Farm Curd 1kg',
      category: 'curd',
      desc: 'Family saver pack. Rich in gut-friendly bacteria and natural dairy calcium.',
      price: '₹65',
      unit: 'per 1 Kg',
      badge: 'Family Saver',
      tagColor: '#0c2340',
      tagBg: '#edf4fc',
      fat: 'Zero Preservatives',
    },
    {
      id: 'p6',
      name: 'A2 Vedic Desi Ghee 500ml',
      category: 'ghee',
      desc: 'Traditional bilona churned pure desi cow ghee with granular texture and divine traditional aroma.',
      price: '₹480',
      unit: 'per 500 ml',
      badge: 'Traditional A2',
      tagColor: '#b45309',
      tagBg: '#fef3c7',
      fat: '100% Bilona Churned',
    },
    {
      id: 'p7',
      name: 'Fresh Malai Paneer 250g',
      category: 'curd',
      desc: 'Melt-in-mouth artisanal cottage cheese made from fresh morning whole milk. Soft and protein-rich.',
      price: '₹95',
      unit: 'per 250 g',
      badge: 'Fresh Daily',
      tagColor: '#0d5c3a',
      tagBg: '#eaf5ee',
      fat: 'No Starch • High Protein',
    },
  ];

  const filteredProducts =
    activeCategory === 'all'
      ? catalogProducts
      : catalogProducts.filter((p) => p.category === activeCategory);

  const faqs = [
    {
      q: 'What time is the milk delivered in the morning?',
      a: 'All deliveries are guaranteed before 6:30 AM every morning. Our delivery boys begin their routes by 5:30 AM to ensure fresh cold milk is ready before your morning tea and breakfast.',
    },
    {
      q: 'How do I pause my delivery if I am traveling or on vacation?',
      a: 'You can pause your subscription anytime with zero penalty. Simply notify us via WhatsApp or have our delivery boy set your vacation pause dates. Deliveries automatically resume on your return date.',
    },
    {
      q: 'Do you charge a bottle deposit or use plastic pouches?',
      a: 'We believe in eco-friendly, healthy living. We deliver in sterilized food-grade glass bottles and hygiene-sealed containers. Simply leave yesterday’s washed empty bottle at your doorstep, and our delivery partner swaps it out seamlessly.',
    },
    {
      q: 'How does billing and monthly payment work?',
      a: 'Every daily delivery is logged automatically in our digital ledger. At month-end, you receive an itemized statement on WhatsApp with full dates, quantities, and a 1-tap UPI payment link. Cash collection is also supported.',
    },
    {
      q: 'How is Natural Milk Dairy different from packaged supermarket milk?',
      a: 'Supermarket milk is often processed for weeks and reconstituted from powdered milk. Our milk comes directly from grass-fed local dairy cows, chilled immediately at 4°C, and delivered to your doorstep within hours of milking with zero chemicals or water addition.',
    },
  ];

  return (
    <div style={{ background: '#f8faf8', minHeight: '100vh', color: '#14241a' }}>
      {/* ============================================================ */}
      {/* HERO SECTION — EXACT MATCH TO SCREENSHOT                     */}
      {/* ============================================================ */}
      <section
        id="home"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '740px',
          backgroundImage: 'url(/hero-dairy.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Seamless dark organic forest green overlay matching the screenshot */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(7, 39, 21, 0.96) 0%, rgba(9, 46, 26, 0.94) 38%, rgba(10, 48, 27, 0.72) 54%, rgba(10, 48, 27, 0.2) 74%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Content Container */}
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            padding: '80px 24px',
            width: '100%',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div style={{ maxWidth: '650px' }}>
            {/* Eyebrow Tag: ☼ GOOD MORNINGS BEGIN NATURALLY */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '28px',
              }}
            >
              <span style={{ fontSize: '1.1rem', color: '#E5B842' }}>☼</span>
              <span>GOOD MORNINGS BEGIN NATURALLY</span>
            </div>

            {/* Giant Bold Headline Matching Screenshot */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.8rem, 6.2vw, 4.6rem)',
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                marginBottom: '24px',
              }}
            >
              Natural Milk<br />
              Dairy.<br />
              A fresh start.<br />
              <span style={{ color: '#E5B842' }}>Every single day.</span>
            </h1>

            {/* Subtitle Matching Screenshot */}
            <p
              style={{
                fontSize: 'clamp(1.05rem, 2vw, 1.28rem)',
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 400,
                maxWidth: '560px',
                marginBottom: '36px',
              }}
            >
              The comfort of fresh milk. The goodness of curd.<br />
              Your everyday essentials, delivered to your door.
            </p>

            {/* CTA Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '38px',
              }}
            >
              <button
                onClick={() => handleOpenSubscribe()}
                style={{
                  background: 'linear-gradient(135deg, #E5B842 0%, #D4A32A 100%)',
                  color: '#071629',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(229, 184, 66, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(229, 184, 66, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(229, 184, 66, 0.4)';
                }}
              >
                <Milk size={20} />
                <span>Subscribe & Order Now</span>
              </button>

              <button
                onClick={() => {
                  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(10px)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  padding: '15px 28px',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(255, 255, 255, 0.45)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)';
                  e.currentTarget.style.borderColor = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.45)';
                }}
              >
                <span>Explore Products</span>
                <ChevronRight size={18} />
              </button>

              <button
                onClick={() => setIsStaffLoginOpen(true)}
                style={{
                  background: 'transparent',
                  color: '#bbf7d0',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <ShieldCheck size={16} />
                <span>Staff Portal ↗</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d1fae5', fontSize: '0.86rem' }}>
                <Check size={16} color="#4ade80" />
                <span>100% Unadulterated</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d1fae5', fontSize: '0.86rem' }}>
                <Clock size={16} color="#E5B842" />
                <span>Delivered Before 6:30 AM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d1fae5', fontSize: '0.86rem' }}>
                <Database size={16} color="#67e8f9" />
                <span>MongoDB Atlas Synced</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4 HIGHLIGHT METRICS BAR                                      */}
      {/* ============================================================ */}
      <section
        style={{
          background: '#0c2340',
          color: '#ffffff',
          padding: '30px 24px',
          boxShadow: '0 8px 30px rgba(12, 35, 64, 0.15)',
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(229, 184, 66, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Milk size={26} color="#E5B842" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>100% Pure</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Grass-fed cows & buffaloes</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(134, 239, 172, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={26} color="#86efac" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>By 6:30 AM</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Guaranteed doorstep drop</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(103, 232, 249, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Smartphone size={26} color="#67e8f9" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>₹0 Paper</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>WhatsApp ledger & receipts</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(244, 114, 182, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar size={26} color="#f472b6" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>Easy Pause</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>1-Tap vacation management</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* OUR PRODUCTS SECTION (#products)                             */}
      {/* ============================================================ */}
      <section
        id="products"
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '80px 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '46px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#eaf5ee',
              color: '#0d5c3a',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            <Sparkles size={14} color="#0d5c3a" />
            Farm-Fresh Daily Essentials
          </div>
          <h2 style={{ fontSize: '2.6rem', color: '#0c2340', fontWeight: 900, margin: '4px 0 12px 0' }}>
            Our Products
          </h2>
          <p style={{ color: '#597361', maxWidth: '620px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Pure, unpasteurized, cold-chain protected cow milk, rich buffalo milk, thick traditional curd, and artisanal desi ghee.
          </p>

          {/* Category Tabs */}
          <div
            style={{
              display: 'inline-flex',
              background: '#ffffff',
              padding: '5px',
              borderRadius: '30px',
              border: '1px solid #e2ece3',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              marginTop: '28px',
              gap: '4px',
            }}
          >
            {[
              { id: 'all', label: 'All Essentials' },
              { id: 'milk', label: 'Fresh Milk' },
              { id: 'curd', label: 'Curd & Paneer' },
              { id: 'ghee', label: 'Vedic Desi Ghee' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '25px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeCategory === cat.id ? '#0d5c3a' : 'transparent',
                  color: activeCategory === cat.id ? '#ffffff' : '#4b5563',
                  transition: 'all 0.2s',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1.5px solid #e5ece6',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 18px rgba(13, 92, 58, 0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(13, 92, 58, 0.12)';
                e.currentTarget.style.borderColor = '#0d5c3a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(13, 92, 58, 0.05)';
                e.currentTarget.style.borderColor = '#e5ece6';
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: p.tagBg,
                      color: p.tagColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {p.badge}
                  </span>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#f8faf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Milk size={20} color="#0d5c3a" />
                  </div>
                </div>

                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#0c2340',
                    marginBottom: '8px',
                    lineHeight: 1.3,
                  }}
                >
                  {p.name}
                </h3>

                <p
                  style={{
                    fontSize: '0.88rem',
                    color: '#597361',
                    lineHeight: 1.55,
                    marginBottom: '16px',
                  }}
                >
                  {p.desc}
                </p>

                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#0d5c3a',
                    background: '#f0fdf4',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    display: 'inline-block',
                    marginBottom: '20px',
                  }}
                >
                  {p.fat}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '16px',
                  borderTop: '1px solid #edf3ee',
                }}
              >
                <div>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0d5c3a' }}>{p.price}</span>
                  <span style={{ fontSize: '0.8rem', color: '#597361', marginLeft: '5px' }}>{p.unit}</span>
                </div>

                <button
                  onClick={() => handleOpenSubscribe(p)}
                  style={{
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(13, 92, 58, 0.25)',
                  }}
                >
                  <span>Subscribe</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* OUR STORY & THE FARM PROMISE (#story)                        */}
      {/* ============================================================ */}
      <section
        id="story"
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e5ece6',
          borderBottom: '1px solid #e5ece6',
          padding: '90px 24px',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '60px',
              alignItems: 'center',
            }}
          >
            {/* Left Story Content */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '14px',
                }}
              >
                <HeartHandshake size={15} />
                Our Story & The Dairy Mission
              </div>

              <h2
                style={{
                  fontSize: 'clamp(2.2rem, 4vw, 3rem)',
                  fontWeight: 900,
                  color: '#0c2340',
                  lineHeight: 1.15,
                  marginBottom: '20px',
                }}
              >
                From Pasture to Your Doorstep in Under 4 Hours
              </h2>

              <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.7, marginBottom: '20px' }}>
                Natural Milk Dairy was born with a single promise: <strong>zero shortcuts</strong>.
                We believe that milk should be as honest as nature intended. No adulteration with vegetable oil,
                no detergent powders, no hormone injections, and no days spent in warehouses.
              </p>

              <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.7, marginBottom: '32px' }}>
                Our cows are fed certified green organic fodder grown on our own fields. Milking is completed
                touchlessly before 4:30 AM, instantly chilled down to 4°C, sealed in sterilized glass bottles,
                and dispatched right to your doorstep before dawn.
              </p>

              {/* 4 Pillars */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#dcfce7',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0c2340', fontSize: '0.95rem' }}>Direct Farm Sourced</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>No middleman milk pools</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#dcfce7',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0c2340', fontSize: '0.95rem' }}>Strict 4°C Cold Chain</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Retains natural enzymes</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#dcfce7',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0c2340', fontSize: '0.95rem' }}>Sterilized Glass Bottles</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Zero plastic leaching</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#dcfce7',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0c2340', fontSize: '0.95rem' }}>Daily Lab Testing</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Fat & purity certified</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Story Graphic Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0d5c3a 0%, #0c2340 100%)',
                borderRadius: '24px',
                padding: '40px',
                color: '#ffffff',
                boxShadow: '0 20px 40px rgba(13, 92, 58, 0.25)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ marginBottom: '28px' }}>
                <span
                  style={{
                    color: '#E5B842',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  The Morning Timeline
                </span>
                <h3 style={{ fontSize: '1.8rem', color: '#ffffff', marginTop: '6px' }}>
                  Freshness Clock
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div
                    style={{
                      width: '64px',
                      fontWeight: 900,
                      color: '#E5B842',
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    04:00 AM
                  </div>
                  <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>Gentle Milking</div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Hygienic touchless milking parlor</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div
                    style={{
                      width: '64px',
                      fontWeight: 900,
                      color: '#E5B842',
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    04:45 AM
                  </div>
                  <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>Cold Chilling & Bottling</div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Chilled to 4°C and sealed in glass bottles</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div
                    style={{
                      width: '64px',
                      fontWeight: 900,
                      color: '#E5B842',
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    05:30 AM
                  </div>
                  <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>Delivery Boy Dispatch</div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Route optimization via mobile app</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div
                    style={{
                      width: '64px',
                      fontWeight: 900,
                      color: '#86efac',
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    06:30 AM
                  </div>
                  <div style={{ borderLeft: '2px solid #86efac', paddingLeft: '16px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#86efac' }}>At Your Doorstep</div>
                    <div style={{ fontSize: '0.85rem', color: '#ffffff' }}>Silent morning drop ready for tea & coffee</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '36px' }}>
                <button
                  onClick={() => handleOpenSubscribe()}
                  style={{
                    width: '100%',
                    background: '#E5B842',
                    color: '#071629',
                    fontWeight: 800,
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                >
                  Start Morning Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FREQUENTLY ASKED QUESTIONS (#faqs)                           */}
      {/* ============================================================ */}
      <section
        id="faqs"
        style={{
          maxWidth: '920px',
          margin: '0 auto',
          padding: '80px 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '46px' }}>
          <span
            style={{
              color: '#0d5c3a',
              fontWeight: 800,
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Got Questions?
          </span>
          <h2 style={{ fontSize: '2.5rem', color: '#0c2340', fontWeight: 900, marginTop: '6px' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: '#597361', fontSize: '1.02rem', marginTop: '6px' }}>
            Everything you need to know about our daily milk delivery, billing, and quality guarantee.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: isOpen ? '1.5px solid #0d5c3a' : '1px solid #e2ece3',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  boxShadow: isOpen ? '0 6px 20px rgba(13, 92, 58, 0.08)' : '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <h4 style={{ fontSize: '1.08rem', color: '#0c2340', fontWeight: 700, margin: 0 }}>
                    {faq.q}
                  </h4>
                  <ChevronDown
                    size={20}
                    color={isOpen ? '#0d5c3a' : '#94a3b8'}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 24px 22px 24px',
                      color: '#475569',
                      fontSize: '0.95rem',
                      lineHeight: 1.65,
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '16px',
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* CONTACT & ORDER INQUIRY SECTION (#contact)                   */}
      {/* ============================================================ */}
      <section
        id="contact"
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e5ece6',
          padding: '80px 24px',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '48px',
            }}
          >
            {/* Contact Details */}
            <div>
              <span
                style={{
                  color: '#0d5c3a',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Get In Touch
              </span>
              <h2 style={{ fontSize: '2.4rem', color: '#0c2340', fontWeight: 900, marginTop: '6px', marginBottom: '16px' }}>
                We're Here For You
              </h2>
              <p style={{ color: '#597361', lineHeight: 1.6, marginBottom: '32px' }}>
                Have questions about our milk, want to start a custom delivery plan, or need delivery assistance? Reach out anytime!
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: '#eaf5ee',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0d5c3a',
                    }}
                  >
                    <Phone size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Helpline & WhatsApp Orders</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0c2340' }}>+91 98765 43210</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: '#edf4fc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0c2340',
                    }}
                  >
                    <MapPin size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Dairy Farm & Dispatch Facility</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0c2340' }}>
                      Plot 14, Green Valley Agro Hub, Andheri, Mumbai 400053
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: '#fef8eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#d98a0d',
                    }}
                  >
                    <Clock size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Operating Hours</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0c2340' }}>
                      Deliveries: 5:00 AM – 7:00 AM • Customer Care: 8:00 AM – 8:00 PM
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact Form */}
            <div
              style={{
                background: '#f8faf8',
                borderRadius: '20px',
                padding: '32px',
                border: '1.5px solid #e2ece3',
              }}
            >
              <h3 style={{ fontSize: '1.3rem', color: '#0c2340', marginBottom: '8px' }}>
                Request a Free Milk Sample / Callback
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#597361', marginBottom: '22px' }}>
                Enter your details and our local delivery route manager will contact you within 30 minutes.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert('Thank you! Your request has been received. Our manager will call you shortly.');
                }}
              >
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Your Name
                  </label>
                  <input type="text" required placeholder="Ramesh Patel" />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Mobile / WhatsApp Number
                  </label>
                  <input type="tel" required placeholder="9876543210" />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Delivery Area / Society
                  </label>
                  <input type="text" required placeholder="e.g. Andheri West, Lokhandwala" />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '13px',
                    borderRadius: '10px',
                    fontSize: '0.98rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Request Morning Trial
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <footer
        style={{
          background: '#071629',
          color: '#ffffff',
          padding: '60px 24px 30px 24px',
          borderTop: '3px solid #0d5c3a',
        }}
      >
        <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '24px',
              paddingBottom: '36px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img
                src="/logo.png"
                alt="Natural Milk Dairy"
                style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ffffff' }}
              />
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.3rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    letterSpacing: '0.02em',
                  }}
                >
                  NATURAL MILK DAIRY
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#E5B842',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  NATURAL • PURE • HEALTHY
                </div>
              </div>
            </div>

            {/* Quick Staff Jump */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleAdminLaunch}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <ShieldCheck size={16} color="#86efac" /> Dairy Owner Portal
              </button>

              <button
                onClick={handleDeliveryLaunch}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Truck size={16} color="#E5B842" /> Delivery Partner App
              </button>
            </div>
          </div>

          <div
            style={{
              paddingTop: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.82rem',
              color: '#94a3b8',
            }}
          >
            <div>
              © 2026 Natural Milk Dairy. All rights reserved. Pure farm milk and automated daily ledger.
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(13, 92, 58, 0.3)',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#86efac',
                fontSize: '0.78rem',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'inline-block',
                }}
              />
              <span>MongoDB Atlas Cloud Connected & Synchronized</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        preselectedProduct={selectedProduct}
      />

      <StaffLoginModal
        isOpen={isStaffLoginOpen}
        onClose={() => setIsStaffLoginOpen(false)}
        onLoginSuccess={(targetTab) => setActiveTab(targetTab)}
      />
    </div>
  );
}
