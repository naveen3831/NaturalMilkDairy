import React, { useState } from 'react';
import { MapPin, Phone, Mail, X } from 'lucide-react';

export default function Footer({ setActiveTab }) {
  const [legalModal, setLegalModal] = useState(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (tab, reset = false) => {
    if (reset) {
      localStorage.removeItem('nmd_selected_product_id');
      window.dispatchEvent(new CustomEvent('nmd_reset_products_page'));
    }
    if (typeof setActiveTab === 'function') {
      setActiveTab(tab);
    }
    scrollToTop();
  };

  return (
    <footer className="nmd-spesh-footer" aria-label="Site footer">
      <div className="nmd-spesh-container">
        {/* Top 4-Column Grid matching reference image */}
        <div className="nmd-spesh-grid">
          {/* Column 1: Brand & Socials */}
          <div className="nmd-spesh-col nmd-spesh-col-brand">
            <div
              className="nmd-spesh-brand-wrap"
              onClick={() => handleNavClick('home')}
              role="button"
              tabIndex={0}
            >
              <div className="nmd-spesh-logo-box">
                <img
                  src="/logo.png"
                  alt="Natural Milk Dairy"
                  className="nmd-spesh-logo-img"
                />
              </div>
              <div className="nmd-spesh-brand-names">
                <span className="nmd-spesh-brand-main">NATURAL MILK DAIRY</span>
                <span className="nmd-spesh-brand-sub">PRIVATE LIMITED</span>
              </div>
            </div>

            <p className="nmd-spesh-desc">
              Delivering pure farm-fresh unpasteurized milk and authentic dairy products directly to your doorstep across Mumbai.
            </p>

            {/* Social Icons matching reference: f, X, in, Instagram, YouTube */}
            <div className="nmd-spesh-socials">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="nmd-spesh-social-btn"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>

              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="nmd-spesh-social-btn"
                aria-label="X (formerly Twitter)"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="nmd-spesh-social-btn"
                aria-label="LinkedIn"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="nmd-spesh-social-btn"
                aria-label="Instagram"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>

              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="nmd-spesh-social-btn"
                aria-label="YouTube"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#080d1a" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="nmd-spesh-col">
            <h4 className="nmd-spesh-heading">Quick Links</h4>
            <ul className="nmd-spesh-links">
              <li>
                <button type="button" onClick={() => handleNavClick('home')}>
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNavClick('story')}>
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNavClick('products', true)}>
                  Services
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNavClick('products', true)}>
                  Projects & Products
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNavClick('contact')}>
                  Career & Support
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Services */}
          <div className="nmd-spesh-col">
            <h4 className="nmd-spesh-heading">Services</h4>
            <ul className="nmd-spesh-links">
              <li>
                <button type="button" onClick={() => handleNavClick('products', true)}>
                  Farm Fresh Cow Milk
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNavClick('products', true)}>
                  Pure Buffalo Milk
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNavClick('products', true)}>
                  Organic A2 Gir Cow Milk
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNavClick('products', true)}>
                  Handcrafted Desi Ghee
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNavClick('products', true)}>
                  Sterilized Glass Bottles
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNavClick('contact')}>
                  Doorstep Morning Delivery
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="nmd-spesh-col nmd-spesh-col-contact">
            <h4 className="nmd-spesh-heading">Contact</h4>
            <div className="nmd-spesh-contact-items">
              <div className="nmd-spesh-contact-row">
                <MapPin size={17} className="nmd-spesh-icon" />
                <span className="nmd-spesh-contact-text">
                  Natural Milk Dairy, Unit 12/B, Knowledge Park Rd,
                  Near WEH, Andheri West, Mumbai,
                  Maharashtra 400053
                </span>
              </div>

              <div className="nmd-spesh-contact-row">
                <Phone size={17} className="nmd-spesh-icon" />
                <a href="tel:+919876543210" className="nmd-spesh-contact-link">
                  +91 98765 43210
                </a>
              </div>

              <div className="nmd-spesh-contact-row">
                <Mail size={17} className="nmd-spesh-icon" />
                <a href="mailto:care@naturalmilkdairy.com" className="nmd-spesh-contact-link">
                  care@naturalmilkdairy.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider & Bottom Row */}
        <div className="nmd-spesh-bottom-bar">
          <div className="nmd-spesh-copyright">
            © {new Date().getFullYear()} NATURAL MILK DAIRY PRIVATE LIMITED. All rights reserved.
          </div>

          <div className="nmd-spesh-legal-links">
            <button
              type="button"
              className="nmd-spesh-legal-btn"
              onClick={() => setLegalModal('privacy')}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              className="nmd-spesh-legal-btn"
              onClick={() => setLegalModal('terms')}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      {/* Privacy / Terms Modal */}
      {legalModal && (
        <div className="nmd-spesh-modal-backdrop" onClick={() => setLegalModal(null)}>
          <div
            className="nmd-spesh-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="nmd-spesh-modal-header">
              <h3>
                {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h3>
              <button
                type="button"
                className="nmd-spesh-modal-close"
                onClick={() => setLegalModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="nmd-spesh-modal-body">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    Natural Milk Dairy Private Limited values customer privacy. We collect minimal personal information (such as delivery address and phone number) strictly to deliver fresh dairy to your doorstep every morning.
                  </p>
                  <p>
                    We do not sell or share customer data with third-party advertisers. All payment processing conforms to RBI and PCI-DSS compliance standards.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Daily doorstep delivery occurs before 6:30 AM across our active Mumbai delivery hubs. Orders or schedule changes must be placed by 8:00 PM the previous evening.
                  </p>
                  <p>
                    We deliver in sanitized, reusable glass bottles. Customers are requested to rinse and return empty bottles at each drop.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}


