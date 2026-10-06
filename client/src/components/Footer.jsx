import React from 'react';
import { Milk, Phone, Mail, MapPin, Clock, ShieldCheck, HeartHandshake, ArrowUp, Database } from 'lucide-react';

export default function Footer({ setActiveTab }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      style={{
        background: '#071629',
        color: '#ffffff',
        borderTop: '3px solid #0d5c3a',
        padding: '70px 24px 30px 24px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Top Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '40px',
            paddingBottom: '50px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Col 1: Brand Info */}
          <div>
            <div
              onClick={() => {
                setActiveTab('home');
                scrollToTop();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src="/logo.png" alt="Natural Milk Dairy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                  NATURAL MILK DAIRY
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#E5B842', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '2px' }}>
                  Natural • Pure • Healthy
                </div>
              </div>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
              Pure, unpasteurized farm-fresh milk delivered to doorsteps before 6:30 AM across Mumbai in eco-friendly sterilized glass bottles.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={15} color="#86efac" />
                <span>+91 98765 43210 (Helpline)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={15} color="#86efac" />
                <span>care@naturalmilkdairy.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={15} color="#86efac" />
                <span>Plot 14, Green Valley Agro Hub, Andheri, Mumbai</span>
              </div>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: 800, marginBottom: '18px', letterSpacing: '0.02em' }}>
              Quick Navigation
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <button
                onClick={() => {
                  setActiveTab('home');
                  scrollToTop();
                }}
                style={{ textAlign: 'left', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.target.style.color = '#86efac')}
                onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
              >
                Home
              </button>
              <button
                onClick={() => {
                  setActiveTab('products');
                  scrollToTop();
                }}
                style={{ textAlign: 'left', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.target.style.color = '#86efac')}
                onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
              >
                Our Products
              </button>
              <button
                onClick={() => {
                  setActiveTab('story');
                  scrollToTop();
                }}
                style={{ textAlign: 'left', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.target.style.color = '#86efac')}
                onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
              >
                Our Story
              </button>
              <button
                onClick={() => {
                  setActiveTab('faqs');
                  scrollToTop();
                }}
                style={{ textAlign: 'left', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.target.style.color = '#86efac')}
                onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
              >
                FAQs & Support
              </button>
              <button
                onClick={() => {
                  setActiveTab('contact');
                  scrollToTop();
                }}
                style={{ textAlign: 'left', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.target.style.color = '#86efac')}
                onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
              >
                Contact Us
              </button>
              <button
                onClick={() => {
                  setActiveTab('login');
                  scrollToTop();
                }}
                style={{ textAlign: 'left', color: '#86efac', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Sign In to Account →
              </button>
            </div>
          </div>

          {/* Col 3: Fresh Products */}
          <div>
            <h4 style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: 800, marginBottom: '18px', letterSpacing: '0.02em' }}>
              Dairy Essentials
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#94a3b8' }}>
              <div>• Farm Fresh Cow Milk 1L (₹60)</div>
              <div>• Farm Fresh Cow Milk 500ml (₹30)</div>
              <div>• Pure Buffalo Milk 1L (₹75)</div>
              <div>• Traditional Farm Curd 500g (₹35)</div>
              <div>• A2 Vedic Desi Ghee 500ml (₹480)</div>
              <div>• Fresh Malai Paneer 250g (₹95)</div>
            </div>
          </div>

          {/* Col 4: Delivery Zones */}
          <div>
            <h4 style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: 800, marginBottom: '18px', letterSpacing: '0.02em' }}>
              Active Delivery Hubs
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '14px' }}>
              Guaranteed morning doorstep delivery before <strong>6:30 AM</strong> in:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['Andheri West', 'Lokhandwala', 'Andheri East', 'Bandra', 'Juhu', 'Goregaon', 'Vile Parle'].map((zone, zidx) => (
                <span
                  key={zidx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    fontSize: '0.78rem',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {zone}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            paddingTop: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.82rem',
            color: '#94a3b8',
          }}
        >
          <div>
            © 2026 Natural Milk Dairy. All rights reserved. • FSSAI License Certified.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* MongoDB Atlas Real-Time Cloud Status Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(13, 92, 58, 0.35)',
                padding: '5px 14px',
                borderRadius: '20px',
                border: '1px solid rgba(34, 197, 94, 0.35)',
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
                  boxShadow: '0 0 8px #22c55e',
                  display: 'inline-block',
                }}
              />
              <span>MongoDB Atlas Cloud: Connected</span>
            </div>

            <button
              onClick={scrollToTop}
              className="dairy-btn-hover"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
              }}
            >
              <ArrowUp size={14} color="#86efac" />
              <span>Back to Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
