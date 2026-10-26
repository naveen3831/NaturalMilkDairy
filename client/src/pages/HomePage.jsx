import React, { useState, useMemo } from 'react';
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
  ArrowRight,
  Star,
  Check,
  Droplets,
  Calculator,
  MapPin,
  Flame,
  Users,
  ShieldAlert,
  X,
  PhoneCall,
  Leaf,
  Layers,
  Percent,
} from 'lucide-react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { getProductImage } from './admin/ProductsPricing';
import SubscribeModal from '../components/SubscribeModal';
import Footer from '../components/Footer';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

const DEFAULT_HOME_PRODUCTS = [
  {
    id: 'p1',
    category: 'milk',
    name: 'Farm Fresh Cow Milk 1L',
    tagline: 'Single-origin morning harvest',
    badge: 'Bestseller',
    badgeColor: '#059669',
    fat: '4.2% Fat • 8.5% SNF',
    price: '₹60',
    numericPrice: 60,
    unit: '/ Litre',
    image: CLOUDINARY_MEDIA.cowMilk,
    desc: 'Freshly milked pure organic farm cow milk chilled to 4°C in sterilized glass bottles.',
    highlights: ['Glass Bottle Packaging', 'No Hormones / Oxytocin', 'Chilled to 4°C in 30 Mins'],
  },
  {
    id: 'p2',
    category: 'milk',
    name: 'Farm Fresh Cow Milk 500ml',
    tagline: 'Single-origin morning harvest',
    badge: 'Fresh Daily',
    badgeColor: '#0c2340',
    fat: '4.2% Fat • 8.5% SNF',
    price: '₹30',
    numericPrice: 30,
    unit: '/ 500ml',
    image: CLOUDINARY_MEDIA.cowMilk500ml || '/product-cow-milk-500ml.jpg',
    desc: 'Convenient daily half-litre pack of pure farm cow milk, ideal for morning chai & coffee.',
    highlights: ['Glass Bottle Packaging', 'No Hormones / Oxytocin', 'Chilled to 4°C in 30 Mins'],
  },
  {
    id: 'p3',
    category: 'milk',
    name: 'Pure Buffalo Milk 1L',
    tagline: 'Rich, thick & velvety',
    badge: 'High Cream Malai',
    badgeColor: '#d98a0d',
    fat: '7.5% Fat • 9.0% SNF',
    price: '₹75',
    numericPrice: 75,
    unit: '/ Litre',
    image: CLOUDINARY_MEDIA.buffaloMilk || '/product-buffalo-milk.jpg',
    desc: 'Thick creamy high-fat pure buffalo milk with rich natural malai.',
    highlights: ['Heavy Natural Malai', 'Zero Dilution', 'Pure Grass-Fed Cattle'],
  },
  {
    id: 'p4',
    category: 'curd',
    name: 'Thick Farm Curd 500g',
    tagline: 'Single-origin morning harvest',
    badge: 'Pure Produce',
    badgeColor: '#059669',
    fat: '100% Pure',
    price: '₹35',
    numericPrice: 35,
    unit: '/ 500g',
    image: CLOUDINARY_MEDIA.curd,
    desc: 'Traditional earthen pot set creamy dahi with natural gut probiotics.',
    highlights: ['Glass Bottle Packaging', 'No Hormones / Oxytocin', 'Chilled to 4°C in 30 Mins'],
  },
  {
    id: 'p5',
    category: 'curd',
    name: 'Fresh Malai Paneer 250g',
    tagline: 'Melt-in-your-mouth soft',
    badge: 'Farm Made',
    badgeColor: '#166534',
    fat: 'High Protein • Pure Cow Milk',
    price: '₹95',
    numericPrice: 95,
    unit: '/ 250g',
    image: CLOUDINARY_MEDIA.paneer,
    desc: 'Crafted fresh every morning from whole cow milk curdled with natural lemon. Ultra-tender, juicy and spongy.',
    highlights: ['No Artificial Starch', 'Crafted Every Dawn', 'Vacuum Sealed Fresh'],
  },
  {
    id: 'p6',
    category: 'ghee',
    name: 'A2 Vedic Desi Ghee 500ml',
    tagline: 'Traditional Bilona churned',
    badge: 'Bilona Churned',
    badgeColor: '#b45309',
    fat: '100% Pure A2 Butter Fat',
    price: '₹480',
    numericPrice: 480,
    unit: '/ 500ml',
    image: CLOUDINARY_MEDIA.ghee,
    desc: 'Handmade slow-cooked bilona ghee from whole cultured curd butter. Golden granular texture and authentic nutty aroma.',
    highlights: ['Traditional Bilona Method', 'Granular Golden Grain', 'Zero Palm Oil / Hydrogenated Fat'],
  },
];

export default function HomePage({ setActiveTab }) {
  const { products: dbProducts } = useDairy();
  const { user } = useAuth();
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calcMilkQty, setCalcMilkQty] = useState(1);
  const [calcCurdQty, setCalcCurdQty] = useState(500);
  const [activeCategory, setActiveCategory] = useState('all');
  const [heroSelectedProduct, setHeroSelectedProduct] = useState('cow-milk');

  const handleProductClick = (prod) => {
    if (!prod) return;
    const prodIdentifier = prod.id || prod._id || prod.name;
    try {
      localStorage.setItem('nmd_selected_product_id', String(prodIdentifier));
      localStorage.setItem('nmd_selected_product_name', prod.name || '');
      localStorage.setItem('nmd_selected_product_obj', JSON.stringify(prod));
    } catch (e) {}

    window.dispatchEvent(
      new CustomEvent('nmd_select_product', {
        detail: { product: prod, id: prodIdentifier },
      })
    );

    if (typeof setActiveTab === 'function') {
      setActiveTab('products', prodIdentifier);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribe = (prod = null) => {
    if (!user) {
      if (prod) {
        localStorage.setItem('nmd_pending_subscription', JSON.stringify({
          ...prod,
          selectedQty: prod.selectedQty || 1,
          selectedFrequency: prod.selectedFrequency || 'daily',
        }));
      }
      setActiveTab('login');
      return;
    }
    if (user.role !== 'customer') {
      window.alert('Please sign in with a customer account to start a subscription.');
      return;
    }

    setSelectedProduct(prod ? {
      ...prod,
      selectedQty: prod.selectedQty || 1,
      selectedFrequency: prod.selectedFrequency || 'daily',
    } : null);
    setIsSubscribeOpen(true);
  };

  // Farm Products Data dynamically synced with MongoDB Atlas & store
  const products = useMemo(() => {
    return (dbProducts && dbProducts.length > 0)
      ? dbProducts
          .filter((p) => p.status !== 'inactive')
          .map((p) => {
            const fallback = DEFAULT_HOME_PRODUCTS.find(
              (def) => def.id === (p.id || p._id) || def.name.toLowerCase() === (p.name || '').toLowerCase()
            );
            return {
              id: p.id || p._id,
              category: p.category || fallback?.category || 'milk',
              name: p.name,
              tagline: fallback?.tagline || 'Single-origin morning harvest',
              badge: fallback?.badge || (p.category === 'milk' ? 'Fresh Daily' : 'Pure Produce'),
              badgeColor: fallback?.badgeColor || '#0d5c3a',
              fat: fallback?.fat || (p.category === 'milk' ? '4.2% Fat • 8.5% SNF' : '100% Pure'),
              price: `₹${p.price}`,
              numericPrice: Number(p.price),
              unit: p.unit?.startsWith('/') ? p.unit : `/ ${p.unit || 'Litre'}`,
              image: p.image || getProductImage(p),
              desc: p.description || fallback?.desc || 'Freshly milked pure natural dairy chilled in sterilized glass bottles.',
              highlights: fallback?.highlights || ['Glass Bottle Packaging', 'No Hormones / Oxytocin', 'Chilled to 4°C in 30 Mins'],
            };
          })
      : DEFAULT_HOME_PRODUCTS;
  }, [dbProducts]);

  // Dynamic monthly estimate using live rates
  const cowMilkItem = products.find((p) => p.name.toLowerCase().includes('cow')) || products[0] || { numericPrice: 60 };
  const curdItem = products.find((p) => p.category === 'curd' || p.name.toLowerCase().includes('curd')) || { numericPrice: 35 };
  const cowMilkRate = Number(cowMilkItem.numericPrice) || 60;
  const curdRate = Number(curdItem.numericPrice) || 35;

  const monthlyMilkCost = calcMilkQty * cowMilkRate * 30;
  const monthlyCurdCost = (calcCurdQty / 500) * curdRate * 30;
  const totalMonthlyCost = monthlyMilkCost + monthlyCurdCost;

  const filteredProducts = useMemo(() => {
    return activeCategory === 'all'
      ? products
      : products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  return (
    <div className="public-home-page" style={{ background: '#f8faf8', width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
      
      <section className="home-hero-banner">
        <div
          className="home-hero-bg"
          style={{
            backgroundImage: `url(${CLOUDINARY_MEDIA.heroDairy}), url(/hero-dairy.jpg)`,
          }}
          role="img"
          aria-label="Fresh farm milk, glass bottle, and dairy pasture"
        />
        <div className="home-hero-overlay" />
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <div className="home-hero-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              <span>Fresh from our farm to your family</span>
            </div>

            <h1>
              A better start to
              <br />
              every morning.
              <span className="home-hero-title-accent">Pure dairy. Simply delivered.</span>
            </h1>

            <p className="home-hero-description">
              Thoughtfully sourced milk and dairy, prepared fresh and delivered to your
              doorstep each morning.
            </p>

            <div className="home-hero-actions">
              <button
                onClick={() => setActiveTab('products')}
                className="home-hero-button home-hero-button-primary"
              >
                <span>Explore our dairy</span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className="home-hero-button home-hero-button-secondary"
              >
                <Milk size={18} aria-hidden="true" />
                <span>Start a subscription</span>
              </button>
            </div>

            <div className="home-hero-trust">
              <div>
                <CheckCircle size={17} aria-hidden="true" />
                <span>Carefully sourced</span>
              </div>
              <div>
                <Clock size={17} aria-hidden="true" />
                <span>Morning delivery</span>
              </div>
              <div>
                <ShieldCheck size={17} aria-hidden="true" />
                <span>Quality you can trust</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. 100% VX LIGHT SECTION: QUICK MORNING ESSENTIALS & MATTER   */}
      {/* ============================================================ */}
      <section
        className="home-morning-section"
        style={{
          width: '100%',
          background: '#ffffff',
          borderBottom: '1px solid #e2ece3',
          padding: '54px 24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div
            className="home-morning-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '46px',
              alignItems: 'center',
            }}
          >
            {/* Left Column: Farm Purity Story (Desktop - Unchanged) */}
            <div className="home-purity-story-desktop">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#059669',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '10px',
                }}
              >
                <Leaf size={16} color="#059669" />
                <span>Good Mornings Begin Naturally</span>
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 3.2vw, 2.7rem)',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  color: '#0c2340',
                  marginBottom: '14px',
                }}
              >
                Pure, Fresh Milk Drawn Every Dawn.<br />
                <span style={{ color: '#059669' }}>Delivered In Glass Bottles.</span>
              </h2>

              <p style={{ fontSize: '1.02rem', color: '#475569', lineHeight: 1.65, marginBottom: '24px' }}>
                Taste the authentic sweetness of raw farm milk. Unlike supermarket packet milk that undergoes multi-day chemical standardization and powdered reconstitution, 
                our milk comes direct from single-origin grass-fed cows, chilled to 4°C in 30 minutes, and bottled in sterilized glass bottles.
              </p>

              {/* 3 Key Purity Checks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#065f46', fontSize: '0.94rem', fontWeight: 600 }}>
                  <CheckCircle size={19} color="#059669" />
                  <span>100% Unadulterated (Zero added water, starch, or milk powders)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#065f46', fontSize: '0.94rem', fontWeight: 600 }}>
                  <Clock size={19} color="#d98a0d" />
                  <span>Guaranteed Silent Drop Before 6:30 AM Every Single Day</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#065f46', fontSize: '0.94rem', fontWeight: 600 }}>
                  <ShieldCheck size={19} color="#0284c7" />
                  <span>Sterilized Food-Grade Glass Bottles (Zero Plastic Leaching)</span>
                </div>
              </div>
            </div>

            {/* Mobile Responsive Redesigned Story: Simple, Sleek & Professional */}
            <div className="home-purity-story-mobile">
              <div className="home-mobile-purity-badge">
                <Leaf size={13} color="#059669" />
                <span>Good Mornings Begin Naturally</span>
              </div>
              <h2 className="home-mobile-purity-title">
                Pure Milk Drawn at Dawn.<br />
                <span>Delivered in Glass Bottles.</span>
              </h2>
              <div className="home-mobile-purity-pills">
                <div className="home-mobile-pill">
                  <CheckCircle size={12} color="#059669" />
                  <span>100% Raw & Pure</span>
                </div>
                <div className="home-mobile-pill">
                  <Clock size={12} color="#d98a0d" />
                  <span>Drop by 6:30 AM</span>
                </div>
                <div className="home-mobile-pill">
                  <ShieldCheck size={12} color="#0284c7" />
                  <span>Glass Bottled</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Light Morning Subscription Selector Box */}
            <div
              className="home-subscription-selector-card"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                borderRadius: '24px',
                padding: '36px',
                border: '1.5px solid #d1fae5',
                boxShadow: '0 12px 36px rgba(5, 150, 105, 0.06)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                Quick Doorstep Subscription
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0c2340', marginBottom: '8px' }}>
                Select Your Morning Essential:
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#597361', marginBottom: '22px' }}>
                Click any item below to configure your morning delivery. Start with zero deposit and pause anytime.
              </p>

              <div className="home-selector-items-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                {[
                  {
                    id: 'cow-milk',
                    label: 'Desi Cow Milk',
                    price: `${cowMilkItem.price || '₹60'}/L`,
                    badge: 'Bestseller',
                    prod: cowMilkItem,
                  },
                  {
                    id: 'buf-milk',
                    label: 'Rich Buffalo Milk',
                    price: `${(products.find((p) => p.name.toLowerCase().includes('buffalo')) || {}).price || '₹75'}/L`,
                    badge: 'High Malai',
                    prod: products.find((p) => p.name.toLowerCase().includes('buffalo')) || products[1] || products[0],
                  },
                  {
                    id: 'curd',
                    label: 'Clay Pot Curd',
                    price: `${curdItem.price || '₹35'}/500g`,
                    badge: 'Probiotic',
                    prod: curdItem,
                  },
                  {
                    id: 'ghee',
                    label: 'A2 Bilona Ghee',
                    price: `${(products.find((p) => p.category === 'ghee' || p.name.toLowerCase().includes('ghee')) || {}).price || '₹480'}/500ml`,
                    badge: 'Pure A2',
                    prod: products.find((p) => p.category === 'ghee' || p.name.toLowerCase().includes('ghee')) || products[4] || products[0],
                  },
                ].map((item) => {
                  const isSelected = heroSelectedProduct === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`home-selector-item-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        setHeroSelectedProduct(item.id);
                        handleProductClick(item.prod);
                      }}
                      style={{
                        padding: '16px 18px',
                        borderRadius: '16px',
                        background: '#ffffff',
                        border: isSelected ? '2px solid #059669' : '1.5px solid #e2ece3',
                        boxShadow: isSelected ? '0 8px 20px rgba(5, 150, 105, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '112px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {item.badge}
                        </span>
                        {isSelected && <Check size={16} color="#059669" strokeWidth={2.5} />}
                      </div>
                      <div className="home-selector-item-title" style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0c2340', lineHeight: 1.25, minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                        {item.label}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1.18rem', color: '#059669', marginTop: 'auto', paddingTop: '6px' }}>
                        {item.price}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => handleSubscribe(cowMilkItem || products[0])}
                className="home-selector-submit-btn shine-button dairy-btn-hover"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.02rem',
                  padding: '15px 20px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(5, 150, 105, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxSizing: 'border-box',
                }}
              >
                <Milk size={19} />
                <span>Start Doorstep Subscription</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>

        </div>
      </section>



      {/* ============================================================ */}
      {/* 4. ARTISANAL FARM PRODUCTS COLLECTION                         */}
      {/* ============================================================ */}
      <section className="public-home-products-section" style={{ maxWidth: '1440px', margin: '90px auto 0 auto', padding: '0 32px' }}>
        <div
          className="public-home-products-header"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '38px',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#0d5c3a',
                fontWeight: 800,
                fontSize: '0.84rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '8px',
              }}
            >
              <Sparkles size={16} color="#d98a0d" />
              <span>Direct From Single-Source Farm</span>
            </div>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#0c2340', fontWeight: 900 }}>
              Our Pure Dairy Collection
            </h2>
            <p style={{ color: '#597361', maxWidth: '620px', fontSize: '1rem', marginTop: '6px' }}>
              Zero adulteration, raw farm chilling to 4°C within 30 minutes, delivered in sterilized glass bottles before 6:30 AM across Mumbai.
            </p>
          </div>

          {/* Interactive Category Tabs */}
          <div className="public-home-category-tabs" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All Products (${products.length})` },
              { id: 'milk', label: 'Fresh Milks' },
              { id: 'curd', label: 'Curd & Paneer' },
              { id: 'ghee', label: 'Desi A2 Ghee' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`tab-pill ${activeCategory === tab.id ? 'active' : 'inactive'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5 Luxury Product Cards Grid */}
        <div className="public-home-product-grid public-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="dairy-product-card"
              onClick={() => handleProductClick(prod)}
              role="button"
              tabIndex={0}
              aria-label={`View ${prod.name} details in products catalog`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProductClick(prod);
                }
              }}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: '1.5px solid #e2ece3',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
              }}
            >
              {/* Product Visual Container */}
              <div className="public-product-image" style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxHeight: '340px', overflow: 'hidden', background: '#f6f9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="product-img"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%', display: 'block', transition: 'transform 0.35s ease' }}
                  onError={(e) => {
                    e.currentTarget.src = prod.name?.toLowerCase().includes('buffalo')
                      ? '/product-buffalo-milk.jpg'
                      : prod.name?.toLowerCase().includes('500')
                      ? '/product-cow-milk-500ml.jpg'
                      : CLOUDINARY_MEDIA.cowMilk;
                  }}
                />
                
                {/* Floating Top Badge */}
                <span
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    padding: '5px 12px',
                    borderRadius: '30px',
                    background: '#ffffff',
                    color: prod.badgeColor,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {prod.badge}
                </span>

                {/* Nutrition Floating Spec Tag */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(7, 22, 41, 0.84)',
                    color: '#ffffff',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  {prod.fat}
                </span>
              </div>

              {/* Product Information Body */}
              <div className="public-product-card-body" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div className="public-product-card-info">
                  <div className="public-product-tagline" style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    {prod.tagline}
                  </div>
                  <h3 style={{ fontSize: '1.3rem', color: '#0c2340', fontWeight: 800, marginBottom: '8px' }}>
                    {prod.name}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#597361', lineHeight: 1.55, marginBottom: '16px' }}>
                    {prod.desc}
                  </p>

                  {/* Feature Checklist */}
                  <div className="public-product-card-features" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                    {prod.highlights.map((h, hidx) => (
                      <div key={hidx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#334155' }}>
                        <Check size={14} color="#059669" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  {/* Compact Mobile Micro Data Badges */}
                  <div className="public-product-card-data-row">
                    <span className="public-card-data-pill">
                      <Check size={9} color="#059669" />
                      <span>{prod.highlights?.[0] || 'Glass Bottled'}</span>
                    </span>
                    <span className="public-card-data-pill">
                      <Sparkles size={9} color="#d98a0d" />
                      <span>{prod.highlights?.[1] || (prod.category === 'milk' ? 'Raw 4°C Chilled' : '100% Pure A2')}</span>
                    </span>
                  </div>
                </div>

                {/* Price & Action Footer */}
                <div
                  className="public-product-card-footer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #edf3ee',
                    paddingTop: '16px',
                  }}
                >
                  <div className="public-product-price">
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669' }}>{prod.price}</span>
                    <span style={{ fontSize: '0.82rem', color: '#597361', marginLeft: '4px' }}>{prod.unit}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubscribe(prod);
                    }}
                    className="dairy-btn-hover public-product-subscribe"
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                    }}
                  >
                    <span>Subscribe Daily</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. 100% VX: HONEST PURITY COMPARISON MATRIX                  */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1440px', margin: '90px auto 0 auto', padding: '0 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '20px',
              background: '#eaf5ee',
              color: '#0d5c3a',
              fontSize: '0.82rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '10px',
            }}
          >
            <ShieldCheck size={14} color="#0d5c3a" />
            <span>The Honest Purity Standard</span>
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#0c2340', fontWeight: 900 }}>
            Why Natural Milk Dairy Leaves Others Far Behind
          </h2>
          <p style={{ color: '#597361', maxWidth: '640px', margin: '8px auto 0 auto', fontSize: '1rem' }}>
            Compare fresh glass-bottled dairy directly against supermarket plastic pouches and traditional loose milkmen.
          </p>
        </div>

        <div
          className="table-responsive"
          style={{
            boxShadow: '0 12px 40px rgba(0,0,0,0.04)',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1.5px solid #e2ece3',
          }}
        >
          <table className="dairy-table" style={{ background: '#ffffff', width: '100%' }}>
            <thead>
              <tr style={{ background: '#f4f8f5' }}>
                <th style={{ padding: '20px 24px', fontSize: '0.98rem', color: '#0c2340' }}>Standard / Purity Metric</th>
                <th style={{ padding: '20px 24px', fontSize: '1.05rem', color: '#059669', background: '#ecfdf5', fontWeight: 900 }}>
                  🌿 Natural Milk Dairy (Ours)
                </th>
                <th style={{ padding: '20px 24px', fontSize: '0.96rem', color: '#64748b' }}>Supermarket Plastic Pouches</th>
                <th style={{ padding: '20px 24px', fontSize: '0.96rem', color: '#64748b' }}>Local Dudhwala (Loose Milk)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Milk Source & Cattle Welfare</td>
                <td style={{ background: '#f9fdfa', color: '#059669', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#059669" />
                    <span>Single-Origin Grass-Fed Pasture Cattle</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>Pooled from hundreds of commercial middlemen</td>
                <td style={{ color: '#64748b' }}>Unknown untraceable city stable sheds</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Processing & Chilling Speed</td>
                <td style={{ background: '#f9fdfa', color: '#059669', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#059669" />
                    <span>Chilled to 4°C within 30 min of milking</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>Multi-day transport & intense heat pasteurization</td>
                <td style={{ color: '#64748b' }}>Unrefrigerated open cans carried in traffic</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Packaging Materials</td>
                <td style={{ background: '#f9fdfa', color: '#059669', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#059669" />
                    <span>Sterilized Food-Grade Glass Bottles</span>
                  </div>
                </td>
                <td style={{ color: '#ef4444' }}>Single-use plastic pouches (leaches microplastics)</td>
                <td style={{ color: '#64748b' }}>Open metal cans or reused plastic containers</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Adulterants & Reconstitution</td>
                <td style={{ background: '#f9fdfa', color: '#059669', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#059669" />
                    <span>Zero water, zero milk powder, zero starch</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>Standardized with reconstituted milk powder</td>
                <td style={{ color: '#ef4444' }}>Common dilution with untested tap water</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Vacation Pause & Flexible Qty</td>
                <td style={{ background: '#f9fdfa', color: '#059669', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#059669" />
                    <span>1-Tap Pause Online / WhatsApp Instant</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>N/A (Must walk to store manually every day)</td>
                <td style={{ color: '#ef4444' }}>Frequent diary disputes over skipped dates</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Billing Transparency & UPI</td>
                <td style={{ background: '#f9fdfa', color: '#059669', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#059669" />
                    <span>Automated WhatsApp Ledger & 1-Click UPI</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>Daily checkout queues & manual invoices</td>
                <td style={{ color: '#ef4444' }}>Unreadable paper notebooks prone to miscalculation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. 100% VX ALL LIGHT THEMED: MONTHLY DAIRY COST CALCULATOR   */}
      {/* ============================================================ */}
      <section className="public-home-calculator-section" style={{ maxWidth: '1360px', margin: '90px auto 0 auto', padding: '0 32px' }}>
        <div
          className="public-home-calculator"
          style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '48px 36px',
            color: '#0c2340',
            border: '1.5px solid #e2ece3',
            boxShadow: '0 16px 45px rgba(13, 92, 58, 0.08)',
          }}
        >
          <div className="public-home-calculator-heading" style={{ textAlign: 'center', marginBottom: '38px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: '20px',
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '10px',
              }}
            >
              <Calculator size={14} color="#059669" />
              <span>Transparent Pricing Calculator</span>
            </div>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.6rem)', color: '#0c2340', fontWeight: 900 }}>
              Calculate Your Family's Monthly Dairy Plan
            </h2>
            <p style={{ color: '#597361', maxWidth: '620px', margin: '8px auto 0 auto', fontSize: '1rem' }}>
              Adjust daily quantities below to see transparent daily & monthly totals with zero hidden delivery charges.
            </p>
          </div>

          <div
            className="public-home-calculator-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '34px',
              alignItems: 'center',
            }}
          >
            {/* Left Controls Sliders (LIGHT THEMED) */}
            <div
              className="public-home-calculator-controls"
              style={{
                background: '#f8faf8',
                padding: '30px',
                borderRadius: '20px',
                border: '1.5px solid #e2ece3',
              }}
            >
              <div style={{ marginBottom: '26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0c2340' }}>Daily Farm Cow Milk (Litres)</label>
                  <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.25rem' }}>{calcMilkQty} L / day</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={calcMilkQty}
                  onChange={(e) => setCalcMilkQty(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#059669', height: '6px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                  <span>0.5 L (₹30)</span>
                  <span>1 L (₹60)</span>
                  <span>2 L (₹120)</span>
                  <span>4 L (₹240)</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0c2340' }}>Daily Fresh Farm Curd (Grams)</label>
                  <span style={{ fontWeight: 900, color: '#d97706', fontSize: '1.25rem' }}>{calcCurdQty} g / day</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="250"
                  value={calcCurdQty}
                  onChange={(e) => setCalcCurdQty(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#d97706', height: '6px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                  <span>0 g</span>
                  <span>250 g</span>
                  <span>500 g (₹35)</span>
                  <span>1,000 g (₹65)</span>
                </div>
              </div>
            </div>

            {/* Right Summary Card (LIGHT THEMED) */}
            <div
              className="public-home-calculator-summary"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                borderRadius: '22px',
                padding: '36px',
                color: '#0c2340',
                textAlign: 'center',
                border: '1.5px solid #d1fae5',
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.08)',
              }}
            >
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Estimated 30-Day Monthly Total
              </div>
              <div style={{ fontSize: '3.4rem', fontWeight: 900, color: '#059669', margin: '6px 0', letterSpacing: '-0.02em' }}>
                ₹{totalMonthlyCost}
              </div>
              <div style={{ fontSize: '0.92rem', color: '#597361', marginBottom: '22px' }}>
                ₹{(calcMilkQty * cowMilkRate + (calcCurdQty / 500) * curdRate).toFixed(0)} per morning • Free Doorstep Delivery Included
              </div>

              <button
                onClick={() => setActiveTab('products')}
                className="shine-button dairy-btn-hover"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '1rem',
                  padding: '15px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(5, 150, 105, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>Start This Subscription</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. 100% VX: VERIFIED MUMBAI CUSTOMER TESTIMONIALS            */}
      {/* ============================================================ */}
      <section className="home-reviews-section">
        <style>{`
          .home-reviews-section {
            max-width: 1440px;
            margin: 90px auto;
            padding: 0 32px;
          }
          .home-reviews-header {
            text-align: center;
            margin-bottom: 46px;
          }
          .home-reviews-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 26px !important;
            width: 100% !important;
          }
          .home-review-card {
            background: #ffffff;
            border-radius: 24px;
            padding: 30px;
            border: 1.5px solid #e2ece3;
            box-shadow: 0 6px 20px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-width: 0;
            box-sizing: border-box;
          }
          .home-review-stars {
            display: flex;
            gap: 4px;
            margin-bottom: 14px;
          }
          .home-review-quote {
            color: #334155;
            font-size: 0.96rem;
            line-height: 1.65;
            font-style: italic;
            margin-bottom: 22px;
          }
          .home-review-author-box {
            border-top: 1px solid #edf3ee;
            padding-top: 16px;
          }
          .home-review-name {
            font-weight: 900;
            color: #0c2340;
            font-size: 1.02rem;
          }
          .home-review-info {
            font-size: 0.82rem;
            color: #64748b;
            margin-top: 2px;
          }
          .home-review-mobile-only {
            display: none !important;
          }

          @media (max-width: 768px) {
            .home-reviews-section {
              margin: 40px auto 44px !important;
              padding: 0 10px !important;
            }
            .home-reviews-header {
              margin-bottom: 20px !important;
            }
            .home-reviews-header h2 {
              font-size: 1.35rem !important;
              line-height: 1.25 !important;
            }
            .home-reviews-header p {
              font-size: 0.80rem !important;
              line-height: 1.38 !important;
              margin-top: 6px !important;
            }
            .home-reviews-grid {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 8px !important;
              width: 100% !important;
            }
            .home-review-card {
              padding: 12px 9px !important;
              border-radius: 14px !important;
              border-width: 1px !important;
              box-shadow: 0 2px 10px rgba(0,0,0,0.03) !important;
              min-width: 0 !important;
              width: 100% !important;
            }
            .home-review-mobile-only {
              display: flex !important;
            }
            .home-review-stars {
              gap: 2px !important;
              margin-bottom: 6px !important;
            }
            .home-review-stars svg {
              width: 11px !important;
              height: 11px !important;
            }
            .home-review-quote {
              font-size: 0.72rem !important;
              line-height: 1.38 !important;
              margin-bottom: 8px !important;
              color: #334155 !important;
              word-break: break-word;
            }
            .home-review-author-box {
              padding-top: 8px !important;
            }
            .home-review-name {
              font-size: 0.76rem !important;
              line-height: 1.2 !important;
              word-break: break-word;
            }
            .home-review-info {
              font-size: 0.64rem !important;
              margin-top: 2px !important;
              line-height: 1.3 !important;
              word-break: break-word;
            }
          }
        `}</style>
        <div className="home-reviews-header">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '20px',
              background: '#eaf5ee',
              color: '#0d5c3a',
              fontSize: '0.82rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '10px',
            }}
          >
            <Star size={14} color="#f5a623" fill="#f5a623" />
            <span>Real Family Experiences</span>
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#0c2340', fontWeight: 900 }}>
            Loved by 850+ Mumbai Households
          </h2>
          <p style={{ color: '#597361', maxWidth: '600px', margin: '8px auto 0 auto', fontSize: '1rem' }}>
            Hear how switching to pure, glass-bottled farm milk transformed morning breakfast routines.
          </p>
        </div>

        <div className="home-reviews-grid">
          {[
            {
              quote: 'The thick golden malai layer on the cow milk is unreal! My kids now actually ask for milk in the morning. And the glass bottle packaging feels so clean and nostalgic.',
              name: 'Priya & Rajesh Iyer',
              area: 'Andheri West (Lokhandwala)',
              plan: '1.5L Cow Milk Daily',
            },
            {
              quote: 'Being able to pause delivery when we go out of station with 1 click without having to argue over milk notebook entries at the end of the month is a blessing.',
              name: 'Sunita Deshmukh',
              area: 'Bandra West (Pali Hill)',
              plan: '1L Milk + 500g Curd',
            },
            {
              quote: 'Punctual 6:00 AM drop every single day without fail. The buffalo milk makes the best thick kheer and homemade paneer we have had in years.',
              name: 'Amit & Neha Shah',
              area: 'Juhu Scheme',
              plan: '2L Buffalo Milk Alternate Days',
            },
            {
              quote: 'Pure raw milk with zero adulteration. Morning delivery before 6:30 AM is always on time, and our tea and coffee taste so much richer now.',
              name: 'Dr. Rohan & Kavita Mehta',
              area: 'Powai (Hiranandani)',
              plan: '1L Gir Cow Milk Daily',
              mobileOnly: true,
            },
          ].map((t, tidx) => (
            <div
              key={tidx}
              className={`home-review-card dairy-card-interactive ${t.mobileOnly ? 'home-review-mobile-only' : ''}`}
            >
              <div>
                <div className="home-review-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={17} fill="#f5a623" color="#f5a623" />
                  ))}
                </div>
                <p className="home-review-quote">
                  "{t.quote}"
                </p>
              </div>

              <div className="home-review-author-box">
                <div className="home-review-name">{t.name}</div>
                <div className="home-review-info">
                  {t.area} • <span style={{ color: '#059669', fontWeight: 700 }}>{t.plan}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 10. PRE-FOOTER LIGHT MINT SATISFACTION GUARANTEE BANNER      */}
      {/* ============================================================ */}



      {/* Global Subscription Modal */}
      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        preselectedProduct={selectedProduct}
      />

      {/* Full Brand Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
