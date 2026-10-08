import React from 'react';
import { HeartHandshake, Check, Sparkles, Award, ShieldCheck, Clock, ArrowRight, Leaf, Milk } from 'lucide-react';
import Footer from '../components/Footer';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

export default function StoryPage({ setActiveTab }) {
  return (
    <div style={{ background: '#f8faf8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Page Header with Organic Farm Sunrise Banner */}
      <div
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

        <div style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
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
      <div style={{ maxWidth: '1360px', margin: '70px auto 0 auto', padding: '0 24px' }}>
        
        <div
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

        {/* 4. Glass Bottles Lineup Banner */}
        <div
          style={{
            borderRadius: '24px',
            overflow: 'hidden',
            marginBottom: '80px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
            position: 'relative',
            height: '320px',
          }}
        >
          <img
            src={CLOUDINARY_MEDIA.glassBottles}
            alt="Sterilized Glass Milk Bottles Lineup"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(7, 31, 19, 0.85) 0%, rgba(7, 31, 19, 0.4) 60%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 40px',
            }}
          >
            <div style={{ maxWidth: '500px', color: '#ffffff' }}>
              <span style={{ color: '#E5B842', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Zero Waste Packaging
              </span>
              <h3 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '6px', marginBottom: '10px' }}>
                Sterilized Glass Bottles, Every Morning
              </h3>
              <p style={{ color: '#e2fdf0', fontSize: '0.95rem', lineHeight: 1.6 }}>
                We deliver in thick food-grade glass bottles that are collected, sanitized in high-temperature steam wash, and reused hundreds of times.
              </p>
            </div>
          </div>
        </div>

        {/* 5. 4 Pillars Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.4rem', color: '#0c2340', fontWeight: 900 }}>
            Our 4 Farm Pillars
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '70px' }}>
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
