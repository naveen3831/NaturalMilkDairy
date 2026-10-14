import React from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowUp,
  Milk,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export default function Footer({ setActiveTab }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Home', tab: 'home' },
    { label: 'Our Products', tab: 'products', reset: true },
    { label: 'Our Story', tab: 'story' },
    { label: 'FAQs & Support', tab: 'faqs' },
    { label: 'Contact Us', tab: 'contact' },
    { label: 'Customer Portal', tab: 'login', highlight: true },
  ];

  const deliveryHubs = [
    'Andheri West',
    'Lokhandwala',
    'Andheri East',
    'Bandra',
    'Juhu',
    'Goregaon',
    'Powai',
    'Borivali',
    'Thane',
    'Navi Mumbai',
  ];

  return (
    <footer className="nmd-footer" aria-label="Site footer">
      <div className="nmd-footer-inner">
        {/* Brand Banner */}
        <div className="nmd-footer-brand-section">
          <div
            className="nmd-footer-brand-header"
            onClick={() => {
              setActiveTab('home');
              scrollToTop();
            }}
            role="button"
            tabIndex={0}
          >
            <div className="nmd-footer-logo-wrap">
              <img
                src="/logo.png"
                alt="Natural Milk Dairy"
                className="nmd-footer-logo"
              />
            </div>
            <div className="nmd-footer-brand-titles">
              <span className="nmd-footer-brand-title">NATURAL MILK DAIRY</span>
              <span className="nmd-footer-brand-tagline">Natural • Pure • Healthy</span>
            </div>
          </div>

          <p className="nmd-footer-desc">
            Pure, unpasteurized farm-fresh milk delivered to doorsteps before 6:30 AM across Mumbai in eco-friendly sterilized glass bottles.
          </p>

          <div className="nmd-footer-contact-row">
            <a href="tel:+919876543210" className="nmd-footer-contact-chip">
              <Phone size={14} className="text-emerald-400" />
              <span>+91 98765 43210</span>
            </a>
            <a href="mailto:care@naturalmilkdairy.com" className="nmd-footer-contact-chip">
              <Mail size={14} className="text-emerald-400" />
              <span>care@naturalmilkdairy.com</span>
            </a>
            <div className="nmd-footer-contact-chip">
              <MapPin size={14} className="text-emerald-400" />
              <span>Andheri, Mumbai</span>
            </div>
          </div>
        </div>

        {/* Navigation & Hubs Grid */}
        <div className="nmd-footer-grid">
          {/* Quick Navigation */}
          <div className="nmd-footer-col">
            <h4 className="nmd-footer-heading">Quick Navigation</h4>
            <div className="nmd-footer-nav-list">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  className={`nmd-footer-nav-link ${link.highlight ? 'highlight' : ''}`}
                  onClick={() => {
                    if (link.reset) {
                      localStorage.removeItem('nmd_selected_product_id');
                      window.dispatchEvent(new CustomEvent('nmd_reset_products_page'));
                    }
                    setActiveTab(link.tab);
                    scrollToTop();
                  }}
                >
                  <ChevronRight size={13} className="nmd-footer-nav-arrow" />
                  <span>{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Hubs */}
          <div className="nmd-footer-col">
            <h4 className="nmd-footer-heading">Morning Delivery Hubs</h4>
            <p className="nmd-footer-hubs-note">
              <Clock size={13} className="text-emerald-400 inline mr-1" />
              Guaranteed morning doorstep drop before <strong>6:30 AM</strong>
            </p>
            <div className="nmd-footer-hubs-wrap">
              {deliveryHubs.map((zone) => (
                <span key={zone} className="nmd-footer-hub-badge">
                  {zone}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quality Badges */}
        <div className="nmd-footer-trust-strip">
          <div className="nmd-footer-trust-item">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>FSSAI Certified Organic Farm Fresh</span>
          </div>
          <div className="nmd-footer-trust-item">
            <Milk size={16} className="text-emerald-400" />
            <span>Sterilized Cold-Chain Glass Bottles</span>
          </div>
          <div className="nmd-footer-trust-item">
            <Sparkles size={16} className="text-emerald-400" />
            <span>Zero Preservatives · 100% Raw Milk</span>
          </div>
        </div>

        {/* Bottom Bar with Back to Top & Safe Padding */}
        <div className="nmd-footer-bottom-bar">
          <div className="nmd-footer-copyright">
            © 2026 Natural Milk Dairy. All rights reserved.
          </div>

          <button
            type="button"
            className="nmd-footer-back-to-top"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <ArrowUp size={14} />
            <span>Back to Top</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
