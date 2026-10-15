import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Truck,
  Users,
  Clock,
  Sparkles,
  AlertCircle,
  Building,
  Navigation,
} from 'lucide-react';

export default function LocationsManager() {
  const { locations, addLocation, updateLocation, deleteLocation, deliveryBoys, customers } = useDairy();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [deleteConfirmLoc, setDeleteConfirmLoc] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [state, setState] = useState('Telangana');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('Morning 5:00 AM - 7:30 AM');
  const [assignedPartnerId, setAssignedPartnerId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  const openCreateModal = () => {
    setEditingLoc(null);
    setName('');
    setPincode('');
    setCity('Hyderabad');
    setState('Telangana');
    setAddress('');
    setLandmark('');
    setDeliverySlot('Morning 5:00 AM - 7:30 AM');
    setAssignedPartnerId('');
    setIsActive(true);
    setNotes('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (loc) => {
    setEditingLoc(loc);
    setName(loc.name || '');
    setPincode(loc.pincode || '');
    setCity(loc.city || 'Hyderabad');
    setState(loc.state || 'Telangana');
    setAddress(loc.address || '');
    setLandmark(loc.landmark || '');
    setDeliverySlot(loc.deliverySlot || 'Morning 5:00 AM - 7:30 AM');
    setAssignedPartnerId(loc.assignedPartnerId || '');
    setIsActive(Boolean(loc.isActive));
    setNotes(loc.notes || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Location / Area name is required');
      return;
    }

    setIsSubmitting(true);
    const selectedBoy = deliveryBoys.find((b) => (b.id || b._id) === assignedPartnerId);

    const payload = {
      name: name.trim(),
      pincode: pincode.trim(),
      city: city.trim(),
      state: state.trim(),
      address: address.trim(),
      landmark: landmark.trim(),
      deliverySlot: deliverySlot.trim(),
      assignedPartnerId: assignedPartnerId || '',
      assignedPartnerName: selectedBoy ? selectedBoy.name : '',
      isActive,
      notes: notes.trim(),
    };

    let res;
    if (editingLoc) {
      res = await updateLocation(editingLoc.id || editingLoc._id, payload);
    } else {
      res = await addLocation(payload);
    }

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg(res.message || 'Location saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setIsModalOpen(false);
    } else {
      setErrorMsg(res.message || 'Failed to save location.');
    }
  };

  const handleToggleStatus = async (loc) => {
    const newStatus = !loc.isActive;
    const res = await updateLocation(loc.id || loc._id, { isActive: newStatus });
    if (res.success) {
      setSuccessMsg(`Location "${loc.name}" is now ${newStatus ? 'Active' : 'Inactive'}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmLoc) return;
    setIsSubmitting(true);
    const res = await deleteLocation(deleteConfirmLoc.id || deleteConfirmLoc._id);
    setIsSubmitting(false);
    setDeleteConfirmLoc(null);

    if (res.success) {
      setSuccessMsg(res.message || 'Location removed.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      alert(res.message || 'Failed to remove location.');
    }
  };

  // Filtered List
  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locations.filter((loc) => {
      if (statusFilter === 'active' && !loc.isActive) return false;
      if (statusFilter === 'inactive' && loc.isActive) return false;
      if (!q) return true;
      return (
        (loc.name && loc.name.toLowerCase().includes(q)) ||
        (loc.pincode && loc.pincode.toLowerCase().includes(q)) ||
        (loc.city && loc.city.toLowerCase().includes(q)) ||
        (loc.landmark && loc.landmark.toLowerCase().includes(q)) ||
        (loc.assignedPartnerName && loc.assignedPartnerName.toLowerCase().includes(q))
      );
    });
  }, [locations, search, statusFilter]);

  // Aggregate Metrics
  const totalLocations = locations.length;
  const activeLocations = locations.filter((l) => l.isActive).length;
  const totalCoveredCustomers = locations.reduce((sum, l) => sum + (l.customerCount || 0), 0);
  const assignedPartnersCount = new Set(locations.map((l) => l.assignedPartnerId).filter(Boolean)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header Toolbar */}
      <div className="ledger-card-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.28rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={22} color="#059669" />
            <span>Service Locations & Delivery Addresses</span>
          </h1>
          <p style={{ fontSize: '0.80rem', color: '#64748b', margin: '3px 0 0 0' }}>
            Authorized delivery zones where customers can take subscriptions and partners fulfill daily doorstep drops
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#059669',
            color: '#ffffff',
            padding: '9px 16px',
            borderRadius: '9px',
            fontSize: '0.82rem',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
            transition: 'all 0.15s ease',
          }}
        >
          <Plus size={16} />
          <span>Add Service Location</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 16px', borderRadius: '10px', fontSize: '0.84rem', fontWeight: 600 }}>
          <CheckCircle2 size={16} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Key Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="ledger-card-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Locations
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {totalLocations}
            </div>
          </div>
        </div>

        <div className="ledger-card-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Delivery Zones
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {activeLocations} <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>of {totalLocations}</span>
            </div>
          </div>
        </div>

        <div className="ledger-card-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Doorstep Accounts
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {totalCoveredCustomers}
            </div>
          </div>
        </div>

        <div className="ledger-card-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Truck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Assigned Partners
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {assignedPartnersCount}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search and Status Filter Row */}
      <div className="ledger-card-panel" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px', position: 'relative' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
          <input
            type="text"
            placeholder="Search by area name, pincode, landmark, or partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              outline: 'none',
              background: '#f8fafc',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Filter Status:</span>
          <div className="ledger-view-toggle">
            {['all', 'active', 'inactive'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`ledger-toggle-btn ${statusFilter === st ? 'active' : ''}`}
                style={{ textTransform: 'capitalize' }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Service Locations List / Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
        {filteredLocations.length === 0 ? (
          <div className="ledger-card-panel" style={{ gridColumn: '1 / -1', padding: '48px 20px', textAlign: 'center' }}>
            <MapPin size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              No Service Locations Found
            </h3>
            <p style={{ fontSize: '0.80rem', color: '#64748b', marginTop: '4px' }}>
              {search ? 'No delivery locations match your search query.' : 'Add your first delivery address to allow users to subscribe and partners to deliver.'}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="ledger-back-btn"
              style={{ marginTop: '14px', display: 'inline-flex' }}
            >
              <Plus size={14} />
              <span>Add Location</span>
            </button>
          </div>
        ) : (
          filteredLocations.map((loc) => {
            const hasCustomers = (loc.customerCount || 0) > 0;
            return (
              <div
                key={loc.id || loc._id}
                className="ledger-card-panel"
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                }}
              >
                {/* Top Row: Name, Pincode & Status */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {loc.name}
                        </h3>
                        {loc.pincode && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
                            PIN: {loc.pincode}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                        {loc.city}, {loc.state}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(loc)}
                      title={loc.isActive ? 'Click to deactivate' : 'Click to activate'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        border: '1px solid',
                        cursor: 'pointer',
                        background: loc.isActive ? '#ecfdf5' : '#f1f5f9',
                        color: loc.isActive ? '#059669' : '#64748b',
                        borderColor: loc.isActive ? '#a7f3d0' : '#cbd5e1',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {loc.isActive ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Route & Landmark */}
                  {(loc.landmark || loc.address) && (
                    <div style={{ marginTop: '10px', fontSize: '0.76rem', color: '#475569', display: 'flex', alignItems: 'flex-start', gap: '5px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                      <Navigation size={12} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{loc.address ? `${loc.address} ` : ''}{loc.landmark ? `(${loc.landmark})` : ''}</span>
                    </div>
                  )}

                  {/* Delivery Timings */}
                  <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} color="#64748b" />
                    <span>Slot: <strong>{loc.deliverySlot || 'Morning Route'}</strong></span>
                  </div>

                  {/* Assigned Delivery Partner */}
                  <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Truck size={12} color="#0284c7" />
                    <span>
                      Partner:{' '}
                      {loc.assignedPartnerName ? (
                        <strong style={{ color: '#0284c7' }}>{loc.assignedPartnerName}</strong>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned (Open Route)</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Customer Count & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.74rem', color: hasCustomers ? '#059669' : '#64748b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={13} />
                    <span>{loc.customerCount || 0} Customers</span>
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(loc)}
                      title="Edit Location"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                      }}
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmLoc(loc)}
                      title="Delete Location"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. ADD / EDIT LOCATION MODAL */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
          style={{ zIndex: 1100 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '500px',
              width: '94%',
              borderRadius: '16px',
              padding: '22px',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingLoc ? 'Edit Service Location' : 'Add New Service Location'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Define authorized address zones for subscriptions & partner deliveries
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '0.80rem', marginBottom: '12px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Location / Area Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Madhapur"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500081"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Base Address / Route Corridor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Road from Metro Station to Kavuri Hills"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Landmark / Hub
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near Cyber Towers"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Delivery Timing Slot
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5:00 AM - 7:00 AM"
                    value={deliverySlot}
                    onChange={(e) => setDeliverySlot(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Assign Partner */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Assign Primary Delivery Partner (Driver)
                </label>
                <select
                  value={assignedPartnerId}
                  onChange={(e) => setAssignedPartnerId(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
                >
                  <option value="">-- No specific partner (Open for any driver) --</option>
                  {deliveryBoys.map((b) => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.name} ({b.mobile}) {b.assignedArea ? `• Currently: ${b.assignedArea}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="locActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#059669' }}
                />
                <label htmlFor="locActiveCheck" style={{ fontSize: '0.80rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Active Serviceable Zone (Visible to users & partners for subscription and delivery)
                </label>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: '#059669',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                  }}
                >
                  {isSubmitting ? 'Saving...' : editingLoc ? 'Update Location' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {deleteConfirmLoc && (
        <div
          className="modal-overlay"
          onClick={() => !isSubmitting && setDeleteConfirmLoc(null)}
          style={{ zIndex: 1200 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              width: '90%',
              borderRadius: '16px',
              padding: '22px',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Remove Location?
              </h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Are you sure you want to remove <strong>"{deleteConfirmLoc.name}"</strong>?
              {deleteConfirmLoc.customerCount > 0 && (
                <span style={{ display: 'block', marginTop: '6px', color: '#b45309', background: '#fffbeb', padding: '6px 10px', borderRadius: '6px' }}>
                  ⚠️ This location has {deleteConfirmLoc.customerCount} active customer(s). It will be safely marked <strong>Inactive</strong> to preserve existing delivery history.
                </span>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmLoc(null)}
                disabled={isSubmitting}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                style={{
                  background: '#dc2626',
                  border: 'none',
                  color: '#ffffff',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
