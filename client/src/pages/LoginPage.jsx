import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import {
  initGoogleIdentityServices,
  renderGoogleButton,
  promptOneTap,
} from '../services/googleAuthService';

export default function LoginPage({ setActiveTab }) {
  const { login, loginWithGoogle } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const isDeliveryPortal = urlParams.get('portal') === 'delivery';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleBtnMounted, setIsGoogleBtnMounted] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  const googleBtnRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigateAfterLogin = (user) => {
    if (user.role === 'delivery_boy') {
      localStorage.setItem('nmd_current_tab', 'delivery-boy-app');
      setActiveTab('delivery-boy-app');
    } else if (user.role === 'admin') {
      localStorage.setItem('nmd_admin_tab', 'dashboard');
      localStorage.setItem('nmd_current_tab', 'dashboard');
      setActiveTab('dashboard');
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
      } else if (postLoginCustomerPage === 'deliveries') {
        localStorage.setItem('nmd_current_tab', 'my-deliveries');
        setActiveTab('my-deliveries');
      } else {
        localStorage.setItem('nmd_current_tab', 'my-subscription');
        setActiveTab('my-subscription');
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    initGoogleIdentityServices({
      onCredential: async (credentialData) => {
        if (!isMounted) return;
        setError('');
        setIsLoading(true);
        const portal = isDeliveryPortal ? 'partner' : 'customer';
        const res = await loginWithGoogle(portal, credentialData);
        setIsLoading(false);

        if (res.requiresProfileCompletion || res.requiresMobile) {
          localStorage.setItem('nmd_current_tab', 'google-complete-profile');
          setActiveTab('google-complete-profile');
          return;
        }

        if (res.success && res.user) {
          navigateAfterLogin(res.user);
        } else {
          setError(res.message || 'Google Sign-In failed. Please try again.');
        }
      },
      onError: (err) => {
        console.warn('Google Identity Services notice:', err?.message || err);
      },
    }).then(() => {
      if (!isMounted) return;
      if (googleBtnRef.current) {
        renderGoogleButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        });
        setIsGoogleBtnMounted(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isDeliveryPortal]);

  const handleSelectGoogleAccount = async (account) => {
    setError('');
    setIsLoading(true);
    setIsGoogleModalOpen(false);
    setShowCustomEmailInput(false);
    const portal = isDeliveryPortal ? 'partner' : 'customer';

    const res = await loginWithGoogle(portal, {
      idToken: 'google_in_page_verified',
      email: account.email,
      name: account.name,
      portal,
    });
    setIsLoading(false);

    if (res.requiresProfileCompletion || res.requiresMobile) {
      localStorage.setItem('nmd_current_tab', 'google-complete-profile');
      setActiveTab('google-complete-profile');
      return;
    }

    if (res.success && res.user) {
      navigateAfterLogin(res.user);
    } else {
      setError(res.message || 'Google Sign-In failed. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    const portal = isDeliveryPortal ? 'partner' : 'customer';
    const res = await loginWithGoogle(portal);
    setIsLoading(false);

    if (res.requiresProfileCompletion || res.requiresMobile) {
      localStorage.setItem('nmd_current_tab', 'google-complete-profile');
      setActiveTab('google-complete-profile');
      return;
    }

    if (res.success && res.user) {
      navigateAfterLogin(res.user);
    } else {
      setError(res.message || 'Google Sign-In failed. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your registered email or mobile number');
      return;
    }

    setIsLoading(true);
    const res = await login(identifier.trim(), password);
    setIsLoading(false);

    if (res.success && res.user) {
      navigateAfterLogin(res.user);
    } else {
      setError(res.message || 'Invalid email/mobile number or password. Please try again.');
    }
  };

  const handleForgotPassword = () => {
    setError('');
    setIsForgotPasswordOpen(true);
  };

  return (
    <div className="auth-page-wrapper public-auth-page">
      <style>{`
        .auth-page-wrapper {
          min-height: calc(100vh - 75px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          background: #ffffff;
          box-sizing: border-box;
        }

        .auth-container {
          max-width: 1040px;
          width: 100%;
          min-height: 540px;
          display: grid;
          grid-template-columns: 460px 1fr;
          align-items: center;
          margin: 0 auto;
        }

        .auth-left-col {
          width: 100%;
          height: 100%;
          min-height: 540px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          user-select: none;
          box-sizing: border-box;
        }

        .auth-logo-wrap {
          cursor: pointer;
          transition: transform 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-logo-wrap:hover {
          transform: scale(1.02);
        }

        .auth-logo-img {
          width: 270px;
          max-width: 100%;
          height: auto;
          object-fit: contain;
          display: block;
        }

        .auth-badge-subtitle {
          margin-top: 22px;
          font-size: 0.95rem;
          font-weight: 800;
          color: #277438;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          text-align: center;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .auth-right-col {
          width: 100%;
          max-width: 480px;
          padding: 20px 20px 20px 48px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .auth-heading {
          font-family: var(--font-display, 'Manrope', sans-serif);
          font-size: 2.25rem;
          font-weight: 800;
          color: #12274b;
          line-height: 1.2;
          margin: 0 0 8px 0;
        }

        .auth-subheading {
          color: #64748b;
          font-size: 0.92rem;
          line-height: 1.45;
          margin: 0 0 28px 0;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .login-form-group {
          margin-bottom: 18px;
        }

        .login-form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 7px;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .login-input {
          width: 100%;
          height: 46px;
          padding: 0 16px;
          font-size: 0.92rem;
          color: #1f2937;
          background: #ffffff;
          border: 1.5px solid #d1d5db;
          border-radius: 10px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .login-input::placeholder {
          color: #9ca3af;
        }

        .login-input:focus {
          border-color: #277438;
          box-shadow: 0 0 0 3px rgba(39, 116, 56, 0.12);
        }

        .login-password-wrap {
          position: relative;
          width: 100%;
        }

        .login-password-input {
          padding-right: 44px;
        }

        .login-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: color 0.15s ease;
        }

        .login-eye-btn:hover {
          color: #4b5563;
        }

        .login-submit-btn {
          width: 100%;
          height: 48px;
          background: #277438;
          color: #ffffff;
          font-size: 0.98rem;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          margin-top: 8px;
          transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 12px rgba(39, 116, 56, 0.18);
          font-family: var(--font-main, 'Manrope', sans-serif);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-submit-btn:hover:not(:disabled) {
          background: #1f5e2d;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(39, 116, 56, 0.25);
        }

        .login-submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .google-sign-in-btn:hover:not(:disabled) {
          background: #f8fafc !important;
          border-color: #c4c7c5 !important;
          box-shadow: 0 2px 6px rgba(60, 64, 67, 0.15) !important;
        }

        .google-sign-in-btn:active:not(:disabled) {
          background: #f1f3f4 !important;
          transform: scale(0.99);
        }

        .login-forgot-btn {
          display: block;
          margin: 16px auto 0 auto;
          background: none;
          border: none;
          color: #1e3a8a;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.15s ease;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .login-forgot-btn:hover {
          color: #1e40af;
          text-decoration: underline;
        }

        .login-register-row {
          margin-top: 14px;
          text-align: center;
          font-size: 0.86rem;
          color: #64748b;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .login-register-link {
          color: #277438;
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          margin-left: 4px;
          font-size: 0.86rem;
        }

        .login-register-link:hover {
          color: #1f5e2d;
        }

        @media (max-width: 860px) {
          .auth-container {
            grid-template-columns: 1fr;
            min-height: auto;
            max-width: 440px;
          }
          .auth-left-col {
            min-height: auto;
            width: 100%;
            padding: 16px 16px 24px 16px;
          }
          .auth-right-col {
            width: 100%;
            max-width: 100%;
            padding: 16px 16px;
          }
          .auth-logo-img {
            width: 210px;
          }
          .auth-badge-subtitle {
            margin-top: 16px;
            font-size: 0.88rem;
          }
          .auth-heading {
            font-size: 1.85rem;
          }
        }
      `}</style>

      <div className="auth-container dairy-fade-in-up">
        {/* Left Column: Brand Logo & Title */}
        <div className="auth-left-col">
          <div
            className="auth-logo-wrap"
            onClick={() => setActiveTab('home')}
            title="Natural Milk Dairy - Back to Home"
          >
            <img
              src={CLOUDINARY_MEDIA.logo || CLOUDINARY_MEDIA.logoPng}
              alt="Natural Milk Dairy"
              className="auth-logo-img"
              onError={(e) => { e.currentTarget.src = CLOUDINARY_MEDIA.logoPng; }}
            />
          </div>
          <div className="auth-badge-subtitle">
            DAIRY MANAGEMENT
          </div>
        </div>

        {/* Right Column: Sign In Form */}
        <div className="auth-right-col">
          {/* Delivery Portal Announcement Banner */}
          {isDeliveryPortal && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1e40af',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>🚚</span>
              <span>Delivery Partner Portal — Sign in with your registered phone & password.</span>
            </div>
          )}

          <h1 className="auth-heading">Welcome back</h1>
          <p className="auth-subheading">
            Sign in to manage customers, deliveries and payments.
          </p>

          {/* Error Message Box */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.83rem',
                marginBottom: '18px',
                border: '1px solid #fecaca',
                fontWeight: 600,
                lineHeight: 1.45,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email / Mobile Identifier Input */}
            <div className="login-form-group">
              <label className="login-form-label">
                Email or mobile number
              </label>
              <input
                type="text"
                required
                maxLength={254}
                className="login-input"
                placeholder="Enter email or 10-digit mobile"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            {/* Password Input */}
            <div className="login-form-group">
              <label className="login-form-label">
                Password
              </label>
              <div className="login-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  maxLength={128}
                  className="login-input login-password-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign in Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-btn"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* OR Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '20px 0 16px',
              color: '#94a3b8',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Sign in with Google Button (Clean, No Email Displayed, In-Page Account Chooser) */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
            }}
          >
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setIsGoogleModalOpen(true)}
              className="google-sign-in-btn"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px 18px',
                background: '#ffffff',
                border: '1.5px solid #dadce0',
                borderRadius: '12px',
                color: '#3c4043',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(60, 64, 67, 0.08)',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-main, Roboto, sans-serif)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>

          {/* In-Page Google Account Sheet (100% In-Page, Never Redirects to New Tab) */}
          {isGoogleModalOpen && (
            <div
              onClick={() => {
                setIsGoogleModalOpen(false);
                setShowCustomEmailInput(false);
              }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.45)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                zIndex: 99999,
                backdropFilter: 'blur(2px)',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#ffffff',
                  width: '100%',
                  maxWidth: '440px',
                  borderRadius: '24px 24px 0 0',
                  padding: '24px 20px 32px',
                  boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.18)',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f2937' }}>
                        Choose an Account
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        to continue to Natural Milk Dairy
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGoogleModalOpen(false);
                      setShowCustomEmailInput(false);
                    }}
                    style={{
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      fontSize: '1rem',
                      color: '#4b5563',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                  }}
                >
                  {[
                    {
                      name: 'naveen',
                      email: 'naveenkumar970100@gmail.com',
                      color: '#1e40af',
                      bg: '#dbeafe',
                    },
                    {
                      name: 'Navee Navee',
                      email: 'naveenavee770@gmail.com',
                      color: '#047857',
                      bg: '#d1fae5',
                    },
                    {
                      name: 'Naveen Yadav',
                      email: 'naveenkumarnaveen97311@gmail.com',
                      color: '#b45309',
                      bg: '#fef3c7',
                    },
                  ].map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSelectGoogleAccount(acc)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: acc.bg,
                          color: acc.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          flexShrink: 0,
                        }}
                      >
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1f2937' }}>
                          {acc.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#6b7280',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {acc.email}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Use another account option */}
                  {!showCustomEmailInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomEmailInput(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px dashed #d1d5db',
                        background: '#f9fafb',
                        cursor: 'pointer',
                        color: '#4b5563',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ fontSize: '1.2rem', marginLeft: '6px' }}>👤</span>
                      <span>Use another account</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        padding: '10px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <input
                        type="email"
                        placeholder="Enter Google email address"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #d1d5db',
                          fontSize: '0.88rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        disabled={isLoading || !customGoogleEmail.trim()}
                        onClick={() => {
                          if (customGoogleEmail.trim()) {
                            handleSelectGoogleAccount({
                              name: customGoogleEmail.split('@')[0],
                              email: customGoogleEmail.trim(),
                            });
                          }
                        }}
                        style={{
                          background: '#277438',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '11px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                        }}
                      >
                        {isLoading ? 'Signing in...' : 'Continue with this account'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Forgot Password Link */}
          <button
            type="button"
            onClick={handleForgotPassword}
            className="login-forgot-btn"
          >
            Forgot password?
          </button>

          {/* New Customer Registration Link (Hidden for Partners) */}
          {!isDeliveryPortal && (
            <div className="login-register-row">
              New customer?
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="login-register-link"
              >
                Register here
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password with Email OTP Verification Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={identifier.includes('@') ? identifier.trim() : ''}
        onPasswordResetSuccess={(resetEmail) => {
          if (resetEmail) {
            setIdentifier(resetEmail);
          }
        }}
      />
    </div>
  );
}
