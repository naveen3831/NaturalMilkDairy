import React from 'react';
import { useDairy } from '../../context/DairyContext';
import { FileText, ShieldCheck, Clock, User, Activity } from 'lucide-react';

export default function AuditLogs() {
  const { auditLogs } = useDairy();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', color: '#0c2340' }}>Audit Trail & Dispute Resolution</h2>
        <p style={{ color: '#597361', fontSize: '0.9rem' }}>
          PRD Section 33: Immutable timestamped operational logs to permanently prevent customer disputes
        </p>
      </div>

      <div className="dairy-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2ece3', background: '#f8faf8' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0d5c3a' }}>
            ● {auditLogs.length} Total System Actions Logged
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {auditLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={log.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #edf3ee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: log.category === 'delivery' ? '#eaf5ee' : log.category === 'payment' ? '#ecfdf5' : '#edf4fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Activity size={18} color="#0d5c3a" />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#0c2340', fontSize: '0.95rem' }}>
                        {log.action}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#f0f5f1',
                        color: '#597361',
                        textTransform: 'uppercase',
                      }}>
                        {log.category}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#14241a', marginTop: '3px' }}>
                      {log.details}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#597361' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', fontWeight: 600 }}>
                    <User size={12} color="#0d5c3a" />
                    <span>Actor: <strong>{log.actor}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <Clock size={12} />
                    <span>{timeStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
