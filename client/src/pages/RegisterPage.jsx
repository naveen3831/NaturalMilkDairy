import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function RegisterPage({ setActiveTab }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    address: '',
    area: '',
    frequency: 'daily',
    milkQty: 1,
    curdQty: 0,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [deliveryAreas, setDeliveryAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDeliveryAreas = async () => {
      try {
        const response = await fetch('/api/auth/delivery-areas');
        const data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.areas)) {
          throw new Error(data.message || 'Unable to load delivery areas.');
        }

        if (isMounted) {
          setDeliveryAreas(data.areas);
          setFormData((current) => ({
            ...current,
            area: data.areas.includes(current.area) ? current.area : (data.areas[0] || ''),
          }));
        }
      } catch (err) {
        if (isMounted) {
          setAreasError(err.message || 'Unable to load delivery areas. Please try again.');
        }
      } finally {
        if (isMounted) setAreasLoading(false);
      }
    };

    loadDeliveryAreas();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.mobile.trim() || !formData.password.trim()) {
      setError('Please fill in all required fields (Name, Mobile, Password)');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    if (!formData.area) {
      setError('There are no delivery areas available for registration right now.');
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
          max-width: 520px;
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
          margin: 0 0 6px 0;
        }

        .auth-subheading {
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.45;
          margin: 0 0 24px 0;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .register-form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 14px;
        }

        .register-form-full {
          margin-bottom: 14px;
        }

        .register-form-label {
          display: block;
          font-size: 0.83rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .register-input, .register-select {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          font-size: 0.9rem;
          color: #1e293b;
          background: #edf2f9;
          border: 1px solid transparent;
          border-radius: 9px;
          outline: none;
          box-sizing: border-box;
          transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .register-input::placeholder {
          color: #94a3b8;
        }

        .register-input:focus, .register-select:focus {
          background: #ffffff;
          border-color: #277438;
          box-shadow: 0 0 0 3px rgba(39, 116, 56, 0.12);
        }

        .register-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding-right: 36px;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 15px;
        }

        .register-password-wrap {
          position: relative;
          width: 100%;
        }

        .register-password-input {
          padding-right: 40px;
        }

        .register-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: color 0.15s ease;
        }

        .register-eye-btn:hover {
          color: #475569;
        }

        .register-submit-btn {
          width: 100%;
          height: 48px;
          background: #277438;
          color: #ffffff;
          font-size: 0.98rem;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          margin-top: 10px;
          transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 12px rgba(39, 116, 56, 0.18);
          font-family: var(--font-main, 'Manrope', sans-serif);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .register-submit-btn:hover:not(:disabled) {
          background: #1f5e2d;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(39, 116, 56, 0.25);
        }

        .register-submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .register-signin-row {
          margin-top: 16px;
          text-align: center;
          font-size: 0.88rem;
          color: #64748b;
          font-family: var(--font-main, 'Manrope', sans-serif);
        }

        .register-signin-link {
          color: #277438;
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          margin-left: 5px;
          font-size: 0.88rem;
        }

        .register-signin-link:hover {
          color: #1f5e2d;
        }

        @media (max-width: 860px) {
          .auth-container {
            grid-template-columns: 1fr;
            min-height: auto;
            max-width: 500px;
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

        @media (max-width: 580px) {
          .register-form-grid-2 {
            grid-template-columns: 1fr;
            gap: 12px;
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
              src="/logo.png"
              alt="Natural Milk Dairy"
              className="auth-logo-img"
            />
          </div>
          <div className="auth-badge-subtitle">
            DAIRY MANAGEMENT
          </div>
        </div>

        {/* Right Column: Create Account Form */}
        <div className="auth-right-col">
          <h1 className="auth-heading">Create account</h1>
          <p className="auth-subheading">
            Join Natural Milk Dairy for fresh doorstep morning deliveries and live tracking.
          </p>

          {registeredSuccess ? (
            <div style={{ textAlign: 'center', padding: '36px 12px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <CheckCircle2 size={38} />
              </div>
              <h3 style={{ fontSize: '1.4rem', color: '#12274b', fontWeight: 800, marginBottom: '6px' }}>
                Account Created Successfully!
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
                Redirecting you to your customer portal...
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    color: '#991b1b',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.83rem',
                    marginBottom: '16px',
                    border: '1px solid #fecaca',
                    fontWeight: 600,
                    lineHeight: 1.45,
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Full name & Mobile number */}
                <div className="register-form-grid-2">
                  <div>
                    <label className="register-form-label">Full name</label>
                    <input
                      type="text"
                      required
                      className="register-input"
                      placeholder="e.g. Anand Deshmukh"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="register-form-label">Mobile number</label>
                    <input
                      type="tel"
                      required
                      className="register-input"
                      placeholder="10-digit number"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password & Confirm password */}
                <div className="register-form-grid-2">
                  <div>
                    <label className="register-form-label">Password</label>
                    <div className="register-password-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="register-input register-password-input"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="register-eye-btn"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="register-form-label">Confirm password</label>
                    <div className="register-password-wrap">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        className="register-input register-password-input"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="register-eye-btn"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delivery address */}
                <div className="register-form-full">
                  <label className="register-form-label">
                    Delivery address (flat / house no, street)
                  </label>
                  <input
                    type="text"
                    required
                    className="register-input"
                    placeholder="e.g. 402 Palm View, Main Link Road"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                {/* Delivery area & Delivery frequency */}
                <div className="register-form-grid-2">
                  <div>
                    <label className="register-form-label">Delivery area</label>
                    <select
                      className="register-select"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      required
                      disabled={areasLoading || deliveryAreas.length === 0}
                    >
                      {areasLoading && <option value="">Loading delivery areas...</option>}
                      {!areasLoading && deliveryAreas.length === 0 && (
                        <option value="">No delivery areas currently available</option>
                      )}
                      {deliveryAreas.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                    {areasError && (
                      <div role="alert" style={{ color: '#b42318', fontSize: '0.82rem', marginTop: '6px' }}>
                        {areasError}
                      </div>
                    )}
                    {!areasLoading && !areasError && deliveryAreas.length === 0 && (
                      <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '6px' }}>
                        Please contact the dairy to confirm service in your area.
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="register-form-label">Delivery frequency</label>
                    <select
                      className="register-select"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    >
                      <option value="daily">Daily Morning</option>
                      <option value="alternate">Alternate Days</option>
                      <option value="weekdays">Weekdays Only</option>
                    </select>
                  </div>
                </div>

                {/* Daily cow milk & Daily curd (dahi) */}
                <div className="register-form-grid-2">
                  <div>
                    <label className="register-form-label">Daily cow milk</label>
                    <select
                      className="register-select"
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
                    <label className="register-form-label">Daily curd (dahi)</label>
                    <select
                      className="register-select"
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || areasLoading || deliveryAreas.length === 0 || Boolean(areasError)}
                  className="register-submit-btn"
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </button>
              </form>

              {/* Already have an account */}
              <div className="register-signin-row">
                Already have an account?
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="register-signin-link"
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
