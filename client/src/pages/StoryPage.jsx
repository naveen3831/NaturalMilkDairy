import React, { useState } from 'react';
import {
  HeartHandshake,
  Check,
  Sparkles,
  Award,
  ShieldCheck,
  Clock,
  ArrowRight,
  Leaf,
  Milk,
  ChevronDown,
  Search,
  HelpCircle,
  MessageSquare,
  Phone,
} from 'lucide-react';
import Footer from '../components/Footer';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

export default function StoryPage({ setActiveTab }) {
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
    <div className="public-story-page" style={{ background: '#f8faf8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Page Header with Organic Farm Sunrise Banner */}
      <div
        className="public-page-hero"
        style={{
          position: 'relative',
          backgroundImage: `url(${CLOUDINARY_MEDIA.organicFarm})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          color: '#ffffff',
          padding: '100px 24px 80px 24px',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(7, 31, 19, 0.75) 0%, rgba(7, 31, 19, 0.85) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div className="public-page-hero-content" style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(229, 184, 66, 0.25)',
              border: '1px solid rgba(229, 184, 66, 0.5)',
              color: '#fce082',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '16px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <HeartHandshake size={15} />
            <span>Our Heritage & Sustainable Farm</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 900, color: '#ffffff', marginBottom: '16px', textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            The Story of Pure, Honest Dairy
          </h1>

          <p style={{ color: '#d1fae5', fontSize: '1.15rem', lineHeight: 1.6, maxWidth: '680px', margin: '0 auto', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
            From green pastures to your kitchen table in under 4 hours. How Natural Milk Dairy was founded to bring back authentic, unadulterated milk.
          </p>
        </div>
      </div>

      {/* 2. Main Story Content with Real Cows in Pasture Photo */}
      <div className="public-page-content" style={{ maxWidth: '1360px', margin: '70px auto 0 auto', padding: '0 24px' }}>
        
        <div
          className="public-story-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '50px',
            alignItems: 'center',
            marginBottom: '90px',
          }}
        >
          {/* Story Text */}
          <div>
            <span style={{ color: '#0d5c3a', fontWeight: 800, fontSize: '0.84rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              The Truth About Modern Milk
            </span>
            <h2 style={{ fontSize: '2.5rem', color: '#0c2340', fontWeight: 900, lineHeight: 1.2, margin: '8px 0 18px 0' }}>
              Why We Started Natural Milk Dairy
            </h2>
            <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.7, marginBottom: '16px' }}>
              For decades, families trusted neighborhood milkmen. But over time, corporate milk supply chains became complicated: milk began traveling hundreds of kilometers across state borders, undergoing chemical reconstitution, powdered additions, and sitting in plastic pouches for weeks.
            </p>
            <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.7, marginBottom: '24px' }}>
              We founded Natural Milk Dairy with a simple rule: <strong>keep it pure, keep it local, and never compromise</strong>. 
              Our cows graze on lush natural green fodder. They are milked in pristine touchless conditions, chilled to 4°C immediately, and bottled in sterilized glass containers before sunrise.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Check size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.92rem', color: '#1f2937', fontWeight: 600 }}>Zero Chemical Preservatives</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Check size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.92rem', color: '#1f2937', fontWeight: 600 }}>No Oxytocin or Hormones</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Check size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.92rem', color: '#1f2937', fontWeight: 600 }}>Hygienic Automated Milking</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Check size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.92rem', color: '#1f2937', fontWeight: 600 }}>Reusable Glass Packaging</span>
              </div>
            </div>
          </div>

          {/* Real Photo of Desi Gir & Holstein Cows in Pasture */}
          <div
            className="public-story-grid"
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 18px 45px rgba(0, 0, 0, 0.12)',
              position: 'relative',
              height: '460px',
            }}
          >
            <img
              src={CLOUDINARY_MEDIA.cowsPasture}
              alt="Healthy Indian Desi Cows Grazing in Pasture"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              className="public-story-photo-caption"
              style={{
                position: 'absolute',
                bottom: '18px',
                left: '18px',
                right: '18px',
                background: 'rgba(7, 22, 41, 0.88)',
                backdropFilter: 'blur(10px)',
                color: '#ffffff',
                padding: '12px 18px',
                borderRadius: '14px',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>Our Free-Range Organic Pastures</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Grass-fed Desi Gir and Holstein cattle thriving in fresh mountain air</div>
            </div>
          </div>
        </div>

        {/* 3. Visual Timeline with Milk Pouring & Glass Bottles Imagery */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '40px',
            alignItems: 'center',
            marginBottom: '90px',
          }}
        >
          {/* Real Milk Pouring Image */}
          <div
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 18px 45px rgba(0, 0, 0, 0.12)',
              height: '420px',
            }}
          >
            <img
              src={CLOUDINARY_MEDIA.milkPour}
              alt="Fresh Farm Milk Pouring into Glass"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Timeline Graphic Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0d5c3a 0%, #0c2340 100%)',
              borderRadius: '24px',
              padding: '40px',
              color: '#ffffff',
              boxShadow: '0 20px 40px rgba(13, 92, 58, 0.2)',
            }}
          >
            <h3 style={{ fontSize: '1.7rem', color: '#E5B842', fontWeight: 900, marginBottom: '6px' }}>
              The Freshness Timeline
            </h3>
            <p style={{ color: '#d1fae5', fontSize: '0.92rem', marginBottom: '28px' }}>
              How your milk travels from farm to doorstep in under 4 hours
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { time: '04:00 AM', title: 'Gentle Milking', desc: 'Milked in clean touchless milking parlor' },
                { time: '04:45 AM', title: '4°C Instant Chilling', desc: 'Preserves natural probiotics and vitamins' },
                { time: '05:30 AM', title: 'Route Dispatch', desc: 'Assigned to local delivery boys via mobile app' },
                { time: '06:30 AM', title: 'At Your Doorstep', desc: 'Fresh cold milk ready for tea and breakfast' },
              ].map((step, sidx) => (
                <div key={sidx} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '75px', fontWeight: 900, color: '#E5B842', fontSize: '1rem', flexShrink: 0 }}>
                    {step.time}
                  </div>
                  <div style={{ borderLeft: '2px solid rgba(255,255,255,0.25)', paddingLeft: '16px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>{step.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>



        {/* 5. 4 Pillars Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.4rem', color: '#0c2340', fontWeight: 900 }}>
            Our 4 Farm Pillars
          </h2>
        </div>

        <div className="public-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '70px' }}>
          {[
            {
              title: '1. Free-Range Cattle',
              desc: 'Cows and buffaloes graze naturally in open pasture sunlight with organic green fodder and clean mountain water.',
            },
            {
              title: '2. Touchless Milking',
              desc: 'Automated milking machines eliminate human hand contact and guarantee maximum microbiological purity.',
            },
            {
              title: '3. Instant Cold Chain',
              desc: 'Milk is chilled down to 4°C within 30 minutes of milking to stop bacterial growth without high-heat damage.',
            },
            {
              title: '4. Eco Glass Bottles',
              desc: 'Zero plastic pouches. Glass bottles preserve true farm taste and eliminate microplastic exposure.',
            },
          ].map((pillar, pidx) => (
            <div
              key={pidx}
              className="dairy-card-interactive"
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '30px 24px',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <h4 style={{ fontSize: '1.25rem', color: '#0d5c3a', fontWeight: 800, marginBottom: '10px' }}>
                {pillar.title}
              </h4>
              <p style={{ fontSize: '0.92rem', color: '#597361', lineHeight: 1.65 }}>
                {pillar.desc}
              </p>
            </div>
          ))}
        </div>

        {/* 6. Comprehensive FAQs Section (Mobile App Only - Website has dedicated FAQs page) */}
        <section
          id="farm-faqs-section"
          className="story-faqs-mobile-only"
          style={{
            marginTop: '30px',
            marginBottom: '70px',
            padding: '50px 24px',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, #ffffff 0%, #f1f8f3 100%)',
            border: '1.5px solid #d9ebd8',
            boxShadow: '0 10px 30px rgba(13, 92, 58, 0.04)',
          }}
          aria-label="Frequently Asked Questions"
        >
          {/* Header */}
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 34px auto' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: '#eaf5ee',
                color: '#0d5c3a',
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              <HelpCircle size={15} />
              <span>Questions & Answers</span>
            </div>
            <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 2.6rem)', color: '#0c2340', fontWeight: 900, marginBottom: '12px' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: '#597361', fontSize: '1.02rem', lineHeight: 1.6 }}>
              Have questions about our daily morning doorstep delivery, glass bottle sterilizing, subscriptions, or 100% pure testing? We have all your answers right here.
            </p>

            {/* Search Input */}
            <div style={{ maxWidth: '520px', margin: '22px auto 0 auto', position: 'relative' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '15px' }} />
              <input
                type="text"
                placeholder="Search questions (e.g. delivery time, vacation, bottle, testing)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 46px',
                  borderRadius: '30px',
                  border: '1px solid #d1e7d6',
                  background: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  fontSize: '0.94rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div
            className="public-faq-category-pills"
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: '30px',
            }}
          >
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
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeCategory === cat.id ? '#0d5c3a' : '#ffffff',
                  color: activeCategory === cat.id ? '#ffffff' : '#4b5563',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  border: activeCategory === cat.id ? '1px solid #0d5c3a' : '1px solid #e2ece3',
                  transition: 'all 0.18s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQs List Accordion */}
          <div
            className="public-faq-list"
            style={{
              maxWidth: '860px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {filteredFaqs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2ece3' }}>
                <p style={{ color: '#597361', fontSize: '0.98rem', margin: 0 }}>
                  No questions found matching "{searchTerm}". Reach out to us below and we will help you right away!
                </p>
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
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                      style={{
                        width: '100%',
                        padding: '18px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                      }}
                      aria-expanded={isOpen}
                    >
                      <h4 style={{ fontSize: '1.04rem', color: '#0c2340', fontWeight: 700, margin: 0, paddingRight: '12px', lineHeight: 1.4 }}>
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
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          padding: '0 22px 20px 22px',
                          color: '#475569',
                          fontSize: '0.95rem',
                          lineHeight: 1.65,
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '14px',
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

          {/* Quick Support Assistance Card */}
          <div
            style={{
              maxWidth: '860px',
              margin: '36px auto 0 auto',
              background: '#ffffff',
              borderRadius: '18px',
              padding: '28px 24px',
              border: '1px solid #d9ebd8',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '18px',
            }}
          >
            <div>
              <h4 style={{ fontSize: '1.12rem', color: '#0c2340', fontWeight: 800, margin: '0 0 4px 0' }}>
                Still have a question?
              </h4>
              <p style={{ color: '#597361', fontSize: '0.9rem', margin: 0 }}>
                Our customer happiness team is available daily from 6:00 AM to 8:00 PM.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('contact');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="dairy-btn-hover"
                style={{
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Phone size={16} />
                <span>Contact Us</span>
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
                  fontSize: '0.88rem',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MessageSquare size={16} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <button
            onClick={() => setActiveTab('products')}
            className="shine-button dairy-btn-hover"
            style={{
              background: 'linear-gradient(135deg, #0d5c3a 0%, #16945a 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1rem',
              padding: '15px 34px',
              borderRadius: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 8px 24px rgba(13, 92, 58, 0.3)',
            }}
          >
            <span>Explore Farm Products</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
