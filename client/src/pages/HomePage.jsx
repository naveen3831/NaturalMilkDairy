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
} from 'lucide-react';
import SubscribeModal from '../components/SubscribeModal';
import Footer from '../components/Footer';

export default function HomePage({ setActiveTab }) {
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calcMilkQty, setCalcMilkQty] = useState(1);
  const [calcCurdQty, setCalcCurdQty] = useState(500);

  const handleSubscribe = (prod) => {
    setSelectedProduct(prod);
    setIsSubscribeOpen(true);
  };

  // Dynamic monthly estimate
  const monthlyMilkCost = calcMilkQty * 60 * 30;
  const monthlyCurdCost = (calcCurdQty / 500) * 35 * 30;
  const totalMonthlyCost = monthlyMilkCost + monthlyCurdCost;

  return (
    <div style={{ background: '#f8faf8', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      {/* ============================================================ */}
      {/* 1. HERO BANNER — FITS 100% IN SINGLE SCREEN VIEWPORT HEIGHT   */}
      {/* ============================================================ */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 75px)',
          minHeight: '560px',
          maxHeight: 'calc(100vh - 75px)',
          backgroundImage: 'url(/hero-dairy.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Silky-smooth translucent forest-green gradient blending across */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(7, 39, 21, 0.95) 0%, rgba(8, 43, 24, 0.92) 36%, rgba(8, 43, 24, 0.65) 54%, rgba(8, 43, 24, 0.15) 75%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Content Container — Compact paddings so entire content fits on 1 screen */}
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            padding: '20px 24px',
            width: '100%',
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ maxWidth: '620px' }}>
            {/* Eyebrow Tag: ☼ GOOD MORNINGS BEGIN NATURALLY */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#e2e8f0',
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              <span style={{ fontSize: '1.1rem', color: '#E5B842' }}>☼</span>
              <span>GOOD MORNINGS BEGIN NATURALLY</span>
            </div>

            {/* Giant Bold Headline Matching Screenshot */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.2rem, 4.4vw, 3.6rem)',
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                marginBottom: '14px',
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
                fontSize: 'clamp(0.95rem, 1.4vw, 1.15rem)',
                lineHeight: 1.5,
                color: 'rgba(255, 255, 255, 0.92)',
                fontWeight: 400,
                maxWidth: '540px',
                marginBottom: '22px',
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
                gap: '14px',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}
            >
              <button
                onClick={() => setIsSubscribeOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #E5B842 0%, #D4A32A 100%)',
                  color: '#071629',
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  padding: '13px 28px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 22px rgba(229, 184, 66, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 26px rgba(229, 184, 66, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 22px rgba(229, 184, 66, 0.4)';
                }}
              >
                <Milk size={19} />
                <span>Subscribe & Order Now</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(10px)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)';
                  e.currentTarget.style.borderColor = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                }}
              >
                <span>Our Products</span>
                <ChevronRight size={17} />
              </button>
            </div>

            {/* Trust Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                flexWrap: 'wrap',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d1fae5', fontSize: '0.82rem', fontWeight: 600 }}>
                <Check size={15} color="#4ade80" />
                <span>100% Unadulterated</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d1fae5', fontSize: '0.82rem', fontWeight: 600 }}>
                <Clock size={15} color="#E5B842" />
                <span>Before 6:30 AM Drop</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d1fae5', fontSize: '0.82rem', fontWeight: 600 }}>
                <ShieldCheck size={15} color="#67e8f9" />
                <span>Sterilized Glass Bottles</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. TODAY'S LIVE DAIRY DISPATCH & QUALITY COUNTERS            */}
      {/* ============================================================ */}
      <section
        style={{
          background: '#0c2340',
          color: '#ffffff',
          padding: '36px 24px',
          boxShadow: '0 8px 30px rgba(12, 35, 64, 0.2)',
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(229, 184, 66, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Milk size={28} color="#E5B842" />
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff' }}>1,420 Litres</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Fresh Morning Milked Yield</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(134, 239, 172, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={28} color="#86efac" />
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff' }}>99.8% On-Time</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Delivered Before 6:30 AM</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(103, 232, 249, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileCheck2 size={28} color="#67e8f9" />
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff' }}>0.0% Adulterants</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Fat: 4.2% • SNF: 8.6% Certified</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(244, 114, 182, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={28} color="#f472b6" />
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff' }}>850+ Families</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Active Mumbai Subscribers</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. HOW MORNING DELIVERY WORKS (4 SIMPLE STEPS)               */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1360px', margin: '70px auto 0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '46px' }}>
          <span style={{ color: '#0d5c3a', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Frictionless Dairy Living
          </span>
          <h2 style={{ fontSize: '2.4rem', color: '#0c2340', fontWeight: 900, marginTop: '6px' }}>
            How Morning Subscription Works
          </h2>
          <p style={{ color: '#597361', maxWidth: '600px', margin: '8px auto 0 auto', fontSize: '1rem' }}>
            Enjoy the pure comfort of doorstep farm milk without the daily hassle of visiting shops or fighting over paper notebooks.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {[
            {
              step: '01',
              title: 'Choose Milk & Curd',
              desc: 'Select pure cow milk, creamy buffalo milk, or traditional clay-pot curd according to your family needs.',
              color: '#0d5c3a',
              bg: '#eaf5ee',
            },
            {
              step: '02',
              title: 'Set Schedule',
              desc: 'Select daily delivery, alternate days, or custom weekday mornings. Start with no advance deposit.',
              color: '#0c2340',
              bg: '#edf4fc',
            },
            {
              step: '03',
              title: 'Silent 6:30 AM Drop',
              desc: 'Your delivery boy drops sterilized cold glass bottles silently outside your door before your alarm rings.',
              color: '#d98a0d',
              bg: '#fef8eb',
            },
            {
              step: '04',
              title: 'Pause Anytime & UPI',
              desc: 'Going on vacation? Pause with 1 tap. Receive clean monthly WhatsApp statements with 1-click UPI payments.',
              color: '#166534',
              bg: '#dcfce7',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="dairy-card-interactive"
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '30px 24px',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: item.bg,
                  color: item.color,
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                }}
              >
                {item.step}
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#0c2340', fontWeight: 800, marginBottom: '8px' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#597361', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3B. FEATURED FARM PRODUCTS (VISIBLE REAL IMAGES & PRICING)   */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1360px', margin: '80px auto 0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0d5c3a', fontWeight: 800, fontSize: '0.84rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <Sparkles size={16} color="#d98a0d" />
              <span>Fresh Farm Harvest</span>
            </div>
            <h2 style={{ fontSize: '2.4rem', color: '#0c2340', fontWeight: 900, marginTop: '6px' }}>
              Our Pure Dairy Products
            </h2>
            <p style={{ color: '#597361', maxWidth: '600px', fontSize: '1rem', marginTop: '6px' }}>
              No preservatives, zero adulterants, chilled to 4°C within 30 minutes of morning milking. Delivered before 6:30 AM across Mumbai.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('products')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#eaf5ee',
              color: '#0d5c3a',
              fontWeight: 800,
              padding: '12px 22px',
              borderRadius: '12px',
              border: '1.5px solid #0d5c3a',
              cursor: 'pointer',
              fontSize: '0.94rem',
            }}
            className="dairy-btn-hover"
          >
            <span>View All Products</span>
            <ArrowRight size={17} />
          </button>
        </div>

        {/* 4 Featured Product Cards with Real Photography */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {[
            {
              id: 'p1',
              name: 'Farm Fresh Cow Milk 1L',
              badge: 'Bestseller',
              badgeColor: '#0d5c3a',
              fat: '4.2% Fat • 8.5% SNF',
              price: '₹60',
              unit: '/ Litre',
              image: '/product-cow-milk.jpg',
              desc: 'Freshly milked raw cow milk chilled in sterilized glass bottles. Natural golden cream layer.',
            },
            {
              id: 'p3',
              name: 'Pure Buffalo Milk 1L',
              badge: 'High Cream Malai',
              badgeColor: '#d98a0d',
              fat: '7.5% Fat • 9.0% SNF',
              price: '₹75',
              unit: '/ Litre',
              image: '/product-buffalo-milk.jpg',
              desc: 'Thick, velvety buffalo milk. Rich in natural A2 fats, yields heavy homemade malai and ghee.',
            },
            {
              id: 'p4',
              name: 'Traditional Farm Curd 500g',
              badge: 'Clay Pot Set',
              badgeColor: '#0d5c3a',
              fat: 'Natural Probiotic',
              price: '₹35',
              unit: '/ 500g',
              image: '/product-curd.jpg',
              desc: 'Dense, naturally sweet probiotic curd cultured in authentic earthen pots with live gut flora.',
            },
            {
              id: 'p6',
              name: 'Vedic A2 Desi Cow Ghee 500ml',
              badge: 'Bilona Churned',
              badgeColor: '#b45309',
              fat: '100% Pure A2',
              price: '₹480',
              unit: '/ 500ml',
              image: '/product-ghee.jpg',
              desc: 'Handmade traditional wood-churned bilona ghee with divine nutty aroma and granular golden texture.',
            },
          ].map((prod) => (
            <div
              key={prod.id}
              className="dairy-product-card"
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1.5px solid #e2ece3',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}
            >
              {/* Image with zoom effect */}
              <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden', background: '#f8faf8' }}>
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="product-img"
                  onError={(e) => {
                    e.currentTarget.src = '/hero-dairy.jpg';
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: '#ffffff',
                    color: prod.badgeColor,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {prod.badge}
                </span>

                <span
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(7, 22, 41, 0.82)',
                    color: '#ffffff',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {prod.fat}
                </span>
              </div>

              {/* Product Content */}
              <div style={{ padding: '22px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>
                    {prod.name}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#597361', lineHeight: 1.5, marginBottom: '16px' }}>
                    {prod.desc}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #edf3ee', paddingTop: '16px' }}>
                  <div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0d5c3a' }}>{prod.price}</span>
                    <span style={{ fontSize: '0.8rem', color: '#597361', marginLeft: '4px' }}>{prod.unit}</span>
                  </div>

                  <button
                    onClick={() => handleSubscribe(prod)}
                    className="dairy-btn-hover"
                    style={{
                      background: '#0d5c3a',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      padding: '9px 18px',
                      borderRadius: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Subscribe</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. COMPARISON TABLE: NATURAL MILK DAIRY VS OTHERS            */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1280px', margin: '80px auto 0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ color: '#0d5c3a', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            The Honest Purity Test
          </span>
          <h2 style={{ fontSize: '2.4rem', color: '#0c2340', fontWeight: 900, marginTop: '6px' }}>
            Why Natural Milk Dairy Is Different
          </h2>
          <p style={{ color: '#597361', maxWidth: '640px', margin: '8px auto 0 auto', fontSize: '1rem' }}>
            See how farm-fresh glass bottled milk compares to processed supermarket pouches and traditional milkmen.
          </p>
        </div>

        <div className="table-responsive" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.04)', borderRadius: '20px', overflow: 'hidden' }}>
          <table className="dairy-table" style={{ background: '#ffffff', width: '100%' }}>
            <thead>
              <tr style={{ background: '#f4f8f5' }}>
                <th style={{ padding: '18px 20px', fontSize: '0.95rem' }}>Feature / Standard</th>
                <th style={{ padding: '18px 20px', fontSize: '1rem', color: '#0d5c3a', background: '#eaf5ee' }}>
                  🌿 Natural Milk Dairy
                </th>
                <th style={{ padding: '18px 20px', fontSize: '0.95rem', color: '#64748b' }}>Supermarket Plastic Pouches</th>
                <th style={{ padding: '18px 20px', fontSize: '0.95rem', color: '#64748b' }}>Local Dudhwala (Loose Milk)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Milk Source</strong></td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 700 }}>Direct Single-Farm Pasture Cattle</td>
                <td>Pooled from hundreds of distant centers</td>
                <td>Unknown mixed sources</td>
              </tr>
              <tr>
                <td><strong>Processing & Chilling</strong></td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 700 }}>Chilled to 4°C within 30 min of milking</td>
                <td>Multi-day boiling & chemical pasteurization</td>
                <td>Warm or unrefrigerated open cans</td>
              </tr>
              <tr>
                <td><strong>Packaging Quality</strong></td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 700 }}>Sterilized Food-Grade Glass Bottles</td>
                <td>Single-use plastic pouches (leaches microplastics)</td>
                <td>Open aluminum containers</td>
              </tr>
              <tr>
                <td><strong>Adulteration & Chemicals</strong></td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 700 }}>Zero water, zero starch, zero preservatives</td>
                <td>Often standardized with milk powders</td>
                <td>Common water dilution & starch issues</td>
              </tr>
              <tr>
                <td><strong>Vacation Pause & Temp Qty</strong></td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 700 }}>1-Tap Vacation Pause via Web/WhatsApp</td>
                <td>N/A (You must go buy manually)</td>
                <td>Frequent diary disputes over skipped days</td>
              </tr>
              <tr>
                <td><strong>Billing Transparency</strong></td>
                <td style={{ background: '#f9fdfa', color: '#0d5c3a', fontWeight: 700 }}>Automatic WhatsApp Ledger & 1-Tap UPI</td>
                <td>Daily retail cash/card checkout</td>
                <td>Messy paper notebook bills prone to errors</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. INTERACTIVE MONTHLY DAIRY COST CALCULATOR                 */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1200px', margin: '80px auto 0 auto', padding: '0 24px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0d5c3a 0%, #0c2340 100%)',
            borderRadius: '24px',
            padding: '48px 36px',
            color: '#ffffff',
            boxShadow: '0 20px 50px rgba(13, 92, 58, 0.25)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ color: '#E5B842', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Transparent Pricing Calculator
            </span>
            <h2 style={{ fontSize: '2.2rem', color: '#ffffff', fontWeight: 900, marginTop: '4px' }}>
              Calculate Your Family's Monthly Dairy Plan
            </h2>
            <p style={{ color: '#d1fae5', maxWidth: '580px', margin: '6px auto 0 auto', fontSize: '0.95rem' }}>
              Adjust daily quantities below to see transparent daily & monthly totals with zero hidden fees.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'center' }}>
            {/* Left Controls */}
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '26px', borderRadius: '18px', backdropFilter: 'blur(8px)' }}>
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>Daily Farm Cow Milk (Litres)</label>
                  <span style={{ fontWeight: 900, color: '#E5B842', fontSize: '1.1rem' }}>{calcMilkQty} L / day</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={calcMilkQty}
                  onChange={(e) => setCalcMilkQty(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#E5B842' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>
                  <span>0.5 L (₹30)</span>
                  <span>1 L (₹60)</span>
                  <span>2 L (₹120)</span>
                  <span>4 L (₹240)</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>Daily Fresh Farm Curd (Grams)</label>
                  <span style={{ fontWeight: 900, color: '#86efac', fontSize: '1.1rem' }}>{calcCurdQty} g / day</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="250"
                  value={calcCurdQty}
                  onChange={(e) => setCalcCurdQty(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#86efac' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>
                  <span>0 g</span>
                  <span>250 g</span>
                  <span>500 g (₹35)</span>
                  <span>1,000 g (₹65)</span>
                </div>
              </div>
            </div>

            {/* Right Summary Card */}
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '30px', color: '#0c2340', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Estimated Monthly Total (30 Days)
              </div>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#0d5c3a', margin: '8px 0' }}>
                ₹{totalMonthlyCost}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#597361', marginBottom: '22px' }}>
                ₹{(calcMilkQty * 60 + (calcCurdQty / 500) * 35).toFixed(0)} per morning • Free Doorstep Delivery
              </div>

              <button
                onClick={() => setIsSubscribeOpen(true)}
                style={{
                  width: '100%',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(13, 92, 58, 0.3)',
                }}
              >
                Start This Subscription
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. VERIFIED MUMBAI CUSTOMER TESTIMONIALS                     */}
      {/* ============================================================ */}
      <section style={{ maxWidth: '1360px', margin: '80px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <span style={{ color: '#0d5c3a', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Real Family Stories
          </span>
          <h2 style={{ fontSize: '2.4rem', color: '#0c2340', fontWeight: 900, marginTop: '6px' }}>
            Trusted by 850+ Households
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
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
              area: 'Bandra West',
              plan: '1L Milk + 500g Curd',
            },
            {
              quote: 'Punctual 6:00 AM drop every single day without fail. The buffalo milk makes the best thick kheer and homemade paneer we have had in years.',
              name: 'Amit & Neha Shah',
              area: 'Juhu',
              plan: '2L Buffalo Milk Alternate Days',
            },
          ].map((t, tidx) => (
            <div
              key={tidx}
              className="dairy-card-interactive"
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '28px',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} fill="#f5a623" color="#f5a623" />
                  ))}
                </div>
                <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '20px' }}>
                  "{t.quote}"
                </p>
              </div>

              <div style={{ borderTop: '1px solid #edf3ee', paddingTop: '14px' }}>
                <div style={{ fontWeight: 800, color: '#0c2340', fontSize: '0.98rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{t.area} • <span style={{ color: '#0d5c3a', fontWeight: 600 }}>{t.plan}</span></div>
              </div>
            </div>
          ))}
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
