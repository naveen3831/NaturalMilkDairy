import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Headphones,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  MessageCircle,
  Send,
  Trash2,
  RefreshCw,
  ExternalLink,
  User,
  Truck,
  Filter,
  CheckCheck,
  X,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

export default function AdminSupportDesk() {
  const { getAuthHeaders } = useAuth();
  const { subscribe: wsSubscribe } = useWebSocket();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'delivery_boy' | 'customer'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'normal' | 'high' | 'urgent'

  // Selected ticket for reply / detail modal
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  // Fetch tickets from API
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/supports', {
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        setError('');
      } else {
        throw new Error(data.message || 'Unable to load support tickets.');
      }
    } catch (err) {
      console.warn('Failed loading tickets from API:', err);
      // Fallback to local storage if API temporarily down
      const saved = localStorage.getItem('nmd_admin_cached_tickets');
      if (saved) {
        try {
          setTickets(JSON.parse(saved));
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Subscribe to real-time events
  useEffect(() => {
    if (!wsSubscribe) return;
    const unsubCreated = wsSubscribe('SUPPORT_TICKET_CREATED', () => fetchTickets());
    const unsubUpdated = wsSubscribe('SUPPORT_TICKET_UPDATED', () => fetchTickets());
    const unsubNotif = wsSubscribe('NOTIFICATION_UPDATED', () => fetchTickets());

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubNotif();
    };
  }, [wsSubscribe, fetchTickets]);

  // Cache to localStorage
  useEffect(() => {
    if (tickets.length > 0) {
      localStorage.setItem('nmd_admin_cached_tickets', JSON.stringify(tickets));
    }
  }, [tickets]);

  // Update Ticket Status or Reply
  const handleUpdateTicket = async (ticketId, updates) => {
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/supports/${encodeURIComponent(ticketId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders ? getAuthHeaders() : {}),
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setTickets((prev) =>
          prev.map((t) => (t.ticketId === ticketId || t.id === ticketId || t._id === ticketId ? { ...t, ...updates } : t))
        );
        if (activeTicket && (activeTicket.ticketId === ticketId || activeTicket.id === ticketId)) {
          setActiveTicket((prev) => ({ ...prev, ...updates }));
        }
        setActionFeedback('✓ Ticket updated successfully!');
        setTimeout(() => setActionFeedback(''), 3500);
      }
    } catch (err) {
      console.error('Failed to update ticket:', err);
      alert('Could not update ticket. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this support message?')) return;
    try {
      await fetch(`/api/supports/${encodeURIComponent(ticketId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
      setTickets((prev) => prev.filter((t) => t.ticketId !== ticketId && t.id !== ticketId && t._id !== ticketId));
      if (activeTicket && (activeTicket.ticketId === ticketId || activeTicket.id === ticketId)) {
        setActiveTicket(null);
      }
      setActionFeedback('✓ Ticket deleted.');
      setTimeout(() => setActionFeedback(''), 3000);
    } catch (err) {
      console.error('Failed deleting ticket:', err);
    }
  };

  const openTicketDetail = (ticket) => {
    setActiveTicket(ticket);
    setReplyText(ticket.adminReply || '');
    setInternalNotes(ticket.adminNotes || '');
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (roleFilter !== 'all' && t.senderRole !== roleFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = (t.senderName || '').toLowerCase().includes(q);
      const matchPhone = (t.senderPhone || '').includes(q);
      const matchId = (t.ticketId || '').toLowerCase().includes(q);
      const matchCat = (t.category || '').toLowerCase().includes(q);
      const matchMsg = (t.message || '').toLowerCase().includes(q);
      const matchArea = (t.senderArea || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchId || matchCat || matchMsg || matchArea;
    }
    return true;
  });

  const totalTickets = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const driverTicketsCount = tickets.filter((t) => t.senderRole === 'delivery_boy' || t.senderRole === 'driver').length;
  const customerTicketsCount = tickets.filter((t) => t.senderRole === 'customer').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* 1. Page Header & Live Pulse */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              flexShrink: 0,
            }}
          >
            <Headphones size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Help & Support Desk
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                  }}
                />
                Live Real-Time
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
              Live incoming assistance requests, route alerts from Delivery Partners, and Customer queries.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchTickets}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {actionFeedback && (
        <div
          style={{
            padding: '12px 18px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            color: '#065f46',
            fontSize: '0.86rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} color="#059669" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* 2. Key Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Total Inquiries */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Inquiries
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {totalTickets}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
              {driverTicketsCount} Drivers · {customerTicketsCount} Customers
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <MessageSquare size={20} />
          </div>
        </div>

        {/* Needs Action / Open */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase' }}>
              Open Tickets
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ca8a04', marginTop: '2px' }}>
              {openCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#a16207', marginTop: '2px' }}>
              Pending admin response
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04' }}>
            <Clock size={20} />
          </div>
        </div>

        {/* In Progress */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              In Progress
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
              {inProgressCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#3b82f6', marginTop: '2px' }}>
              Dispatched / in resolution
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <RefreshCw size={20} />
          </div>
        </div>

        {/* Resolved */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Resolved
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
              {resolvedCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '2px' }}>
              Successfully handled
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <CheckCheck size={20} />
          </div>
        </div>
      </div>

      {/* 3. Search & Multi-Filters Toolbar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '14px 18px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by name, phone, area, topic, or message..."
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              boxSizing: 'border-box',
              background: '#f8fafc',
            }}
          />
        </div>

        {/* Sender Role Pills */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '9px' }}>
          {[
            { id: 'all', label: 'All Senders', count: totalTickets },
            { id: 'delivery_boy', label: '🚚 Drivers', count: driverTicketsCount },
            { id: 'customer', label: '🥛 Customers', count: customerTicketsCount },
          ].map((pill) => {
            const active = roleFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setRoleFilter(pill.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: active ? 800 : 600,
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? '#0284c7' : '#475569',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{pill.label}</span>
                <span style={{ fontSize: '0.7rem', padding: '0 5px', borderRadius: '999px', background: active ? '#e0f2fe' : '#e2e8f0', color: active ? '#0369a1' : '#64748b' }}>
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Dropdown */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="open">🟡 Open ({openCount})</option>
            <option value="in_progress">🔵 In Progress ({inProgressCount})</option>
            <option value="resolved">🟢 Resolved ({resolvedCount})</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Urgencies</option>
            <option value="urgent">🚨 Urgent Priority</option>
            <option value="high">⚠️ High Priority</option>
            <option value="normal">Normal Priority</option>
          </select>
        </div>
      </div>

      {/* 4. Tickets Feed / Grid */}
      {filteredTickets.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <Headphones size={26} />
          </div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
            No Support Messages Found
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            {search || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'No tickets match your active filter criteria. Try resetting filters.'
              : 'Any incoming help requests from delivery partners or customers will appear here in real time.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTickets.map((t) => {
            const isDriver = t.senderRole === 'delivery_boy' || t.senderRole === 'driver';
            const isUrgent = t.priority === 'urgent';
            const isHigh = t.priority === 'high';
            const isOpen = t.status === 'open';
            const isInProg = t.status === 'in_progress';
            const isResolved = t.status === 'resolved';

            return (
              <div
                key={t.ticketId || t.id || t._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Top Row: Ticket ID, Role, Priority, Time, Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                      {t.ticketId || 'TKT-8492'}
                    </span>

                    {/* Sender Role Badge */}
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: isDriver ? '#ecfdf5' : '#eff6ff',
                        color: isDriver ? '#065f46' : '#1e40af',
                        border: `1px solid ${isDriver ? '#a7f3d0' : '#bfdbfe'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isDriver ? <Truck size={12} /> : <User size={12} />}
                      {isDriver ? 'DELIVERY PARTNER' : 'CUSTOMER'}
                    </span>

                    {/* Category */}
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: '#f1f5f9',
                        color: '#334155',
                      }}
                    >
                      {t.category || 'General Support'}
                    </span>

                    {/* Priority Badge */}
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: isUrgent ? '#fee2e2' : isHigh ? '#fef3c7' : '#f0fdf4',
                        color: isUrgent ? '#991b1b' : isHigh ? '#92400e' : '#166534',
                        border: `1px solid ${isUrgent ? '#fca5a5' : isHigh ? '#fde68a' : '#bbf7d0'}`,
                      }}
                    >
                      {t.priority ? t.priority.toUpperCase() : 'NORMAL'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>

                    {/* Status Pill */}
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: isOpen ? '#fef9c3' : isInProg ? '#dbeafe' : '#dcfce7',
                        color: isOpen ? '#854d0e' : isInProg ? '#1e40af' : '#15803d',
                        border: `1px solid ${isOpen ? '#fde047' : isInProg ? '#93c5fd' : '#86efac'}`,
                      }}
                    >
                      {isOpen ? '🟡 Open' : isInProg ? '🔵 In Progress' : '🟢 Resolved'}
                    </span>
                  </div>
                </div>

                {/* Sender Details Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#475569' }}>
                  <div>
                    <strong style={{ color: '#0f172a' }}>{t.senderName || 'Anonymous'}</strong>
                    {t.senderId && <span style={{ color: '#94a3b8', marginLeft: '6px' }}>({t.senderId})</span>}
                  </div>
                  {t.senderPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} color="#059669" />
                      <span>{t.senderPhone}</span>
                    </div>
                  )}
                  {t.senderArea && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>Sector:</span>
                      <strong>{t.senderArea}</strong>
                    </div>
                  )}
                  {t.senderAddress && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>Address:</span>
                      <span>{t.senderAddress}</span>
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '0.88rem',
                    color: '#1e293b',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    marginBottom: '12px',
                  }}
                >
                  {t.message}
                </div>

                {/* Admin Reply or Notes Banner if exists */}
                {t.adminReply && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '0.8rem',
                      color: '#0f172a',
                      marginBottom: '12px',
                    }}
                  >
                    <strong>Dispatch Admin Reply:</strong> {t.adminReply}
                  </div>
                )}

                {/* Actions Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Call Button */}
                    {t.senderPhone && (
                      <a
                        href={`tel:${t.senderPhone}`}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#059669',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Phone size={13} />
                        <span>Call</span>
                      </a>
                    )}

                    {/* WhatsApp Button */}
                    {t.senderPhone && (
                      <a
                        href={`https://wa.me/91${t.senderPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${t.senderName}, Natural Milk Dairy Admin is contacting you regarding ticket ${t.ticketId || ''}:`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#047857',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <MessageCircle size={13} />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {/* Quick Status Toggles */}
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => handleUpdateTicket(t.ticketId || t.id, { status: 'in_progress' })}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#eff6ff',
                          color: '#1e40af',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⏳ Start Resolving
                      </button>
                    )}

                    {!isResolved && (
                      <button
                        type="button"
                        onClick={() => handleUpdateTicket(t.ticketId || t.id, { status: 'resolved' })}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#f0fdf4',
                          color: '#166534',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Mark Resolved
                      </button>
                    )}

                    {isResolved && (
                      <button
                        type="button"
                        onClick={() => handleUpdateTicket(t.ticketId || t.id, { status: 'open' })}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#fef9c3',
                          color: '#854d0e',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ↩ Reopen
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => openTicketDetail(t)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>Reply & Notes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTicket(t.ticketId || t.id)}
                      title="Delete ticket"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        background: '#fff1f2',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Reply & Resolution Modal */}
      {activeTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setActiveTicket(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Ticket {activeTicket.ticketId}
                  </h3>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: activeTicket.senderRole === 'delivery_boy' ? '#ecfdf5' : '#eff6ff',
                      color: activeTicket.senderRole === 'delivery_boy' ? '#065f46' : '#1e40af',
                    }}
                  >
                    {activeTicket.senderRole === 'delivery_boy' ? 'DRIVER' : 'CUSTOMER'}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Category: {activeTicket.category} · Priority: {activeTicket.priority?.toUpperCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Sender Summary Box */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Sender:</span>
                <strong style={{ color: '#0f172a' }}>{activeTicket.senderName} ({activeTicket.senderId || 'N/A'})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Phone:</span>
                <strong style={{ color: '#059669' }}>{activeTicket.senderPhone || 'Not provided'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Area / Locality:</span>
                <strong style={{ color: '#0f172a' }}>{activeTicket.senderArea || 'Madhapur'}</strong>
              </div>
              {activeTicket.senderAddress && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Address:</span>
                  <span style={{ color: '#334155', textAlign: 'right', maxWidth: '300px' }}>{activeTicket.senderAddress}</span>
                </div>
              )}
            </div>

            {/* Original Message */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Original Message:
              </label>
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px', fontSize: '0.86rem', color: '#0f172a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {activeTicket.message}
              </div>
            </div>

            {/* Form for Reply and Internal Notes */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateTicket(activeTicket.ticketId || activeTicket.id, {
                  adminReply: replyText,
                  adminNotes: internalNotes,
                });
              }}
            >
              {/* Admin Reply */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Admin Reply / Customer Communication:
                </label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type reply or solution provided..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Internal Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Internal Dispatch Notes (For Operations Team Only):
                </label>
                <input
                  type="text"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="e.g. Dispatched replacement at 5:40 AM with driver laddu"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Status Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => handleUpdateTicket(activeTicket.ticketId || activeTicket.id, { status: 'open', adminReply: replyText, adminNotes: internalNotes })}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #fde047',
                    background: activeTicket.status === 'open' ? '#fef08a' : '#fefce8',
                    color: '#854d0e',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🟡 Set Open
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateTicket(activeTicket.ticketId || activeTicket.id, { status: 'in_progress', adminReply: replyText, adminNotes: internalNotes })}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    background: activeTicket.status === 'in_progress' ? '#bfdbfe' : '#eff6ff',
                    color: '#1e40af',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔵 Set In-Progress
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateTicket(activeTicket.ticketId || activeTicket.id, { status: 'resolved', adminReply: replyText, adminNotes: internalNotes })}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0',
                    background: activeTicket.status === 'resolved' ? '#bbf7d0' : '#f0fdf4',
                    color: '#166534',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🟢 Mark Resolved ✓
                </button>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  {isUpdating ? 'Saving...' : 'Save Reply & Notes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
