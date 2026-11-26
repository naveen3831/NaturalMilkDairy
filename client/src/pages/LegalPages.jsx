import React from 'react';
import {
  Shield,
  FileText,
  Trash2,
  CheckCircle2,
  Mail,
  Phone,
  AlertTriangle,
  Lock,
  Database,
  Share2,
  Scale,
  Clock,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { useDairy } from '../context/DairyContext';
import Footer from '../components/Footer';

function LegalPageShell({ icon: Icon, badge, title, subtitle, quickLinkLabel, quickLinkTab, setActiveTab, children }) {
  const goTo = (tab) => {
    if (typeof setActiveTab === 'function') setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Centered Light Hero Section (matching reference full-page layout) */}
      <section
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 45%), radial-gradient(circle at 80% 30%, rgba(5, 150, 105, 0.07) 0%, transparent 45%), #ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '56px 20px 48px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '0.73rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '18px',
            }}
          >
            <Icon size={14} />
            <span>{badge}</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 4.2vw, 2.85rem)',
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 14px',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: '1.02rem',
              color: '#475569',
              margin: '0 auto 24px',
              maxWidth: '620px',
              lineHeight: 1.65,
            }}
          >
            {subtitle}
          </p>

          {quickLinkLabel && quickLinkTab && (
            <button
              type="button"
              onClick={() => goTo(quickLinkTab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                padding: '9px 18px',
                borderRadius: '999px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Shield size={15} color="#059669" />
              <span>{quickLinkLabel}</span>
            </button>
          )}
        </div>
      </section>

      {/* Clause Cards Container */}
      <section style={{ flex: 1, padding: '36px 16px 64px' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {children}
        </div>
      </section>

      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}

function ClauseCard({ icon: Icon, label, title, children }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
        padding: 'clamp(20px, 3.5vw, 32px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#ecfdf5',
            border: '1px solid #bbf7d0',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>
        <div>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              color: '#059669',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              marginBottom: '2px',
            }}
          >
            {label}
          </div>
          <h2 style={{ fontSize: '1.22rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {title}
          </h2>
        </div>
      </div>

      <div style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.72 }}>
        {children}
      </div>
    </div>
  );
}

export function PrivacyPolicyPage({ setActiveTab }) {
  const { contactInfo } = useDairy();
  const email = contactInfo?.email || 'care@naturalmilkdairy.com';
  const phone = contactInfo?.phone || '+91 98765 43210';
  const address =
    contactInfo?.address ||
    'Natural Milk Dairy, Unit 12/B, Knowledge Park Rd, Near WEH, Andheri West, Mumbai, Maharashtra 400053';

  return (
    <LegalPageShell
      icon={Shield}
      badge="Platform Privacy Policy"
      title="Privacy Policy"
      subtitle="Learn how Natural Milk Dairy Private Limited collects, uses, safeguards, and deletes your personal data across our website and mobile application."
      quickLinkLabel="View Terms & Conditions"
      quickLinkTab="terms-and-conditions"
      setActiveTab={setActiveTab}
    >
      <ClauseCard icon={Database} label="Section 01" title="Information We Collect">
        <p style={{ marginTop: 0 }}>
          We collect only the information required to manage your dairy subscriptions and deliver fresh products to your doorstep:
        </p>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li><strong>Account &amp; Profile Details:</strong> Full name, mobile number, email address, and encrypted login credentials (or Google Sign-In profile identifiers).</li>
          <li><strong>Delivery &amp; Location Details:</strong> Doorstep address, flat/house number, landmark, serviceable area, and optional map coordinates for accurate route delivery.</li>
          <li><strong>Orders &amp; Payment References:</strong> Subscription plans, daily quantities, delivery history, and Razorpay transaction IDs (we never store raw card numbers, CVV, or UPI PINs).</li>
          <li><strong>Notifications &amp; Delivery Proof:</strong> Firebase Cloud Messaging (FCM) tokens for delivery alerts, and doorstep delivery photos captured by authorized delivery partners.</li>
        </ul>
      </ClauseCard>

      <ClauseCard icon={CheckCircle2} label="Section 02" title="How We Use Your Information">
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li>Schedule, route, and fulfill daily morning doorstep deliveries and one-time orders.</li>
          <li>Process subscription payments, generate monthly ledger statements, and apply pauses or quantity changes.</li>
          <li>Send real-time delivery updates, OTP password resets, and customer support responses.</li>
          <li>Protect the platform against unauthorized access, fraud, and API abuse.</li>
        </ul>
      </ClauseCard>

      <ClauseCard icon={Share2} label="Section 03" title="Data Sharing & Third-Party Services">
        <p style={{ marginTop: 0 }}>
          We <strong>never</strong> sell or rent your personal information to advertisers. Data is shared strictly when needed for service delivery:
        </p>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li><strong>Assigned Delivery Partners:</strong> Name, phone number, doorstep address, and daily order quantities required to complete your delivery.</li>
          <li><strong>Infrastructure Providers:</strong> Razorpay (payments), Google Firebase (authentication &amp; push notifications), and Cloudinary (secure image storage).</li>
        </ul>
      </ClauseCard>

      <ClauseCard icon={Lock} label="Section 04" title="Data Security & Encryption">
        <p style={{ margin: 0 }}>
          All web and mobile API traffic is encrypted via HTTPS/TLS in transit. Passwords and OTPs are stored using
          cryptographic hashing, and every API endpoint enforces server-side role-based access control.
        </p>
      </ClauseCard>

      <ClauseCard icon={Trash2} label="Section 05" title="Account Deletion & Contact">
        <p style={{ marginTop: 0 }}>
          You may permanently delete your account and personal data at any time through our in-app Delete Account option
          or by following our Account Deletion guide.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => {
              if (typeof setActiveTab === 'function') setActiveTab('delete-account');
              window.scrollTo({ top: 0, behavior: 'auto' });
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              padding: '9px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={15} />
            <span>Open Account Deletion Steps</span>
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          <strong>Natural Milk Dairy Private Limited</strong> ·{' '}
          <a href={`mailto:${email}`} style={{ color: '#059669', fontWeight: 600 }}>{email}</a> ·{' '}
          <a href={`tel:${phone.replace(/\s+/g, '')}`} style={{ color: '#059669', fontWeight: 600 }}>{phone}</a>
          <br />
          {address}
        </p>
      </ClauseCard>
    </LegalPageShell>
  );
}

export function TermsConditionsPage({ setActiveTab }) {
  const { contactInfo } = useDairy();
  const email = contactInfo?.email || 'care@naturalmilkdairy.com';
  const phone = contactInfo?.phone || '+91 98765 43210';

  return (
    <LegalPageShell
      icon={FileText}
      badge="Platform Legal Agreement"
      title="Terms & Conditions"
      subtitle="Please review these Terms & Conditions carefully before using our Natural Milk Dairy web platform, doorstep subscription services, or Mobile application."
      quickLinkLabel="View Privacy Policy"
      quickLinkTab="privacy-policy"
      setActiveTab={setActiveTab}
    >
      <ClauseCard icon={CheckCircle2} label="Clause 01" title="Acceptance of Terms">
        <p style={{ marginTop: 0 }}>
          Welcome to Natural Milk Dairy Private Limited. By accessing our public website, signing into the customer or
          delivery partner portal, or using the Natural Milk Dairy mobile application, you agree to comply with and be
          bound by these Terms &amp; Conditions.
        </p>
        <p style={{ marginBottom: 0 }}>
          If you do not agree with any part of these terms, please discontinue use of the platform and contact our
          support team for assistance.
        </p>
      </ClauseCard>

      <ClauseCard icon={UserCheck} label="Clause 02" title="Eligibility & Account Responsibility">
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li>You must provide accurate contact information and a valid doorstep delivery address within our active service zones.</li>
          <li>You are responsible for maintaining the confidentiality of your password and session credentials.</li>
          <li>Unauthorized access attempts, automated scraping, or role manipulation are strictly prohibited.</li>
        </ul>
      </ClauseCard>

      <ClauseCard icon={Clock} label="Clause 03" title="Doorstep Deliveries, Pauses & Glass Bottles">
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li>Morning doorstep deliveries are fulfilled during your route schedule window (typically 5:00 AM – 7:30 AM).</li>
          <li>Customers may pause deliveries, resume subscriptions, or set temporary quantity changes before the daily dispatch cutoff.</li>
          <li>Where reusable sterilized glass bottles are provided, please rinse and leave empty bottles at your doorstep for collection.</li>
        </ul>
      </ClauseCard>

      <ClauseCard icon={CreditCard} label="Clause 04" title="Pricing, Subscriptions & Refunds">
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li>Product pricing and 30-day prepaid or cash/UPI ledger terms are shown clearly prior to order confirmation.</li>
          <li>Online payments are verified securely via Razorpay; doorstep cash and direct UPI payments are logged in your ledger.</li>
          <li>Unused prepaid balances from cancelled or paused subscriptions are credited to your account or refunded upon support verification.</li>
        </ul>
      </ClauseCard>

      <ClauseCard icon={Scale} label="Clause 05" title="Account Termination & Governing Law">
        <p style={{ marginTop: 0 }}>
          We reserve the right to suspend accounts involved in payment fraud or platform abuse. You may delete your
          account at any time via our{' '}
          <button
            type="button"
            onClick={() => {
              if (typeof setActiveTab === 'function') setActiveTab('delete-account');
              window.scrollTo({ top: 0, behavior: 'auto' });
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#059669',
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            Account Deletion page
          </button>.
        </p>
        <p style={{ marginBottom: 0 }}>
          These Terms &amp; Conditions are governed by the laws of India. Support:{' '}
          <a href={`mailto:${email}`} style={{ color: '#059669', fontWeight: 600 }}>{email}</a> ·{' '}
          <a href={`tel:${phone.replace(/\s+/g, '')}`} style={{ color: '#059669', fontWeight: 600 }}>{phone}</a>.
        </p>
      </ClauseCard>
    </LegalPageShell>
  );
}

export function AccountDeletionPage({ setActiveTab }) {
  const { contactInfo } = useDairy();
  const email = contactInfo?.email || 'care@naturalmilkdairy.com';
  const phone = contactInfo?.phone || '+91 98765 43210';

  const steps = [
    {
      step: 'Step 01',
      title: 'Sign In to Your Account',
      desc: 'Open the Natural Milk Dairy Android app or website and sign in using your registered mobile number, email & password, or Google Sign-In.',
    },
    {
      step: 'Step 02',
      title: 'Open Profile / Account Settings',
      desc: 'Tap the Profile tab in the bottom navigation bar (mobile app) or open your Account Menu in the top navigation bar (web).',
    },
    {
      step: 'Step 03',
      title: 'Tap "Delete Account"',
      desc: 'Scroll to the Account Actions section and select the "Delete Account" button.',
    },
    {
      step: 'Step 04',
      title: 'Confirm Permanent Deletion',
      desc: 'Confirm the deletion prompt. Your active session is logged out immediately and your personal data is permanently removed.',
    },
  ];

  return (
    <LegalPageShell
      icon={Trash2}
      badge="Account & Data Removal"
      title="Account Deletion Steps"
      subtitle="Follow these steps to permanently delete your Natural Milk Dairy account and personal information from our mobile app or website."
      quickLinkLabel="View Privacy Policy"
      quickLinkTab="privacy-policy"
      setActiveTab={setActiveTab}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '14px',
          padding: '16px 20px',
          color: '#92400e',
          fontSize: '0.92rem',
        }}
      >
        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Important Notice:</strong> Account deletion is permanent and cannot be undone. Please settle or pause
          any active doorstep delivery subscriptions before deleting your account.
        </div>
      </div>

      <ClauseCard icon={CheckCircle2} label="Option A · Instant" title="Delete Directly Inside the App or Website">
        <div style={{ display: 'grid', gap: '12px' }}>
          {steps.map((item) => (
            <div
              key={item.step}
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
              }}
            >
              <span
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.73rem',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {item.step}
              </span>
              <div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.96rem', marginBottom: '2px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#475569' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </ClauseCard>

      <ClauseCard icon={Mail} label="Option B · Support Assisted" title="Request Deletion Without Signing In">
        <p style={{ marginTop: 0 }}>
          If you cannot access your registered device, contact our support desk with your registered mobile number or
          email address. Verified deletion requests are completed within <strong>7 business days</strong>.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent('Account Deletion Request - Natural Milk Dairy')}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
            }}
          >
            <Mail size={16} />
            <span>Email: {email}</span>
          </a>
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
            }}
          >
            <Phone size={16} />
            <span>Call / WhatsApp: {phone}</span>
          </a>
        </div>
      </ClauseCard>

      <ClauseCard icon={Database} label="Data Retention" title="What Data Is Deleted vs. Retained">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
          <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontWeight: 800, color: '#065f46', marginBottom: '6px' }}>Permanently Deleted</div>
            <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.86rem', color: '#064e3b' }}>
              <li>Name, email address, and mobile number</li>
              <li>Saved doorstep addresses &amp; GPS coordinates</li>
              <li>Login credentials, active tokens &amp; FCM push tokens</li>
              <li>Notification history &amp; delivery preferences</li>
            </ul>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Legally Retained Only</div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569' }}>
              Statutory tax/invoice ledger entries required under Indian accounting regulations may be retained in
              restricted, non-operational archive form for the mandatory retention period.
            </p>
          </div>
        </div>
      </ClauseCard>
    </LegalPageShell>
  );
}
