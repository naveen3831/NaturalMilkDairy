import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import { ShieldCheck, Clock, User, Activity, Search } from 'lucide-react';

export default function AuditLogs() {
  const { auditLogs } = useDairy();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterCategory !== 'all' && log.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q);
      const matchActor = log.actor?.toLowerCase().includes(q);
      if (!matchAction && !matchDetails && !matchActor) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Toolbar */}
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
            Audit Trail & Dispute Resolution Logs
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
            Immutable timestamped operational records of deliveries, cash handovers, and rate updates
          </p>
        </div>

        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '6px',
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #d1fae5',
          }}
        >
          {auditLogs.length} Actions Logged
        </span>
      </div>

      {/* 2. Filter & Search Controls */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, or customer details..."
            style={{
              paddingLeft: '34px',
              paddingTop: '7px',
              paddingBottom: '7px',
              fontSize: '0.84rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {['all', 'delivery', 'payment', 'customer', 'pricing'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                border: '1px solid',
                borderColor: filterCategory === cat ? '#059669' : '#e2e8f0',
                background: filterCategory === cat ? '#ecfdf5' : '#ffffff',
                color: filterCategory === cat ? '#065f46' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat === 'all' ? 'All Activities' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Audit Activity List */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.86rem' }}>
              No audit logs matching this search filter.
            </div>
          ) : (
            filteredLogs.map((log) => {
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
                    padding: '14px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background:
                          log.category === 'delivery'
                            ? '#ecfdf5'
                            : log.category === 'payment'
                            ? '#fffbeb'
                            : '#eff6ff',
                        color:
                          log.category === 'delivery'
                            ? '#059669'
                            : log.category === 'payment'
                            ? '#b45309'
                            : '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Activity size={16} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                          {log.action}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                            textTransform: 'uppercase',
                          }}
                        >
                          {log.category}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                        {log.details}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.76rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', fontWeight: 600 }}>
                      <User size={12} color="#059669" />
                      <span>By: {log.actor}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px', color: '#94a3b8' }}>
                      <Clock size={11} />
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
