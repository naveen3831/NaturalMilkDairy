import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Heart, LayoutGrid, Soup, Calendar, Search, ShoppingCart, Leaf, PhoneCall, Truck, X, Milk, Sparkles, Check, ArrowRight, ShieldCheck, Droplets, Clock, HeartHandshake, Eye, Snowflake, Flame } from 'lucide-react';
import { useDairy } from '../context/DairyContext';
import { getProductImage } from './admin/ProductsPricing';
import SubscribeModal from '../components/SubscribeModal';
import ProductDetailsView from './ProductDetailsView';
import Footer from '../components/Footer';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';
import { useAuth } from '../context/AuthContext';

const DEFAULT_CATALOG = [
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
    image: CLOUDINARY_MEDIA.cowMilk,
    features: ['100% Unadulterated', 'Chilled to 4°C', 'Eco Glass Bottle'],
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
    image: CLOUDINARY_MEDIA.cowMilk500ml || '/product-cow-milk-500ml.jpg',
    features: ['Fresh Every Dawn', 'Sealed Bottle', 'Easy Morning Drop'],
  },
  {
    id: 'p3',
    name: 'Pure Buffalo Milk 1L',
    category: 'milk',
    desc: 'Thick, creamy high-fat buffalo milk. Yields golden yellow malai, ideal for rich kheer, homemade ghee and paneer.',
    price: '₹75',
    unit: 'per 1 Litre',
    badge: 'High Cream',
    tagColor: '#d98a0d',
    tagBg: '#fef8eb',
    fat: '7.5% Fat • 9.0% SNF',
    image: CLOUDINARY_MEDIA.buffaloMilk || '/product-buffalo-milk.jpg',
    features: ['Extra Thick Malai', 'Natural Cream', 'Wholesome Taste'],
  },
  {
    id: 'p4',
    name: 'Traditional Farm Curd 500g',
    category: 'curd',
    desc: 'Natural probiotic curd set in traditional earthen clay pots. Thick, velvety texture without unpleasant sourness.',
    price: '₹35',
    unit: 'per 500 g',
    badge: 'Probiotic',
    tagColor: '#0d5c3a',
    tagBg: '#eaf5ee',
    fat: 'Clay-Pot Set',
    image: CLOUDINARY_MEDIA.curd,
    features: ['Live Gut Cultures', 'Zero Gelatin / Starch', 'Cool & Refreshing'],
  },
  {
    id: 'p5',
    name: 'Traditional Farm Curd 1kg',
    category: 'curd',
    desc: 'Family saver pack. Rich in gut-friendly bacteria and natural dairy calcium for healthy daily meals.',
    price: '₹65',
    unit: 'per 1 Kg',
    badge: 'Family Saver',
    tagColor: '#0c2340',
    tagBg: '#edf4fc',
    fat: 'Zero Preservatives',
    image: CLOUDINARY_MEDIA.curd,
    features: ['High Calcium', 'Perfect for Raita & Chaas', 'Naturally Set'],
  },
  {
    id: 'p6',
    name: 'A2 Vedic Desi Ghee 500ml',
    category: 'ghee',
    desc: 'Traditional bilona churned pure desi cow ghee with granular golden texture and divine authentic aroma.',
    price: '₹480',
    unit: 'per 500 ml',
    badge: 'Traditional A2',
    tagColor: '#b45309',
    tagBg: '#fef3c7',
    fat: '100% Bilona Churned',
    image: CLOUDINARY_MEDIA.ghee,
    features: ['Hand Churned (Bilona)', 'Rich Golden Grain', 'Immunity Booster'],
  },
  {
    id: 'p7',
    name: 'Fresh Malai Paneer 250g',
    category: 'curd',
    desc: 'Melt-in-mouth artisanal cottage cheese made from fresh morning whole milk. Soft, spongey and protein-rich.',
    price: '₹95',
    unit: 'per 250 g',
    badge: 'Fresh Daily',
    tagColor: '#0d5c3a',
    tagBg: '#eaf5ee',
    fat: 'High Protein',
    image: CLOUDINARY_MEDIA.paneer,
    features: ['No Artificial Starch', 'Soft & Creamy', 'Made Daily'],
  },
];

const findMatchingProduct = (list, query, queryName = '') => {
  if (!list || !list.length) return null;
  const qStr = (query || '').toString().trim().toLowerCase();
  const qNameStr = (queryName || '').toString().trim().toLowerCase();

  // 1. Direct id / _id match
  if (qStr) {
    const byId = list.find((p) => 
      (p.id && String(p.id).toLowerCase() === qStr) || 
      (p._id && String(p._id).toLowerCase() === qStr)
    );
    if (byId && (!qNameStr || byId.name.trim().toLowerCase() === qNameStr)) {
      return byId;
    }
  }

  // 2. Exact name match
  const searchName = qNameStr || qStr;
  if (searchName) {
    const byExactName = list.find(
      (p) => p.name && p.name.trim().toLowerCase() === searchName
    );
    if (byExactName) return byExactName;
  }

  // 3. Normalized alphanumeric match
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normSearch = norm(searchName);
  if (normSearch) {
    const byNorm = list.find((p) => norm(p.name) === normSearch);
    if (byNorm) return byNorm;

    const byContains = list.find(
      (p) =>
        norm(p.name).includes(normSearch) ||
        (normSearch.length > 4 && normSearch.includes(norm(p.name)))
    );
    if (byContains) return byContains;
  }

  // 4. Fallback ID match if found earlier
  if (qStr) {
    const byIdFallback = list.find((p) => 
      (p.id && String(p.id).toLowerCase() === qStr) || 
      (p._id && String(p._id).toLowerCase() === qStr)
    );
    if (byIdFallback) return byIdFallback;
  }

  return null;
};

export default function ProductsPage({ setActiveTab }) {
  const { products: dbProducts } = useDairy();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const lastTargetKeyRef = useRef(null);

  // Live dynamic catalog from MongoDB Atlas & local database (memoized to keep stable reference)
  const catalogProducts = useMemo(() => {
    return (dbProducts && dbProducts.length > 0)
      ? dbProducts
          .filter((p) => p.status !== 'inactive')
          .map((p) => {
            const fallback = DEFAULT_CATALOG.find(
              (def) => def.id === (p.id || p._id) || def.name.toLowerCase() === (p.name || '').toLowerCase()
            );
            return {
              id: p.id || p._id,
              name: p.name,
              category: p.category || fallback?.category || 'milk',
              desc: p.description || fallback?.desc || 'Pure unadulterated farm dairy produce delivered fresh every morning.',
              price: `₹${p.price}`,
              numericPrice: Number(p.price),
              unit: p.unit?.startsWith('per') ? p.unit : `per ${p.unit || '1 Litre'}`,
              badge: fallback?.badge || (p.category === 'milk' ? 'Farm Fresh' : 'Pure Dairy'),
              tagColor: fallback?.tagColor || '#0d5c3a',
              tagBg: fallback?.tagBg || '#eaf5ee',
              fat: fallback?.fat || (p.category === 'milk' ? '4.2% Fat • 8.5% SNF' : '100% Pure'),
              image: p.image || getProductImage(p),
              images: Array.isArray(p.images) ? p.images : [],
              features: fallback?.features || ['100% Unadulterated', 'Chilled to 4°C', 'Food-Grade Sealed'],
            };
          })
      : DEFAULT_CATALOG;
  }, [dbProducts]);

  const filteredProducts = useMemo(() => {
    return activeCategory === 'all'
      ? catalogProducts
      : catalogProducts.filter((p) => p.category === activeCategory);
  }, [catalogProducts, activeCategory]);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [favProducts, setFavProducts] = useState(new Set());
  const toggleFav = (id) => {
    setFavProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderMobileProducts = () => {
    const categories = [
      { id: 'all', label: 'All Products', icon: LayoutGrid },
      { id: 'milk', label: 'Fresh Milk', icon: Milk },
      { id: 'curd', label: 'Curd & Paneer', icon: Soup },
      { id: 'ghee', label: 'Ghee & Butter', icon: Flame },
    ];

    const displayProducts = filteredProducts.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.desc && p.desc.toLowerCase().includes(q));
    });

    return (
      <div className="mobile-products-page-container">
        {/* Left-Aligned Heading matching Image with Milk Splash */}
        <div className="mobile-products-header-box">
          <div className="mobile-products-header-text">
            <h2 className="mobile-products-title">Our Products</h2>
            <p className="mobile-products-subtitle">
              Pure, cold-chain protected cow milk, rich buffalo milk, thick traditional curd and artisanal desi ghee delivered fresh every dawn.
            </p>
          </div>
          <div className="mobile-products-header-splash">
            <img src="/header_milk_splash.png" alt="" />
          </div>
        </div>

        {/* Search Bar matching Image 2 */}
        <div className="mobile-products-search-box">
          <Search size={18} color="#64748B" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Filter Chips matching Image 2 */}
        <div className="mobile-products-pills-row">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            const IconComp = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                className={`mobile-category-chip-btn${isSelected ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {IconComp && <IconComp size={13} />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2-Column Product Grid matching Image 2 */}
        <div className="mobile-products-2col-grid">
          {displayProducts.map((p, idx) => {
            const isFav = favProducts.has(p.id);
            const nameLower = p.name.toLowerCase();

            // Dynamic badge matching Image exactly
            let badgeText = 'FARM FRESH';
            let badgeClass = 'badge-farm-fresh';
            if (nameLower.includes('cow milk 1l') || idx === 0) {
              badgeText = 'BESTSELLER';
              badgeClass = 'badge-bestseller';
            } else if (nameLower.includes('500ml') || idx === 1) {
              badgeText = 'FARM FRESH';
              badgeClass = 'badge-farm-fresh';
            } else if (nameLower.includes('buffalo') || idx === 2) {
              badgeText = 'HIGH CREAM';
              badgeClass = 'badge-high-cream';
            } else if (p.category === 'curd' || nameLower.includes('curd')) {
              badgeText = 'PURE DAIRY';
              badgeClass = 'badge-pure-dairy';
            } else if (p.category === 'ghee' || nameLower.includes('ghee')) {
              badgeText = 'VEDIC A2';
              badgeClass = 'badge-high-cream';
            }

            // Description short line
            let shortDesc = p.desc || p.description || '';
            if (nameLower.includes('cow milk 1l')) {
              shortDesc = 'Freshly milked pure organic cow milk chilled to 4°C.';
            } else if (nameLower.includes('500ml')) {
              shortDesc = 'Naturally rich A2 milk from healthy native cows.';
            } else if (nameLower.includes('buffalo')) {
              shortDesc = 'Rich creamy high-fat pure buffalo milk.';
            } else if (nameLower.includes('curd')) {
              shortDesc = 'Thick, creamy and naturally probiotic curd.';
            }

            // Features (2 columns matching Image)
            let f1Icon = <Milk size={13} color="#0d5c3a" />;
            let f1Text1 = 'Glass Bottle';
            let f1Text2 = 'Packaging';
            let f2Icon = <Snowflake size={13} color="#0d5c3a" />;
            let f2Text1 = 'Chilled to';
            let f2Text2 = '4°C in 30 Mins';

            if (p.category === 'curd' || nameLower.includes('curd')) {
              f1Icon = <ShieldCheck size={13} color="#0d5c3a" />;
              f1Text1 = 'Hygienic';
              f1Text2 = 'Packaging';
              f2Icon = <Leaf size={13} color="#0d5c3a" />;
              f2Text1 = 'No';
              f2Text2 = 'Preservatives';
            } else if (p.category === 'ghee' || nameLower.includes('ghee')) {
              f1Icon = <Flame size={13} color="#0d5c3a" />;
              f1Text1 = 'Vedic Bilona';
              f1Text2 = 'Process';
              f2Icon = <ShieldCheck size={13} color="#0d5c3a" />;
              f2Text1 = '100% Pure';
              f2Text2 = 'A2 Desi Ghee';
            }

            // Clean price
            const cleanPrice = p.price?.startsWith('₹') ? p.price : ('₹' + (p.price || '65'));
            const cleanUnit = p.unit?.replace('per ', '').replace('/', '').trim() || (nameLower.includes('500ml') ? '500ml' : (p.category === 'curd' ? '500g' : '1L'));

            return (
              <div
                key={p.id}
                className="mobile-grid-product-card"
                onClick={() => {
                  setSelectedProductDetails(p);
                  const prodKey = p.id || p.name;
                  localStorage.setItem('nmd_selected_product_id', String(prodKey));
                  window.history.replaceState({ nmdPage: 'products' }, '', `/products?product=${encodeURIComponent(prodKey)}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                {/* Top Image */}
                <div className="mobile-card-top-image">
                  <img src={p.image || '/product-cow-milk.jpg'} alt={p.name} />
                  <span className={`mobile-grid-card-badge ${badgeClass}`}>{badgeText}</span>
                  <button
                    type="button"
                    className={`mobile-card-heart-btn${isFav ? ' is-fav' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(p.id);
                    }}
                  >
                    <Heart size={15} fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : '#475569'} />
                  </button>
                </div>

                {/* Body Details */}
                <div className="mobile-card-body">
                  <h3 className="mobile-card-title">{p.name}</h3>
                  <p className="mobile-card-desc">{shortDesc}</p>

                  {/* 2 Features side-by-side matching Image */}
                  <div className="mobile-card-features-grid">
                    <div className="mobile-card-feat-col">
                      <div className="mobile-card-feat-icon">{f1Icon}</div>
                      <div className="mobile-card-feat-text">
                        <span>{f1Text1}</span>
                        <span>{f1Text2}</span>
                      </div>
                    </div>
                    <div className="mobile-card-feat-col">
                      <div className="mobile-card-feat-icon">{f2Icon}</div>
                      <div className="mobile-card-feat-text">
                        <span>{f2Text1}</span>
                        <span>{f2Text2}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Subscribe Button Row matching Image */}
                  <div className="mobile-card-bottom-row">
                    <div className="mobile-card-price-line">
                      <span className="mobile-card-price-val">{cleanPrice}</span>
                      <span className="mobile-card-price-unit">/{cleanUnit}</span>
                    </div>

                    <button
                      type="button"
                      className="mobile-card-subscribe-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartSubscription(p);
                      }}
                    >
                      <Calendar size={12} />
                      <span>Subscribe</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Contact Us Button */}
        <button
          type="button"
          className="mobile-floating-contact-pill"
          onClick={() => setActiveTab('contact')}
          aria-label="Contact us"
        >
          <PhoneCall size={17} />
          <span>Contact Us</span>
        </button>
      </div>
    );
  };

  useEffect(() => {
    const handleReset = () => {
      lastTargetKeyRef.current = null;
      setSelectedProductDetails(null);
      setActiveCategory('all');
      localStorage.removeItem('nmd_selected_product_id');
      localStorage.removeItem('nmd_selected_product_name');
      localStorage.removeItem('nmd_selected_product_obj');
      if (window.location.search.includes('product=') || window.location.search.includes('id=')) {
        window.history.replaceState({ nmdPage: 'products' }, '', '/products');
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    };

    const handleSelectEvent = (e) => {
      const prod = e.detail?.product;
      const id = e.detail?.id;
      if (prod) {
        lastTargetKeyRef.current = id || prod.id || prod.name;
        setSelectedProductDetails(prod);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (id && catalogProducts.length > 0) {
        const found = findMatchingProduct(catalogProducts, id);
        if (found) {
          lastTargetKeyRef.current = id;
          setSelectedProductDetails(found);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('nmd_reset_products_page', handleReset);
    window.addEventListener('nmd_select_product', handleSelectEvent);

    const urlParams = new URLSearchParams(window.location.search);
    const paramProduct = urlParams.get('product') || urlParams.get('id');
    const localId = localStorage.getItem('nmd_selected_product_id');
    const localName = localStorage.getItem('nmd_selected_product_name');

    const targetKey = paramProduct || localId;
    if (targetKey && catalogProducts.length > 0) {
      if (lastTargetKeyRef.current !== targetKey) {
        const found = findMatchingProduct(catalogProducts, targetKey, localName);
        if (found) {
          lastTargetKeyRef.current = targetKey;
          setSelectedProductDetails((prev) => {
            if (prev && (prev.id === found.id || prev.name === found.name)) {
              return prev;
            }
            return found;
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }

    return () => {
      window.removeEventListener('nmd_reset_products_page', handleReset);
      window.removeEventListener('nmd_select_product', handleSelectEvent);
    };
  }, [catalogProducts]);

  useEffect(() => {
    if (user?.role !== 'customer') return;
    const pendingSubscription = localStorage.getItem('nmd_pending_subscription');
    if (!pendingSubscription) return;
    try {
      const product = JSON.parse(pendingSubscription);
      setSelectedProduct(product);
      setSelectedProductDetails(product);
      setIsSubscribeOpen(true);
      localStorage.removeItem('nmd_pending_subscription');
    } catch (error) {
      localStorage.removeItem('nmd_pending_subscription');
      console.error('Unable to restore subscription selection:', error);
    }
  }, [user]);

  const handleStartSubscription = (product) => {
    if (!user) {
      localStorage.setItem('nmd_pending_subscription', JSON.stringify(product));
      setActiveTab('login');
      return;
    }
    if (user.role !== 'customer') {
      window.alert('Please sign in with a customer account to start a subscription.');
      return;
    }
    setSelectedProduct(product);
    setIsSubscribeOpen(true);
  };

  const handleSubscribe = (product) => {
    setSelectedProductDetails(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated Product Details Page
  if (selectedProductDetails) {
    return (
      <div className="public-products-page product-details-view-active" style={{ background: '#f8faf8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ProductDetailsView
          product={selectedProductDetails}
          onBack={() => {
            lastTargetKeyRef.current = null;
            setSelectedProductDetails(null);
            localStorage.removeItem('nmd_selected_product_id');
            localStorage.removeItem('nmd_selected_product_name');
            localStorage.removeItem('nmd_selected_product_obj');
            if (window.location.search.includes('product=') || window.location.search.includes('id=')) {
              window.history.replaceState({ nmdPage: 'products' }, '', '/products');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSubscribe={(prodWithConfig) => {
            handleStartSubscription(prodWithConfig);
          }}
        />

        {/* Subscribe / Booking Modal */}
        <SubscribeModal
          isOpen={isSubscribeOpen}
          onClose={() => setIsSubscribeOpen(false)}
          preselectedProduct={selectedProduct}
        />

        <Footer setActiveTab={setActiveTab} />
      </div>
    );
  }

  return (
    <div className="public-products-page" style={{ background: '#f8faf8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {isMobile ? renderMobileProducts() : (
        <>
      {/* Page Header with Real Glass Bottles Background Banner */}
      <div
        className="public-page-hero"
        style={{
          position: 'relative',
          backgroundImage: `url(${CLOUDINARY_MEDIA.glassBottles})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 45%',
          color: '#ffffff',
          padding: '80px 24px 60px 24px',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(7, 31, 19, 0.75) 0%, rgba(7, 31, 19, 0.88) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div className="public-page-hero-content" style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div
            className="public-products-eyebrow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#86efac',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            <Sparkles size={14} color="#E5B842" />
            Direct From Farm To Table
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.4rem)', fontWeight: 900, color: '#ffffff', marginBottom: '12px' }}>
            Our Products
          </h1>
          <p style={{ color: '#d1fae5', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto' }}>
            Pure, cold-chain protected cow milk, rich buffalo milk, thick traditional curd, and artisanal desi ghee delivered fresh every dawn.
          </p>

          {/* Category Filter Tabs with Smooth Animation */}
          <div
            className="public-product-category-filter"
            role="group"
            aria-label="Filter products by category"
            style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              padding: '5px',
              borderRadius: '30px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginTop: '32px',
              gap: '4px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {[
              { id: 'all', label: 'All Products' },
              { id: 'milk', label: 'Fresh Milk' },
              { id: 'curd', label: 'Curd & Paneer' },
              { id: 'ghee', label: 'Vedic Desi Ghee' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                aria-pressed={activeCategory === cat.id}
                style={{
                  padding: '9px 22px',
                  borderRadius: '25px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeCategory === cat.id ? '#E5B842' : 'transparent',
                  color: activeCategory === cat.id ? '#071629' : '#ffffff',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: activeCategory === cat.id ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid with Images & Animations */}
      <div className="public-page-content" style={{ maxWidth: '1360px', margin: '60px auto', padding: '0 24px', flex: 1, width: '100%' }}>
        <div
          className="public-card-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '30px',
          }}
        >
          {filteredProducts.map((p, idx) => (
            <div
              key={p.id}
              className="dairy-product-card dairy-fade-in-up"
              onClick={() => {
                setSelectedProductDetails(p);
                const prodKey = p.id || p.name;
                localStorage.setItem('nmd_selected_product_id', String(prodKey));
                window.history.replaceState({ nmdPage: 'products' }, '', `/products?product=${encodeURIComponent(prodKey)}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              role="button"
              tabIndex={0}
              aria-label={`View details and book ${p.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedProductDetails(p);
                  const prodKey = p.id || p.name;
                  localStorage.setItem('nmd_selected_product_id', String(prodKey));
                  window.history.replaceState({ nmdPage: 'products' }, '', `/products?product=${encodeURIComponent(prodKey)}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              style={{
                background: '#ffffff',
                borderRadius: '22px',
                border: '1.5px solid #e5ece6',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 6px 20px rgba(13, 92, 58, 0.06)',
                animationDelay: `${idx * 0.07}s`,
                cursor: 'pointer',
                transition: 'transform 0.22s ease, box-shadow 0.22s ease',
              }}
            >
              {/* Product Real Image Header */}
              <div
                className="public-product-image"
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  maxHeight: '340px',
                  overflow: 'hidden',
                  background: '#f6f9f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="product-img"
                  onError={(e) => {
                    e.currentTarget.src = p.name?.toLowerCase().includes('buffalo')
                      ? '/product-buffalo-milk.jpg'
                      : p.name?.toLowerCase().includes('500')
                      ? '/product-cow-milk-500ml.jpg'
                      : CLOUDINARY_MEDIA.cowMilk;
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 10%',
                    display: 'block',
                    transition: 'transform 0.35s ease',
                  }}
                />

                {/* Badge Overlay */}
                <span
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '5px 12px',
                    borderRadius: '20px',
                    background: '#ffffff',
                    color: p.tagColor,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {p.badge}
                </span>

                <span
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(7, 22, 41, 0.82)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                  }}
                >
                  {p.fat}
                </span>
              </div>

              {/* Product Body Details */}
              <div className="public-product-card-body" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div className="public-product-card-info">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0c2340', margin: 0 }}>
                      {p.name}
                    </h3>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: '#597361', lineHeight: 1.6, marginBottom: '16px' }}>
                    {p.desc}
                  </p>

                  {/* Features List */}
                  <div className="public-product-card-features" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    {p.features.map((feat, fidx) => (
                      <div key={fidx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#475569' }}>
                        <Check size={14} color="#16a34a" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Compact Mobile Micro Data Badges */}
                  <div className="public-product-card-data-row">
                    <span className="public-card-data-pill">
                      <Check size={9} color="#16a34a" />
                      <span>{p.features?.[0] || 'Glass Bottled'}</span>
                    </span>
                    <span className="public-card-data-pill">
                      <Sparkles size={9} color="#d98a0d" />
                      <span>{p.category === 'milk' ? 'Raw 4°C Chilled' : '100% Pure A2'}</span>
                    </span>
                  </div>

                  {/* Tap to View Details pill */}
                  <div className="public-product-card-view-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#0d5c3a', fontWeight: 700, marginBottom: '6px' }}>
                    <Eye size={13} />
                    <span>Click card for details & specs →</span>
                  </div>
                </div>

                {/* Price and CTA */}
                <div
                  className="public-product-card-footer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                    borderTop: '1px solid #edf3ee',
                  }}
                >
                  <div className="public-product-price">
                    <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0d5c3a' }}>{p.price}</span>
                    <span style={{ fontSize: '0.82rem', color: '#597361', marginLeft: '6px' }}>{p.unit}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubscribe(p);
                    }}
                    className="dairy-btn-hover public-product-subscribe"
                    style={{
                      background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(13, 92, 58, 0.25)',
                    }}
                  >
                    <span>Subscribe Now</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quality Assurance Badges */}
        <div
          style={{
            marginTop: '50px',
            background: '#ffffff',
            borderRadius: '24px',
            padding: '40px',
            border: '1.5px solid #e2ece3',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '30px',
          }}
        >
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', flexShrink: 0 }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.1rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>Daily Purity Testing</h4>
              <p style={{ fontSize: '0.86rem', color: '#597361', lineHeight: 1.5 }}>
                Every batch is tested for fat, SNF, and zero adulterants before bottling.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', flexShrink: 0 }}>
              <Droplets size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.1rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>Zero Water Dilution</h4>
              <p style={{ fontSize: '0.86rem', color: '#597361', lineHeight: 1.5 }}>
                What the cow yields is what reaches your kitchen. Never diluted with water or powder.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e', flexShrink: 0 }}>
              <Clock size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.1rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>Before 6:30 AM Drop</h4>
              <p style={{ fontSize: '0.86rem', color: '#597361', lineHeight: 1.5 }}>
                Silent, punctual delivery partner drops right at your doorstep before you wake up.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer setActiveTab={setActiveTab} />
        </>
      )}

      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        preselectedProduct={selectedProduct}
      />
    </div>
  );
}
