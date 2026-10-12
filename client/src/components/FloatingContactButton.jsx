import React from 'react';
import { Phone } from 'lucide-react';

/**
 * Mobile-Only Floating Contact Us Action Icon
 * Displayed exclusively on mobile responsive viewports (<= 768px)
 * floating above the bottom navigation bar.
 */
export default function FloatingContactButton({ activeTab, setActiveTab }) {
  const isContactActive = activeTab === 'contact';

  return (
    <aside className="mobile-floating-contact-container" aria-label="Quick contact">
      <button
        type="button"
        id="mobile-floating-contact-btn"
        className={`mobile-floating-contact-btn${isContactActive ? ' is-active' : ''}`}
        onClick={() => {
          setActiveTab('contact');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Contact Natural Milk Dairy Support"
        title="Contact Us"
      >
        <span className="floating-contact-glow" aria-hidden="true" />
        <Phone size={17} className="floating-contact-icon" aria-hidden="true" />
        <span className="floating-contact-text">Contact Us</span>
      </button>
    </aside>
  );
}
