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
  Send,
} from 'lucide-react';

export default function EditDeliveryBoyPage({ deliveryBoyId, onBack, onSaved, onDeleted }) {
  const { deliveryBoys, updateDeliveryBoy, deleteDeliveryBoy, sendDeliveryBoyCredentials } = useDairy();

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
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailFeedback, setMailFeedback] = useState('');
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
            (b.id !== boy?.id && b._id !== boy?._id) &&
            b.mobile &&
            b.mobile.trim() === cleanMobile
        )
      : null;

  const otherDriverByEmail =
    cleanEmail.length >= 4 && cleanEmail.includes('@')
      ? (deliveryBoys || []).find(
          (b) =>
            (b.id !== boy?.id && b._id !== boy?._id) &&
            b.email &&
            b.email.trim().toLowerCase() === cleanEmail
        )
      : null;

  const isMobileDuplicate = Boolean(otherDriverByMobile || backendConflictField === 'mobile' || backendConflictField === 'both');
  const isEmailDuplicate = Boolean(otherDriverByEmail || backendConflictField === 'email' || backendConflictField === 'both');

  if (!boy) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>Delivery Partner Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '0.86rem', marginTop: '6px' }}>
          The requested delivery partner record could not be located in MongoDB Atlas.
        </p>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: '16px',
            padding: '8px 18px',
            borderRadius: '8px',
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ← Back to Delivery Partners
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
            : `Partner ${name} updated in MongoDB Atlas.`
        );
      } else if (onBack) {
        onBack();
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to update delivery partner.');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDeliveryBoy(boy.id, 'Admin');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      if (onDeleted) {
        onDeleted(`Delivery partner ${boy.name} deleted from database.`);
      } else if (onBack) {
        onBack();
      }
    } catch (err) {
      setIsDeleting(false);
      setErrorMessage(err.message || 'Failed to delete partner.');
    }
  };

  const handleQuickSendEmail = async () => {
    const targetEmail = email.trim() || boy.email;
    if (!targetEmail) {
      setErrorMessage('Please enter an email address before sending credentials.');
      return;
    }
    setIsSendingMail(true);
    setMailFeedback('');
    try {
      const res = await sendDeliveryBoyCredentials(boy.id, 'Admin');
      setIsSendingMail(false);
      if (res?.success) {
        setMailFeedback(`✅ Credentials successfully sent to ${targetEmail}!`);
        setTimeout(() => setMailFeedback(''), 5000);
      } else {
        setErrorMessage(res?.message || 'Failed to dispatch email.');
      }
    } catch (err) {
      setIsSendingMail(false);
      setErrorMessage(err.message || 'Failed to dispatch email.');
    }
  };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                }}
              >
                {boy.status === 'inactive' ? 'Inactive' : 'Active'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
              Edit Partner: {boy.name}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            disabled={isSendingMail}
            onClick={handleQuickSendEmail}
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '7px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isSendingMail ? 0.7 : 1,
            }}
          >
            {isSendingMail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            <span>{isSendingMail ? 'Sending Email...' : 'Send Credentials Email'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '7px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Trash2 size={14} />
            <span>Delete Partner</span>
          </button>

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
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={17} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mail Feedback Banner */}
      {mailFeedback && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={17} />
          <span>{mailFeedback}</span>
        </div>
      )}

      {/* 2. Full-Page Edit Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          {/* Card 1: Partner Details */}
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
                <Edit2 size={16} color="#059669" />
                <span>Profile & Contact Details</span>
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Driver contact information and login credentials
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Partner Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
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
              </div>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color={isMobileDuplicate ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '12px', top: '12px' }} />
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
              {isMobileDuplicate && (
                <div style={{ marginTop: '6px', padding: '7px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.76rem', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Phone number is already registered with partner <strong>"{otherDriverByMobile?.name || 'another account'}"</strong>. Please change the phone number.</span>
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: isEmailDuplicate ? '#dc2626' : '#059669', display: 'block' }}>
                  Partner Email Address
                </label>
                {isEmailDuplicate && (
                  <span style={{ fontSize: '0.73rem', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} />
                    ALREADY REGISTERED
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color={isEmailDuplicate ? '#ef4444' : '#059669'} style={{ position: 'absolute', left: '12px', top: '12px' }} />
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
              {isEmailDuplicate && (
                <div style={{ marginTop: '6px', padding: '7px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.76rem', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Email address is already registered with partner <strong>"{otherDriverByEmail?.name || 'another account'}"</strong>. Please change the email address.</span>
                </div>
              )}
            </div>

            {email && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '10px 14px',
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

          {/* Card 2: Route, Status & Password */}
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
                Route territory, vehicle info, and account status
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
                  list="edit-partner-routes"
                  placeholder="Type or select route area"
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
                <datalist id="edit-partner-routes">
                  <option value="Andheri West" />
                  <option value="Juhu" />
                  <option value="Bandra West" />
                  <option value="Powai" />
                  <option value="Vile Parle" />
                  <option value="Lokhandwala" />
                  <option value="Versova" />
                  <option value="Goregaon" />
                  <option value="Santacruz" />
                  <option value="Khar West" />
                </datalist>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Vehicle Number / Model
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. MH-02-ND-5678"
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
                  Reset Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
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

        {/* Footer Actions */}
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

      {/* Delete Confirmation Modal */}
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
              Are you sure you want to permanently delete <strong>{boy.name}</strong> ({boy.mobile}) from the system and MongoDB Atlas?
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '9px',
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
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '9px',
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
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
