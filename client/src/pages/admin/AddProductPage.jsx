import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  ArrowLeft,
  Tag,
  UploadCloud,
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { CLOUDINARY_MEDIA, PRESET_GALLERY } from '../../constants/cloudinaryMedia';

const PRESET_IMAGES = PRESET_GALLERY;

export default function AddProductPage({ onBack, onSaved }) {
  const { addProduct, uploadImage } = useDairy();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('milk');
  const [unit, setUnit] = useState('1 L');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [image, setImage] = useState(CLOUDINARY_MEDIA.cowMilk);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Uploading to Cloudinary...');
    try {
      const res = await uploadImage(file);
      setIsUploading(false);
      if (res && res.success && res.url) {
        setImage(res.url);
        setUploadStatus(res.warning ? 'Saved locally' : 'Uploaded to Cloudinary');
      } else {
        setUploadStatus('Upload failed. Used default preset.');
      }
    } catch (err) {
      setIsUploading(false);
      setUploadStatus('Upload error: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }
    if (!price || Number(price) <= 0) {
      setErrorMessage('Please enter a valid price greater than 0.');
      return;
    }
    if (!unit.trim()) {
      setErrorMessage('Unit size is required (e.g. 1 L, 500 ml).');
      return;
    }

    setIsSubmitting(true);
    try {
      await addProduct({
        name: name.trim(),
        category,
        unit: unit.trim(),
        price: Number(price),
        description: description.trim(),
        image: image.trim(),
        status,
        actor: 'Admin',
      });
      setIsSubmitting(false);

      if (onSaved) {
        onSaved(`Product "${name}" successfully created and saved to MongoDB Atlas!`);
      } else if (onBack) {
        onBack();
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to create product.');
    }
  };

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Top Header with Back Navigation */}
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
            title="Back to Products & Pricing"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dairy Catalog & Rate Card
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
              Create New Dairy Product
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

      {/* Error Alert */}
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

      {/* 2. Full Page Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.4fr) minmax(320px, 1fr)', gap: '20px' }}>
          {/* Left Column: Product Information */}
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
                <Tag size={16} color="#059669" />
                <span>Product Specifications & Pricing</span>
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Set catalog name, category, package size, and daily rate
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Product Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Farm Fresh Cow Milk 1L"
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Category <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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
                  <option value="milk">Milk</option>
                  <option value="curd">Curd / Dahi</option>
                  <option value="ghee">Ghee</option>
                  <option value="paneer">Paneer</option>
                  <option value="butter">Butter</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Unit Size <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 L, 500 ml, 500 g"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', display: 'block', marginBottom: '6px' }}>
                  Rate Card Price (₹) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 65"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #a7f3d0',
                    background: '#f0fdf4',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#065f46',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Catalog Status
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
                  <option value="active">Active (Available for delivery)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Product Description
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Freshly milked pure organic farm cow milk chilled to 4°C in sterilized glass bottles."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Right Column: Photo & Media */}
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
                <Camera size={16} color="#059669" />
                <span>Product Photo & Media</span>
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Upload to Cloudinary or select from curated dairy presets
              </p>
            </div>

            {/* Live Photo Preview Card */}
            <div
              style={{
                width: '100%',
                height: '210px',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                position: 'relative',
              }}
            >
              <img
                src={image}
                alt="Product Preview"
                onError={(e) => {
                  e.currentTarget.src = '/product-cow-milk.jpg';
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  right: '10px',
                  background: 'rgba(15, 23, 42, 0.78)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 700 }}>Live Visual Preview</span>
                <span>{unit}</span>
              </div>
            </div>

            {/* Cloudinary File Upload */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '14px',
                textAlign: 'center',
              }}
            >
              <input
                type="file"
                accept="image/*"
                id="add-page-file-upload"
                onChange={handleFileUpload}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="add-page-file-upload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#059669',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
                }}
              >
                <UploadCloud size={15} />
                <span>Upload Custom Photo</span>
              </label>

              {isUploading && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Loader2 size={14} className="animate-spin" /> Uploading to Cloudinary...
                </div>
              )}

              {uploadStatus && !isUploading && (
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                  ✓ {uploadStatus}
                </div>
              )}
            </div>

            {/* Dairy Presets */}
            <div>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                Or Choose Dairy Preset Image:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 8px',
                      borderRadius: '8px',
                      background: image === preset.url ? '#ecfdf5' : '#ffffff',
                      border: image === preset.url ? '2px solid #059669' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                    />
                    <span style={{ fontSize: '0.7rem', fontWeight: image === preset.url ? 700 : 500, color: image === preset.url ? '#059669' : '#334155' }}>
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                Image URL
              </label>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  color: '#475569',
                }}
              />
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
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Create Product & Save to Database</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
