import React, { useState, useEffect } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  Share2,
  Clock,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Building2,
  MessageSquare,
  Sparkles,
  Pencil,
  X,
  Copy,
  Check,
  ArrowUpRight,
} from 'lucide-react';

export default function ContactSettingsView() {
  const { contactInfo, updateContactInfo, resetContactInfo } = useDairy();

  // Mode: view details by default, edit only when clicked
  const [isEditing, setIsEditing] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    tagline: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    cleanPhone: '',
    email: '',
    whatsapp: '',
    workingHours: '',
    deliveryHours: '',
    socialLinks: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: '',
      youtube: '',
    },
  });

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Sync form with context
  useEffect(() => {
    if (contactInfo) {
      setFormData({
        companyName: contactInfo.companyName || 'NATURAL MILK DAIRY PRIVATE LIMITED',
        tagline: contactInfo.tagline || 'Natural • Pure • Healthy',
        description:
          contactInfo.description ||
          'Delivering pure farm-fresh unpasteurized milk and authentic dairy products directly to your doorstep across Mumbai.',
        address:
          contactInfo.address ||
          'Natural Milk Dairy, Unit 12/B, Knowledge Park Rd, Near WEH, Andheri West, Mumbai, Maharashtra 400053',
        city: contactInfo.city || 'Mumbai',
        state: contactInfo.state || 'Maharashtra',
        pincode: contactInfo.pincode || '400053',
        phone: contactInfo.phone || '+91 98765 43210',
        cleanPhone: contactInfo.cleanPhone || '919876543210',
        email: contactInfo.email || 'care@naturalmilkdairy.com',
        whatsapp: contactInfo.whatsapp || '+91 98765 43210',
        workingHours: contactInfo.workingHours || '5:00 AM – 9:00 PM Daily (365 Days)',
        deliveryHours: contactInfo.deliveryHours || '5:00 AM – 6:30 AM Doorstep Drop',
        socialLinks: {
          facebook: contactInfo.socialLinks?.facebook || 'https://facebook.com',
          twitter: contactInfo.socialLinks?.twitter || 'https://twitter.com',
          linkedin: contactInfo.socialLinks?.linkedin || 'https://linkedin.com',
          instagram: contactInfo.socialLinks?.instagram || 'https://instagram.com',
          youtube: contactInfo.socialLinks?.youtube || 'https://youtube.com',
        },
      });
    }
  }, [contactInfo]);

  const handleCopy = (text, key) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSocialChange = (network, value) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [network]: value,
      },
    }));
  };

  const handleCancel = () => {
    if (contactInfo) {
      setFormData({
        companyName: contactInfo.companyName || 'NATURAL MILK DAIRY PRIVATE LIMITED',
        tagline: contactInfo.tagline || 'Natural • Pure • Healthy',
        description: contactInfo.description || '',
        address: contactInfo.address || '',
        city: contactInfo.city || 'Mumbai',
        state: contactInfo.state || 'Maharashtra',
        pincode: contactInfo.pincode || '400053',
        phone: contactInfo.phone || '+91 98765 43210',
        cleanPhone: contactInfo.cleanPhone || '919876543210',
        email: contactInfo.email || 'care@naturalmilkdairy.com',
        whatsapp: contactInfo.whatsapp || '+91 98765 43210',
        workingHours: contactInfo.workingHours || '',
        deliveryHours: contactInfo.deliveryHours || '',
        socialLinks: {
          facebook: contactInfo.socialLinks?.facebook || 'https://facebook.com',
          twitter: contactInfo.socialLinks?.twitter || 'https://twitter.com',
          linkedin: contactInfo.socialLinks?.linkedin || 'https://linkedin.com',
          instagram: contactInfo.socialLinks?.instagram || 'https://instagram.com',
          youtube: contactInfo.socialLinks?.youtube || 'https://youtube.com',
        },
      });
    }
    setIsEditing(false);
    setStatusMsg(null);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const res = await updateContactInfo(formData);
    setSaving(false);

    if (res.success) {
      setStatusMsg({
        type: 'success',
        text: 'Contact details & social media links updated successfully! Changes are live across Web and Mobile apps.',
      });
      setIsEditing(false);
      setTimeout(() => setStatusMsg(null), 5000);
    } else {
      setStatusMsg({
        type: 'error',
        text: res.message || 'Failed to update contact info. Please try again.',
      });
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset all contact details and social links back to standard company defaults?'
      )
    ) {
      return;
    }
    setResetting(true);
    setStatusMsg(null);

    const res = await resetContactInfo();
    setResetting(false);

    if (res.success) {
      setStatusMsg({
        type: 'success',
        text: 'Reset to factory defaults completed successfully.',
      });
      setIsEditing(false);
      setTimeout(() => setStatusMsg(null), 5000);
    } else {
      setStatusMsg({
        type: 'error',
        text: res.message || 'Failed to reset contact info.',
      });
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* 1. Header with Actions */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isEditing ? '#f59e0b' : '#10b981',
              }}
            />
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: isEditing ? '#b45309' : '#059669',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {isEditing ? 'Editing Mode Active' : 'Live Business Contact Profile'}
            </span>
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Contact Details & Social Media Links
          </h1>
          <p
            style={{
              fontSize: '0.84rem',
              color: '#64748b',
              margin: '4px 0 0',
              maxWidth: '650px',
            }}
          >
            {isEditing
              ? 'Update public telephone helplines, WhatsApp support, office dispatch address, and official social media handles.'
              : 'Review current active helpline numbers, WhatsApp desk, dispatch hub address, and official social media handles across Web and Mobile apps.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: '#059669',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <Pencil size={15} />
              <span>Edit Contact Details</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving || resetting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <X size={15} />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={resetting || saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #fde68a',
                  background: '#fffbeb',
                  color: '#b45309',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: resetting ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCcw size={15} />
                <span>{resetting ? 'Resetting...' : 'Reset Defaults'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || resetting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
                }}
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {statusMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: statusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${statusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: statusMsg.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.86rem',
            fontWeight: 600,
          }}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 size={18} color="#059669" />
          ) : (
            <AlertCircle size={18} color="#dc2626" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* VIEW DETAILS MODE (READ-ONLY CLEAN OVERVIEW)               */}
      {/* ────────────────────────────────────────────────────────── */}
      {!isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Support & Customer Helplines */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                  }}
                >
                  <Phone size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Helpline & Customer Support Channels
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                    Active numbers & emails linked to user calls, WhatsApp buttons & public footer
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#059669',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Pencil size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Phone */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Phone Helpline
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(formData.phone, 'phone')}
                    title="Copy phone number"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8' }}
                  >
                    {copiedKey === 'phone' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {formData.phone}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <a
                    href={`tel:${formData.phone.replace(/\s+/g, '')}`}
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#059669',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Direct Call</span>
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid #dcfce7',
                  background: '#f0fdf4',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                    WhatsApp Desk
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(formData.whatsapp, 'wa')}
                    title="Copy WhatsApp"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#15803d' }}
                  >
                    {copiedKey === 'wa' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534' }}>
                  {formData.whatsapp}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <a
                    href={`https://wa.me/${formData.cleanPhone || formData.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#15803d',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Open WhatsApp Chat</span>
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>

              {/* Email */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Customer Care Email
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(formData.email, 'email')}
                    title="Copy Email"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8' }}
                  >
                    {copiedKey === 'email' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>
                  {formData.email}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <a
                    href={`mailto:${formData.email}`}
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#059669',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Send Mail</span>
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>

              {/* Working Hours */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Helpline Working Hours
                </span>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                  {formData.workingHours}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                  Early morning doorstep dispatch active
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Social Media Handles */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                  }}
                >
                  <Share2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Official Social Media Channels
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                    Configured URLs opening from the website footer & mobile apps
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#2563eb',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Pencil size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
              }}
            >
              {[
                { name: 'Facebook', url: formData.socialLinks.facebook, color: '#1877f2', bg: '#eff6ff' },
                { name: 'X (formerly Twitter)', url: formData.socialLinks.twitter, color: '#0f172a', bg: '#f1f5f9' },
                { name: 'LinkedIn', url: formData.socialLinks.linkedin, color: '#0a66c2', bg: '#eff6ff' },
                { name: 'Instagram', url: formData.socialLinks.instagram, color: '#e1306c', bg: '#fdf2f8' },
                { name: 'YouTube', url: formData.socialLinks.youtube, color: '#ef4444', bg: '#fef2f2' },
              ].map((item) => (
                <div
                  key={item.name}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: item.color }}>
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        color: '#475569',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '2px',
                      }}
                    >
                      {item.url || 'Not configured'}
                    </div>
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 12px',
                        background: item.bg,
                        color: item.color,
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <span>Visit</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Physical Office & Dispatch Address */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706',
                  }}
                >
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Physical Dispatch & Operations Address
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                    Surfaced on delivery receipts, customer invoices, and contact pages
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#d97706',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Pencil size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.5 }}>
                {formData.address}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.78rem', color: '#64748b' }}>
                <span>City: <strong>{formData.city}</strong></span>
                <span>•</span>
                <span>State: <strong>{formData.state}</strong></span>
                <span>•</span>
                <span>PIN: <strong>{formData.pincode}</strong></span>
              </div>
            </div>
          </div>

          {/* Section 4: Legal Entity & Description */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                  }}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Legal Entity & Public Branding
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                    Company title & tagline rendered across all web and mobile platforms
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Pencil size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                {formData.companyName}
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#059669' }}>
                {formData.tagline}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.4 }}>
                {formData.description}
              </div>
            </div>
          </div>

          {/* Section 5: Live Website Footer Preview Box */}
          <div
            style={{
              background: '#080d1a',
              borderRadius: '16px',
              padding: '24px',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#10b981" />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Website Footer Reflection
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Real-time sync</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                fontSize: '0.82rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.92rem', marginBottom: '6px' }}>
                  {formData.companyName}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                  {formData.description}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Facebook', 'Twitter', 'LinkedIn', 'Instagram', 'YouTube'].map((net) => {
                    const url = formData.socialLinks[net.toLowerCase()];
                    return (
                      <a
                        key={net}
                        href={url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{net}</span>
                        <ExternalLink size={10} color="#94a3b8" />
                      </a>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem', marginBottom: '8px' }}>
                  Contact
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#cbd5e1', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <MapPin size={15} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{formData.address}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} color="#10b981" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, color: '#ffffff' }}>{formData.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} color="#10b981" style={{ flexShrink: 0 }} />
                    <span>{formData.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────── */
        /* EDIT FORM MODE (WHEN ADMIN CLICKS "EDIT DETAILS")          */
        /* ────────────────────────────────────────────────────────── */
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Communication & Helplines */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <Phone size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Helpline & Customer Support Channels
                </h3>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                  Enter telephone numbers, WhatsApp contact, and official support email
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Phone / Customer Care Helpline
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  WhatsApp Operations Helpline
                </label>
                <div style={{ position: 'relative' }}>
                  <MessageSquare size={15} color="#059669" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Official Support Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="care@naturalmilkdairy.com"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Helpline Working Hours
                </label>
                <div style={{ position: 'relative' }}>
                  <Clock size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    value={formData.workingHours}
                    onChange={(e) => handleChange('workingHours', e.target.value)}
                    placeholder="5:00 AM – 9:00 PM Daily (365 Days)"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Social Media Handles */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <Share2 size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Social Media Links & Handles
                </h3>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                  Official social profile links embedded in footer buttons (Facebook, X/Twitter, LinkedIn, Instagram, YouTube)
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#1877f2', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800 }}>Facebook</span> Profile / Page URL
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.facebook}
                  onChange={(e) => handleSocialChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/naturalmilkdairy"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800 }}>X (formerly Twitter)</span> Profile URL
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.twitter}
                  onChange={(e) => handleSocialChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/naturalmilkdairy"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#0a66c2', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800 }}>LinkedIn</span> Company Page URL
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.linkedin}
                  onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/company/naturalmilkdairy"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#e1306c', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800 }}>Instagram</span> Profile URL
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.instagram}
                  onChange={(e) => handleSocialChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/naturalmilkdairy"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800 }}>YouTube</span> Official Channel URL
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.youtube}
                  onChange={(e) => handleSocialChange('youtube', e.target.value)}
                  placeholder="https://youtube.com/@naturalmilkdairy"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Physical Address */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                }}
              >
                <MapPin size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Physical Office & Dispatch Address
                </h3>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                  Full road, unit, and landmark address
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Complete Street Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Natural Milk Dairy, Unit 12/B, Knowledge Park Rd, Near WEH, Andheri West, Mumbai, Maharashtra 400053"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '14px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Mumbai"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      color: '#0f172a',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="Maharashtra"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      color: '#0f172a',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Postal Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    placeholder="400053"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Legal Branding */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                }}
              >
                <Building2 size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Legal Entity & Mission Tagline
                </h3>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                  Company title & footer paragraph
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Company Name (Entity)
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="NATURAL MILK DAIRY PRIVATE LIMITED"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Tagline / Motto
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="Natural • Pure • Healthy"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Footer Description Paragraph
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Delivering pure farm-fresh unpasteurized milk and authentic dairy products directly to your doorstep across Mumbai."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '10px',
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving || resetting}
              style={{
                padding: '11px 20px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || resetting}
              style={{
                padding: '11px 28px',
                borderRadius: '10px',
                border: 'none',
                background: '#059669',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(5,150,105,0.3)',
              }}
            >
              {saving ? 'Saving Changes...' : 'Save All Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
