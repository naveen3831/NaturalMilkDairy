import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Milk,
  Calendar,
  Share2,
  MessageCircle,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function ProductDetailsView({ product, onBack, onSubscribe }) {
  // Extract images: default to product's own image.
  // If admin added more images (in product.images or product.gallery), include them.
  const rawImages = [
    product.image || product.imageUrl,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.gallery) ? product.gallery : []),
    ...(Array.isArray(product.additionalImages) ? product.additionalImages : []),
  ].filter(Boolean);

  // De-duplicate URLs
  const productImages = Array.from(new Set(rawImages));

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [bookingQty, setBookingQty] = useState(
    product.name?.toLowerCase().includes('500') ? 1 : 1
  );
  const [bookingFreq, setBookingFreq] = useState('daily');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight') setActiveImgIndex((prev) => (prev + 1) % productImages.length);
      if (e.key === 'ArrowLeft') setActiveImgIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
    };
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, productImages.length]);

  const activeImage = productImages[activeImgIndex] || productImages[0] || product.image;

  // Price calculations
  const unitPrice =
    product.numericPrice ||
    parseInt(String(product.price).replace(/[^\d]/g, ''), 10) ||
    60;
  const dailyTotal = unitPrice * bookingQty;
  const monthlyTotal =
    dailyTotal *
    (bookingFreq === 'daily' ? 30 : bookingFreq === 'alternate' ? 15 : 1);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleBookNow = () => {
    onSubscribe({
      ...product,
      selectedQty: bookingQty,
      selectedFrequency: bookingFreq,
    });
  };

  const openWhatsAppBooking = () => {
    const text = encodeURIComponent(
      `Hello Natural Milk Dairy! I would like to book:\n` +
      `🥛 Product: ${product.name}\n` +
      `🔢 Quantity: ${bookingQty} (${product.unit})\n` +
      `📅 Schedule: ${bookingFreq.toUpperCase()}\n` +
      `⏰ Morning Slot: 5:30 AM - 6:30 AM\n\n` +
      `Please confirm my delivery schedule.`
    );
    window.open(`https://wa.me/919876543210?text=${text}`, '_blank');
  };

  const openLightboxAt = (index) => {
    setActiveImgIndex(index);
    setIsLightboxOpen(true);
  };

  const nextLightboxImg = (e) => {
    e?.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % productImages.length);
  };

  const prevLightboxImg = (e) => {
    e?.stopPropagation();
    setActiveImgIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  return (
    <div
      className="product-details-root"
      style={{
        background: '#f8faf8',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Clean Sticky Top Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2ece3',
          padding: '12px 18px',
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '999px',
              background: '#eef5f0',
              border: '1.5px solid #d2e4d7',
              color: '#0d5c3a',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <ArrowLeft size={17} />
            <span>Back to Products</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: '#eaf5ee',
                color: '#0d5c3a',
                padding: '5px 12px',
                borderRadius: '999px',
                fontWeight: 800,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {product.category || 'Pure Dairy'}
            </span>
            <button
              type="button"
              onClick={handleShare}
              title="Share"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Share2 size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Product Content (Clean, Professional & Simple Layout) */}
      <main
        style={{
          maxWidth: '1120px',
          width: '100%',
          margin: '24px auto',
          padding: '0 18px 60px 18px',
          boxSizing: 'border-box',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* ========================================================= */}
          {/* LEFT: Clean Image Showcase & Admin Gallery Thumbnails     */}
          {/* ========================================================= */}
          <div>
            {/* Main Product Image Card */}
            <div
              onClick={() => openLightboxAt(activeImgIndex)}
              style={{
                position: 'relative',
                borderRadius: '22px',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 8px 24px rgba(13, 92, 58, 0.06)',
                cursor: 'pointer',
              }}
              title="Click to view full image"
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3.4',
                  maxHeight: '440px',
                  background: '#f8faf9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={activeImage}
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.3s ease',
                  }}
                />
              </div>

              {/* Floating Badge (Top Left) */}
              <span
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  background: '#ffffff',
                  color: product.tagColor || '#0d5c3a',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {product.badge || 'Farm Fresh'}
              </span>

              {/* Fullscreen Icon Hint (Top Right) */}
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  padding: '6px 10px',
                  borderRadius: '20px',
                  background: 'rgba(7, 22, 41, 0.78)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Maximize2 size={13} />
                <span>Full View</span>
              </div>

              {/* Nutrition Tag (Bottom Left) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  left: '14px',
                  padding: '5px 12px',
                  borderRadius: '10px',
                  background: 'rgba(7, 22, 41, 0.85)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                }}
              >
                {product.fat || '100% Pure Farm Produce'}
              </div>
            </div>

            {/* ONLY IF Admin added more images: Show small thumbnails below the main image */}
            {productImages.length > 1 && (
              <div style={{ marginTop: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    overflowX: 'auto',
                    padding: '2px 0 6px 0',
                  }}
                >
                  {productImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openLightboxAt(idx)}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        padding: 0,
                        border: activeImgIndex === idx ? '2.5px solid #0d5c3a' : '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        cursor: 'pointer',
                        flexShrink: 0,
                        boxShadow: activeImgIndex === idx ? '0 3px 10px rgba(13, 92, 58, 0.25)' : 'none',
                        transition: 'all 0.18s ease',
                      }}
                      title={`View image ${idx + 1} full screen`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumb ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                  Tap thumbnail to view full screen
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT: Product Details & Professional Booking Card        */}
          {/* ========================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Main Info Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '22px',
                border: '1.5px solid #e2ece3',
                padding: '26px 24px',
                boxShadow: '0 6px 20px rgba(13, 92, 58, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0d5c3a', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                <Sparkles size={14} color="#E5B842" />
                <span>Direct Farm Doorstep Fresh</span>
              </div>

              <h1
                style={{
                  fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                  fontWeight: 900,
                  color: '#0c2340',
                  margin: '0 0 10px 0',
                  lineHeight: 1.25,
                }}
              >
                {product.name}
              </h1>

              {/* Price Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <span style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0d5c3a' }}>
                  {product.price}
                </span>
                <span style={{ fontSize: '0.90rem', color: '#64748b', fontWeight: 600 }}>
                  {product.unit}
                </span>
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    marginLeft: 'auto',
                  }}
                >
                  ✓ Free Doorstep Delivery
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  color: '#475569',
                  fontSize: '0.94rem',
                  lineHeight: 1.6,
                  margin: '0 0 18px 0',
                }}
              >
                {product.desc}
              </p>

              {/* Clean 4 Feature Checklist Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#1e293b', fontWeight: 600 }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#eaf5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#0d5c3a" />
                  </div>
                  <span>100% Raw & Unadulterated</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#1e293b', fontWeight: 600 }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#eaf5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#0d5c3a" />
                  </div>
                  <span>Chilled to 4°C at Sunrise</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#1e293b', fontWeight: 600 }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#eaf5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#0d5c3a" />
                  </div>
                  <span>Sterilized Glass Bottle</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#1e293b', fontWeight: 600 }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#eaf5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#0d5c3a" />
                  </div>
                  <span>Drop before 6:30 AM</span>
                </div>
              </div>
            </div>

            {/* 2. Professional & Simple Booking Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '22px',
                border: '1.5px solid #d2e4d7',
                padding: '24px',
                boxShadow: '0 8px 24px rgba(13, 92, 58, 0.06)',
              }}
            >
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  color: '#0d5c3a',
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Calendar size={18} />
                <span>Book Morning Doorstep Delivery</span>
              </h3>

              {/* Quantity Selector */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.80rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Daily Quantity
                  </label>
                  <span style={{ fontSize: '0.80rem', color: '#0d5c3a', fontWeight: 700 }}>
                    ₹{dailyTotal} / delivery
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: '#f8faf9',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '3px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setBookingQty((q) => Math.max(1, q - 1))}
                      disabled={bookingQty <= 1}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        border: 'none',
                        background: bookingQty <= 1 ? '#f1f5f9' : '#e2e8f0',
                        color: bookingQty <= 1 ? '#94a3b8' : '#0f172a',
                        fontWeight: 900,
                        cursor: bookingQty <= 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Minus size={15} />
                    </button>
                    <span
                      style={{
                        minWidth: '50px',
                        textAlign: 'center',
                        fontSize: '1.1rem',
                        fontWeight: 900,
                        color: '#0f172a',
                      }}
                    >
                      {bookingQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBookingQty((q) => Math.min(10, q + 1))}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#0d5c3a',
                        color: '#ffffff',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  {/* Preset chips */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 2, 3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBookingQty(val)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '10px',
                          border: bookingQty === val ? '1.5px solid #0d5c3a' : '1px solid #cbd5e1',
                          background: bookingQty === val ? '#eaf5ee' : '#ffffff',
                          color: bookingQty === val ? '#0d5c3a' : '#334155',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                        }}
                      >
                        {val} {product.unit.replace('per ', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Frequency Selection */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Delivery Frequency
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'daily', label: 'Daily', sub: 'Every morning' },
                    { id: 'alternate', label: 'Alternate', sub: 'Every 2nd day' },
                    { id: 'trial', label: '1-Day Trial', sub: 'Single drop' },
                  ].map((freq) => (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => setBookingFreq(freq.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: bookingFreq === freq.id ? '2px solid #0d5c3a' : '1.5px solid #cbd5e1',
                        background: bookingFreq === freq.id ? '#eaf5ee' : '#f8faf9',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: bookingFreq === freq.id ? '#0d5c3a' : '#1e293b' }}>
                        {freq.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {freq.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleBookNow}
                  className="dairy-btn-hover"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 20px rgba(13, 92, 58, 0.25)',
                  }}
                >
                  <Milk size={19} />
                  <span>Subscribe / Book Morning Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={openWhatsAppBooking}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '14px',
                    background: '#ffffff',
                    color: '#16a34a',
                    border: '1.5px solid #22c55e',
                    fontWeight: 800,
                    fontSize: '0.90rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <MessageCircle size={17} />
                  <span>Book via WhatsApp</span>
                </button>
              </div>

              {/* Reassurance Micro-banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.75rem',
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Truck size={14} color="#0d5c3a" />
                  <span>Sunrise 6:30 AM</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RotateCcw size={14} color="#0d5c3a" />
                  <span>Free Bottle Swap</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={14} color="#0d5c3a" />
                  <span>Pause Anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* 3. FULL-PAGE IMAGE VIEWER (LIGHTBOX MODAL)                */}
      {/* ========================================================= */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-page image viewer"
          onClick={() => setIsLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(7, 22, 16, 0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 20px',
            boxSizing: 'border-box',
          }}
        >
          {/* Lightbox Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: '1200px',
              margin: '0 auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <div style={{ color: '#ffffff', fontSize: '0.90rem', fontWeight: 700 }}>
              {product.name} {productImages.length > 1 && `(${activeImgIndex + 1} / ${productImages.length})`}
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Centered Large High-Res Image */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              maxWidth: '1200px',
              width: '100%',
              margin: '12px auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {productImages.length > 1 && (
              <button
                type="button"
                onClick={prevLightboxImg}
                style={{
                  position: 'absolute',
                  left: '12px',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <img
              src={activeImage}
              alt={product.name}
              style={{
                maxWidth: '92vw',
                maxHeight: '76vh',
                objectFit: 'contain',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            />

            {productImages.length > 1 && (
              <button
                type="button"
                onClick={nextLightboxImg}
                style={{
                  position: 'absolute',
                  right: '12px',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Strip (Only if multiple images) */}
          {productImages.length > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                paddingTop: '8px',
                overflowX: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {productImages.map((thumbUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImgIndex(idx)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    padding: 0,
                    border: activeImgIndex === idx ? '2.5px solid #22c55e' : '1.5px solid rgba(255,255,255,0.3)',
                    background: '#000000',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={thumbUrl}
                    alt={`Thumb ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
