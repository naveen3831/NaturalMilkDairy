import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  Truck,
  Plus,
  Phone,
  MapPin,
  Wallet,
  UserPlus,
  X,
  Edit2,
  Trash2,
  Mail,
  Lock,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export default function DeliveryBoysManager({ onNavigateToAdd, onNavigateToEdit }) {
  const {
    deliveryBoys,
    addDeliveryBoy,
    updateDeliveryBoy,
    deleteDeliveryBoy,
    reconcileCash,
    sendDeliveryBoyCredentials,
  } = useDairy();

  const [sendingEmailBoyId, setSendingEmailBoyId] = useState(null);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [assignedArea, setAssignedArea] = useState('Andheri West');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingBoy, setEditingBoy] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editArea, setEditArea] = useState('Andheri West');
  const [editVehicle, setEditVehicle] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editResendEmail, setEditResendEmail] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirm State
  const [deletingBoy, setDeletingBoy] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reconcile State
  const [reconcilingBoy, setReconcilingBoy] = useState(null);
  const [reconcileNotes, setReconcileNotes] = useState('');

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobile) return;
    setIsSubmitting(true);
    const res = await addDeliveryBoy({
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      assignedArea,
      vehicleNumber: vehicleNumber.trim(),
      password: password.trim() || 'driver@123',
      actor: 'Admin',
    });
    setIsSubmitting(false);
    setName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setVehicleNumber('');
    setShowAddModal(false);

    if (res?.emailSent) {
      showToast(`✅ Partner ${name} added & credentials emailed successfully!`);
    } else {
      showToast(`✅ Partner ${name} registered in MongoDB.`);
    }
  };

  const openEditModal = (boy) => {
    setEditingBoy(boy);
    setEditName(boy.name || '');
    setEditEmail(boy.email || '');
    setEditMobile(boy.mobile || '');
    setEditPassword(boy.password || '');
    setEditArea(boy.assignedArea || 'Andheri West');
    setEditVehicle(boy.vehicleNumber || '');
    setEditStatus(boy.status || 'active');
    setEditResendEmail(Boolean(boy.email));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBoy || !editName || !editMobile) return;
    setIsUpdating(true);
    const res = await updateDeliveryBoy(editingBoy.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      mobile: editMobile.trim(),
      assignedArea: editArea,
      vehicleNumber: editVehicle.trim(),
      password: editPassword.trim(),
      status: editStatus,
      resendEmail: editResendEmail,
      actor: 'Admin',
    });
    setIsUpdating(false);
    setEditingBoy(null);

    if (res?.emailSent) {
      showToast(`✅ Partner ${editName} updated & credentials re-sent via email!`);
    } else {
      showToast(`✅ Partner ${editName} updated in MongoDB Atlas.`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBoy) return;
    setIsDeleting(true);
    await deleteDeliveryBoy(deletingBoy.id, 'Admin');
    setIsDeleting(false);
    showToast(`🗑️ Partner ${deletingBoy.name} removed from database.`);
    setDeletingBoy(null);
  };

  const handleConfirmReconcile = async () => {
    if (!reconcilingBoy) return;
    await reconcileCash(reconcilingBoy.id, {
      notes: reconcileNotes,
      actor: 'Admin',
    });
    setReconcilingBoy(null);
    setReconcileNotes('');
    showToast(`💰 Cash collection reconciled for ${reconcilingBoy.name}.`);
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

      {/* 1. Header Bar */}
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
            Delivery Personnel & Fleet Management
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
            Driver routes, credentials dispatch, cash reconciliation, and MongoDB live fleet sync
          </p>
        </div>

        <button
          onClick={() => {
            if (onNavigateToAdd) onNavigateToAdd();
            else setShowAddModal(true);
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
            boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}
        >
          <UserPlus size={15} />
          <span>Add Delivery Partner</span>
        </button>
      </div>

      {/* 2. Driver Partners Grid */}
      {deliveryBoys.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
            }}
          >
            <Truck size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
            No Delivery Partners Created Yet
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.84rem', maxWidth: '420px', margin: '6px auto 16px auto' }}>
            Add drivers to assign morning routes, dispatch login credentials via email, and sync with MongoDB Atlas.
          </p>
          <button
            onClick={() => {
              if (onNavigateToAdd) onNavigateToAdd();
              else setShowAddModal(true);
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#059669',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + Add First Delivery Partner
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
          }}
        >
          {deliveryBoys.map((boy) => {
            const stats = boy.todayStats || {};
            const totalCollected = (boy.todayCashCollected || 0) + (boy.todayUpiCollected || 0);

            return (
              <div
                key={boy.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  {/* Card Header with Edit/Delete Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#ecfdf5',
                          color: '#059669',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {boy.name?.charAt(0)?.toUpperCase() || 'D'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {boy.name}
                        </h3>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Vehicle: <strong>{boy.vehicleNumber || 'Unassigned'}</strong>
                        </div>
                      </div>
                    </div>

                    <div>
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
                  </div>

                  {/* Contact Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.78rem', color: '#64748b', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} color="#059669" />
                      <span>{boy.mobile}</span>
                    </div>
                    {boy.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={13} color="#059669" />
                        <span style={{ color: '#0f172a' }}>{boy.email}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={13} color="#059669" />
                      <span>Route Area: <strong>{boy.assignedArea}</strong></span>
                    </div>
                  </div>

                  {/* Route Drops Summary Strip */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Today's Route Deliveries
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center' }}>
                      <div style={{ background: '#ffffff', padding: '6px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>DONE</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669' }}>{stats.completed ?? 0}</div>
                      </div>
                      <div style={{ background: '#ffffff', padding: '6px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>PENDING</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706' }}>{stats.pending ?? 0}</div>
                      </div>
                      <div style={{ background: '#ffffff', padding: '6px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>MISSED</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>{stats.notDelivered ?? 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Cash In Hand Box */}
                  <div
                    style={{
                      background: '#f0fdf4',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      border: '1px solid #bbf7d0',
                      marginBottom: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                        Cash in Hand Today:
                      </span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857' }}>
                        ₹{totalCollected.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#166534' }}>
                      <span>Cash: ₹{boy.todayCashCollected || 0}</span>
                      <span>UPI: ₹{boy.todayUpiCollected || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Row */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setReconcilingBoy(boy)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#b45309',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fef3c7')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fffbeb')}
                  >
                    <Wallet size={14} />
                    <span>Reconcile Cash</span>
                  </button>

                  <button
                    type="button"
                    disabled={sendingEmailBoyId === boy.id}
                    onClick={async () => {
                      if (!boy.email) {
                        showToast(`⚠️ No email address set for ${boy.name}. Please edit driver and add an email.`);
                        return;
                      }
                      setSendingEmailBoyId(boy.id);
                      const res = await sendDeliveryBoyCredentials(boy.id, 'Admin');
                      setSendingEmailBoyId(null);
                      if (res?.success) {
                        showToast(`✅ Credentials emailed to ${boy.email}!`);
                      } else {
                        showToast(`❌ ${res?.message || 'Failed to dispatch email'}`);
                      }
                    }}
                    title="Send Login Credentials Email"
                    style={{
                      padding: '8px 12px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                      opacity: sendingEmailBoyId === boy.id ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#dbeafe')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#eff6ff')}
                  >
                    {sendingEmailBoyId === boy.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Mail size={13} />
                    )}
                    <span>{sendingEmailBoyId === boy.id ? 'Sending...' : 'Email Login'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToEdit) onNavigateToEdit(boy.id);
                      else openEditModal(boy);
                    }}
                    style={{
                      padding: '8px 14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#edf2f7')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingBoy(boy)}
                    title="Delete Partner"
                    style={{
                      padding: '8px 10px',
                      background: '#fef2f2',
                      border: '1px solid #fee2e2',
                      color: '#dc2626',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fef2f2')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Add Delivery Partner Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Add Delivery Partner</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Register driver credentials and assign morning route
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Partner Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Mobile Number (Login ID) *</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', display: 'block', marginBottom: '4px' }}>
                  📧 Partner Email (For Credentials Dispatch) *
                </label>
                <input
                  type="email"
                  placeholder="e.g. driver@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #bbf7d0', background: '#f0fdf4', padding: '8px 12px', fontSize: '0.84rem' }}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px', display: 'block' }}>
                  Login details and route info will be instantly dispatched to this email address.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Portal Password
                </label>
                <input
                  type="text"
                  placeholder="e.g. driver@123 (Default: driver@123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Assigned Delivery Route / Area *
                </label>
                <input
                  type="text"
                  list="add-route-datalist"
                  placeholder="Type route area (e.g. Lokhandwala, Andheri West, Juhu...)"
                  value={assignedArea}
                  onChange={(e) => setAssignedArea(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  required
                />
                <datalist id="add-route-datalist">
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
                <span style={{ fontSize: '0.71rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Type any custom route, street, or colony name.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Vehicle Number / Info</label>
                <input
                  type="text"
                  placeholder="e.g. MH-02-CD-5678 (Hero Splendor)"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSubmitting ? '#94a3b8' : '#059669',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Registering & Emailing...' : 'Save Partner & Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Delivery Partner Modal */}
      {editingBoy && (
        <div className="modal-overlay" onClick={() => setEditingBoy(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Edit Delivery Partner</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Update credentials, route assignment, or portal status in MongoDB
                </p>
              </div>
              <button onClick={() => setEditingBoy(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Partner Full Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Mobile Number (Login ID) *</label>
                <input
                  type="tel"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', display: 'block', marginBottom: '4px' }}>
                  Partner Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #bbf7d0', background: '#f0fdf4', padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Reset Portal Password
                </label>
                <input
                  type="text"
                  placeholder="Enter new password (leave as is to keep existing)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Route Area *
                  </label>
                  <input
                    type="text"
                    list="edit-route-datalist"
                    placeholder="Type or select route area"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                    required
                  />
                  <datalist id="edit-route-datalist">
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

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Vehicle Info</label>
                <input
                  type="text"
                  value={editVehicle}
                  onChange={(e) => setEditVehicle(e.target.value)}
                  style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              {editEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="edit-resend-email"
                    checked={editResendEmail}
                    onChange={(e) => setEditResendEmail(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="edit-resend-email" style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                    📧 Re-send updated login credentials to {editEmail}
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingBoy(null)}
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
                  disabled={isUpdating}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isUpdating ? '#94a3b8' : '#059669',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUpdating ? 'Saving Updates...' : 'Save & Update Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Delivery Partner Confirmation Modal */}
      {deletingBoy && (
        <div className="modal-overlay" onClick={() => setDeletingBoy(null)}>
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
                Delete Delivery Partner?
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{deletingBoy.name}</strong> ({deletingBoy.mobile})? This driver will be permanently removed from MongoDB Atlas and route assignments.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeletingBoy(null)}
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
                {isDeleting ? 'Deleting...' : 'Yes, Delete Partner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Reconcile Modal */}
      {reconcilingBoy && (
        <div className="modal-overlay" onClick={() => setReconcilingBoy(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Verify Cash Handover</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  {reconcilingBoy.name} • Route: {reconcilingBoy.assignedArea}
                </p>
              </div>
              <button onClick={() => setReconcilingBoy(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.84rem' }}>
                <span style={{ color: '#64748b' }}>Cash Collected Today:</span>
                <strong style={{ color: '#0f172a' }}>₹{reconcilingBoy.todayCashCollected || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#64748b' }}>UPI Verified:</span>
                <strong style={{ color: '#059669' }}>₹{reconcilingBoy.todayUpiCollected || 0}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Reconciliation Note
              </label>
              <input
                type="text"
                placeholder="e.g. Cash received at counter and verified"
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: '0.84rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setReconcilingBoy(null)}
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
                onClick={handleConfirmReconcile}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm Reconciliation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
