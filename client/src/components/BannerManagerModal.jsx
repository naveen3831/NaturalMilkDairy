import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useDairy } from '../context/DairyContext';

const CATEGORY_OPTIONS = [
  { id: 'milk', label: 'Fresh Milks' },
  { id: 'curd', label: 'Curd & Paneer' },
  { id: 'ghee', label: 'Ghee & Butter' },
  { id: 'sweets', label: 'Dairy Sweets' },
];

export default function BannerManagerModal({ isOpen, onClose }) {
  const { uploadImage } = useDairy();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/banners/admin', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();
      if (data.success && data.banners) {
        setBanners(data.banners);
      }
    } catch (err) {
      console.error('Failed to fetch banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBanners();
    }
  }, [isOpen]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await uploadImage(file);
      if (res && res.success && res.url) {
        setEditingBanner((prev) => ({ ...prev, imageUrl: res.url }));
        setMessage('✅ Image uploaded to Cloudinary');
      } else {
        setMessage('⚠️ Failed to upload image');
      }
    } catch (err) {
      setMessage('⚠️ Upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.title || !editingBanner.imageUrl) {
      setMessage('⚠️ Title and Image URL are required');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const isNew = !editingBanner._id;
      const url = isNew ? '/api/banners' : `/api/banners/${editingBanner._id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(editingBanner),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(isNew ? '✅ New banner added!' : '✅ Banner updated successfully!');
        setEditingBanner(null);
        await fetchBanners();
      } else {
        setMessage('⚠️ ' + (data.message || 'Error saving banner'));
      }
    } catch (err) {
      setMessage('⚠️ Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Are you sure you want to delete this carousel banner?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/banners/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();
      if (data.success) {
        setMessage('🗑️ Banner removed');
        await fetchBanners();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} color="#059669" />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Home Carousel Banners Manager
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Manage carousel slides for both Mobile App and Mobile Web. Banners redirect to categories when clicked.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: message.startsWith('✅') ? '#ecfdf5' : '#fef2f2',
              color: message.startsWith('✅') ? '#065f46' : '#991b1b',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {editingBanner ? (
            /* Edit / Create Form */
            <form onSubmit={handleSaveBanner} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingBanner._id ? 'Edit Carousel Banner' : 'Create New Carousel Banner'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Image Preview & Upload */}
              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'center',
                  background: '#f8fafc',
                }}
              >
                {editingBanner.imageUrl ? (
                  <img
                    src={editingBanner.imageUrl}
                    alt="Banner preview"
                    style={{
                      width: '200px',
                      height: '130px',
                      objectFit: 'cover',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                    onError={(e) => { e.currentTarget.src = '/hero_banner_card.png'; }}
                  />
                ) : (
                  <div
                    style={{
                      width: '200px',
                      height: '130px',
                      borderRadius: '10px',
                      background: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                    }}
                  >
                    <ImageIcon size={32} />
                  </div>
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Upload New Image to Cloudinary:
                  </label>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: '#059669',
                      color: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      width: 'fit-content',
                    }}
                  >
                    <UploadCloud size={16} />
                    <span>{isUploading ? 'Uploading...' : 'Choose Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Recommended size: 455 x 298 px (or ~3:2 aspect ratio).
                  </span>
                  <input
                    type="text"
                    value={editingBanner.imageUrl || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                    placeholder="Or enter direct image URL / path (/hero_banner_card.png)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Banner Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBanner.title || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    placeholder="e.g. Pure Milk. Healthier Lives."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Redirects to Category *
                  </label>
                  <select
                    value={editingBanner.category || 'milk'}
                    onChange={(e) => setEditingBanner({ ...editingBanner, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Subtitle / Description
                </label>
                <textarea
                  rows={2}
                  value={editingBanner.subtitle || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  placeholder="e.g. Fresh farm harvest delivered to your doorstep daily before 6:30 AM."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Status & Order */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={editingBanner.isActive !== false}
                    onChange={(e) => setEditingBanner({ ...editingBanner, isActive: e.target.checked })}
                  />
                  <span>Active in Carousel</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Display Order:</span>
                  <input
                    type="number"
                    value={editingBanner.order || 0}
                    onChange={(e) => setEditingBanner({ ...editingBanner, order: Number(e.target.value) })}
                    style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#059669',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Banner'}
                </button>
              </div>
            </form>
          ) : (
            /* Banners List */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                  Available Category Banners ({banners.length})
                </span>
                <button
                  onClick={() =>
                    setEditingBanner({
                      title: '',
                      subtitle: '',
                      imageUrl: '/hero_banner_card.png',
                      category: 'milk',
                      order: banners.length,
                      isActive: true,
                    })
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    background: '#059669',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} />
                  <span>Add New Banner</span>
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading carousel banners...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                  {banners.map((b) => {
                    const catObj = CATEGORY_OPTIONS.find((c) => c.id === b.category);
                    return (
                      <div
                        key={b._id || b.imageUrl}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '14px',
                          overflow: 'hidden',
                          background: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ position: 'relative', height: '160px', background: '#f1f5f9' }}>
                          <img
                            src={b.imageUrl}
                            alt={b.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.src = '/hero_banner_card.png'; }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: b.isActive ? '#059669' : '#94a3b8',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '10px',
                              left: '10px',
                              background: 'rgba(15, 23, 42, 0.75)',
                              color: '#ffffff',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backdropFilter: 'blur(4px)',
                            }}
                          >
                            Redirects to: {catObj?.label || b.category}
                          </div>
                        </div>

                        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                              {b.title}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.35 }}>
                              {b.subtitle}
                            </p>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                              Order: {b.order}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setEditingBanner(b)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  color: '#334155',
                                  cursor: 'pointer',
                                }}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              {b._id && (
                                <button
                                  onClick={() => handleDeleteBanner(b._id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    fontSize: '0.76rem',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                  }}
                                  title="Delete Banner"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
