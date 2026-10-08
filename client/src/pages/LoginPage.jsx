import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ setActiveTab }) {
  const { login } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const isDeliveryPortal = urlParams.get('portal') === 'delivery';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      // Role-based dashboard navigation
      if (res.user.role === 'delivery_boy') {
        localStorage.setItem('nmd_current_tab', 'delivery-boy-app');
        setActiveTab('delivery-boy-app');
      } else if (res.user.role === 'admin') {
        localStorage.setItem('nmd_admin_tab', 'dashboard');
        localStorage.setItem('nmd_current_tab', 'dashboard');
        setActiveTab('dashboard');
      } else {
        localStorage.setItem('nmd_current_tab', 'customer-portal');
        setActiveTab('customer-portal');
      }
    } else {
      setError(res.message || 'Invalid email/mobile or password. Please verify and try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 75px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'radial-gradient(circle at 50% 25%, #edf7f0 0%, #f7faf8 60%, #e2ece4 100%)',
      }}
    >
      <div
        className="dairy-fade-in-up"
        style={{
          maxWidth: '380px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 12px 36px rgba(13, 92, 58, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
          border: '1.5px solid #e2ece3',
        }}
      >
        {/* Delivery Partner Portal Dedicated Banner */}
        {isDeliveryPortal && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#1e40af',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🚚</span>
            <span>Delivery Partner Portal — Sign in with the credentials received in your dispatch email.</span>
          </div>
        )}

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div
            onClick={() => setActiveTab('home')}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 12px auto',
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '2px solid #0d5c3a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src="/logo.png" alt="Natural Milk Dairy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h2 style={{ fontSize: '1.45rem', color: '#0c2340', fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
            {isDeliveryPortal ? 'Delivery Partner Sign In' : 'Sign In'}
          </h2>
          <p style={{ color: '#597361', fontSize: '0.84rem', marginTop: '4px' }}>
            {isDeliveryPortal
              ? 'Enter your mobile/email and portal password'
              : 'Access your Natural Milk Dairy account'}
          </p>
        </div>

        {/* Unified Login Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                marginBottom: '14px',
                border: '1px solid #fecaca',
                lineHeight: 1.45,
                fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
              Email or Mobile Number
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="text"
                required
                placeholder="e.g. admin@gmail.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{
                  paddingLeft: '36px',
                  height: '42px',
                  fontSize: '0.9rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  width: '100%',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => alert('Please contact support on +91 98765 43210 or your delivery partner to reset your password.')}
                style={{ fontSize: '0.74rem', color: '#0d5c3a', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Forgot?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  paddingLeft: '36px',
                  paddingRight: '38px',
                  height: '42px',
                  fontSize: '0.9rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  width: '100%',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="dairy-btn-hover"
            style={{
              width: '100%',
              background: '#0d5c3a',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.94rem',
              padding: '11px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              border: 'none',
              marginTop: '6px',
              boxShadow: '0 4px 12px rgba(13, 92, 58, 0.22)',
            }}
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Switch to Register */}
        <div style={{ marginTop: '14px', textAlign: 'center', borderTop: '1px solid #edf3ee', paddingTop: '12px' }}>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
            New customer?{' '}
            <button
              onClick={() => setActiveTab('register')}
              style={{
                color: '#0d5c3a',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                textDecoration: 'underline',
              }}
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
