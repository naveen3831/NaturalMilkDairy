import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Truck, Lock, Phone, MapPin, Milk, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RegisterPage({ setActiveTab }) {
  const { register } = useAuth();
  const role = 'customer';
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    address: '',
    area: 'Andheri West',
    milkQty: 1,
    curdQty: 0,
    frequency: 'daily',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.mobile || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const result = await register({
      ...formData,
      role: 'customer',
    });
    setIsLoading(false);

    if (result.success) {
      setRegisteredSuccess(true);
      setTimeout(() => {
        setActiveTab('customer-portal');
      }, 1500);
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 76px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 20px',
        background: 'radial-gradient(circle at 50% 20%, #eaf5ee 0%, #f4f8f5 60%, #e2ece4 100%)',
      }}
    >
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: '0 20px 50px rgba(13, 92, 58, 0.12)',
          border: '1.5px solid #e2ece3',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            onClick={() => setActiveTab('home')}
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 14px auto',
              background: '#ffffff',
              boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
              border: '2px solid #0d5c3a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src="/logo.png" alt="Natural Milk Dairy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h2 style={{ fontSize: '1.8rem', color: '#0c2340', fontWeight: 900, margin: 0 }}>
            Create Customer Account
          </h2>
          <p style={{ color: '#597361', fontSize: '0.9rem', marginTop: '4px' }}>
            Join Natural Milk Dairy for fresh doorstep morning deliveries & live tracking
          </p>
        </div>

        {registeredSuccess ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle2 size={38} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>
              Account Created Successfully!
            </h3>
            <p style={{ color: '#597361', fontSize: '0.95rem' }}>
              Saved to MongoDB Atlas. Redirecting you to your portal...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.86rem',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Deshmukh"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            {role === 'customer' && (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Delivery Address (Flat / House No, Street) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 402 Palm View, Main Link Road"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Delivery Area
                    </label>
                    <select
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    >
                      <option value="Andheri West">Andheri West</option>
                      <option value="Andheri East">Andheri East</option>
                      <option value="Bandra">Bandra</option>
                      <option value="Juhu">Juhu</option>
                      <option value="Goregaon">Goregaon</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Delivery Frequency
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    >
                      <option value="daily">Daily Morning</option>
                      <option value="alternate">Alternate Days</option>
                      <option value="weekdays">Weekdays Only</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Daily Cow Milk
                    </label>
                    <select
                      value={formData.milkQty}
                      onChange={(e) => setFormData({ ...formData, milkQty: Number(e.target.value) })}
                    >
                      <option value={0.5}>500 ml</option>
                      <option value={1}>1 Litre (Standard)</option>
                      <option value={1.5}>1.5 Litres</option>
                      <option value={2}>2 Litres</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Daily Curd (Dahi)
                    </label>
                    <select
                      value={formData.curdQty}
                      onChange={(e) => setFormData({ ...formData, curdQty: Number(e.target.value) })}
                    >
                      <option value={0}>None</option>
                      <option value={250}>250 grams</option>
                      <option value={500}>500 grams</option>
                      <option value={1000}>1 Kg</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {role !== 'customer' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Assigned Route / Territory
                </label>
                <select
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                >
                  <option value="Andheri West">Andheri West</option>
                  <option value="Andheri East">Andheri East</option>
                  <option value="Bandra">Bandra</option>
                  <option value="Juhu">Juhu</option>
                  <option value="All Dairy Routes">All Dairy Routes (Admin)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: '#0d5c3a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1rem',
                padding: '14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(13, 92, 58, 0.25)',
              }}
            >
              <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* Switch to Login */}
        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #edf3ee', paddingTop: '18px' }}>
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
            Already have an account?{' '}
            <button
              onClick={() => setActiveTab('login')}
              style={{
                color: '#0d5c3a',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
