import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Send,
  CheckCircle2,
  ArrowLeft,
  Shield,
  Copy,
  Check,
  Zap,
  Sparkles,
  PhoneCall,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import Footer from '../components/Footer';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

export default function ContactPage({ setActiveTab }) {
  const { user, getAuthHeaders } = useAuth();
  const { subscribe: wsSubscribe } = useWebSocket();

  // Responsive mobile detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tabs: 'chat' | 'details'
  const [activeTab, setActiveContactTab] = useState('chat');

  // Contact inquiry form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    mobile: user?.mobile || user?.phone || '',
    email: user?.email || '',
    area: user?.assignedArea || user?.area || 'Andheri West',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');
  const chatBottomRef = useRef(null);

  // Admin Profile Constants
  const adminDetails = {
    name: 'Naveen Kumar',
    role: 'Operations Head & Lead System Administrator',
    company: 'Natural Milk Dairy Dispatch Center',
    phone: '+91 98765 43210',
    cleanPhone: '919876543210',
    emergencyPhone: '+91 97018 78789',
    email: 'care@naturalmilkdairy.com',
    adminEmail: 'admin@naturalmilkdairy.com',
    hubAddress: 'Plot 14, Green Valley Agro Hub, Andheri / Madhapur Hub Depot',
    timings: '5:00 AM – 9:00 PM Every Day (365 Days Active)',
    deliveryWindow: 'Early Morning 5:00 AM – 6:30 AM Doorstep Drops',
  };

  const quickChips = [
    '🥛 Morning milk drop timing inquiry',
    '⏰ Need morning delivery before 5:30 AM',
    '🚪 Please leave bottle at door handle',
    '💳 Subscription & balance payment query',
  ];

  // Scroll to bottom of chat
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Load chat history from backend
  const loadChatHistory = useCallback(async () => {
    try {
      const phoneParam = user?.mobile || user?.phone || '9876543210';
      const res = await fetch(`/api/supports/my-chats?phone=${encodeURIComponent(phoneParam)}`, {
        headers: getAuthHeaders ? getAuthHeaders() : {},
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.tickets) && data.tickets.length > 0) {
        const latest = data.tickets[0];
        setTicketId(latest.ticketId || latest.id);
        if (Array.isArray(latest.messages) && latest.messages.length > 0) {
          setChatMessages(latest.messages);
          setTimeout(() => scrollToBottom(false), 80);
          return;
        }
      }

      // Seed welcoming message if empty
      setChatMessages([
        {
          sender: 'admin',
          senderName: 'Naveen Kumar (Admin Desk)',
          text: 'Namaste! Welcome to Natural Milk Dairy direct support. I am Naveen Kumar from the dispatch desk. How may I assist your morning dairy delivery today?',
          createdAt: new Date().toISOString(),
        },
      ]);
      setTimeout(() => scrollToBottom(false), 80);
    } catch (err) {
      console.warn('Could not load chat history:', err);
    }
  }, [user, getAuthHeaders, scrollToBottom]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Subscribe to real-time WebSocket events for chat updates
  useEffect(() => {
    if (!wsSubscribe) return;

    const unsubChat = wsSubscribe('SUPPORT_CHAT_MESSAGE', (payload) => {
      if (payload && payload.message) {
        const msg = payload.message;
        setChatMessages((prev) => {
          const already = prev.some(
            (m) =>
              m.text === msg.text &&
              m.sender === msg.sender &&
              String(m.createdAt) === String(msg.createdAt)
          );
          if (already) return prev;
          return [...prev, msg];
        });
        if (payload.ticket && payload.ticket.ticketId) {
          setTicketId(payload.ticket.ticketId);
        }
        setTimeout(() => scrollToBottom(true), 60);
      }
    });

    const unsubUpdated = wsSubscribe('SUPPORT_TICKET_UPDATED', (payload) => {
      if (payload && payload.ticket) {
        loadChatHistory();
      }
    });

    return () => {
      unsubChat();
      unsubUpdated();
    };
  }, [wsSubscribe, loadChatHistory, scrollToBottom]);

  // Send chat message to admin
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || chatInput).trim();
    if (!text || isSending) return;

    const senderName = user?.name || 'Customer';
    const senderPhone = user?.mobile || user?.phone || '9876543210';
    const senderArea = user?.assignedArea || user?.area || 'Madhapur';

    // Optimistically add customer bubble
    const newMsg = {
      sender: 'customer',
      senderName,
      text,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setIsSending(true);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await fetch('/api/supports/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders ? getAuthHeaders() : {}),
        },
        body: JSON.stringify({
          ticketId,
          text,
          senderName,
          senderPhone,
          senderArea,
          senderRole: 'customer',
        }),
      });

      const data = await res.json();
      if (data.success && data.ticket) {
        setTicketId(data.ticket.ticketId);
      }
    } catch (err) {
      console.error('Failed sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2500);
    }
  };

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // Also push inquiry into chat
    if (formData.message) {
      handleSendMessage(`Sample Inquiry: ${formData.message} (Area: ${formData.area})`);
    }
  };

  // =========================================================================
  // RENDER: MOBILE FULL SCREEN EXPERIENCE
  // =========================================================================
  if (isMobile) {
    return (
      <div
        className="mobile-fullscreen-contact"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: '#f8faf8',
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          width: '100vw',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Fullscreen Mobile Header */}
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2ece3',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('home')}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #e2ece3',
                background: '#f1f7f3',
                color: '#0d5c3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label="Back to home"
            >
              <ArrowLeft size={19} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0c2340', lineHeight: 1.2 }}>
                  Natural Milk Dairy Desk
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                    Admin Online • 5 AM – 9 PM
                  </span>
                </div>
              </div>
            </div>
          </div>

          <a
            href={`tel:${adminDetails.phone}`}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#e8f5ee',
              color: '#0d5c3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              flexShrink: 0,
            }}
            title="Direct Phone Call"
          >
            <Phone size={18} />
          </a>
        </header>

        {/* Tab Switcher: Chat vs Admin Details */}
        <div style={{ background: '#ffffff', padding: '8px 16px', borderBottom: '1px solid #eef3ef', flexShrink: 0 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#f1f5f2',
              padding: '4px',
              borderRadius: '12px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveContactTab('chat')}
              style={{
                padding: '9px 12px',
                borderRadius: '9px',
                border: 'none',
                background: activeTab === 'chat' ? '#ffffff' : 'transparent',
                color: activeTab === 'chat' ? '#0d5c3a' : '#64748b',
                fontWeight: activeTab === 'chat' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: activeTab === 'chat' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <MessageSquare size={15} />
              <span>Live Chat with Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveContactTab('details')}
              style={{
                padding: '9px 12px',
                borderRadius: '9px',
                border: 'none',
                background: activeTab === 'details' ? '#ffffff' : 'transparent',
                color: activeTab === 'details' ? '#0d5c3a' : '#64748b',
                fontWeight: activeTab === 'details' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: activeTab === 'details' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <UserCheck size={15} />
              <span>Admin Details</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'chat' ? (
          // ==================== LIVE CHAT VIEW ====================
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f8faf8' }}>
            {/* Realtime 2-Way Sync Notification */}
            <div
              style={{
                background: '#e8f5ee',
                borderBottom: '1px solid #d1fae5',
                padding: '7px 16px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#0d5c3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                flexShrink: 0,
              }}
            >
              <Zap size={13} />
              <span>Live 2-Way Sync Active • Messages deliver instantly to Admin</span>
            </div>

            {/* Chat Stream */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {chatMessages.map((msg, i) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isAdmin ? 'flex-start' : 'flex-end',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        maxWidth: '85%',
                        flexDirection: isAdmin ? 'row' : 'row-reverse',
                      }}
                    >
                      {isAdmin && (
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#0d5c3a',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          <Shield size={14} />
                        </div>
                      )}

                      <div
                        style={{
                          background: isAdmin ? '#ffffff' : '#0d5c3a',
                          color: isAdmin ? '#0f172a' : '#ffffff',
                          borderRadius: isAdmin ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                          padding: '10px 14px',
                          border: isAdmin ? '1px solid #e2ece3' : 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        }}
                      >
                        {isAdmin && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              marginBottom: '3px',
                            }}
                          >
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0d5c3a' }}>
                              {msg.senderName || 'Naveen Kumar (Admin)'}
                            </span>
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                fontSize: '0.62rem',
                                fontWeight: 900,
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              ADMIN
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: '0.86rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {msg.text}
                        </div>
                        <div
                          style={{
                            fontSize: '0.65rem',
                            color: isAdmin ? '#94a3b8' : 'rgba(255,255,255,0.7)',
                            marginTop: '4px',
                            textAlign: 'right',
                          }}
                        >
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Chips */}
            <div
              style={{
                padding: '6px 16px',
                background: '#ffffff',
                borderTop: '1px solid #eef3ef',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <div
              style={{
                padding: '10px 16px 16px 16px',
                background: '#ffffff',
                borderTop: '1px solid #e2ece3',
                flexShrink: 0,
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type message to Admin Naveen Kumar..."
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSending}
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#0d5c3a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: !chatInput.trim() || isSending ? 'not-allowed' : 'pointer',
                    opacity: !chatInput.trim() || isSending ? 0.6 : 1,
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(13, 92, 58, 0.3)',
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        ) : (
          // ==================== ADMIN DETAILS VIEW ====================
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 16px 40px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Admin Profile Hero Card */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2ece3',
                borderRadius: '20px',
                padding: '22px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0d5c3a 0%, #15803d 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(13, 92, 58, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <Shield size={30} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0c2340' }}>
                      {adminDetails.name}
                    </h2>
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      CHIEF ADMIN
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#597361', fontWeight: 700, marginTop: '2px' }}>
                    {adminDetails.role}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                    {adminDetails.company}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.78rem',
                  color: '#166534',
                  fontWeight: 700,
                }}
              >
                <Sparkles size={16} />
                <span>Active on live dispatch desk right now (Response time &lt; 2 mins)</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <a
                href={`tel:${adminDetails.phone}`}
                style={{
                  background: '#0d5c3a',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  boxShadow: '0 4px 12px rgba(13, 92, 58, 0.25)',
                }}
              >
                <PhoneCall size={16} />
                <span>Call Admin</span>
              </a>

              <a
                href={`https://wa.me/${adminDetails.cleanPhone}?text=${encodeURIComponent('Hello Admin Naveen Kumar, I need support with my Natural Milk Dairy subscription.')}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                }}
              >
                <MessageSquare size={16} />
                <span>WhatsApp</span>
              </a>
            </div>

            {/* Detailed Info List */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2ece3',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Phone */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eaf5ee', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Helpline & Direct Phone</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0c2340' }}>{adminDetails.phone}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(adminDetails.phone, 'phone')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: '#475569',
                    fontWeight: 700,
                  }}
                >
                  {copiedKey === 'phone' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  <span>{copiedKey === 'phone' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{ height: '1px', background: '#f1f5f9' }} />

              {/* Email */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Operations Email</div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2340' }}>{adminDetails.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(adminDetails.email, 'email')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: '#475569',
                    fontWeight: 700,
                  }}
                >
                  {copiedKey === 'email' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  <span>{copiedKey === 'email' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{ height: '1px', background: '#f1f5f9' }} />

              {/* Hub Address */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Dispatch Hub & Depot</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0c2340', lineHeight: 1.4 }}>
                    {adminDetails.hubAddress}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: '#f1f5f9' }} />

              {/* Delivery & Shift Timings */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Helpline & Dispatch Shifts</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0c2340' }}>
                    {adminDetails.timings}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                    {adminDetails.deliveryWindow}
                  </div>
                </div>
              </div>
            </div>

            {/* Switch to Chat Button */}
            <button
              type="button"
              onClick={() => setActiveContactTab('chat')}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1.5px solid #0d5c3a',
                borderRadius: '12px',
                padding: '13px',
                color: '#0d5c3a',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <MessageSquare size={17} />
              <span>Switch to Live Chat with Admin</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: DESKTOP / RESPONSIVE WEB PAGE VIEW
  // =========================================================================
  return (
    <div className="public-contact-page" style={{ background: '#f8faf8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Organic Farm Background Banner */}
      <div
        className="public-page-hero"
        style={{
          position: 'relative',
          backgroundImage: `url(${CLOUDINARY_MEDIA.organicFarm})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          color: '#ffffff',
          padding: '80px 24px 70px 24px',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(7, 31, 19, 0.78) 0%, rgba(7, 31, 19, 0.90) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div className="public-page-hero-content" style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#86efac',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            <Phone size={15} />
            We Are Always Here For You
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)', fontWeight: 900, color: '#ffffff', marginBottom: '14px' }}>
            Contact Us & Admin Desk
          </h1>
          <p style={{ color: '#d1fae5', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto' }}>
            Connect directly with Administrator Naveen Kumar, chat in real-time, or request doorstep morning deliveries.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="public-page-content" style={{ maxWidth: '1280px', margin: '60px auto 0 auto', padding: '0 24px' }}>
        {/* Top 2-Column Section: Admin Details & Live Real-Time Chat */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '32px',
            marginBottom: '60px',
          }}
        >
          {/* Column 1: Admin & Operations Profile Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '36px',
              border: '1.5px solid #e2ece3',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ color: '#0d5c3a', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Chief Administrator
                </span>
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.72rem', fontWeight: 900, padding: '2px 8px', borderRadius: '4px' }}>
                  ONLINE
                </span>
              </div>

              <h2 style={{ fontSize: '2.1rem', color: '#0c2340', fontWeight: 900, margin: '4px 0 10px 0' }}>
                {adminDetails.name}
              </h2>
              <div style={{ color: '#597361', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                {adminDetails.role}
              </div>
              <p style={{ color: '#64748b', fontSize: '0.94rem', lineHeight: 1.5, marginBottom: '28px' }}>
                Oversees farm collection, chilled van logistics, and 365-day morning doorstep deliveries across Mumbai & Hyderabad.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eaf5ee', color: '#0d5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Helpline & Direct Phone</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0c2340' }}>{adminDetails.phone}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Official Email</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0c2340' }}>{adminDetails.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Dispatch Hub & Depot</div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0c2340' }}>
                      {adminDetails.hubAddress}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Helpline & Delivery Timings</div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0c2340' }}>
                      {adminDetails.timings}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a
                href={`tel:${adminDetails.phone}`}
                style={{
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  padding: '13px 24px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)',
                }}
              >
                <Phone size={18} />
                <span>Call Admin Directly</span>
              </a>

              <a
                href={`https://wa.me/${adminDetails.cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  padding: '13px 24px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.25)',
                }}
              >
                <MessageSquare size={18} />
                <span>WhatsApp Admin</span>
              </a>
            </div>
          </div>

          {/* Column 2: Live Real-Time 2-Way Chat with Admin */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1.5px solid #e2ece3',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '560px',
            }}
          >
            {/* Chat Card Header */}
            <div
              style={{
                padding: '16px 20px',
                background: '#0d5c3a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>Live Chat with Admin Desk</div>
                  <div style={{ fontSize: '0.74rem', color: '#bbf7d0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                    WebSocket 2-Way Instant Sync
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.76rem', background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                Admin Naveen
              </span>
            </div>

            {/* Chat Messages List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#f8faf8',
              }}
            >
              {chatMessages.map((msg, idx) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isAdmin ? 'flex-start' : 'flex-end',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '82%',
                        background: isAdmin ? '#ffffff' : '#0d5c3a',
                        color: isAdmin ? '#0f172a' : '#ffffff',
                        border: isAdmin ? '1px solid #e2ece3' : 'none',
                        borderRadius: isAdmin ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                        padding: '10px 14px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      {isAdmin && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0d5c3a' }}>
                            {msg.senderName || 'Naveen Kumar (Admin)'}
                          </span>
                          <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.62rem', fontWeight: 900, padding: '1px 5px', borderRadius: '3px' }}>
                            ADMIN
                          </span>
                        </div>
                      )}
                      <div style={{ fontSize: '0.86rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: '0.64rem', color: isAdmin ? '#94a3b8' : 'rgba(255,255,255,0.7)', marginTop: '4px', textAlign: 'right' }}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Chips */}
            <div style={{ padding: '6px 16px', background: '#ffffff', borderTop: '1px solid #eef3ef', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {quickChips.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{
                padding: '12px 16px',
                background: '#ffffff',
                borderTop: '1px solid #e2ece3',
                display: 'flex',
                gap: '8px',
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message to admin..."
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSending}
                style={{
                  background: '#0d5c3a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0 20px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: !chatInput.trim() || isSending ? 'not-allowed' : 'pointer',
                  opacity: !chatInput.trim() || isSending ? 0.6 : 1,
                }}
              >
                <Send size={16} />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Section: Sample Request Form */}
        <div
          className="public-contact-form"
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '36px',
            border: '1.5px solid #e2ece3',
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            maxWidth: '780px',
            margin: '0 auto',
          }}
        >
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <CheckCircle2 size={38} />
              </div>
              <h3 style={{ fontSize: '1.5rem', color: '#0c2340', fontWeight: 800, marginBottom: '8px' }}>
                Thank You, {formData.name}!
              </h3>
              <p style={{ color: '#597361', lineHeight: 1.6, marginBottom: '24px' }}>
                Your inquiry has been received. Our local delivery route coordinator will get in touch with you at <strong>{formData.mobile}</strong> within 30 minutes.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                style={{
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 700,
                  padding: '10px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit}>
              <h3 style={{ fontSize: '1.4rem', color: '#0c2340', fontWeight: 800, marginBottom: '6px' }}>
                Request a Free Sample Bottle / Callback
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#597361', marginBottom: '24px' }}>
                Fill in your details below and we will assign your area delivery boy to bring a free milk sample bottle tomorrow morning.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="public-contact-form-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Delivery Area
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Andheri West">Andheri West</option>
                    <option value="Andheri East">Andheri East</option>
                    <option value="Bandra">Bandra</option>
                    <option value="Juhu">Juhu</option>
                    <option value="Goregaon">Goregaon</option>
                    <option value="Madhapur">Madhapur, Hyderabad</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Message or Special Delivery Request
                </label>
                <textarea
                  rows={3}
                  placeholder="Please mention your apartment name or preferred delivery time..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <button
                type="submit"
                className="dairy-btn-hover"
                style={{
                  width: '100%',
                  background: '#0d5c3a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  padding: '14px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(13, 92, 58, 0.25)',
                }}
              >
                <Send size={18} />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>

        {/* Visit Our Organic Dairy Farm Banner */}
        <div
          className="public-feature-banner public-contact-farm-banner"
          style={{
            marginTop: '70px',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
            position: 'relative',
            height: '360px',
            marginBottom: '70px',
          }}
        >
          <img
            src={CLOUDINARY_MEDIA.cowsPasture}
            alt="Visit Our Organic Dairy Pastures in Karjat"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            className="public-contact-farm-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(7, 31, 19, 0.9) 0%, rgba(7, 31, 19, 0.5) 60%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 44px',
            }}
          >
            <div className="public-contact-farm-content" style={{ maxWidth: '580px', color: '#ffffff' }}>
              <span style={{ color: '#E5B842', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Open Farm Policy
              </span>
              <h3 className="public-contact-farm-title" style={{ fontSize: '2.2rem', fontWeight: 900, marginTop: '6px', marginBottom: '12px', lineHeight: 1.2 }}>
                Visit Our Cows & Pastures in Person
              </h3>
              <p style={{ color: '#e2fdf0', fontSize: '1rem', lineHeight: 1.6, marginBottom: '22px' }}>
                We believe in 100% transparency. Families and kids are welcome to visit our Karjat & Nashik dairy pastures on weekends. See how our cattle live, graze, and get milked without human touch.
              </p>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <a
                  href={`tel:${adminDetails.phone}`}
                  style={{
                    background: '#E5B842',
                    color: '#071629',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Phone size={16} />
                  <span>Call to Schedule a Weekend Farm Tour</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
