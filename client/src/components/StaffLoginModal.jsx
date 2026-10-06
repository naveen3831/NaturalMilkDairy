import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Truck, UserCheck, X, ArrowRight, Lock, Phone } from 'lucide-react';

export default function StaffLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const { switchUser, login, DEMO_USERS } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleQuickSelect = (userId, targetTab) => {
    switchUser(userId);
    onLoginSuccess(targetTab);
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setError('');
    const user = login(mobile, password);
    if (user) {
      if (user.role === 'admin') {
        onLoginSuccess('dashboard');
      } else {
        onLoginSuccess('delivery-boy-app');
      }
      onClose();
    } else {
      setError('Invalid mobile number or password. Or click a quick login option below.');
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
            Select your staff role below for immediate 1-tap test access, or sign in with your credentials.
          </p>

          {/* Quick 1-Tap Access Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
            <button
              onClick={() => handleQuickSelect('admin', 'dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '12px',
                background: '#eaf5ee',
                border: '1.5px solid #0d5c3a',
                color: '#0d5c3a',
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck size={22} color="#0d5c3a" />
                <div>
                  <div style={{ fontSize: '0.98rem', color: '#0d5c3a' }}>Dairy Owner / Admin Portal</div>
                  <div style={{ fontSize: '0.78rem', color: '#597361', fontWeight: 500 }}>
                    Full ledger, customer management & billing
                  </div>
                </div>
              </div>
              <ArrowRight size={18} color="#0d5c3a" />
            </button>

            <button
              onClick={() => handleQuickSelect('usr_boy_1', 'delivery-boy-app')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '12px',
                background: '#fef8eb',
                border: '1.5px solid #f5a623',
                color: '#92400e',
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Truck size={22} color="#d98a0d" />
                <div>
                  <div style={{ fontSize: '0.98rem', color: '#92400e' }}>Delivery Partner: Rahul Sharma</div>
                  <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 500 }}>
                    Morning delivery route & cash/UPI collection
                  </div>
                </div>
              </div>
              <ArrowRight size={18} color="#d98a0d" />
            </button>

            <button
              onClick={() => handleQuickSelect('usr_boy_2', 'delivery-boy-app')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Truck size={20} color="#64748b" />
                <div>
                  <div style={{ fontSize: '0.92rem' }}>Delivery Partner: Sunil Verma</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Andheri East Route</div>
                </div>
              </div>
              <ArrowRight size={16} color="#64748b" />
            </button>
          </div>

          <div
            style={{
              position: 'relative',
              textAlign: 'center',
              margin: '20px 0',
            }}
          >
            <div style={{ borderTop: '1px solid #e2e8f0', width: '100%' }} />
            <span
              style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#ffffff',
                padding: '0 12px',
                fontSize: '0.75rem',
                color: '#94a3b8',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              or sign in manually
            </span>
          </div>

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
