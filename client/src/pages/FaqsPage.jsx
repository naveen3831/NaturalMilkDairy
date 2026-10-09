import React, { useState } from 'react';
import { ChevronDown, MessageSquare, Phone, Search, HelpCircle } from 'lucide-react';
import Footer from '../components/Footer';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

export default function FaqsPage({ setActiveTab }) {
  const [openFaq, setOpenFaq] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const faqs = [
    {
      category: 'delivery',
      q: 'What time is milk delivered to my doorstep in the morning?',
      a: 'All deliveries are completed strictly before 6:30 AM every morning. Our delivery boys begin dispatch at 5:30 AM so you have fresh, chilled milk ready for your morning tea, coffee, and cooking.',
    },
    {
      category: 'subscription',
      q: 'How do I pause my delivery if I am traveling or on vacation?',
      a: 'Pausing is completely hassle-free! You can set your pause dates directly in your Customer Portal, or send a quick WhatsApp message to your delivery partner before 9:00 PM the previous night. Deliveries automatically resume on your return date with ₹0 charges.',
    },
    {
      category: 'packaging',
      q: 'Do you charge a bottle deposit or use plastic packaging?',
      a: 'We use premium sterilized, food-grade glass bottles to ensure zero plastic leaching and authentic farm taste. There is no deposit required. Simply rinse yesterday’s empty bottle and leave it outside your door; our delivery partner swaps it out seamlessly each morning.',
    },
    {
      category: 'billing',
      q: 'How does billing and monthly payment work?',
      a: 'Every daily drop is logged automatically in our digital ledger. At the end of the month, you receive a transparent WhatsApp statement showing exact dates and quantities with an instant 1-tap UPI payment link. You can also pay via Net Banking, Debit/Credit Card, or cash.',
    },
    {
      category: 'quality',
      q: 'How do you guarantee that the milk is 100% unadulterated?',
      a: 'Every single batch undergoes rigorous testing before dispatch: testing fat percentage, SNF, and screening for starch, detergents, urea, and neutralizers. We also maintain a strict 4°C cold chain from milking parlor to delivery van.',
    },
    {
      category: 'subscription',
      q: 'Can I increase or decrease my quantity for just one day?',
      a: 'Yes! If you have guests arriving tomorrow and need 2L instead of your usual 1L, simply update your quantity in the portal or WhatsApp your delivery boy by 9:00 PM. The temporary quantity applies for that day only and automatically reverts the following morning.',
    },
    {
      category: 'quality',
      q: 'What is the difference between Cow Milk and Buffalo Milk?',
      a: 'Our Cow Milk is lighter (4.2% fat), easily digestible, naturally sweet, and rich in beta-carotene. Our Buffalo Milk is thicker and creamier (7.5% fat), producing rich, golden-yellow malai ideal for homemade ghee, paneer, and rich desserts.',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCat = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch =
      faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="public-faqs-page" style={{ background: '#f8faf8', minHeight: '100vh', paddingBottom: '90px' }}>
      {/* Header with Organic Farm Background Banner */}
      <div
        className="public-page-hero"
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

        <div className="public-page-hero-content" style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
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
            <HelpCircle size={15} />
            Help Center & Support
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)', fontWeight: 900, color: '#ffffff', marginBottom: '14px' }}>
            Frequently Asked Questions
          </h1>
          <p style={{ color: '#d1fae5', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto 28px auto' }}>
            Everything you need to know about our daily milk delivery, subscription schedules, glass bottles, and digital billing.
          </p>

          {/* Search Bar */}
          <div style={{ maxWidth: '540px', margin: '0 auto', position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '15px' }} />
            <input
              type="text"
              placeholder="Search questions (e.g. vacation pause, delivery time, bottle)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px 14px 46px',
                borderRadius: '30px',
                border: 'none',
                background: '#ffffff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                fontSize: '0.95rem',
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="public-page-content" style={{ maxWidth: '920px', margin: '40px auto 0 auto', padding: '0 24px' }}>
        <div className="public-faq-category-pills" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
          {[
            { id: 'all', label: 'All Questions' },
            { id: 'delivery', label: 'Morning Delivery' },
            { id: 'subscription', label: 'Vacation & Pauses' },
            { id: 'quality', label: 'Quality & Testing' },
            { id: 'billing', label: 'Billing & Payments' },
            { id: 'packaging', label: 'Bottles & Eco Glass' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeCategory === cat.id ? '#0d5c3a' : '#ffffff',
                color: activeCategory === cat.id ? '#ffffff' : '#4b5563',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: activeCategory === cat.id ? '1px solid #0d5c3a' : '1px solid #e2ece3',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQs List */}
        <div className="public-faq-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredFaqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '16px' }}>
              <p style={{ color: '#597361', fontSize: '1rem' }}>No questions found matching your search. Please reach out to us below!</p>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="public-faq-item"
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: isOpen ? '1.5px solid #0d5c3a' : '1px solid #e2ece3',
                    overflow: 'hidden',
                    boxShadow: isOpen ? '0 6px 20px rgba(13, 92, 58, 0.08)' : '0 2px 6px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s',
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
                    <h4 style={{ fontSize: '1.08rem', color: '#0c2340', fontWeight: 700, margin: 0, paddingRight: '12px' }}>
                      {faq.q}
                    </h4>
                    <ChevronDown
                      size={20}
                      color={isOpen ? '#0d5c3a' : '#94a3b8'}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  {isOpen && (
                    <div
                      className="public-card-grid"
                      style={{
                        padding: '0 24px 22px 24px',
                        color: '#475569',
                        fontSize: '0.96rem',
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
            })
          )}
        </div>

        {/* Visual Milk & Glass Bottle Photo Cards */}
        <div
          className="public-faq-feature-grid"
          style={{
            marginTop: '60px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '26px',
          }}
        >
          <div
            className="public-faq-feature-card"
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#ffffff',
              border: '1.5px solid #e2ece3',
              boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ height: '220px', overflow: 'hidden' }}>
              <img
                src={CLOUDINARY_MEDIA.glassBottles}
                alt="Sterilized Glass Bottles"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '22px' }}>
              <h4 style={{ fontSize: '1.15rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>
                Why do we strictly use Glass Bottles?
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#597361', lineHeight: 1.6 }}>
                Hot milk packed into plastic pouches leaches harmful endocrine-disrupting chemicals. Our sterilized glass bottles preserve 100% natural flavor with zero environmental plastic waste.
              </p>
            </div>
          </div>

          <div
            className="public-faq-feature-card"
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#ffffff',
              border: '1.5px solid #e2ece3',
              boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ height: '220px', overflow: 'hidden' }}>
              <img
                src={CLOUDINARY_MEDIA.milkPour}
                alt="Cold Farm Milk Pour"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '22px' }}>
              <h4 style={{ fontSize: '1.15rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>
                Should I boil the milk after morning delivery?
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#597361', lineHeight: 1.6 }}>
                Yes! Our milk is farm-fresh and chilled to 4°C immediately after milking. We recommend a gentle, slow boil on your stove, which produces a rich, thick golden malai layer on top.
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp & Call Banner */}
        <div
          style={{
            marginTop: '60px',
            background: 'linear-gradient(135deg, #eaf5ee 0%, #edf4fc 100%)',
            borderRadius: '20px',
            padding: '36px',
            border: '1.5px solid #c7e3d1',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '1.4rem', color: '#0c2340', fontWeight: 800, marginBottom: '8px' }}>
            Still have questions or need assistance?
          </h3>
          <p style={{ color: '#597361', fontSize: '0.95rem', marginBottom: '22px' }}>
            Our customer care and delivery managers are available every day from 6:00 AM to 8:00 PM.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('contact')}
              className="dairy-btn-hover"
              style={{
                background: '#0d5c3a',
                color: '#ffffff',
                fontWeight: 700,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              Contact Support
            </button>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="dairy-btn-hover"
              style={{
                background: '#25D366',
                color: '#ffffff',
                fontWeight: 700,
                padding: '12px 24px',
                borderRadius: '10px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MessageSquare size={18} />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
