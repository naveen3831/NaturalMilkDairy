import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  Share2,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  MapPin,
  CheckCircle2,
  Truck,
  Leaf,
  RotateCcw,
  Star,
  MessageCircle,
  PackageCheck,
  Heart,
  Droplets,
} from 'lucide-react';

export default function ProductDetailsView({
  product,
  onBack,
  onSubscribe,
  customer,
  onDirectPlaceOrder,
  onNavigateDashboard,
}) {
  if (!product) return null;

  // Extract all available product images
  const rawImages = [
    product.image || product.imageUrl,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.gallery) ? product.gallery : []),
    ...(Array.isArray(product.additionalImages) ? product.additionalImages : []),
  ].filter(Boolean);

  const productImages = Array.from(new Set(rawImages));
  if (productImages.length === 0 && product.image) {
    productImages.push(product.image);
  }

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [bookingQty, setBookingQty] = useState(1);
  const [bookingFreq, setBookingFreq] = useState(
    product?.initialFreq === 'one_time' ? 'one_time' : 'subscription'
  );

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [orderDate, setOrderDate] = useState(tomorrowStr);
  const [dropNotes, setDropNotes] = useState(
    customer?.landmark ? `Near ${customer.landmark}` : 'Deliver at doorstep milk bag'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    document.body.classList.add('product-details-page-active');
    return () => {
      document.body.classList.remove('product-details-page-active');
    };
  }, []);

  useEffect(() => {
    if (product?.initialFreq) {
      setBookingFreq(product.initialFreq === 'one_time' ? 'one_time' : 'subscription');
    }
  }, [product?.initialFreq]);

  useEffect(() => {
    if (customer?.landmark) {
      setDropNotes(`Near ${customer.landmark}`);
    }
  }, [customer?.landmark]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight') setActiveImgIndex((prev) => (prev + 1) % productImages.length);
      if (e.key === 'ArrowLeft')
        setActiveImgIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
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

  const activeImage =
    productImages[activeImgIndex] ||
    productImages[0] ||
    product.image ||
    'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=800&auto=format&fit=crop&q=80';

  // Numerical unit price
  const unitPrice =
    product.numericPrice ||
    parseInt(String(product.price || '').replace(/[^\d]/g, ''), 10) ||
    (product.category === 'curd' ? 35 : 60);

  const dailyTotal = unitPrice * bookingQty;
  const monthlyTotal = dailyTotal * 30;

  // Preset options tailored to product unit
  const getPresetOptions = () => {
    const u = (product.unit || '').toLowerCase();
    const n = (product.name || '').toLowerCase();
    if (u.includes('litre') || u.includes('1 l') || n.includes('1l') || n.includes('1 l')) {
      return [
        { qty: 1, label: '1 Litre' },
        { qty: 2, label: '2 Litres' },
        { qty: 3, label: '3 Litres' },
      ];
    }
    if (u.includes('500') || n.includes('500')) {
      return [
        { qty: 1, label: '1 Pack (500g)' },
        { qty: 2, label: '2 Packs (1 kg)' },
        { qty: 3, label: '3 Packs (1.5 kg)' },
      ];
    }
    if (u.includes('kg') || n.includes('kg')) {
      return [
        { qty: 1, label: '1 kg' },
        { qty: 2, label: '2 kg' },
        { qty: 3, label: '3 kg' },
      ];
    }
    return [
      { qty: 1, label: '1 Unit' },
      { qty: 2, label: '2 Units' },
      { qty: 3, label: '3 Units' },
    ];
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleConfirmOrder = async () => {
    if (typeof onDirectPlaceOrder === 'function') {
      setIsSubmitting(true);
      try {
        const res = await onDirectPlaceOrder({
          product,
          quantity: bookingQty,
          bookingType: bookingFreq === 'one_time' ? 'one_time' : 'subscription',
          date: orderDate,
          dropNotes: dropNotes || 'Deliver at doorstep milk bag',
        });
        if (res?.success) {
          setOrderSuccessMsg(
            res.message ||
              `Your ${bookingFreq === 'one_time' ? 'order' : 'subscription'} for ${bookingQty}x ${product.name} has been confirmed!`
          );
        } else {
          alert(res?.message || 'Could not place order. Please try again.');
        }
      } catch (err) {
        alert('Could not place order: ' + (err.message || 'Please try again.'));
      } finally {
        setIsSubmitting(false);
      }
    } else if (typeof onSubscribe === 'function') {
      onSubscribe({
        ...product,
        selectedQty: bookingQty,
        selectedFrequency: bookingFreq,
        calculatedPrice: dailyTotal,
        date: orderDate,
        dropNotes,
      });
    }
  };

  const openWhatsAppBooking = () => {
    const text = encodeURIComponent(
      `Hello Natural Milk Dairy! I would like to book:\n` +
        `🥛 Product: ${product.name}\n` +
        `🔢 Quantity: ${bookingQty} (${product.unit || 'unit'})\n` +
        `📅 Type: ${bookingFreq === 'one_time' ? 'One-Time Delivery' : 'Daily Morning Subscription'}\n` +
        `🗓 Delivery Date: ${orderDate}\n` +
        `⏰ Morning Slot: 5:30 AM - 6:30 AM\n` +
        `💰 Total: ₹${dailyTotal}\n\n` +
        `Please confirm my delivery schedule.`
    );
    window.open(`https://wa.me/919876543210?text=${text}`, '_blank');
  };

  const cleanUnit = (product.unit || '').replace(/^per\s+/i, '').trim() || 'unit';

  return (
    <div
      className="product-details-root"
      style={{
        background: '#f6f9f6',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        color: '#13281c',
      }}
    >
      {/* MOBILE TOP APP BAR (MOBILE ONLY) */}
      <div className="pdp-mobile-top-bar">
        <button
          type="button"
          onClick={onBack}
          className="pdp-mobile-circle-btn"
          aria-label="Back to products"
        >
          <ArrowLeft size={19} color="#0d5c3a" strokeWidth={2.2} />
        </button>
        <div className="pdp-mobile-header-title">
          <span>{product.name}</span>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="pdp-mobile-circle-btn"
          aria-label="Share product"
        >
          {copiedLink ? <Check size={17} color="#0d5c3a" /> : <Share2 size={17} color="#0d5c3a" />}
        </button>
      </div>

      {/* 1. TOP HEADER BAR (DESKTOP) */}
      <header
        className="pdp-desktop-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #e3ede5',
          padding: '12px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Back Button & Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '999px',
                background: '#eef6f0',
                border: '1px solid #cce2d3',
                color: '#0d5c3a',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0d5c3a';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#0d5c3a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#eef6f0';
                e.currentTarget.style.color = '#0d5c3a';
                e.currentTarget.style.borderColor = '#cce2d3';
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Products</span>
            </button>

          </div>

          {/* Right Status Badges & Share */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: '#e8f5ec',
                border: '1px solid #bde3c8',
                color: '#0a633b',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.3px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.25)',
                }}
              />
              FRESH SUNRISE BATCH READY
            </div>

            <div
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#f1f5f2',
                border: '1px solid #dce8df',
                color: '#3d5947',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
              }}
            >
              {product.category || 'ORGANIC'}
            </div>

            <button
              type="button"
              onClick={handleShare}
              title="Share or Copy Link"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: copiedLink ? '#0d5c3a' : '#ffffff',
                border: '1px solid #dce8df',
                color: copiedLink ? '#ffffff' : '#3d5947',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN SHOWCASE & BOOKING HERO */}
      <main
        style={{
          maxWidth: '1240px',
          width: '100%',
          margin: '0 auto',
          padding: '28px 24px 60px',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.08fr) minmax(0, 1fr)',
            gap: '32px',
            alignItems: 'start',
          }}
          className="product-details-grid"
        >
          {/* ================= LEFT COLUMN: VISUAL EXPERIENCE & FARM GUARANTEES ================= */}
          <div className="pdp-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="pdp-image-section" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Main Stage Image */}
              <div
              style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #e1eee4',
                boxShadow: '0 16px 40px -12px rgba(13, 92, 58, 0.1)',
                aspectRatio: '4 / 3',
                maxHeight: '460px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                  transition: 'transform 0.5s ease',
                }}
              />

              {/* Floating Top-Left Tag */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(10px)',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#0d5c3a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                }}
              >
                <Leaf size={14} color="#16a34a" />
                <span>100% FARM FRESH</span>
              </div>



              {/* Floating Bottom Ribbon */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  background: 'rgba(13, 38, 24, 0.75)',
                  backdropFilter: 'blur(10px)',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={17} color="#4ade80" />
                  <span>100% Raw & Unadulterated Pure Dairy</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: '#bbf7d0',
                  }}
                >
                  <Clock size={14} />
                  <span>Next Drop: 5:30 AM</span>
                </div>
              </div>
            </div>

            {/* Gallery Thumbnails (if multiple images) */}
            {productImages.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                }}
              >
                {productImages.map((thumbUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      padding: 0,
                      border:
                        activeImgIndex === idx
                          ? '2.5px solid #0d5c3a'
                          : '1.5px solid #dbe8de',
                      background: '#ffffff',
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow:
                        activeImgIndex === idx
                          ? '0 4px 12px rgba(13, 92, 58, 0.25)'
                          : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <img
                      src={thumbUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            )}

            </div>

            {/* 4 Farm Fresh Quality Pillars (2x2 Matrix) */}
            <div
              className="pdp-quality-pillars"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #e2ece3',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#e8f5ec',
                    color: '#0d5c3a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Clock size={20} />
                </div>
                <div>
                  <h4
                    style={{
                      margin: '0 0 3px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: '#0d5c3a',
                    }}
                  >
                    Sunrise 6:30 AM Drop
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: '#5b7564',
                      lineHeight: 1.45,
                    }}
                  >
                    Placed fresh at your doorstep before your day begins.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #e2ece3',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#e8f5ec',
                    color: '#0d5c3a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Droplets size={20} />
                </div>
                <div>
                  <h4
                    style={{
                      margin: '0 0 3px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: '#0d5c3a',
                    }}
                  >
                    Chilled to 4°C at Sunrise
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: '#5b7564',
                      lineHeight: 1.45,
                    }}
                  >
                    Maintained through an unbroken cold chain from the farm.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #e2ece3',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#e8f5ec',
                    color: '#0d5c3a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h4
                    style={{
                      margin: '0 0 3px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: '#0d5c3a',
                    }}
                  >
                    Sterilized Eco Glass / Clay
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: '#5b7564',
                      lineHeight: 1.45,
                    }}
                  >
                    Hygienic multi-stage heat sterilization. 100% chemical free.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #e2ece3',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#e8f5ec',
                    color: '#0d5c3a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4
                    style={{
                      margin: '0 0 3px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: '#0d5c3a',
                    }}
                  >
                    Zero Preservatives
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: '#5b7564',
                      lineHeight: 1.45,
                    }}
                  >
                    No synthetic thickeners, stabilizers, or milk powders.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: UNIFIED LUXURY BOOKING SUITE ================= */}
          <div
            className="pdp-booking-suite"
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              border: '1px solid #e1eee4',
              boxShadow: '0 20px 48px -12px rgba(13, 92, 58, 0.09)',
              position: 'relative',
            }}
          >
            {/* If Order was successfully placed, render Celebration Screen */}
            {orderSuccessMsg ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '30px 10px',
                }}
              >
                <div
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    background: '#e8f5ec',
                    color: '#0d5c3a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px',
                    boxShadow: '0 8px 24px rgba(13, 92, 58, 0.15)',
                  }}
                >
                  <CheckCircle2 size={44} />
                </div>

                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: '#0d5c3a',
                  }}
                >
                  Order Confirmed!
                </h3>

                <p
                  style={{
                    margin: '0 0 24px',
                    fontSize: '0.96rem',
                    color: '#4e6b57',
                    maxWidth: '420px',
                    lineHeight: 1.5,
                  }}
                >
                  {orderSuccessMsg}
                </p>

                {/* Receipt Details Box */}
                <div
                  style={{
                    width: '100%',
                    background: '#f7faf8',
                    border: '1px solid #e0ede3',
                    borderRadius: '16px',
                    padding: '18px 22px',
                    marginBottom: '26px',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      fontSize: '0.88rem',
                    }}
                  >
                    <span style={{ color: '#688271' }}>Product:</span>
                    <strong style={{ color: '#0d5c3a' }}>
                      {bookingQty} × {product.name}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      fontSize: '0.88rem',
                    }}
                  >
                    <span style={{ color: '#688271' }}>Schedule:</span>
                    <strong style={{ color: '#13281c' }}>
                      {bookingFreq === 'one_time'
                        ? 'Single One-Time Delivery'
                        : 'Daily Morning Subscription'}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      fontSize: '0.88rem',
                    }}
                  >
                    <span style={{ color: '#688271' }}>Delivery Date:</span>
                    <strong style={{ color: '#13281c' }}>{orderDate} (5:30 - 6:30 AM)</strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '10px',
                      borderTop: '1px dashed #d5e6d9',
                      fontSize: '0.95rem',
                    }}
                  >
                    <span style={{ color: '#13281c', fontWeight: 700 }}>Total Amount:</span>
                    <strong style={{ color: '#0d5c3a', fontSize: '1.15rem' }}>
                      ₹{dailyTotal}
                    </strong>
                  </div>
                </div>

                {/* CTAs */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    width: '100%',
                  }}
                >
                  {typeof onNavigateDashboard === 'function' && (
                    <button
                      type="button"
                      onClick={onNavigateDashboard}
                      style={{
                        padding: '14px 24px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #0d5c3a 0%, #177a4f 100%)',
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(13, 92, 58, 0.25)',
                      }}
                    >
                      View in My Dashboard
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOrderSuccessMsg('');
                      onBack?.();
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '14px',
                      background: '#eef6f0',
                      color: '#0d5c3a',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      border: '1px solid #cbe3d2',
                      cursor: 'pointer',
                    }}
                  >
                    Browse More Farm Products
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Product Eyebrow & Title */}
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#0d5c3a',
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                    }}
                  >
                    <Sparkles size={13} color="#16a34a" />
                    <span>DIRECT FARM DOORSTEP FRESH</span>
                  </div>

                  <h1
                    style={{
                      margin: '0 0 8px',
                      fontSize: '1.95rem',
                      fontWeight: 800,
                      color: '#0d3822',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    {product.name}
                  </h1>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.84rem',
                      color: '#657e6c',
                    }}
                  >
                    <div style={{ display: 'flex', color: '#f59e0b' }}>
                      <Star size={15} fill="#f59e0b" />
                      <Star size={15} fill="#f59e0b" />
                      <Star size={15} fill="#f59e0b" />
                      <Star size={15} fill="#f59e0b" />
                      <Star size={15} fill="#f59e0b" />
                    </div>
                    <strong style={{ color: '#13281c' }}>4.9</strong>
                    <span>(1,240+ morning subscribers)</span>
                  </div>
                </div>

                {/* Price Display Strip */}
                <div
                  style={{
                    background: '#f4f9f5',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    border: '1px solid #dcebdf',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '22px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '2.1rem',
                        fontWeight: 900,
                        color: '#0d5c3a',
                        lineHeight: 1,
                      }}
                    >
                      ₹{unitPrice}
                    </span>
                    <span
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: '#55725f',
                      }}
                    >
                      / {cleanUnit}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#e0f2e4',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      color: '#0a633b',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Free Doorstep Delivery</span>
                  </div>
                </div>

                {/* Frequency Selector: One-Time vs Daily Subscription */}
                <div style={{ marginBottom: '22px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#496653',
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      marginBottom: '10px',
                    }}
                  >
                    CHOOSE ORDER FREQUENCY
                  </label>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px',
                    }}
                  >
                    {/* One-Time Order */}
                    <button
                      type="button"
                      onClick={() => setBookingFreq('one_time')}
                      style={{
                        padding: '14px',
                        borderRadius: '16px',
                        border:
                          bookingFreq === 'one_time'
                            ? '2px solid #0d5c3a'
                            : '1.5px solid #dce8df',
                        background:
                          bookingFreq === 'one_time' ? '#0d5c3a' : '#ffffff',
                        color: bookingFreq === 'one_time' ? '#ffffff' : '#13281c',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        boxShadow:
                          bookingFreq === 'one_time'
                            ? '0 6px 18px rgba(13, 92, 58, 0.2)'
                            : 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <PackageCheck
                          size={18}
                          color={bookingFreq === 'one_time' ? '#ffffff' : '#0d5c3a'}
                        />
                        <strong style={{ fontSize: '0.94rem' }}>One-Time Order</strong>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.75rem',
                          color:
                            bookingFreq === 'one_time'
                              ? 'rgba(255, 255, 255, 0.85)'
                              : '#617b6a',
                          lineHeight: 1.35,
                        }}
                      >
                        Single doorstep delivery tomorrow morning
                      </p>
                    </button>

                    {/* Daily Subscription */}
                    <button
                      type="button"
                      onClick={() => setBookingFreq('subscription')}
                      style={{
                        padding: '14px',
                        borderRadius: '16px',
                        border:
                          bookingFreq === 'subscription'
                            ? '2px solid #0d5c3a'
                            : '1.5px solid #dce8df',
                        background:
                          bookingFreq === 'subscription' ? '#0d5c3a' : '#ffffff',
                        color:
                          bookingFreq === 'subscription' ? '#ffffff' : '#13281c',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        boxShadow:
                          bookingFreq === 'subscription'
                            ? '0 6px 18px rgba(13, 92, 58, 0.2)'
                            : 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <Calendar
                          size={18}
                          color={
                            bookingFreq === 'subscription' ? '#ffffff' : '#0d5c3a'
                          }
                        />
                        <strong style={{ fontSize: '0.94rem' }}>
                          Daily Subscription
                        </strong>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.75rem',
                          color:
                            bookingFreq === 'subscription'
                              ? 'rgba(255, 255, 255, 0.85)'
                              : '#617b6a',
                          lineHeight: 1.35,
                        }}
                      >
                        Every morning before 6:30 AM · Pause anytime
                      </p>
                    </button>
                  </div>
                </div>

                {/* Selected Product Pill Info */}
                <div
                  style={{
                    background: '#f8faf8',
                    border: '1px solid #e1eee4',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#e9f2eb',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={activeImage}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#13281c' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#688272' }}>
                        ₹{unitPrice} per {cleanUnit}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      background: '#e8f5ec',
                      color: '#0d5c3a',
                      padding: '4px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    Farm Fresh
                  </span>
                </div>

                {/* Delivery Date & Quantity Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '14px',
                    marginBottom: '16px',
                  }}
                >
                  {/* Delivery Date */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#496653',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      DELIVERY DATE
                    </label>
                    <input
                      type="date"
                      min={tomorrowStr}
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #d6e4d9',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#13281c',
                        background: '#ffffff',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Quantity Stepper */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#496653',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      ORDER QUANTITY
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        borderRadius: '12px',
                        border: '1.5px solid #d6e4d9',
                        background: '#ffffff',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setBookingQty((prev) => Math.max(1, prev - 1))}
                        disabled={bookingQty <= 1}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          border: 'none',
                          background: bookingQty <= 1 ? '#f1f5f2' : '#eaf4ed',
                          color: bookingQty <= 1 ? '#a0b4a7' : '#0d5c3a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: bookingQty <= 1 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Minus size={15} />
                      </button>

                      <span
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: '#0d5c3a',
                        }}
                      >
                        {bookingQty}
                      </span>

                      <button
                        type="button"
                        onClick={() => setBookingQty((prev) => Math.min(20, prev + 1))}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#0d5c3a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preset Chips (Fixed string concatenation bug) */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  {getPresetOptions().map((preset) => {
                    const isSelected = bookingQty === preset.qty;
                    return (
                      <button
                        key={preset.qty}
                        type="button"
                        onClick={() => setBookingQty(preset.qty)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '999px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          border: isSelected
                            ? '1.5px solid #0d5c3a'
                            : '1px solid #d4e3d7',
                          background: isSelected ? '#0d5c3a' : '#f2f8f4',
                          color: isSelected ? '#ffffff' : '#31543d',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Customer Delivery Details or Address Preview */}
                {customer && (
                  <div
                    style={{
                      background: '#f8faf8',
                      borderRadius: '14px',
                      padding: '12px 16px',
                      border: '1px solid #e1eee4',
                      marginBottom: '20px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#496653',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '6px',
                      }}
                    >
                      <MapPin size={13} color="#0d5c3a" />
                      <span>DOORSTEP DROP DESTINATION</span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: '#13281c',
                        marginBottom: '3px',
                      }}
                    >
                      {customer.name} · {customer.phone || customer.mobile || ''}
                    </div>

                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#5b7564',
                        lineHeight: 1.4,
                      }}
                    >
                      {customer.address ||
                        customer.locality ||
                        'Registered doorstep delivery route'}
                    </div>

                    <input
                      type="text"
                      value={dropNotes}
                      onChange={(e) => setDropNotes(e.target.value)}
                      placeholder="Drop instructions (e.g. Ring bell, leave in bag)"
                      style={{
                        width: '100%',
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d4e3d7',
                        fontSize: '0.8rem',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        color: '#13281c',
                      }}
                    />
                  </div>
                )}

                {/* Price Breakdown & Confirm CTA */}
                <div
                  style={{
                    borderTop: '1px solid #e6f0e8',
                    paddingTop: '18px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      fontSize: '0.92rem',
                    }}
                  >
                    <div>
                      <span style={{ color: '#5b7564' }}>
                        {bookingQty} × ₹{unitPrice} ({product.name})
                      </span>
                      {bookingFreq === 'subscription' && (
                        <div style={{ fontSize: '0.78rem', color: '#0d5c3a', fontWeight: 600 }}>
                          Est. Monthly: ₹{monthlyTotal} (30 morning drops)
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '1.45rem',
                          fontWeight: 900,
                          color: '#0d5c3a',
                          lineHeight: 1,
                        }}
                      >
                        ₹{dailyTotal}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>
                        FREE Doorstep Drop
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '16px 24px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #0d5c3a 0%, #16804d 100%)',
                      color: '#ffffff',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 10px 26px -6px rgba(13, 92, 58, 0.4)',
                      transition: 'all 0.2s ease',
                      opacity: isSubmitting ? 0.75 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow =
                          '0 14px 30px -6px rgba(13, 92, 58, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow =
                        '0 10px 26px -6px rgba(13, 92, 58, 0.4)';
                    }}
                  >
                    {isSubmitting ? (
                      <span>Scheduling Drop...</span>
                    ) : bookingFreq === 'one_time' ? (
                      <>
                        <PackageCheck size={20} />
                        <span>Confirm & Place Order • ₹{dailyTotal}</span>
                      </>
                    ) : (
                      <>
                        <Calendar size={20} />
                        <span>Start Daily Subscription • ₹{dailyTotal}/day</span>
                      </>
                    )}
                  </button>

                  {/* WhatsApp Secondary Ordering Option */}
                  <div
                    style={{
                      textAlign: 'center',
                      marginTop: '14px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={openWhatsAppBooking}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0d5c3a',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                      }}
                    >
                      <MessageCircle size={15} color="#22c55e" />
                      <span>Prefer WhatsApp? Book via WhatsApp →</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* 2.5 STICKY BOTTOM ACTION BAR (MOBILE ONLY) */}
      {!orderSuccessMsg && (
        <div className="pdp-mobile-bottom-bar">
          <div className="pdp-mobile-bottom-price">
            <div className="pdp-mobile-price-val">₹{dailyTotal}</div>
            <div className="pdp-mobile-price-sub">
              {bookingFreq === 'subscription' ? 'Daily Morning Drop' : 'One-Time Delivery'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            className="pdp-mobile-cta-btn"
          >
            {isSubmitting ? (
              <span>Scheduling...</span>
            ) : bookingFreq === 'subscription' ? (
              <span>Start Subscription →</span>
            ) : (
              <span>Confirm Order →</span>
            )}
          </button>
        </div>
      )}

      {/* 3. LIGHTBOX FULL VIEW MODAL */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
          }}
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar inside Lightbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{product.name}</span>
              <span
                style={{
                  fontSize: '0.82rem',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                {activeImgIndex + 1} / {productImages.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={22} />
            </button>
          </div>

          {/* Center Image Stage */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {productImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIndex(
                    (prev) => (prev - 1 + productImages.length) % productImages.length
                  );
                }}
                style={{
                  position: 'absolute',
                  left: '12px',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <ChevronLeft size={24} />
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
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
              }}
            />

            {productImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIndex((prev) => (prev + 1) % productImages.length);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Lightbox Thumbnails */}
          {productImages.length > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                paddingTop: '10px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {productImages.map((thumbUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImgIndex(idx)}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    padding: 0,
                    border:
                      activeImgIndex === idx
                        ? '2.5px solid #22c55e'
                        : '1.5px solid rgba(255, 255, 255, 0.3)',
                    background: '#000000',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={thumbUrl}
                    alt=""
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
