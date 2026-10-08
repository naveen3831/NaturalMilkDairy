import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  Milk,
  Edit2,
  Plus,
  UploadCloud,
  Loader2,
  Sparkles,
  X,
  LayoutGrid,
  List,
  Camera,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { CLOUDINARY_MEDIA, PRESET_GALLERY, getDefaultProductImage } from '../../constants/cloudinaryMedia';

const PRESET_IMAGES = PRESET_GALLERY;

export const getProductImage = (p) => {
  if (p?.image && typeof p.image === 'string' && p.image.trim() !== '') {
    return p.image;
  }
  if (p?.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.trim() !== '') {
    return p.imageUrl;
  }
  return getDefaultProductImage(p?.name, p?.category);
};

export default function ProductsPricing({ onNavigateToAdd, onNavigateToEdit }) {
  const { products, updateProductPrice, addProduct, updateProduct, deleteProduct, uploadImage } = useDairy();

  // View mode: 'grid' (rich card showcase) or 'table' (dense rate card)
  const [viewMode, setViewMode] = useState('grid');

  // Modals & Drawers
  const [showAddForm, setShowAddForm] = useState(false);

  // Full Edit Product Modal State
  const [editingFullProduct, setEditingFullProduct] = useState(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('milk');
  const [editProdUnit, setEditProdUnit] = useState('1 L');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdImage, setEditProdImage] = useState('');
  const [editProdStatus, setEditProdStatus] = useState('active');
  const [isEditProductUpdating, setIsEditProductUpdating] = useState(false);

  // Delete Product State
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Add Product Form State
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('milk');
  const [prodUnit, setProdUnit] = useState('1 L');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('/product-cow-milk.jpg');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Modal upload state
  const [isModalUploading, setIsModalUploading] = useState(false);

  const handleImageFileChange = async (e, target = 'add') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'fullEdit') {
      setIsModalUploading(true);
      const res = await uploadImage(file);
      setIsModalUploading(false);
      if (res && res.success && res.url) {
        setEditProdImage(res.url);
      }
    } else {
      setIsUploading(true);
      setUploadStatus('Uploading to Cloudinary...');
      const res = await uploadImage(file);
      setIsUploading(false);
      if (res && res.success && res.url) {
        setProdImage(res.url);
        setUploadStatus(res.warning ? 'Saved locally' : 'Uploaded to Cloudinary');
      } else {
        setUploadStatus('Upload failed. Used default preset.');
      }
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice) return;
    await addProduct({
      name: prodName,
      category: prodCategory,
      unit: prodUnit,
      price: Number(prodPrice),
      description: prodDesc,
      image: prodImage || getProductImage({ name: prodName, category: prodCategory }),
      actor: 'Admin',
    });
    setProdName('');
    setProdPrice('');
    setProdDesc('');
    setProdImage('/product-cow-milk.jpg');
    setUploadStatus('');
    setShowAddForm(false);
    showToast(`✅ Product "${prodName}" added to catalog & MongoDB Atlas.`);
  };

  const openFullEditModal = (p) => {
    setEditingFullProduct(p);
    setEditProdName(p.name || '');
    setEditProdCategory(p.category || 'milk');
    setEditProdUnit(p.unit || '1 L');
    setEditProdPrice(p.price || '');
    setEditProdDesc(p.description || '');
    setEditProdImage(p.image || getProductImage(p));
    setEditProdStatus(p.status || 'active');
  };

  const handleSaveFullEdit = async (e) => {
    e.preventDefault();
    if (!editingFullProduct || !editProdName || !editProdPrice) return;

    setIsEditProductUpdating(true);
    await updateProduct(editingFullProduct.id, {
      name: editProdName,
      category: editProdCategory,
      unit: editProdUnit,
      price: Number(editProdPrice),
      description: editProdDesc,
      image: editProdImage,
      status: editProdStatus,
      actor: 'Admin',
    });
    setIsEditProductUpdating(false);
    setEditingFullProduct(null);
    showToast(`✅ Product "${editProdName}" updated in MongoDB Atlas.`);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    await deleteProduct(deletingProduct.id, 'Admin');
    setIsDeleting(false);
    showToast(`🗑️ Product "${deletingProduct.name}" removed from database.`);
    setDeletingProduct(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Banner */}
      {toastMessage && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            color: '#065f46',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)',
          }}
        >
          <CheckCircle size={16} color="#059669" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Top Header Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Product Catalog & Photo Gallery
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
            Full CRUD operations, Cloudinary image management, and MongoDB Atlas live synchronization
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={14} />
              <span>Visual Gallery</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={14} />
              <span>Table View</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (onNavigateToAdd) onNavigateToAdd();
              else setShowAddForm(!showAddForm);
            }}
            style={{
              background: '#059669',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.84rem',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={15} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 2. Historical Notice */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={16} />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
          <strong style={{ color: '#0f172a' }}>Live Database Synchronization:</strong> All product additions, revisions, rate modifications, and deletions immediately sync with MongoDB Atlas and Cloudinary media assets.
        </div>
      </div>

      {/* 3. Add Product Form Drawer */}
      {showAddForm && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Create New Dairy Catalog Item
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Save new dairy product to MongoDB Atlas and Cloudinary
              </p>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: '#eff6ff',
                color: '#1d4ed8',
                padding: '3px 10px',
                borderRadius: '6px',
              }}
            >
              MongoDB & Cloudinary
            </span>
          </div>

          <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Product Name *</label>
              <input
                type="text"
                placeholder="e.g. Pure Buffalo Milk 500ml"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                value={prodCategory}
                onChange={(e) => setProdCategory(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
              >
                <option value="milk">Milk</option>
                <option value="curd">Curd / Dahi</option>
                <option value="ghee">Ghee</option>
                <option value="paneer">Paneer</option>
                <option value="butter">Butter</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Unit Size *</label>
              <input
                type="text"
                placeholder="e.g. 1 L, 500 ml, 500 g"
                value={prodUnit}
                onChange={(e) => setProdUnit(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Price (₹) *</label>
              <input
                type="number"
                placeholder="e.g. 65"
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                required
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Short Description</label>
              <input
                type="text"
                placeholder="e.g. Pure, unadulterated farm fresh milk chilled within 30 mins"
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem', width: '100%' }}
              />
            </div>

            {/* Product Image Selector & Upload Box */}
            <div
              style={{
                gridColumn: '1 / -1',
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={16} color="#059669" />
                  <span>Product Photo (Cloudinary Upload or Dairy Preset)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="new-prod-file-input"
                    onChange={(e) => handleImageFileChange(e, 'add')}
                    disabled={isUploading}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="new-prod-file-input"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    <UploadCloud size={14} color="#059669" />
                    <span>Upload to Cloudinary</span>
                  </label>
                  {isUploading && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                      <Loader2 size={14} className="animate-spin" /> Uploading...
                    </span>
                  )}
                  {uploadStatus && !isUploading && (
                    <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>
                      ✓ {uploadStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Preset Image Options */}
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Or select a standard dairy photo preset:
                </span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setProdImage(preset.url)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: prodImage === preset.url ? '#ecfdf5' : '#ffffff',
                        border: prodImage === preset.url ? '2px solid #059669' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        style={{ width: '26px', height: '26px', borderRadius: '4px', objectFit: 'cover' }}
                      />
                      <span style={{ fontSize: '0.75rem', fontWeight: prodImage === preset.url ? 700 : 500, color: prodImage === preset.url ? '#059669' : '#334155' }}>
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              {prodImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <img
                    src={prodImage}
                    alt="Active Preview"
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #059669' }}
                  />
                  <div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>Selected Image</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', wordBreak: 'break-all' }}>{prodImage}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  padding: '9px 22px',
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Save Product
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '9px 16px',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Products Display (Visual Gallery Cards View) */}
      {viewMode === 'grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '18px',
          }}
        >
          {products.map((p) => {
            const imgSrc = getProductImage(p);

            return (
              <div
                key={p.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.07)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                }}
              >
                {/* Product Image Frame */}
                <div
                  style={{
                    position: 'relative',
                    height: '180px',
                    width: '100%',
                    background: '#f1f5f9',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={p.name}
                    onError={(e) => {
                      e.currentTarget.src = '/product-cow-milk.jpg';
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.3s ease',
                    }}
                  />

                  {/* Top Badges */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      display: 'flex',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        background: 'rgba(15, 23, 42, 0.82)',
                        backdropFilter: 'blur(4px)',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {p.category}
                    </span>
                    <span
                      style={{
                        background: '#059669',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {p.unit}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                      {p.name}
                    </h3>
                  </div>

                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748b',
                      margin: '0 0 14px 0',
                      lineHeight: 1.4,
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {p.description || 'Farm-fresh pure unadulterated natural dairy produce delivered daily.'}
                  </p>

                  {/* Price Row */}
                  <div
                    style={{
                      paddingTop: '10px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                        Rate Card Price
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                          ₹{p.price}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>/ {p.unit}</span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: p.status === 'inactive' ? '#fef2f2' : '#ecfdf5',
                        color: p.status === 'inactive' ? '#dc2626' : '#047857',
                      }}
                    >
                      {p.status === 'inactive' ? 'Inactive' : 'Active'}
                    </span>
                  </div>

                  {/* Actions Row (Edit Full Details & Delete) */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        if (onNavigateToEdit) onNavigateToEdit(p.id);
                        else openFullEditModal(p);
                      }}
                      style={{
                        flex: 1,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#334155',
                        padding: '7px 10px',
                        borderRadius: '7px',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#edf2f7')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    >
                      <Edit2 size={13} /> Edit Item
                    </button>

                    <button
                      onClick={() => setDeletingProduct(p)}
                      title="Delete Product"
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#dc2626',
                        padding: '7px 10px',
                        borderRadius: '7px',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fef2f2')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Products Table View */}
      {viewMode === 'table' && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '12px 18px' }}>Product Photo & Details</th>
                  <th style={{ padding: '12px 18px' }}>Category</th>
                  <th style={{ padding: '12px 18px' }}>Unit Size</th>
                  <th style={{ padding: '12px 18px' }}>Active Price</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const imgSrc = getProductImage(p);

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              position: 'relative',
                              width: '56px',
                              height: '56px',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              border: '1px solid #e2e8f0',
                              flexShrink: 0,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                          >
                            <img
                              src={imgSrc}
                              alt={p.name}
                              onError={(e) => {
                                e.currentTarget.src = '/product-cow-milk.jpg';
                              }}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </div>

                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                              {p.description || 'Natural dairy fresh'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ textTransform: 'capitalize', fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                          {p.category}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0f172a' }}>{p.unit}</td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669' }}>
                          ₹{p.price}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            background: p.status === 'inactive' ? '#fef2f2' : '#ecfdf5',
                            color: p.status === 'inactive' ? '#dc2626' : '#047857',
                          }}
                        >
                          {p.status === 'inactive' ? 'Inactive' : 'Active'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              if (onNavigateToEdit) onNavigateToEdit(p.id);
                              else openFullEditModal(p);
                            }}
                            title="Edit Product Details"
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#334155',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.76rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={13} /> Edit
                          </button>

                          <button
                            onClick={() => setDeletingProduct(p)}
                            title="Delete Product"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fee2e2',
                              color: '#dc2626',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Full Edit Product Modal */}
      {editingFullProduct && (
        <div className="modal-overlay" onClick={() => setEditingFullProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Edit Product Catalog Item
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Update details, pricing, and photo in MongoDB Atlas
                </p>
              </div>
              <button onClick={() => setEditingFullProduct(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleSaveFullEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Product Name *</label>
                <input
                  type="text"
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    value={editProdCategory}
                    onChange={(e) => setEditProdCategory(e.target.value)}
                    style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  >
                    <option value="milk">Milk</option>
                    <option value="curd">Curd / Dahi</option>
                    <option value="ghee">Ghee</option>
                    <option value="paneer">Paneer</option>
                    <option value="butter">Butter</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Unit Size *</label>
                  <input
                    type="text"
                    value={editProdUnit}
                    onChange={(e) => setEditProdUnit(e.target.value)}
                    style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Price (₹ Rate) *</label>
                  <input
                    type="number"
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(e.target.value)}
                    style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Status</label>
                  <select
                    value={editProdStatus}
                    onChange={(e) => setEditProdStatus(e.target.value)}
                    style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Description</label>
                <input
                  type="text"
                  value={editProdDesc}
                  onChange={(e) => setEditProdDesc(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              {/* Photo Selector */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Product Photo</label>
                  <label
                    htmlFor="edit-file-input"
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#059669',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <UploadCloud size={13} />
                    <span>Upload New Photo</span>
                  </label>
                  <input
                    type="file"
                    id="edit-file-input"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e, 'fullEdit')}
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={editProdImage || '/product-cow-milk.jpg'}
                    alt="Current"
                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #059669' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                    {PRESET_IMAGES.slice(0, 4).map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setEditProdImage(preset.url)}
                        style={{
                          background: editProdImage === preset.url ? '#ecfdf5' : '#ffffff',
                          border: editProdImage === preset.url ? '1.5px solid #059669' : '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingFullProduct(null)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditProductUpdating}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isEditProductUpdating ? '#94a3b8' : '#059669',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: isEditProductUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isEditProductUpdating ? 'Saving...' : 'Save Product Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Product Confirmation Modal */}
      {deletingProduct && (
        <div className="modal-overlay" onClick={() => setDeletingProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Delete Product?
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{deletingProduct.name}</strong>? This item will be permanently removed from MongoDB Atlas and future customer subscriptions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isDeleting ? '#94a3b8' : '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
