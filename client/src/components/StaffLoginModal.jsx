import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Phone } from 'lucide-react';

export default function StaffLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const { login, logout } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!mobile.trim() || !password || password.length > 128) {
      setError('Enter your registered email/mobile number and password.');
      return;
    }
    const res = await login(mobile, password);
    if (res && res.success && res.user) {
      if (res.user.role === 'admin') {
        onLoginSuccess('dashboard');
      } else if (res.user.role === 'delivery_boy') {
        onLoginSuccess('delivery-boy-app');
      } else {
        logout();
        setError('A staff account is required to access this portal.');
        return;
      }
      onClose();
    } else {
      setError(res?.message || 'Invalid mobile number or password. Or click a quick login option below.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 22, 41, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '460px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d5c3a 0%, #0c2340 100%)',
            padding: '24px 28px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={24} color="#f5a623" />
            </div>
            <div>
              <h3 style={{ color: '#ffffff', fontSize: '1.25rem', margin: 0 }}>Staff Portal Login</h3>
              <p style={{ color: '#86efac', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Natural Milk Dairy Management System
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px' }}>
          <p style={{ fontSize: '0.88rem', color: '#597361', marginBottom: '18px', lineHeight: 1.5 }}>
            Sign in with your staff credentials to continue to the management portal.
          </p>

          <form onSubmit={handleManualSubmit}>
            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '12px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  required
                  maxLength={254}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Password / PIN
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="password"
                  required
                  maxLength={128}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: '#0d5c3a',
                color: '#ffffff',
                fontWeight: 700,
                padding: '12px',
                borderRadius: '10px',
                fontSize: '0.95rem',
              }}
            >
              Sign In to Portal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
