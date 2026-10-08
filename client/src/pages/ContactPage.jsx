import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import Footer from '../components/Footer';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

export default function ContactPage({ setActiveTab }) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    area: 'Andheri West',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ background: '#f8faf8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Organic Farm Background Banner */}
      <div
        style={{
          position: 'relative',
          backgroundImage: `url(${CLOUDINARY_MEDIA.organicFarm})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          color: '#ffffff',
          padding: '80px 24px 70px 24px',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(7, 31, 19, 0.78) 0%, rgba(7, 31, 19, 0.90) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
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
            <Phone size={15} />
            We Are Always Here For You
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)', fontWeight: 900, color: '#ffffff', marginBottom: '14px' }}>
            Contact Us
          </h1>
          <p style={{ color: '#d1fae5', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto' }}>
            Have a question about our morning routes, custom dairy subscriptions, or want to visit our farm? Get in touch today.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '60px auto 0 auto', padding: '0 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '48px',
          }}
        >
          {/* Contact Details Card */}
          <div>
            <span style={{ color: '#0d5c3a', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Direct Support
            </span>
            <h2 style={{ fontSize: '2.2rem', color: '#0c2340', fontWeight: 900, margin: '6px 0 16px 0' }}>
              Farm & Operations Center
            </h2>
            <p style={{ color: '#597361', fontSize: '1rem', lineHeight: 1.6, marginBottom: '32px' }}>
              Our delivery hubs and chilled dispatch centers operate 365 days a year without missing a single morning.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eaf5ee', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Helpline & Instant Orders</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0c2340' }}>+91 98765 43210</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Email Inquiries</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0c2340' }}>care@naturalmilkdairy.com</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Dairy Farm & Dispatch Hub</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0c2340' }}>
                    Plot 14, Green Valley Agro Hub, Andheri, Mumbai 400053
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Delivery Timings</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0c2340' }}>
                    5:00 AM – 6:30 AM Daily (Customer Support: 7 AM – 9 PM)
                  </div>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Quick Chat */}
            <div style={{ marginTop: '36px' }}>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(37, 211, 102, 0.3)',
                }}
              >
                <MessageSquare size={20} />
                <span>Quick Order via WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '36px',
              border: '1.5px solid #e2ece3',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                  <CheckCircle2 size={38} />
                </div>
                <h3 style={{ fontSize: '1.5rem', color: '#0c2340', fontWeight: 800, marginBottom: '8px' }}>
                  Thank You, {formData.name}!
                </h3>
                <p style={{ color: '#597361', lineHeight: 1.6, marginBottom: '24px' }}>
                  Your inquiry has been received. Our local delivery route coordinator will get in touch with you at <strong>{formData.mobile}</strong> within 30 minutes.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '10px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 style={{ fontSize: '1.4rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>
                  Request a Free Sample / Callback
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#597361', marginBottom: '24px' }}>
                  Fill in your details below and we will assign your area delivery boy to bring a free milk sample bottle tomorrow morning.
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Delivery Area
                    </label>
                    <select
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    >
                      <option value="Andheri West">Andheri West</option>
                      <option value="Andheri East">Andheri East</option>
                      <option value="Bandra">Bandra</option>
                      <option value="Juhu">Juhu</option>
                      <option value="Goregaon">Goregaon</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '22px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Message or Special Delivery Request
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Please mention your apartment name or preferred delivery time..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="dairy-btn-hover"
                  style={{
                    width: '100%',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    padding: '14px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(13, 92, 58, 0.25)',
                  }}
                >
                  <Send size={18} />
                  <span>Submit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Visit Our Organic Dairy Farm Banner */}
        <div
          style={{
            marginTop: '70px',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
            position: 'relative',
            height: '360px',
            marginBottom: '70px',
          }}
        >
          <img
            src={CLOUDINARY_MEDIA.cowsPasture}
            alt="Visit Our Organic Dairy Pastures in Karjat"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(7, 31, 19, 0.9) 0%, rgba(7, 31, 19, 0.5) 60%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 44px',
            }}
          >
            <div style={{ maxWidth: '580px', color: '#ffffff' }}>
              <span style={{ color: '#E5B842', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Open Farm Policy
              </span>
              <h3 style={{ fontSize: '2.2rem', fontWeight: 900, marginTop: '6px', marginBottom: '12px', lineHeight: 1.2 }}>
                Visit Our Cows & Pastures in Person
              </h3>
              <p style={{ color: '#e2fdf0', fontSize: '1rem', lineHeight: 1.6, marginBottom: '22px' }}>
                We believe in 100% transparency. Families and kids are welcome to visit our Karjat & Nashik dairy pastures on weekends. See how our cattle live, graze, and get milked without human touch.
              </p>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <a
                  href="tel:+919876543210"
                  style={{
                    background: '#E5B842',
                    color: '#071629',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Phone size={16} />
                  <span>Call to Schedule a Weekend Farm Tour</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
