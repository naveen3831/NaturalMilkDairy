import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, CheckCircle2, ShieldCheck, Mail, Phone, Lock, User, ArrowLeft, AlertCircle } from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

export default function GoogleCompleteProfilePage({ setActiveTab }) {
  const { pendingGoogleAuth, completeGoogleProfile, savePendingGoogleAuth, loginWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load pending Google profile info from context, sessionStorage, or localStorage
  const effectiveGoogleAuth = pendingGoogleAuth || (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem('nmd_pending_google_auth') ||
        localStorage.getItem('nmd_pending_google_auth') ||
        'null'
      );
    } catch (_) {
      return null;
    }
  })();

  useEffect(() => {
    if (effectiveGoogleAuth?.name && !name) {
      setName(effectiveGoogleAuth.name);
    }
  }, [effectiveGoogleAuth]);

  // Ensure phone number input only ever contains digits and strips accidental browser email autofill
  useEffect(() => {
    if (mobile && /\D/.test(mobile)) {
      setMobile((prev) => prev.replace(/\D/g, '').slice(0, 10));
    }
  }, [mobile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    const cleanDigits = mobile.trim().replace(/\D/g, '');
    if (cleanDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      setError('Mobile number must start with 6, 7, 8, or 9.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    const res = await completeGoogleProfile({
      name: name.trim(),
      mobile: cleanDigits,
      password,
      portal: effectiveGoogleAuth?.portal || 'customer',
    });
    setIsLoading(false);

    if (res.success && res.user) {
      if (res.user.role === 'delivery_boy') {
        localStorage.setItem('nmd_current_tab', 'delivery-boy-app');
        setActiveTab('delivery-boy-app');
      } else {
        const postLoginCustomerPage = localStorage.getItem('nmd_post_login_customer_page');
        if (postLoginCustomerPage) {
          localStorage.removeItem('nmd_post_login_customer_page');
        }
        if (window.innerWidth <= 768) {
          const targetPage = ['dashboard', 'products', 'subscription', 'deliveries', 'profile'].includes(postLoginCustomerPage)
            ? postLoginCustomerPage
            : 'dashboard';
          localStorage.setItem('nmd_customer_page', targetPage);
          localStorage.setItem('nmd_current_tab', 'customer-portal');
          setActiveTab('customer-portal');
        } else {
          localStorage.setItem('nmd_current_tab', 'my-subscription');
          setActiveTab('my-subscription');
        }
      }
    } else {
      setError(res.message || 'Unable to complete your registration. Please try again.');
    }
  };

  const handleCancel = () => {
    savePendingGoogleAuth(null);
    try { sessionStorage.removeItem('nmd_pending_google_auth'); } catch (_) {}
    try { localStorage.removeItem('nmd_pending_google_auth'); } catch (_) {}
    setActiveTab('login');
  };

  const handleReLoginGoogle = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await loginWithGoogle('customer');
      setIsLoading(false);
      if (res.success && res.user) {
        if (window.innerWidth <= 768) {
          localStorage.setItem('nmd_customer_page', 'dashboard');
          localStorage.setItem('nmd_current_tab', 'customer-portal');
          setActiveTab('customer-portal');
        } else {
          localStorage.setItem('nmd_current_tab', 'my-subscription');
          setActiveTab('my-subscription');
        }
      }
    } catch (err) {
      setIsLoading(false);
      setError(err?.message || 'Google Sign-In failed. Please try again.');
    }
  };

  return (
    <div className="gcp-page-wrapper">
      <style>{`
        .gcp-page-wrapper {
          min-height: calc(100vh - 75px);
          width: 100%;
          background: #f8faf8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px 60px;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .gcp-card-container {
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .gcp-brand-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .gcp-brand-logo {
          height: 52px;
          object-fit: contain;
          margin-bottom: 12px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .gcp-brand-logo:hover {
          transform: scale(1.03);
        }

        .gcp-page-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #14241a;
          margin: 0 0 6px 0;
          line-height: 1.25;
        }

        .gcp-page-sub {
          font-size: 0.88rem;
          color: #597361;
          margin: 0;
          line-height: 1.4;
        }

        .gcp-main-card {
          width: 100%;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2ece3;
          overflow: hidden;
          box-sizing: border-box;
        }

        .gcp-verified-banner {
          background: linear-gradient(135deg, #ecfdf5 0%, #e0f2fe 100%);
          border-bottom: 1px solid #bbf7d0;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .gcp-avatar-img {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          object-fit: cover;
          flex-shrink: 0;
        }

        .gcp-avatar-fallback {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: #0d5c3a;
          color: #ffffff;
          font-weight: 800;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .gcp-verified-info {
          flex: 1;
          min-width: 0;
        }

        .gcp-verified-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .gcp-user-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gcp-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: #dcfce7;
          border: 1px solid #86efac;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #166534;
        }

        .gcp-user-email-chip {
          margin-top: 4px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 9px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #0d5c3a;
          max-width: 100%;
        }

        .gcp-user-email-chip span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gcp-form-body {
          padding: 22px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        .gcp-error-box {
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #b91c1c;
          font-size: 0.84rem;
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 1.35;
        }

        .gcp-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .gcp-field-label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #374151;
        }

        .gcp-field-label .req {
          color: #ef4444;
          margin-left: 2px;
        }

        .gcp-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .gcp-input-icon {
          position: absolute;
          left: 12px;
          color: #9ca3af;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .gcp-input-prefix {
          position: absolute;
          left: 12px;
          color: #0d5c3a;
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 4px;
          pointer-events: none;
        }

        .gcp-input {
          width: 100%;
          height: 46px;
          padding: 0 14px 0 40px;
          background: #ffffff;
          border: 1.5px solid #d1d5db;
          border-radius: 12px;
          font-size: 0.92rem;
          color: #111827;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
        }

        .gcp-input-with-prefix {
          padding-left: 64px !important;
        }

        .gcp-input:focus {
          border-color: #0d5c3a;
          box-shadow: 0 0 0 3px rgba(13, 92, 58, 0.12);
        }

        .gcp-input-locked {
          background: #f3f4f6;
          border-color: #e5e7eb;
          color: #4b5563;
          cursor: not-allowed;
          font-weight: 600;
        }

        .gcp-eye-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.15s ease;
        }

        .gcp-eye-btn:hover {
          color: #4b5563;
        }

        .gcp-field-hint {
          font-size: 0.74rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.35;
        }

        .gcp-submit-btn {
          width: 100%;
          height: 48px;
          background: #0d5c3a;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;
          box-shadow: 0 4px 14px rgba(13, 92, 58, 0.25);
          transition: background-color 0.2s ease, transform 0.1s ease;
        }

        .gcp-submit-btn:hover:not(:disabled) {
          background: #083b25;
          transform: translateY(-1px);
        }

        .gcp-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .gcp-cancel-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 4px auto 0;
          padding: 6px 12px;
          border-radius: 8px;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .gcp-cancel-btn:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        .gcp-fallback-card {
          width: 100%;
          background: #ffffff;
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          border: 1px solid #e2ece3;
          box-sizing: border-box;
        }

        .gcp-fallback-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #fef3c7;
          color: #d97706;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        @media (max-width: 480px) {
          .gcp-page-wrapper {
            padding: 16px 12px 40px;
            min-height: 100vh;
          }
          .gcp-main-card {
            border-radius: 16px;
          }
          .gcp-form-body {
            padding: 18px 16px;
          }
          .gcp-page-title {
            font-size: 1.3rem;
          }
        }
      `}</style>

      <div className="gcp-card-container">
        {/* Brand Header */}
        <div className="gcp-brand-header">
          <img
            src={CLOUDINARY_MEDIA.logo || CLOUDINARY_MEDIA.logoPng}
            alt="Natural Milk Dairy"
            className="gcp-brand-logo"
            onClick={() => setActiveTab('home')}
          />
          <h1 className="gcp-page-title">Complete Your Profile</h1>
          <p className="gcp-page-sub">
            Just a few quick details to activate your morning doorstep milk deliveries.
          </p>
        </div>

        {/* If no active Google session is found, show session expired / reconnect card */}
        {!effectiveGoogleAuth || (!effectiveGoogleAuth.idToken && !effectiveGoogleAuth.completionToken && !effectiveGoogleAuth.email) ? (
          <div className="gcp-fallback-card">
            <div className="gcp-fallback-icon">
              <Mail size={28} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
              No Active Google Session
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#4b5563', margin: '0 0 20px', lineHeight: 1.45 }}>
              Please sign in with your Google account first so we can verify your profile and activate doorstep deliveries.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleReLoginGoogle}
                disabled={isLoading}
                className="gcp-submit-btn"
                style={{ margin: 0 }}
              >
                {isLoading ? 'Connecting...' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="gcp-cancel-btn"
              >
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </button>
            </div>
          </div>
        ) : (
          /* Main Complete Profile Card */
          <div className="gcp-main-card">
            {/* Google Verified Banner */}
            <div className="gcp-verified-banner">
              {effectiveGoogleAuth.picture ? (
                <img
                  src={effectiveGoogleAuth.picture}
                  alt={effectiveGoogleAuth.name || 'Google User'}
                  className="gcp-avatar-img"
                />
              ) : (
                <div className="gcp-avatar-fallback">
                  {(effectiveGoogleAuth.name || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="gcp-verified-info">
                <div className="gcp-verified-row">
                  <span className="gcp-user-name">
                    {effectiveGoogleAuth.name || 'Google Account'}
                  </span>
                  <span className="gcp-verified-badge">
                    <ShieldCheck size={12} />
                    <span>Verified</span>
                  </span>
                </div>
                <div className="gcp-user-email-chip" title={effectiveGoogleAuth.email}>
                  <Mail size={12} style={{ flexShrink: 0 }} />
                  <span>{effectiveGoogleAuth.email}</span>
                  <Lock size={11} style={{ color: '#9ca3af', flexShrink: 0 }} />
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="gcp-form-body">
              {error && (
                <div className="gcp-error-box">
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <span>{error}</span>
                    {(error.toLowerCase().includes('session') || error.toLowerCase().includes('google') || error.toLowerCase().includes('again')) && (
                      <button
                        type="button"
                        onClick={handleReLoginGoogle}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#b91c1c',
                          textDecoration: 'underline',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          padding: 0,
                          marginTop: '2px',
                        }}
                      >
                        Click here to re-verify with Google
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Locked Google Email */}
              <div className="gcp-field-group">
                <label className="gcp-field-label">
                  Google Email Address
                </label>
                <div className="gcp-input-wrap">
                  <div className="gcp-input-icon">
                    <Mail size={18} style={{ color: '#0d5c3a' }} />
                  </div>
                  <input
                    type="email"
                    value={effectiveGoogleAuth.email || ''}
                    disabled
                    readOnly
                    className="gcp-input gcp-input-locked"
                  />
                  <div style={{ position: 'absolute', right: 12, color: '#9ca3af', display: 'flex' }}>
                    <Lock size={16} />
                  </div>
                </div>
                <p className="gcp-field-hint">
                  Linked to your verified Google account for fast 1-click login.
                </p>
              </div>

              {/* Full Name */}
              <div className="gcp-field-group">
                <label htmlFor="gcp-name" className="gcp-field-label">
                  Full Name <span className="req">*</span>
                </label>
                <div className="gcp-input-wrap">
                  <div className="gcp-input-icon">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    id="gcp-name"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="gcp-input"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="gcp-field-group">
                <label htmlFor="gcp-phone" className="gcp-field-label">
                  Phone Number <span className="req">*</span>
                </label>
                <div className="gcp-input-wrap">
                  <div className="gcp-input-prefix">
                    <Phone size={15} />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    id="gcp-phone"
                    name="phone"
                    autoComplete="tel"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 10);
                      setMobile(pasted);
                    }}
                    placeholder="9876543210"
                    className="gcp-input gcp-input-with-prefix"
                  />
                </div>
                <p className="gcp-field-hint">
                  Required for morning doorstep milk drops and OTP confirmations.
                </p>
              </div>

              {/* Create Password */}
              <div className="gcp-field-group">
                <label htmlFor="gcp-password" className="gcp-field-label">
                  Create Password <span className="req">*</span>
                </label>
                <div className="gcp-input-wrap">
                  <div className="gcp-input-icon">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="gcp-password"
                    name="new-password"
                    autoComplete="new-password"
                    required
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="gcp-input"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="gcp-eye-btn"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="gcp-field-hint">
                  Allows direct password login anytime without requiring Google.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="gcp-field-group">
                <label htmlFor="gcp-confirm-password" className="gcp-field-label">
                  Confirm Password <span className="req">*</span>
                </label>
                <div className="gcp-input-wrap">
                  <div className="gcp-input-icon">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="gcp-confirm-password"
                    name="confirm-password"
                    autoComplete="new-password"
                    required
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="gcp-input"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="gcp-eye-btn"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={isLoading}
                className="gcp-submit-btn"
              >
                {isLoading ? (
                  <>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        border: '2.5px solid #ffffff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span>Completing Setup...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Complete Registration & Sign In</span>
                  </>
                )}
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleCancel}
                className="gcp-cancel-btn"
              >
                <ArrowLeft size={16} />
                <span>Cancel and return to Sign In</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
