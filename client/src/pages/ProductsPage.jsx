import React, { useState } from 'react';
import { Milk, Sparkles, Check, ArrowRight, ShieldCheck, Droplets, Clock, HeartHandshake } from 'lucide-react';
import SubscribeModal from '../components/SubscribeModal';
import Footer from '../components/Footer';

export default function ProductsPage({ setActiveTab }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

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
      image: '/product-cow-milk.jpg',
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
      image: '/product-cow-milk.jpg',
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
      image: '/product-buffalo-milk.jpg',
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
      image: '/product-curd.jpg',
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
      image: '/product-curd.jpg',
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
      image: '/product-ghee.jpg',
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
      image: '/product-paneer.jpg',
      features: ['No Artificial Starch', 'Soft & Creamy', 'Made Daily'],
    },
  ];

  const filteredProducts =
    activeCategory === 'all'
      ? catalogProducts
      : catalogProducts.filter((p) => p.category === activeCategory);

  const handleSubscribe = (product) => {
    setSelectedProduct(product);
    setIsSubscribeOpen(true);
  };

  return (
    <div style={{ background: '#f8faf8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d5c3a 0%, #0c2340 100%)',
          color: '#ffffff',
          padding: '60px 24px 50px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div
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
      <div style={{ maxWidth: '1360px', margin: '60px auto', padding: '0 24px', flex: 1, width: '100%' }}>
        <div
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
              }}
            >
              {/* Product Real Image Header */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '240px',
                  overflow: 'hidden',
                  background: '#f1f5f2',
                }}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="product-img"
                  onError={(e) => {
                    e.currentTarget.src = '/hero-dairy.jpg';
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
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
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0c2340', marginBottom: '8px' }}>
                    {p.name}
                  </h3>

                  <p style={{ fontSize: '0.9rem', color: '#597361', lineHeight: 1.6, marginBottom: '16px' }}>
                    {p.desc}
                  </p>

                  {/* Features List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                    {p.features.map((feat, fidx) => (
                      <div key={fidx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#475569' }}>
                        <Check size={14} color="#16a34a" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price and CTA */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '18px',
                    borderTop: '1px solid #edf3ee',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0d5c3a' }}>{p.price}</span>
                    <span style={{ fontSize: '0.82rem', color: '#597361', marginLeft: '6px' }}>{p.unit}</span>
                  </div>

                  <button
                    onClick={() => handleSubscribe(p)}
                    className="dairy-btn-hover"
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
                    <span>Subscribe</span>
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
            marginTop: '70px',
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

      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        preselectedProduct={selectedProduct}
      />
    </div>
  );
}
