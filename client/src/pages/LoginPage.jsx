import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ setActiveTab }) {
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!mobile.trim()) {
      setError('Please enter your registered mobile number');
      return;
    }

    setIsLoading(true);
    const res = await login(mobile.trim(), password);
    setIsLoading(false);

    if (res.success && res.user) {
      // Role-based automatic redirect without user having to select role
      if (res.user.role === 'admin') {
        setActiveTab('dashboard');
      } else if (res.user.role === 'delivery_boy') {
        setActiveTab('delivery-boy-app');
      } else {
        setActiveTab('customer-portal');
      }
    } else {
      setError('Invalid mobile number or password. Please verify and try again.');
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
          maxWidth: '360px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px 22px',
          boxShadow: '0 12px 36px rgba(13, 92, 58, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
          border: '1.5px solid #e2ece3',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div
            onClick={() => setActiveTab('home')}
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 12px auto',
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              border: '2px solid #0d5c3a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src="/logo.png" alt="Natural Milk Dairy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h2 style={{ fontSize: '1.5rem', color: '#0c2340', fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
            Sign In
          </h2>
          <p style={{ color: '#597361', fontSize: '0.84rem', marginTop: '4px' }}>
            Access your Natural Milk Dairy account
          </p>
        </div>

        {/* Unified Login Form — No Role Selector */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '14px',
                border: '1px solid #fecaca',
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
              Mobile Number
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
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
        <div style={{ marginTop: '18px', textAlign: 'center', borderTop: '1px solid #edf3ee', paddingTop: '14px' }}>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
            Don't have an account yet?{' '}
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
