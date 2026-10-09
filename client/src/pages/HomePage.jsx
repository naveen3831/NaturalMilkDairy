import React, { useState } from 'react';
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
  HeartHandshake,
  Star,
  Check,
  Droplets,
  Calculator,
  MapPin,
  Flame,
  FileCheck2,
  Users,
  ShieldAlert,
  X,
  PhoneCall,
  Leaf,
  Layers,
  Percent,
} from 'lucide-react';
import { useDairy } from '../context/DairyContext';
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
    badgeColor: '#0d5c3a',
    fat: '4.2% Fat • 8.5% SNF',
    price: '₹60',
    numericPrice: 60,
    unit: '/ Litre',
    image: CLOUDINARY_MEDIA.cowMilk,
    desc: 'Freshly milked raw cow milk chilled in sterilized glass bottles. Natural golden cream layer, silky smooth taste.',
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
    image: CLOUDINARY_MEDIA.buffaloMilk,
    desc: 'Thick, creamy buffalo milk with exceptional fat content. Perfect for homemade rabdi, kheer, and dense malai.',
    highlights: ['Heavy Natural Malai', 'Zero Dilution', 'Pure Grass-Fed Cattle'],
  },
  {
    id: 'p4',
    category: 'curd',
    name: 'Traditional Farm Curd 500g',
    tagline: 'Cultured in earthen pots',
    badge: 'Clay Pot Set',
    badgeColor: '#0d5c3a',
    fat: 'Live Probiotics',
    price: '₹35',
    numericPrice: 35,
    unit: '/ 500g',
    image: CLOUDINARY_MEDIA.curd,
    desc: 'Naturally set probiotic curd with thick spoonable consistency. Natural subtle sweetness with zero sour preservatives.',
    highlights: ['Active Gut Cultures', 'Clay Pot Fermentation', 'Zero Gelatin / Stabilizers'],
  },
  {
    id: 'p5',
    category: 'curd',
    name: 'Artisanal Malai Paneer 250g',
    tagline: 'Melt-in-your-mouth soft',
    badge: 'Farm Made',
    badgeColor: '#166534',
    fat: 'High Protein • Pure Cow Milk',
    price: '₹90',
    numericPrice: 90,
    unit: '/ 250g',
    image: CLOUDINARY_MEDIA.paneer,
    desc: 'Crafted fresh every morning from whole cow milk curdled with natural lemon. Ultra-tender, juicy and spongy.',
    highlights: ['No Artificial Starch', 'Crafted Every Dawn', 'Vacuum Sealed Fresh'],
  },
  {
    id: 'p6',
    category: 'ghee',
    name: 'Vedic A2 Desi Cow Ghee 500ml',
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
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calcMilkQty, setCalcMilkQty] = useState(1);
  const [calcCurdQty, setCalcCurdQty] = useState(500);
  const [activeCategory, setActiveCategory] = useState('all');
  const [heroSelectedProduct, setHeroSelectedProduct] = useState('cow-milk');

  const handleSubscribe = (prod = null) => {
    setSelectedProduct(prod);
    setIsSubscribeOpen(true);
  };

  // Farm Products Data dynamically synced with MongoDB Atlas & store
  const products = (dbProducts && dbProducts.length > 0)
    ? dbProducts
        .filter((p) => p.status !== 'inactive')
        .map((p) => {
          const fallback = DEFAULT_HOME_PRODUCTS.find(
            (def) => def.id === p.id || def.name.toLowerCase() === (p.name || '').toLowerCase()
          );
          return {
            id: p.id,
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

  // Dynamic monthly estimate using live rates
  const cowMilkItem = products.find((p) => p.name.toLowerCase().includes('cow')) || products[0] || { numericPrice: 60 };
  const curdItem = products.find((p) => p.category === 'curd' || p.name.toLowerCase().includes('curd')) || { numericPrice: 35 };
  const cowMilkRate = Number(cowMilkItem.numericPrice) || 60;
  const curdRate = Number(curdItem.numericPrice) || 35;

  const monthlyMilkCost = calcMilkQty * cowMilkRate * 30;
  const monthlyCurdCost = (calcCurdQty / 500) * curdRate * 30;
  const totalMonthlyCost = monthlyMilkCost + monthlyCurdCost;

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="public-home-page" style={{ background: '#f8faf8', width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
      
      <section
        className="home-hero-banner"
        style={{
          backgroundImage: `url(${CLOUDINARY_MEDIA.heroDairy})`,
        }}
      >
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
                onClick={() => handleSubscribe(products[0])}
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
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '46px',
              alignItems: 'center',
            }}
          >
            {/* Left Column: Farm Purity Story */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#0d5c3a',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '10px',
                }}
              >
                <Leaf size={16} color="#0d5c3a" />
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
                <span style={{ color: '#0d5c3a' }}>Delivered In Glass Bottles.</span>
              </h2>

              <p style={{ fontSize: '1.02rem', color: '#475569', lineHeight: 1.65, marginBottom: '24px' }}>
                Taste the authentic sweetness of raw farm milk. Unlike supermarket packet milk that undergoes multi-day chemical standardization and powdered reconstitution, 
                our milk comes direct from single-origin grass-fed cows, chilled to 4°C in 30 minutes, and bottled in sterilized glass bottles.
              </p>

              {/* 3 Key Purity Checks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontSize: '0.94rem', fontWeight: 600 }}>
                  <CheckCircle size={19} color="#16a34a" />
                  <span>100% Unadulterated (Zero added water, starch, or milk powders)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontSize: '0.94rem', fontWeight: 600 }}>
                  <Clock size={19} color="#d98a0d" />
                  <span>Guaranteed Silent Drop Before 6:30 AM Every Single Day</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontSize: '0.94rem', fontWeight: 600 }}>
                  <ShieldCheck size={19} color="#0284c7" />
                  <span>Sterilized Food-Grade Glass Bottles (Zero Plastic Leaching)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Light Morning Subscription Selector Box */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f8faf8 0%, #edf7f0 100%)',
                borderRadius: '24px',
                padding: '36px',
                border: '1.5px solid #d1e7d8',
                boxShadow: '0 12px 36px rgba(13, 92, 58, 0.06)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#0d5c3a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                Quick Doorstep Subscription
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0c2340', marginBottom: '8px' }}>
                Select Your Morning Essential:
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#597361', marginBottom: '22px' }}>
                Click any item below to configure your morning delivery. Start with zero deposit and pause anytime.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
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
                      onClick={() => {
                        setHeroSelectedProduct(item.id);
                        handleSubscribe(item.prod);
                      }}
                      style={{
                        padding: '16px 18px',
                        borderRadius: '16px',
                        background: '#ffffff',
                        border: isSelected ? '2px solid #0d5c3a' : '1.5px solid #e2ece3',
                        boxShadow: isSelected ? '0 8px 20px rgba(13, 92, 58, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0d5c3a', textTransform: 'uppercase' }}>
                          {item.badge}
                        </span>
                        {isSelected && <Check size={16} color="#0d5c3a" />}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0c2340' }}>{item.label}</div>
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0d5c3a', marginTop: '4px' }}>{item.price}</div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => handleSubscribe(cowMilkItem || products[0])}
                className="shine-button dairy-btn-hover"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.02rem',
                  padding: '15px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(13, 92, 58, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
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
      {/* 3. 100% VX ALL LIGHT THEMED: DAILY QUALITY SEAL & DISPATCH    */}
      {/* ============================================================ */}
      <section
        style={{
          width: '100%',
          background: '#f8faf8',
          borderBottom: '1px solid #e2ece3',
          padding: '48px 24px',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          {/* Header Row: Seal Badge + Route + Star Rating (LIGHT THEMED) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '18px',
              marginBottom: '28px',
              paddingBottom: '22px',
              borderBottom: '1px solid #e2ece3',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: '#eaf5ee',
                  border: '1.5px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={26} color="#0d5c3a" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0c2340', margin: 0 }}>
                    Daily Farm Quality Seal
                  </h3>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: '#dcfce7',
                      border: '1px solid #86efac',
                      color: '#166534',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    Grade A+ Certified
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#597361', marginTop: '2px' }}>
                  Laboratory Certified at Farm at 04:45 AM • FSSAI Certified
                </div>
              </div>
            </div>

            {/* Route Status & Customer Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '30px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 8px #22c55e',
                  }}
                  className="pulse-badge"
                />
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0c2340' }}>
                  Tomorrow's 6:00 AM Mumbai Routes Active
                </span>
                <button
                  onClick={() => handleSubscribe(products[0])}
                  style={{
                    background: '#0d5c3a',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    border: 'none',
                    marginLeft: '4px',
                  }}
                >
                  Join Route
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', color: '#f5a623' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="#f5a623" color="#f5a623" />
                  ))}
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0c2340' }}>4.92 / 5.0</span>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>(850+ Mumbai Homes)</span>
              </div>
            </div>
          </div>

          {/* 4 Lab Verified Purity Metrics Cards Grid (LIGHT THEMED) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '18px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Natural Milk Fat Content</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#d97706', margin: '4px 0' }}>4.2% - 7.5%</div>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>Thick Homemade Golden Malai</div>
            </div>

            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>SNF (Solids Not Fat)</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', margin: '4px 0' }}>8.6% - 9.2%</div>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>High Natural Whey & Casein Protein</div>
            </div>

            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Chemical Adulterants</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0284c7', margin: '4px 0' }}>0.0%</div>
              <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600 }}>Zero Added Water, Starch, or Urea</div>
            </div>

            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Chilling Temperature</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0891b2', margin: '4px 0' }}>3.8°C</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Chilled within 30 min of milking</div>
            </div>
          </div>

          {/* Live Dispatch Counters Row (LIGHT THEMED) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e2ece3',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Milk size={24} color="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0c2340' }}>1,420 Litres</div>
                <div style={{ fontSize: '0.8rem', color: '#597361' }}>Morning Harvest Yield</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} color="#166534" />
              </div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0c2340' }}>99.8% On-Time</div>
                <div style={{ fontSize: '0.8rem', color: '#597361' }}>Delivered Before 6:30 AM</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCheck2 size={24} color="#0369a1" />
              </div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0c2340' }}>Daily Tested</div>
                <div style={{ fontSize: '0.8rem', color: '#597361' }}>Lab Certified Every Dawn</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} color="#be185d" />
              </div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0c2340' }}>850+ Families</div>
                <div style={{ fontSize: '0.8rem', color: '#597361' }}>Active Daily Subscribers</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. 100% VX: OUR PASTURE HERD & ETHICAL FARM (COW IMAGES)      */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1440px', margin: '80px auto 0 auto', padding: '0 32px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          {/* Real Photo of Desi Gir & Holstein Cows in Pasture */}
          <div
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
              position: 'relative',
              height: '420px',
            }}
          >
            <img
              src={CLOUDINARY_MEDIA.cowsPasture}
              alt="Healthy Indian Desi Cows Grazing in Pasture"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: 'rgba(7, 22, 41, 0.85)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '0.84rem',
                fontWeight: 700,
              }}
            >
              🌱 100% Free-Range Pasture Grazing • Ethical Cattle Care
            </div>
          </div>

          {/* Herd Heritage Copy */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                borderRadius: '20px',
                background: '#eaf5ee',
                color: '#0d5c3a',
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '12px',
              }}
            >
              <HeartHandshake size={15} color="#0d5c3a" />
              <span>Ethical Farm Standards</span>
            </div>

            <h2 style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.5rem)', color: '#0c2340', fontWeight: 800, lineHeight: 1.25 }}>
              Healthy, Happy Cows Make Naturally Sweeter Milk
            </h2>

            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.65, marginTop: '14px', marginBottom: '18px' }}>
              Unlike industrial dairy factories where cattle are confined to small cement stalls and injected with growth hormones, 
              our cattle roam freely in lush green pastures under natural sunlight. They graze on natural organic clover and fresh grasses.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#166534', fontWeight: 600 }}>
                <Check size={16} color="#16a34a" />
                <span>Zero Oxytocin or Hormones</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#166534', fontWeight: 600 }}>
                <Check size={16} color="#16a34a" />
                <span>Clean Automated Milking</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#166534', fontWeight: 600 }}>
                <Check size={16} color="#16a34a" />
                <span>Ayurvedic Veterinary Care</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#166534', fontWeight: 600 }}>
                <Check size={16} color="#16a34a" />
                <span>Mineral-Rich Clean Water</span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('story')}
              style={{
                background: '#0d5c3a',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.92rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <span>Read Our Full Farm Story</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. 100% VX: FRESH MILK POURING & GLASS BOTTLING GALLERY      */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1440px', margin: '80px auto 0 auto', padding: '0 32px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '30px',
          }}
        >
          {/* Card 1: Glass Milk Pour */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '1.5px solid #e2ece3',
              boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ height: '260px', overflow: 'hidden' }}>
              <img
                src={CLOUDINARY_MEDIA.milkPour}
                alt="Fresh Whole Milk Pouring from Glass Bottle"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '26px' }}>
              <h3 style={{ fontSize: '1.3rem', color: '#0c2340', fontWeight: 800, marginBottom: '8px' }}>
                Taste Real Raw Sweetness
              </h3>
              <p style={{ color: '#597361', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Commercial pasteurized packet milk loses its natural enzymes and aromas. Our farm milk is chilled to 4°C immediately, 
                preserving that creamy, naturally sweet taste your grandparents remember.
              </p>
            </div>
          </div>

          {/* Card 2: Glass Bottles Lineup */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '1.5px solid #e2ece3',
              boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ height: '260px', overflow: 'hidden' }}>
              <img
                src={CLOUDINARY_MEDIA.glassBottles}
                alt="Sterilized Glass Milk Bottles Lineup"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '26px' }}>
              <h3 style={{ fontSize: '1.3rem', color: '#0c2340', fontWeight: 800, marginBottom: '8px' }}>
                Sterilized Glass, Zero Plastic
              </h3>
              <p style={{ color: '#597361', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Hot milk packed in cheap plastic pouches leaches phthalates and microplastics. 
                We pack exclusively in food-grade, multi-stage sterilized glass bottles for absolute purity.
              </p>
            </div>
          </div>

          {/* Card 3: Sunrise Dairy Farm */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '1.5px solid #e2ece3',
              boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ height: '260px', overflow: 'hidden' }}>
              <img
                src={CLOUDINARY_MEDIA.organicFarm}
                alt="Sunrise Organic Dairy Farm"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '26px' }}>
              <h3 style={{ fontSize: '1.3rem', color: '#0c2340', fontWeight: 800, marginBottom: '8px' }}>
                From Farm To Doorstep in 3 Hours
              </h3>
              <p style={{ color: '#597361', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Milked at 4:30 AM, bottled by 5:15 AM, and delivered silently outside your door by 6:30 AM. 
                The fastest, freshest dairy journey in Mumbai.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. 100% VX: ARTISANAL FARM PRODUCTS COLLECTION               */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1440px', margin: '90px auto 0 auto', padding: '0 32px' }}>
        <div
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Products (5)' },
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
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: '1.5px solid #e2ece3',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
              }}
            >
              {/* Product Visual Container */}
              <div className="public-product-image" style={{ position: 'relative', width: '100%', height: '240px', overflow: 'hidden', background: '#f8faf8' }}>
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="product-img"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.src = CLOUDINARY_MEDIA.heroDairy;
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
                  <div style={{ fontSize: '0.78rem', color: '#0d5c3a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
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
                        <Check size={14} color="#0d5c3a" />
                        <span>{h}</span>
                      </div>
                    ))}
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
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0d5c3a' }}>{prod.price}</span>
                    <span style={{ fontSize: '0.82rem', color: '#597361', marginLeft: '4px' }}>{prod.unit}</span>
                  </div>

                  <button
                    onClick={() => handleSubscribe(prod)}
                    className="dairy-btn-hover public-product-subscribe"
                    style={{
                      background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
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
                      boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
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
                <th style={{ padding: '20px 24px', fontSize: '1.05rem', color: '#0d5c3a', background: '#eaf5ee', fontWeight: 900 }}>
                  🌿 Natural Milk Dairy (Ours)
                </th>
                <th style={{ padding: '20px 24px', fontSize: '0.96rem', color: '#64748b' }}>Supermarket Plastic Pouches</th>
                <th style={{ padding: '20px 24px', fontSize: '0.96rem', color: '#64748b' }}>Local Dudhwala (Loose Milk)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Milk Source & Cattle Welfare</td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#0d5c3a" />
                    <span>Single-Origin Grass-Fed Pasture Cattle</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>Pooled from hundreds of commercial middlemen</td>
                <td style={{ color: '#64748b' }}>Unknown untraceable city stable sheds</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Processing & Chilling Speed</td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#0d5c3a" />
                    <span>Chilled to 4°C within 30 min of milking</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>Multi-day transport & intense heat pasteurization</td>
                <td style={{ color: '#64748b' }}>Unrefrigerated open cans carried in traffic</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Packaging Materials</td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#0d5c3a" />
                    <span>Sterilized Food-Grade Glass Bottles</span>
                  </div>
                </td>
                <td style={{ color: '#ef4444' }}>Single-use plastic pouches (leaches microplastics)</td>
                <td style={{ color: '#64748b' }}>Open metal cans or reused plastic containers</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Adulterants & Reconstitution</td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#0d5c3a" />
                    <span>Zero water, zero milk powder, zero starch</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>Standardized with reconstituted milk powder</td>
                <td style={{ color: '#ef4444' }}>Common dilution with untested tap water</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Vacation Pause & Flexible Qty</td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#0d5c3a" />
                    <span>1-Tap Pause Online / WhatsApp Instant</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>N/A (Must walk to store manually every day)</td>
                <td style={{ color: '#ef4444' }}>Frequent diary disputes over skipped dates</td>
              </tr>
              <tr>
                <td style={{ padding: '18px 24px', fontWeight: 700 }}>Billing Transparency & UPI</td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#0d5c3a" />
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
                background: '#eaf5ee',
                color: '#0d5c3a',
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '10px',
              }}
            >
              <Calculator size={14} color="#0d5c3a" />
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
                  <span style={{ fontWeight: 900, color: '#0d5c3a', fontSize: '1.25rem' }}>{calcMilkQty} L / day</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={calcMilkQty}
                  onChange={(e) => setCalcMilkQty(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#0d5c3a', height: '6px' }}
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
                background: 'linear-gradient(135deg, #f7faf8 0%, #edf7f0 100%)',
                borderRadius: '22px',
                padding: '36px',
                color: '#0c2340',
                textAlign: 'center',
                border: '1.5px solid #d1e7d8',
                boxShadow: '0 8px 24px rgba(13, 92, 58, 0.06)',
              }}
            >
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0d5c3a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Estimated 30-Day Monthly Total
              </div>
              <div style={{ fontSize: '3.4rem', fontWeight: 900, color: '#0d5c3a', margin: '6px 0', letterSpacing: '-0.02em' }}>
                ₹{totalMonthlyCost}
              </div>
              <div style={{ fontSize: '0.92rem', color: '#597361', marginBottom: '22px' }}>
                ₹{(calcMilkQty * cowMilkRate + (calcCurdQty / 500) * curdRate).toFixed(0)} per morning • Free Doorstep Delivery Included
              </div>

              <button
                onClick={() => handleSubscribe(cowMilkItem || products[0])}
                className="shine-button dairy-btn-hover"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '1rem',
                  padding: '15px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(13, 92, 58, 0.35)',
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
      <section style={{ maxWidth: '1440px', margin: '90px auto', padding: '0 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '46px' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '26px' }}>
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
          ].map((t, tidx) => (
            <div
              key={tidx}
              className="dairy-card-interactive"
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '30px',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={17} fill="#f5a623" color="#f5a623" />
                  ))}
                </div>
                <p style={{ color: '#334155', fontSize: '0.96rem', lineHeight: 1.65, fontStyle: 'italic', marginBottom: '22px' }}>
                  "{t.quote}"
                </p>
              </div>

              <div style={{ borderTop: '1px solid #edf3ee', paddingTop: '16px' }}>
                <div style={{ fontWeight: 900, color: '#0c2340', fontSize: '1.02rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                  {t.area} • <span style={{ color: '#0d5c3a', fontWeight: 700 }}>{t.plan}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 10. PRE-FOOTER LIGHT MINT SATISFACTION GUARANTEE BANNER      */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1440px', margin: '0 auto 80px auto', padding: '0 32px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #eaf5ee 0%, #f0fdf4 100%)',
            borderRadius: '28px',
            padding: '48px 38px',
            color: '#0c2340',
            border: '2px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '26px',
            boxShadow: '0 16px 40px rgba(13, 92, 58, 0.08)',
          }}
        >
          <div style={{ maxWidth: '640px' }}>
            <span
              style={{
                background: '#0d5c3a',
                color: '#ffffff',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              100% Satisfaction Guarantee
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0c2340', marginTop: '12px' }}>
              Taste The Difference Tomorrow Morning
            </h2>
            <p style={{ color: '#475569', fontSize: '1.02rem', marginTop: '8px', lineHeight: 1.6 }}>
              Sign up today with zero deposit. If you don't taste the unmistakable sweetness 
              and rich cream layer on your first delivery, your morning is on us.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSubscribe(products[0])}
              className="shine-button dairy-btn-hover"
              style={{
                background: '#0d5c3a',
                color: '#ffffff',
                padding: '16px 32px',
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 8px 24px rgba(13, 92, 58, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Milk size={19} />
              <span>Start Tomorrow's Delivery</span>
            </button>
          </div>
        </div>
      </section>

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
