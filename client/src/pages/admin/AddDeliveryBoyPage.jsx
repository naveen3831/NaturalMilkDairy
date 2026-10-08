import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  ArrowLeft,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Truck,
  Lock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Send,
  Loader2,
} from 'lucide-react';

export default function AddDeliveryBoyPage({ onBack, onSaved, onNavigateToEdit }) {
  const { addDeliveryBoy, deliveryBoys } = useDairy();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('Driver@123');
  const [assignedArea, setAssignedArea] = useState('Andheri West');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [status, setStatus] = useState('active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [backendConflictField, setBackendConflictField] = useState(null); // 'mobile' | 'email' | 'both'
  const [backendPartnerName, setBackendPartnerName] = useState('');

  const cleanMobile = mobile.trim();
  const cleanEmail = email.trim().toLowerCase();

  // Real-time client-side duplicate detection
  const duplicateDriverByMobile =
    cleanMobile.length >= 10
      ? (deliveryBoys || []).find((b) => b.mobile && b.mobile.trim() === cleanMobile)
      : null;

  const duplicateDriverByEmail =
    cleanEmail.length >= 4 && cleanEmail.includes('@')
      ? (deliveryBoys || []).find((b) => b.email && b.email.trim().toLowerCase() === cleanEmail)
      : null;

  const isMobileDuplicate = Boolean(
    duplicateDriverByMobile ||
      backendConflictField === 'mobile' ||
      backendConflictField === 'both'
  );

  const isEmailDuplicate = Boolean(
    duplicateDriverByEmail ||
      backendConflictField === 'email' ||
      backendConflictField === 'both'
  );

  const matchedPartner =
    duplicateDriverByMobile ||
    duplicateDriverByEmail ||
    (backendPartnerName ? { name: backendPartnerName } : null);

  const handleMobileChange = (e) => {
    setMobile(e.target.value);
    if (backendConflictField === 'mobile' || backendConflictField === 'both') {
      setBackendConflictField(null);
      setErrorMessage('');
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (backendConflictField === 'email' || backendConflictField === 'both') {
      setBackendConflictField(null);
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setBackendConflictField(null);

    if (!name.trim()) {
      setErrorMessage('Partner name is required.');
      return;
    }
    if (!cleanMobile || cleanMobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('A valid email address is required to dispatch login credentials.');
      return;
    }
    if (!assignedArea.trim()) {
      setErrorMessage('Please assign a delivery route area.');
      return;
    }

    // Pre-flight duplicate check against loaded fleet
    if (duplicateDriverByMobile && duplicateDriverByEmail) {
      setBackendConflictField('both');
      setBackendPartnerName(duplicateDriverByMobile.name || duplicateDriverByEmail.name);
      setErrorMessage(
        `Both phone number (${cleanMobile}) and email (${cleanEmail}) already exist in the database (registered with ${duplicateDriverByMobile.name || duplicateDriverByEmail.name}). Please change both the phone number and email.`
      );
      return;
    }
    if (duplicateDriverByMobile) {
      setBackendConflictField('mobile');
      setBackendPartnerName(duplicateDriverByMobile.name);
      setErrorMessage(
        `Phone number (${cleanMobile}) is already registered with partner "${duplicateDriverByMobile.name}". Please change the phone number.`
      );
      return;
    }
    if (duplicateDriverByEmail) {
      setBackendConflictField('email');
      setBackendPartnerName(duplicateDriverByEmail.name);
      setErrorMessage(
        `Email address (${cleanEmail}) is already registered with partner "${duplicateDriverByEmail.name}". Please change the email address.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addDeliveryBoy({
        name: name.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        assignedArea: assignedArea.trim(),
        vehicleNumber: vehicleNumber.trim(),
        password: password.trim() || 'Driver@123',
        status,
        actor: 'Admin',
      });

      setIsSubmitting(false);

      if (!res || !res.success) {
        setBackendConflictField(res?.field || 'both');
        if (res?.existingPartnerName) {
          setBackendPartnerName(res.existingPartnerName);
        }
        setErrorMessage(
          res?.message ||
            'Email or phone number already exists in the database. Please change the email or phone number and try again.'
        );
        return;
      }

      // Success
      if (onSaved) {
        onSaved(
          res?.emailSent
            ? `Partner ${name} created & login credentials emailed successfully!`
            : `Partner ${name} registered in MongoDB database.`
        );
      } else if (onBack) {
        onBack();
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to create delivery partner.');
    }
  };

  const hasDuplicateIssue = isMobileDuplicate || isEmailDuplicate || Boolean(errorMessage);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header with Back Button */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#edf2f7';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            title="Back to Delivery Partners list"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fleet & Logistics Management
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
              Create Delivery Partner
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            fontWeight: 600,
            fontSize: '0.82rem',
            padding: '7px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>

      {/* Prominent Duplicate Conflict / Error Banner */}
      {hasDuplicateIssue && (
        <div
          style={{
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            borderRadius: '16px',
            padding: '16px 20px',
            boxShadow: '0 3px 10px rgba(239, 68, 68, 0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#dc2626',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '0.94rem', fontWeight: 800, color: '#991b1b' }}>
              {isMobileDuplicate && isEmailDuplicate
                ? 'Email and Phone Number Already Exist'
                : isMobileDuplicate
                ? 'Phone Number Already Exists'
                : isEmailDuplicate
                ? 'Email Address Already Exists'
                : 'Registration Conflict'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#b91c1c', lineHeight: 1.5, fontWeight: 500 }}>
              {errorMessage ||
                (isMobileDuplicate && isEmailDuplicate
                  ? `Both phone number (${cleanMobile}) and email (${cleanEmail}) already exist in the database. Please change the email and phone number to create a new delivery partner.`
                  : isMobileDuplicate
                  ? `Phone number (${cleanMobile}) is already registered with partner "${matchedPartner?.name || 'an existing account'}". Please change the phone number.`
                  : `Email address (${cleanEmail}) is already registered with partner "${matchedPartner?.name || 'an existing account'}". Please change the email address.`)}
            </p>
          </div>
        </div>
      )}

      {/* 2. Full-Page Registration Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          {/* Card 1: Personal Details & Identity */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={16} color="#059669" />
                <span>Partner Identity & Contact</span>
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Basic driver profile for route assignment, credentials dispatch, and communication
              </p>
            </div>

            {/* Name */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Partner Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Mobile Number (Login ID) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: isMobileDuplicate ? '#dc2626' : '#334155', display: 'block' }}>
                  Mobile Number (Login ID) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {isMobileDuplicate && (
                  <span style={{ fontSize: '0.73rem', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} />
                    ALREADY REGISTERED
                  </span>
                )}
                {!isMobileDuplicate && cleanMobile.length === 10 && (
                  <span style={{ fontSize: '0.73rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={13} />
                    Available
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={15}
                  color={isMobileDuplicate ? '#ef4444' : '#94a3b8'}
                  style={{ position: 'absolute', left: '12px', top: '12px' }}
                />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={handleMobileChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: '10px',
                    border: isMobileDuplicate ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    background: isMobileDuplicate ? '#fef2f2' : '#ffffff',
                    color: isMobileDuplicate ? '#991b1b' : '#0f172a',
                    fontSize: '0.86rem',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                />
              </div>

              {/* Inline duplicate warning */}
              {isMobileDuplicate ? (
                <div
                  style={{
                    marginTop: '7px',
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#b91c1c',
                    fontSize: '0.77rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '7px',
                    lineHeight: 1.45,
                  }}
                >
                  <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Phone number already exists:</strong> ({cleanMobile}) is already registered with partner{' '}
                    <strong>"{matchedPartner?.name || 'another account'}"</strong>. Please change the phone number.
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  The driver will use this mobile number to log into the delivery web application.
                </span>
              )}
            </div>

            {/* Partner Email (Credentials Dispatch) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: isEmailDuplicate ? '#dc2626' : '#059669', display: 'block' }}>
                  Partner Email (Credentials Dispatch) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {isEmailDuplicate && (
                  <span style={{ fontSize: '0.73rem', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} />
                    ALREADY REGISTERED
                  </span>
                )}
                {!isEmailDuplicate && cleanEmail.includes('@') && cleanEmail.length > 5 && (
                  <span style={{ fontSize: '0.73rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={13} />
                    Available
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  color={isEmailDuplicate ? '#ef4444' : '#059669'}
                  style={{ position: 'absolute', left: '12px', top: '12px' }}
                />
                <input
                  type="email"
                  placeholder="e.g. driver@gmail.com"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: '10px',
                    border: isEmailDuplicate ? '1.5px solid #ef4444' : '1px solid #a7f3d0',
                    background: isEmailDuplicate ? '#fef2f2' : '#f0fdf4',
                    color: isEmailDuplicate ? '#991b1b' : '#065f46',
                    fontSize: '0.86rem',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                />
              </div>

              {/* Inline duplicate warning */}
              {isEmailDuplicate ? (
                <div
                  style={{
                    marginTop: '7px',
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#b91c1c',
                    fontSize: '0.77rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '7px',
                    lineHeight: 1.45,
                  }}
                >
                  <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Email already exists:</strong> ({cleanEmail}) is already registered with partner{' '}
                    <strong>"{matchedPartner?.name || 'another account'}"</strong>. Please change the email address.
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#047857', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                  ✓ Portal login credentials and route info will be dispatched to this email automatically.
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Route & Security */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={16} color="#059669" />
                <span>Route Assignment & Security</span>
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Define morning delivery territory, vehicle, and authentication
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Assigned Route Area <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  list="new-partner-routes"
                  placeholder="Type or select route area (e.g. Andheri West, Juhu, Madhapur...)"
                  value={assignedArea}
                  onChange={(e) => setAssignedArea(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
                <datalist id="new-partner-routes">
                  <option value="Andheri West" />
                  <option value="Juhu" />
                  <option value="Bandra West" />
                  <option value="Powai" />
                  <option value="Vile Parle" />
                  <option value="Lokhandwala" />
                  <option value="Versova" />
                  <option value="Goregaon" />
                  <option value="Madhapur" />
                  <option value="Santacruz" />
                  <option value="Khar West" />
                </datalist>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Custom streets, sectors, or societies can be typed directly.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Vehicle Number / Model
              </label>
              <input
                type="text"
                placeholder="e.g. MH-02-ND-5678 (Hero Splendor)"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Portal Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Account Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    background: '#ffffff',
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions Footer */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: isSubmitting
                ? '#94a3b8'
                : isMobileDuplicate || isEmailDuplicate
                ? '#dc2626'
                : '#059669',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow:
                isMobileDuplicate || isEmailDuplicate
                  ? '0 2px 4px rgba(220, 38, 38, 0.25)'
                  : '0 2px 4px rgba(5, 150, 105, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Registering & Emailing...</span>
              </>
            ) : isMobileDuplicate || isEmailDuplicate ? (
              <>
                <AlertCircle size={16} />
                <span>Change Email / Phone to Save</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Save Partner & Dispatch Email</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
