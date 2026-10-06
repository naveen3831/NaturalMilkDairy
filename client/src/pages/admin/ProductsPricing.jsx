import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Milk, ShieldAlert, Edit2, Check, Plus, DollarSign, Sparkles } from 'lucide-react';

export default function ProductsPricing() {
  const { products, updateProductPrice, addProduct } = useDairy();
  const [editingId, setEditingId] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New product form state
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('milk');
  const [prodUnit, setProdUnit] = useState('1 L');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');

  const startEdit = (p) => {
    setEditingId(p.id);
    setNewPrice(p.price);
  };

  const handleSavePrice = async (id) => {
    if (!newPrice || Number(newPrice) <= 0) return;
    await updateProductPrice(id, newPrice, 'Admin');
    setEditingId(null);
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
      actor: 'Admin',
    });
    setProdName('');
    setProdPrice('');
    setProdDesc('');
    setShowAddForm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: '#0c2340' }}>Product Catalog & Pricing Management</h2>
          <p style={{ color: '#597361', fontSize: '0.9rem' }}>
            Configure daily farm milk, curd, ghee, and dairy rates
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ padding: '11px 20px', borderRadius: '12px', fontSize: '0.92rem' }}
        >
          <Plus size={18} />
          <span>{showAddForm ? 'Cancel' : 'Add New Product'}</span>
        </button>
      </div>

      {/* Rule 7 Notice Callout (PRD Section 6) */}
      <div style={{
        background: '#eaf5ee',
        border: '1.5px solid #16945a',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <div style={{ padding: '8px', background: '#0d5c3a', borderRadius: '50%', color: '#ffffff' }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h4 style={{ color: '#0d5c3a', fontSize: '0.98rem', fontWeight: 800 }}>
            Rule 7 Automatic Historical Pricing Protection Active
          </h4>
          <p style={{ color: '#14241a', fontSize: '0.85rem', marginTop: '2px' }}>
            If you adjust milk from ₹60 to ₹65, all historical delivery ledger records and past customer bills retain the exact price applicable on that delivery date.
          </p>
        </div>
      </div>

      {/* Add Product Form Modal / Accordion */}
      {showAddForm && (
        <div className="dairy-card" style={{ border: '2px solid #0d5c3a', background: '#f8faf8' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#0c2340', marginBottom: '16px' }}>Add New Dairy Product</h3>
          <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Product Name</label>
              <input type="text" placeholder="e.g. Pure Buffalo Milk 500ml" value={prodName} onChange={(e) => setProdName(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Category</label>
              <select value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}>
                <option value="milk">Milk</option>
                <option value="curd">Curd / Dahi</option>
                <option value="ghee">Ghee</option>
                <option value="paneer">Paneer</option>
                <option value="butter">Butter</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Unit</label>
              <input type="text" placeholder="e.g. 1 L, 500 ml, 500 g" value={prodUnit} onChange={(e) => setProdUnit(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Price (₹)</label>
              <input type="number" placeholder="e.g. 65" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="dairy-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Unit Size</th>
                <th>Current Price (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Modify Pricing</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isEditing = editingId === p.id;

                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eaf5ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Milk size={20} color="#0d5c3a" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0c2340', fontSize: '0.98rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#597361' }}>{p.description || 'Natural dairy fresh'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 600 }}>
                        {p.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{p.unit}</td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700 }}>₹</span>
                          <input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            style={{ width: '80px', padding: '4px 8px', fontSize: '1rem', fontWeight: 800 }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d5c3a' }}>
                          ₹{p.price}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-delivered">Active</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleSavePrice(p.id)}
                            style={{
                              background: '#0d5c3a',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Check size={14} /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              background: '#e5e7eb',
                              color: '#374151',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(p)}
                          style={{
                            background: '#edf4fc',
                            color: '#16467a',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Edit2 size={14} /> Update Rate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
