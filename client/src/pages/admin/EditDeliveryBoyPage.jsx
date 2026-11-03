import React, { useState, useEffect } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  MapPin,
  Lock,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wallet,
  ShieldCheck,
  User,
  Check,
} from 'lucide-react';

export default function EditDeliveryBoyPage({ deliveryBoyId, onBack, onSaved, onDeleted }) {
  const { deliveryBoys, updateDeliveryBoy, deleteDeliveryBoy, locations } = useDairy();

  // Find partner
  const boy = deliveryBoys.find(
    (b) => b.id === deliveryBoyId || (b._id && b._id.toString() === deliveryBoyId) || b.mobile === deliveryBoyId
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [assignedArea, setAssignedArea] = useState('Andheri West');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [status, setStatus] = useState('active');
  const [resendEmail, setResendEmail] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [backendConflictField, setBackendConflictField] = useState(null);

  useEffect(() => {
    if (boy) {
      setName(boy.name || '');
      setEmail(boy.email || '');
      setMobile(boy.mobile || '');
      setPassword(boy.password || '');
      setAssignedArea(boy.assignedArea || 'Andheri West');
      setVehicleNumber(boy.vehicleNumber || '');
      setStatus(boy.status || 'active');
      setResendEmail(Boolean(boy.email));
    }
  }, [boy]);

  const cleanMobile = mobile.trim();
  const cleanEmail = email.trim().toLowerCase();

  // Check if mobile or email is already taken by another delivery boy
  const otherDriverByMobile =
    cleanMobile.length >= 10
      ? (deliveryBoys || []).find(
          (b) =>
            b.id !== boy?.id &&
            b._id !== boy?._id &&
            b.mobile &&
            b.mobile.trim() === cleanMobile
        )
      : null;

  const otherDriverByEmail =
    cleanEmail.length >= 4 && cleanEmail.includes('@')
      ? (deliveryBoys || []).find(
          (b) =>
            b.id !== boy?.id &&
            b._id !== boy?._id &&
            b.email &&
            b.email.trim().toLowerCase() === cleanEmail
        )
      : null;

  const isMobileDuplicate = Boolean(otherDriverByMobile || backendConflictField === 'mobile' || backendConflictField === 'both');
  const isEmailDuplicate = Boolean(otherDriverByEmail || backendConflictField === 'email' || backendConflictField === 'both');

  if (!boy) {
    return (
      <div style={{ width: '100%', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>Delivery Partner Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '0.86rem', marginTop: '6px' }}>
          The requested delivery partner record could not be located in the database.
        </p>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: '16px',
            padding: '9px 20px',
            borderRadius: '10px',
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.84rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Delivery Partners</span>
        </button>
      </div>
    );
  }

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
    if (!assignedArea.trim()) {
      setErrorMessage('Please assign a delivery route area.');
      return;
    }

    if (otherDriverByMobile && otherDriverByEmail) {
      setBackendConflictField('both');
      setErrorMessage(
        `Both phone number (${cleanMobile}) and email (${cleanEmail}) already belong to partner "${otherDriverByMobile.name}". Please change both.`
      );
      return;
    }
    if (otherDriverByMobile) {
      setBackendConflictField('mobile');
      setErrorMessage(
        `Phone number (${cleanMobile}) is already registered with partner "${otherDriverByMobile.name}". Please change the phone number.`
      );
      return;
    }
    if (otherDriverByEmail) {
      setBackendConflictField('email');
      setErrorMessage(
        `Email address (${cleanEmail}) is already registered with partner "${otherDriverByEmail.name}". Please change the email address.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateDeliveryBoy(boy.id, {
        name: name.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        assignedArea: assignedArea.trim(),
        vehicleNumber: vehicleNumber.trim(),
        password: password.trim(),
        status,
        resendEmail,
        actor: 'Admin',
      });

      setIsSubmitting(false);

      if (!res || !res.success) {
        setBackendConflictField(res?.field || 'both');
        setErrorMessage(res?.message || 'Failed to update partner. Duplicate email or phone number detected.');
        return;
      }

      if (onSaved) {
        onSaved(
          res?.emailSent
            ? `Partner ${name} updated & new credentials emailed successfully!`
            : `Partner ${name} profile and route updated successfully.`
        );
      } else if (onBack) {
        onBack();
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to update delivery partner.');
    }
  };

  const handleDelete = async (force = false) => {
    setIsDeleting(true);
    try {
      const res = await deleteDeliveryBoy(boy.id, 'Admin', force);
      setIsDeleting(false);
      if (res?.success) {
        setShowDeleteConfirm(false);
        if (onDeleted) {
          onDeleted(`Delivery partner ${boy.name} deleted from database.`);
        } else if (onBack) {
          onBack();
        }
      } else if (res?.hasCashInHand) {
        setErrorMessage(`⚠️ Partner holds ₹${res.amount} cash in hand! Reconcile or force delete.`);
      } else {
        setErrorMessage(res?.message || 'Failed to delete partner.');
      }
    } catch (err) {
      setIsDeleting(false);
      setErrorMessage(err.message || 'Failed to delete partner.');
    }
  };

  const stats = boy.todayStats || {};
  const cashCollected = Number(boy.todayCashCollected) || 0;
  const upiCollected = Number(boy.todayUpiCollected) || 0;
  const totalCollected = cashCollected + upiCollected;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Toolbar (Full Width) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.015)',
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
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#edf2f7';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            title="Back to Delivery Partners list"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Delivery Fleet
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: boy.status === 'inactive' ? '#fef2f2' : '#ecfdf5',
                  color: boy.status === 'inactive' ? '#dc2626' : '#047857',
                  border: '1px solid',
                  borderColor: boy.status === 'inactive' ? '#fee2e2' : '#bbf7d0',
                }}
              >
                {boy.status === 'inactive' ? 'Inactive' : 'Active'}
              </span>
              {boy.assignedArea && (
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                  • Route: <strong>{boy.assignedArea}</strong>
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
              Edit Partner: {boy.name}
            </h1>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fef2f2')}
          >
            <Trash2 size={14} />
            <span>Delete Partner</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? '#94a3b8' : '#059669',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '8px 18px',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = '#047857';
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = '#059669';
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Save Changes & Sync</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '14px 20px',
            borderRadius: '12px',
            fontSize: '0.86rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Partner Snapshot & Live Performance Banner (Full Width) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.015)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          alignItems: 'center',
        }}
      >
        {/* Partner Info Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: '#ecfdf5',
              color: '#059669',
              fontWeight: 800,
              fontSize: '1.3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid #a7f3d0',
            }}
          >
            {boy.name?.charAt(0)?.toUpperCase() || 'D'}
          </div>

          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {boy.name}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={12} color="#059669" />
                <span>{boy.mobile}</span>
              </span>
              {boy.vehicleNumber && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Truck size={12} color="#059669" />
                  <span>{boy.vehicleNumber}</span>
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} color="#059669" />
                <span>{boy.assignedArea}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Route Drops & Cash In Hand KPI Strips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* Today's Route Drops */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Today's Route Deliveries
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
              <div style={{ background: '#ffffff', padding: '6px 4px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>DONE</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669' }}>{stats.completed ?? 0}</div>
              </div>
              <div style={{ background: '#ffffff', padding: '6px 4px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>PENDING</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706' }}>{stats.pending ?? 0}</div>
              </div>
              <div style={{ background: '#ffffff', padding: '6px 4px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>MISSED</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>{stats.notDelivered ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Cash in Hand Today */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                Cash in Hand Today
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857' }}>
                ₹{totalCollected.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#15803d', marginTop: '6px' }}>
              <span>Cash: ₹{cashCollected}</span>
              <span>UPI: ₹{upiCollected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Full-Page Edit Form (2 Full-Width Responsive Cards) */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Card 1: Profile & Contact Details */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.015)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} color="#059669" />
                <span>Profile & Contact Details</span>
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Driver contact information and login credentials
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label style={{ fontSize: '0.80rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Partner Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter partner name"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Mobile Number */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.80rem', fontWeight: 700, color: isMobileDuplicate ? '#dc2626' : '#334155', display: 'block' }}>
                  Mobile Number (Login ID) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {isMobileDuplicate && (
                  <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} />
                    ALREADY REGISTERED
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color={isMobileDuplicate ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    if (backendConflictField === 'mobile' || backendConflictField === 'both') {
                      setBackendConflictField(null);
                      setErrorMessage('');
                    }
                  }}
                  required
                  placeholder="10-digit mobile number"
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 36px',
                    borderRadius: '10px',
                    border: isMobileDuplicate ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    background: isMobileDuplicate ? '#fef2f2' : '#ffffff',
                    color: isMobileDuplicate ? '#991b1b' : '#0f172a',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                />
              </div>
              {isMobileDuplicate && (
                <div style={{ marginTop: '6px', padding: '7px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.74rem', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Phone number is already registered with partner <strong>"{otherDriverByMobile?.name || 'another account'}"</strong>. Please change the phone number.</span>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.80rem', fontWeight: 700, color: isEmailDuplicate ? '#dc2626' : '#059669', display: 'block' }}>
                  Partner Email Address
                </label>
                {isEmailDuplicate && (
                  <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} />
                    ALREADY REGISTERED
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color={isEmailDuplicate ? '#ef4444' : '#059669'} style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (backendConflictField === 'email' || backendConflictField === 'both') {
                      setBackendConflictField(null);
                      setErrorMessage('');
                    }
                  }}
                  placeholder="driver@naturalmilkdairy.com"
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 36px',
                    borderRadius: '10px',
                    border: isEmailDuplicate ? '1.5px solid #ef4444' : '1px solid #a7f3d0',
                    background: isEmailDuplicate ? '#fef2f2' : '#f0fdf4',
                    color: isEmailDuplicate ? '#991b1b' : '#065f46',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                />
              </div>
              {isEmailDuplicate && (
                <div style={{ marginTop: '6px', padding: '7px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.74rem', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Email address is already registered with partner <strong>"{otherDriverByEmail?.name || 'another account'}"</strong>. Please change the email address.</span>
                </div>
              )}
            </div>

            {/* Re-send Credentials Checkbox */}
            {email && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <input
                  type="checkbox"
                  id="edit-page-resend"
                  checked={resendEmail}
                  onChange={(e) => setResendEmail(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="edit-page-resend" style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                  📧 Re-send updated login credentials to {email}
                </label>
              </div>
            )}
          </div>

          {/* Card 2: Route Assignment & Security */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.015)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={16} color="#059669" />
                <span>Route Assignment & Security</span>
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Route territory, vehicle info, and account status
              </p>
            </div>

            {/* Assigned Route Area */}
            <div>
              <label style={{ fontSize: '0.80rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Assigned Route Area <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="text"
                  list="edit-partner-routes"
                  placeholder="Type or select route area"
                  value={assignedArea}
                  onChange={(e) => setAssignedArea(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 36px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <datalist id="edit-partner-routes">
                  {locations && locations.length > 0 ? (
                    locations.filter((l) => l.isActive).map((l) => (
                      <option key={l.id || l._id} value={l.name}>
                        {l.name} {l.pincode ? `(${l.pincode})` : ''} • {l.city}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Madhapur" />
                      <option value="Hitec City" />
                      <option value="Gachibowli" />
                      <option value="Kondapur" />
                      <option value="Jubilee Hills" />
                      <option value="Banjara Hills" />
                    </>
                  )}
                </datalist>
              </div>
            </div>

            {/* Vehicle Number */}
            <div>
              <label style={{ fontSize: '0.80rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Vehicle Number / Model
              </label>
              <div style={{ position: 'relative' }}>
                <Truck size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. AP40DT9792"
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 36px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Password & Status (2 Columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.80rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Reset Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.80rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Account Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Footer Actions Bar (Full Width) */}
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.015)',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 26px',
              borderRadius: '10px',
              border: 'none',
              background: isSubmitting ? '#94a3b8' : '#059669',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = '#047857';
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = '#059669';
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Updates...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Save Changes & Sync</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 5. Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Delete Delivery Partner?
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>This action cannot be undone</span>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Are you sure you want to permanently delete <strong>{boy.name}</strong> ({boy.mobile}) from the system and database?
            </p>

            {/* If partner has amount in hand, show breakdown */}
            {(() => {
              const hasAmountInHand = totalCollected > 0;
              if (hasAmountInHand) {
                return (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1.5px solid #f59e0b',
                      borderRadius: '12px',
                      padding: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px' }}>
                      <AlertTriangle size={16} />
                      <span>Cash in Partner Hand Detected: ₹{totalCollected}</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#78350f', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                      Partner currently holds un-reconciled money in hand.
                    </p>
                    <div style={{ background: '#ffffff', borderRadius: '8px', padding: '8px', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-around', fontSize: '0.8rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#92400e', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>CASH</span>
                        <strong style={{ color: '#b45309' }}>₹{cashCollected}</strong>
                      </div>
                      <div style={{ width: '1px', background: '#fde68a' }} />
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#92400e', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>UPI</span>
                        <strong style={{ color: '#059669' }}>₹{upiCollected}</strong>
                      </div>
                      <div style={{ width: '1px', background: '#fde68a' }} />
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#92400e', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>TOTAL</span>
                        <strong style={{ color: '#dc2626' }}>₹{totalCollected}</strong>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const hasCash = totalCollected > 0;
                  handleDelete(hasCash);
                }}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                <span>
                  {isDeleting
                    ? 'Deleting...'
                    : totalCollected > 0
                    ? 'Force Delete'
                    : 'Yes, Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
