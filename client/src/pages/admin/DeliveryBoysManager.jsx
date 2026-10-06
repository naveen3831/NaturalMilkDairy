import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Truck, Plus, CheckCircle, ShieldCheck, Phone, MapPin, IndianRupee, Wallet } from 'lucide-react';

export default function DeliveryBoysManager() {
  const { deliveryBoys, addDeliveryBoy, reconcileCash } = useDairy();
  const [showAddModal, setShowAddModal] = useState(false);
  const [reconcilingBoy, setReconcilingBoy] = useState(null);
  const [reconcileNotes, setReconcileNotes] = useState('');

  // Add form state
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [assignedArea, setAssignedArea] = useState('Andheri West');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobile) return;
    await addDeliveryBoy({
      name,
      mobile,
      assignedArea,
      vehicleNumber,
      password: '123',
      actor: 'Admin',
    });
    setName('');
    setMobile('');
    setVehicleNumber('');
    setShowAddModal(false);
  };

  const handleConfirmReconcile = async () => {
    if (!reconcilingBoy) return;
    await reconcileCash(reconcilingBoy.id, {
      notes: reconcileNotes,
      actor: 'Admin',
    });
    setReconcilingBoy(null);
    setReconcileNotes('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: '#0c2340' }}>Delivery Personnel & Cash Reconciliation</h2>
          <p style={{ color: '#597361', fontSize: '0.9rem' }}>
            PRD Section 26, 27, 28: Daily performance monitoring and end-of-day cash audits
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ padding: '11px 20px', borderRadius: '12px', fontSize: '0.92rem' }}
        >
          <Plus size={18} />
          <span>Add Delivery Partner</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '20px',
      }}>
        {deliveryBoys.map((boy) => {
          const stats = boy.todayStats || {};
          const totalCollected = (boy.todayCashCollected || 0) + (boy.todayUpiCollected || 0);

          return (
            <div key={boy.id} className="dairy-card" style={{ borderTop: '5px solid #0d5c3a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#0c2340' }}>{boy.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#597361', marginTop: '2px' }}>
                    <Phone size={13} color="#0d5c3a" />
                    <span>{boy.mobile}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#597361', marginTop: '2px' }}>
                    <MapPin size={13} color="#0d5c3a" />
                    <span>Area: <strong>{boy.assignedArea}</strong></span>
                  </div>
                </div>
                <span className="badge badge-delivered">Active Route</span>
              </div>

              {/* Performance Metrics (PRD Section 27) */}
              <div style={{
                background: '#f8faf8',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid #e2ece3',
                marginBottom: '16px',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#597361', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Today's Deliveries:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#597361' }}>COMPLETED</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>{stats.completed ?? 0}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#597361' }}>PENDING</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706' }}>{stats.pending ?? 0}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#597361' }}>MISSED</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>{stats.notDelivered ?? 0}</div>
                  </div>
                </div>
              </div>

              {/* Collection Box (PRD Section 28) */}
              <div style={{
                background: '#eaf5ee',
                borderRadius: '12px',
                padding: '14px',
                border: '1.5px solid #16945a',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0d5c3a', textTransform: 'uppercase' }}>
                    Daily Collection In Hand:
                  </span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0d5c3a' }}>
                    ₹{totalCollected.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#14241a' }}>
                  <span>💵 Cash in hand: <strong>₹{boy.todayCashCollected || 0}</strong></span>
                  <span>📱 UPI collected: <strong>₹{boy.todayUpiCollected || 0}</strong></span>
                </div>
              </div>

              {/* End of day reconcile action button */}
              <button
                type="button"
                onClick={() => setReconcilingBoy(boy)}
                className="btn-gold"
                style={{ width: '100%', padding: '10px', fontSize: '0.88rem' }}
              >
                <Wallet size={16} />
                <span>Verify & Reconcile Today's Cash</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Reconcile Modal (PRD Section 28) */}
      {reconcilingBoy && (
        <div className="modal-overlay" onClick={() => setReconcilingBoy(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: '#0c2340' }}>Cash Reconciliation</h3>
                <p style={{ fontSize: '0.85rem', color: '#597361' }}>
                  Delivery Partner: <strong>{reconcilingBoy.name}</strong> ({reconcilingBoy.assignedArea})
                </p>
              </div>
              <button onClick={() => setReconcilingBoy(null)} style={{ fontSize: '1.2rem', color: '#899e90' }}>✕</button>
            </div>

            <div style={{
              background: '#f8faf8',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#597361' }}>Cash to be deposited:</span>
                <span style={{ fontWeight: 800, color: '#0d5c3a', fontSize: '1.1rem' }}>₹{reconcilingBoy.todayCashCollected || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#597361' }}>UPI Direct collections:</span>
                <span style={{ fontWeight: 800, color: '#16467a', fontSize: '1.1rem' }}>₹{reconcilingBoy.todayUpiCollected || 0}</span>
              </div>
              <div style={{ height: '1px', background: '#e2ece3' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <span style={{ fontWeight: 800, color: '#0c2340' }}>Total Daily Collection:</span>
                <span style={{ fontWeight: 900, color: '#0c2340' }}>
                  ₹{(reconcilingBoy.todayCashCollected || 0) + (reconcilingBoy.todayUpiCollected || 0)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Reconciliation Note:
              </label>
              <input
                type="text"
                placeholder="e.g. Physical cash counted and matched ledger"
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
              />
            </div>

            <button
              onClick={handleConfirmReconcile}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '0.95rem' }}
            >
              ✓ Confirm Cash Handover & Reconcile
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.3rem', color: '#0c2340' }}>Add New Delivery Partner</h3>
              <button onClick={() => setShowAddModal(false)} style={{ fontSize: '1.2rem', color: '#899e90' }}>✕</button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input type="text" placeholder="e.g. Ramesh Patil" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Mobile Number</label>
                <input type="tel" placeholder="10-digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Assigned Delivery Area</label>
                <input type="text" placeholder="e.g. Andheri West, Juhu, Lokhandwala" value={assignedArea} onChange={(e) => setAssignedArea(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Vehicle / Route Details</label>
                <input type="text" placeholder="e.g. MH-02-EE-1122 (Motorbike)" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '13px', marginTop: '10px' }}>
                Register Delivery Partner
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
