import React from 'react';
import { HeartHandshake, Check, Sparkles, Award, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import Footer from '../components/Footer';

export default function StoryPage({ setActiveTab }) {
  return (
    <div style={{ background: '#f8faf8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d5c3a 0%, #0c2340 100%)',
          color: '#ffffff',
          padding: '70px 24px 60px 24px',
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
              color: '#E5B842',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            <HeartHandshake size={15} />
            Our Heritage & Commitment
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)', fontWeight: 900, color: '#ffffff', marginBottom: '14px' }}>
            Our Story
          </h1>
          <p style={{ color: '#d1fae5', fontSize: '1.15rem', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto' }}>
            From green pastures to your kitchen in under 4 hours. How Natural Milk Dairy was founded to bring back honest, unadulterated milk.
          </p>
        </div>
      </div>

      {/* Main Story Content */}
      <div style={{ maxWidth: '1280px', margin: '60px auto 0 auto', padding: '0 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '60px',
            alignItems: 'center',
            marginBottom: '80px',
          }}
        >
          <div>
            <span style={{ color: '#0d5c3a', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              The Truth About Modern Milk
            </span>
            <h2 style={{ fontSize: '2.4rem', color: '#0c2340', fontWeight: 900, lineHeight: 1.2, margin: '8px 0 18px 0' }}>
              Why We Started Natural Milk Dairy
            </h2>
            <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.7, marginBottom: '18px' }}>
              For decades, families trusted the neighborhood milk delivery. But over time, corporate milk supply chains became complicated: milk began traveling thousands of kilometers, undergoing chemical reconstitution, powdered additions, and sitting in pouches for weeks.
            </p>
            <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.7, marginBottom: '28px' }}>
              We started Natural Milk Dairy with a simple rule: <strong>keep it pure, keep it local, and never compromise</strong>.
              Our cows graze on lush natural green fodder. They are milked in pristine conditions, chilled to 4°C immediately, and bottled in sterilized glass containers before sunrise.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Check size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 600 }}>Zero Chemical Preservatives</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Check size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 600 }}>No Hormone Injections (Oxytocin)</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Check size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 600 }}>Hygienic Automated Milking</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Check size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 600 }}>Reusable Glass Packaging</span>
              </div>
            </div>
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
            <p style={{ color: '#d1fae5', fontSize: '0.9rem', marginBottom: '30px' }}>
              How your milk travels from farm to doorstep in under 4 hours
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {[
                { time: '04:00 AM', title: 'Gentle Milking', desc: 'Milked in clean touchless milking parlor' },
                { time: '04:45 AM', title: '4°C Instant Chilling', desc: 'Preserves natural probiotics and vitamins' },
                { time: '05:30 AM', title: 'Route Dispatch', desc: 'Assigned to local delivery boys via mobile app' },
                { time: '06:30 AM', title: 'At Your Doorstep', desc: 'Fresh cold milk ready for tea and breakfast' },
              ].map((step, sidx) => (
                <div key={sidx} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '68px', fontWeight: 900, color: '#E5B842', fontSize: '0.98rem', flexShrink: 0 }}>
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

        {/* 4 Pillars Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.2rem', color: '#0c2340', fontWeight: 900 }}>
            Our 4 Farm Pillars
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
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
                borderRadius: '18px',
                padding: '28px',
                border: '1.5px solid #e2ece3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <h4 style={{ fontSize: '1.2rem', color: '#0d5c3a', fontWeight: 800, marginBottom: '10px' }}>
                {pillar.title}
              </h4>
              <p style={{ fontSize: '0.9rem', color: '#597361', lineHeight: 1.6 }}>
                {pillar.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '60px', marginBottom: '80px' }}>
          <button
            onClick={() => setActiveTab('products')}
            className="dairy-btn-hover"
            style={{
              background: '#0d5c3a',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1rem',
              padding: '14px 32px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
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
