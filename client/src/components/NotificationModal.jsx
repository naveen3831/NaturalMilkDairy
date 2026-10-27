import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  BellOff,
  X,
  CheckCheck,
  Check,
  Trash2,
  Truck,
  CheckCircle2,
  AlertCircle,
  Package,
  Clock,
  Sparkles,
  ShieldCheck,
  Radio,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  Headphones,
  User,
  Phone,
  MapPin,
} from 'lucide-react';

function SwipeableNotificationCard({ item, meta, isUnread, getRelativeTime, onSelect, onDelete }) {
  const [startX, setStartX] = useState(null);
  const [currentX, setCurrentX] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const diffX = startX !== null && currentX !== null ? currentX - startX : 0;
  // Swipe to left: negative translateX capped at -120px
  const translateX = Math.max(-120, Math.min(0, diffX));

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (diffX < -70) {
      // Swiped left sufficiently to delete
      setIsDeleting(true);
      setTimeout(() => {
        onDelete(item.id || item._id);
      }, 200);
    } else {
      setStartX(null);
      setCurrentX(null);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '13px',
        overflow: 'hidden',
        transition: 'opacity 0.2s ease, max-height 0.25s ease, margin 0.25s ease',
        opacity: isDeleting ? 0 : 1,
        maxHeight: isDeleting ? '0px' : '220px',
        marginBottom: isDeleting ? '0px' : '10px',
      }}
    >
      {/* Red Delete Background Revealed on Swipe Left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '18px',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.8rem',
          gap: '6px',
          borderRadius: '13px',
        }}
      >
        <span>Delete</span>
        <Trash2 size={16} />
      </div>

      {/* Card Content (Slides Left on Touch Drag) */}
      <div
        className="nmd-notification-card"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (Math.abs(diffX) < 10 && !isDeleting) {
            onSelect(item);
          }
        }}
        style={{
          padding: '14px 15px',
          borderRadius: '13px',
          background: isUnread ? '#fbfdfc' : '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          gap: '12px',
          cursor: 'pointer',
          position: 'relative',
          transform: isDeleting ? 'translateX(-100%)' : `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          if (!isSwiping && diffX === 0) {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSwiping && diffX === 0) {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }
        }}
      >
        {/* Category Type Icon Box */}
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: meta.bg,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '1px',
          }}
        >
          {meta.icon}
        </div>

        {/* Body Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top Meta Strip: Category Tag + Relative Time + Direct Delete Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              marginBottom: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: meta.tagColor,
                  background: meta.tagBg,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {meta.tag}
              </span>
              {isUnread && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#059669',
                    display: 'inline-block',
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#94a3b8',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                <Clock size={11} />
                <span>{getRelativeTime(item.createdAt)}</span>
              </div>

              {/* Direct Desktop / Tap Delete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id || item._id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="Delete notification"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Card Title */}
          <h4
            style={{
              fontSize: '0.86rem',
              fontWeight: isUnread ? 800 : 700,
              color: isUnread ? '#0f172a' : '#334155',
              margin: 0,
              lineHeight: 1.35,
            }}
          >
            {item.title}
          </h4>

          {/* Notification Description Preview */}
          <p
            style={{
              fontSize: '0.78rem',
              color: isUnread ? '#334155' : '#64748b',
              margin: '4px 0 0 0',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.message}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NotificationModal() {
  const {
    notifications,
    unreadCount,
    isNotificationOpen,
    setIsNotificationOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    currentRole,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Reset selected notification when drawer closes
  useEffect(() => {
    if (!isNotificationOpen) {
      setSelectedNotification(null);
    }
  }, [isNotificationOpen]);

  // Handle ESC key to close drawer & lock body scroll
  useEffect(() => {
    if (!isNotificationOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsNotificationOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isNotificationOpen, setIsNotificationOpen]);

  if (!isNotificationOpen) return null;

  // Filter notifications based on tab
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.isRead;
    if (activeTab === 'deliveries') {
      return (
        item.type === 'delivery_assigned' ||
        item.type === 'delivery_completed' ||
        item.type === 'delivery_missed' ||
        item.type === 'route_update' ||
        item.type === 'subscription_created' ||
        item.type === 'partner_message' ||
        item.type === 'customer_message' ||
        item.type === 'ticket'
      );
    }
    return true;
  });

  // Relative time helper
  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    const diffMs = Date.now() - new Date(dateString).getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Get icon & tag styling by notification type
  const getTypeMeta = (type) => {
    switch (type) {
      case 'delivery_assigned':
        return {
          icon: <Truck size={17} color="#2563eb" />,
          bg: '#eff6ff',
          border: '#e2e8f0',
          tag: 'DISPATCH',
          tagColor: '#1d4ed8',
          tagBg: '#dbeafe',
        };
      case 'subscription_created':
        return {
          icon: <Sparkles size={17} color="#d97706" />,
          bg: '#fffbeb',
          border: '#e2e8f0',
          tag: 'SUBSCRIPTION',
          tagColor: '#b45309',
          tagBg: '#fef3c7',
        };
      case 'delivery_completed':
        return {
          icon: <CheckCircle2 size={17} color="#059669" />,
          bg: '#ecfdf5',
          border: '#e2e8f0',
          tag: 'DELIVERED',
          tagColor: '#047857',
          tagBg: '#d1fae5',
        };
      case 'delivery_missed':
        return {
          icon: <AlertCircle size={17} color="#dc2626" />,
          bg: '#fef2f2',
          border: '#e2e8f0',
          tag: 'ALERT',
          tagColor: '#b91c1c',
          tagBg: '#fee2e2',
        };
      case 'route_update':
        return {
          icon: <Package size={17} color="#7c3aed" />,
          bg: '#f5f3ff',
          border: '#e2e8f0',
          tag: 'ROUTE PLAN',
          tagColor: '#6d28d9',
          tagBg: '#ede9fe',
        };
      case 'partner_message':
        return {
          icon: <AlertCircle size={17} color="#059669" />,
          bg: '#ecfdf5',
          border: '#e2e8f0',
          tag: 'DRIVER MESSAGE',
          tagColor: '#065f46',
          tagBg: '#d1fae5',
        };
      case 'customer_message':
      case 'ticket':
        return {
          icon: <Headphones size={17} color="#0284c7" />,
          bg: '#f0f9ff',
          border: '#e2e8f0',
          tag: 'CUSTOMER MESSAGE',
          tagColor: '#0369a1',
          tagBg: '#e0f2fe',
        };
      case 'system':
      default:
        return {
          icon: <Sparkles size={17} color="#059669" />,
          bg: '#f0fdf4',
          border: '#e2e8f0',
          tag: 'UPDATE',
          tagColor: '#065f46',
          tagBg: '#ecfdf5',
        };
    }
  };

  const getRoleDescription = () => {
    if (currentRole === 'admin') {
      return 'Live operations, driver routes & dispatch logs';
    }
    if (currentRole === 'delivery_boy') {
      return 'Morning shifts, customer stops & delivery alerts';
    }
    return 'Doorstep deliveries, fresh batch & subscription alerts';
  };

  return (
    <>
      {/* Drawer Overlay Backdrop */}
      <div
        className="nmd-notification-backdrop"
        onClick={() => setIsNotificationOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          zIndex: 99998,
          animation: 'nmdFadeInBackdrop 0.22s ease-out forwards',
        }}
      />

      {/* Slide-over Side Drawer (Anchored to Right Edge) */}
      <aside
        className="nmd-notification-drawer"
        role="dialog"
        aria-label="Notification Center"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '450px',
          maxWidth: '100vw',
          height: '100vh',
          background: '#ffffff',
          boxShadow: '-12px 0 40px rgba(15, 23, 42, 0.16), -2px 0 10px rgba(15, 23, 42, 0.05)',
          borderLeft: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 99999,
          animation: 'nmdSlideInFromRight 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Brand Accent Bar */}
        <div
          style={{
            height: '3.5px',
            background: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)',
            width: '100%',
            flexShrink: 0,
          }}
        />

        {/* Drawer Header */}
        <div
          style={{
            padding: '18px 22px 14px 22px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.28)',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      border: '2px solid #ffffff',
                    }}
                  />
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2
                    style={{
                      fontSize: '1.18rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: 0,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Notifications
                  </h2>
                  {unreadCount > 0 ? (
                    <span
                      style={{
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: '#059669',
                        }}
                      />
                      {unreadCount} unread
                    </span>
                  ) : (
                    <span
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#64748b',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '999px',
                      }}
                    >
                      Caught up
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: '0.76rem',
                    color: '#64748b',
                    margin: '3px 0 0 0',
                    lineHeight: 1.35,
                  }}
                >
                  {getRoleDescription()}
                </p>
              </div>
            </div>

            {/* Header Close Button (Accessible across mobile and desktop) */}
            <button
              type="button"
              onClick={() => setIsNotificationOpen(false)}
              aria-label="Close notification panel"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.borderColor = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Bulk Actions */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {/* Segmented Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '9px',
            }}
          >
            {[
              { id: 'all', label: 'All', count: notifications.length },
              { id: 'unread', label: 'Unread', count: unreadCount },
              { id: 'deliveries', label: 'Deliveries' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: isActive ? 700 : 600,
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#059669' : '#64748b',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '999px',
                        background: isActive ? '#ecfdf5' : '#e2e8f0',
                        color: isActive ? '#059669' : '#64748b',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Header Actions (Only shown when notifications are available) */}
          {filteredNotifications.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#059669',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#ecfdf5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  title="Mark all notifications as read"
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  clearAllNotifications();
                  setSelectedNotification(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
                title="Delete all notifications"
              >
                <Trash2 size={13} />
                <span>Clear all</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body: Either Single Notification Detail View or Cards Feed */}
        {selectedNotification ? (
          /* ================= Notification Detail View ================= */
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Detail View Top Toolbar */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fafafa',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <ArrowLeft size={14} />
                <span>Back to list</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (deleteNotification) {
                    deleteNotification(selectedNotification.id);
                  }
                  setSelectedNotification(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#fff1f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#dc2626',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff1f2')}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>

            {/* Detail Content Body */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              {(() => {
                const meta = getTypeMeta(selectedNotification.type);
                const isDelivery =
                  selectedNotification.type === 'delivery_assigned' ||
                  selectedNotification.type === 'delivery_completed' ||
                  selectedNotification.type === 'delivery_missed' ||
                  selectedNotification.type === 'route_update' ||
                  Boolean(selectedNotification.data?.driverName || selectedNotification.data?.partnerName || selectedNotification.data?.proofUrl || selectedNotification.proofUrl);
                const isDispatch = selectedNotification.type === 'delivery_assigned';
                const isDelivered = selectedNotification.type === 'delivery_completed';
                const driverName = selectedNotification.data?.partnerName || selectedNotification.data?.driverName || 'Naveen Kumar';
                const deliveryDate = selectedNotification.data?.date || new Date(selectedNotification.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const proofUrl = selectedNotification.data?.proofUrl || selectedNotification.proofUrl;

                return (
                  <>
                    {/* Category Tag + Full Timestamp */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          color: isDelivery ? (isDispatch ? '#1d4ed8' : '#047857') : meta.tagColor,
                          background: isDelivery ? (isDispatch ? '#dbeafe' : '#d1fae5') : meta.tagBg,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {isDelivery ? (isDispatch ? <Truck size={14} color="#1d4ed8" /> : <CheckCircle2 size={14} color="#047857" />) : meta.icon}
                        {isDelivery ? (isDispatch ? 'OUT FOR DELIVERY' : 'DELIVERED TO DOORSTEP') : meta.tag}
                      </span>

                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(selectedNotification.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.35 }}>
                      {selectedNotification.title}
                    </h3>

                    {/* Full Message Box */}
                    <div
                      style={{
                        background: isDelivery ? (isDispatch ? '#f0f7ff' : '#f4fbf7') : '#f8fafc',
                        border: `1px solid ${isDelivery ? (isDispatch ? '#bfdbfe' : '#bbf7d0') : '#e2e8f0'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        fontSize: '0.88rem',
                        color: '#1e293b',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {selectedNotification.message}
                    </div>

                    {/* EXACT DELIVERY DROP DETAILS & LIVE TRACKER */}
                    {isDelivery && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* 4-Step Progress Tracker */}
                        <div
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                              <Truck size={16} color="#059669" />
                              <span>Live Delivery Progress Tracker</span>
                            </div>
                            <span
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                background: isDispatch ? '#dbeafe' : '#d1fae5',
                                color: isDispatch ? '#1d4ed8' : '#047857',
                                padding: '2px 7px',
                                borderRadius: '4px',
                              }}
                            >
                              {isDispatch ? 'IN TRANSIT' : 'COMPLETED'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                              { title: 'Order Confirmed & Scheduled', sub: 'Farm fresh morning batch reserved', done: true, active: false },
                              { title: 'Chilled & Bottled at 3.8°C', sub: 'Cold-chain verified & packed at depot', done: true, active: false },
                              { title: `Out for Doorstep Delivery`, sub: `With delivery partner ${driverName}`, done: isDelivered, active: isDispatch },
                              { title: isDelivered ? 'Doorstep Drop Completed' : 'Doorstep Drop Pending', sub: isDelivered ? 'Placed safely in your doorstep bag' : 'Estimated morning shift delivery (5:00 AM - 6:30 AM)', done: isDelivered, active: false },
                            ].map((step, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: step.done ? '#059669' : (step.active ? '#2563eb' : '#cbd5e1'),
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                  }}
                                >
                                  {step.done ? <Check size={12} strokeWidth={3} /> : (step.active ? <Truck size={11} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />)}
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: step.done || step.active ? 800 : 600, color: step.done || step.active ? '#0f172a' : '#94a3b8' }}>
                                    {step.title}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: step.active ? '#2563eb' : '#64748b' }}>
                                    {step.sub}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery Drop Specifications */}
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '14px 16px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Delivery Date</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{deliveryDate}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Delivery Slot</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>5:00 AM – 6:30 AM</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Package</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>1.5L Farm Fresh Cow Milk</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Drop Point</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Customer Doorstep Bag</span>
                          </div>
                        </div>

                        {/* Assigned Delivery Partner Contact */}
                        <div
                          style={{
                            background: '#ffffff',
                            border: '1px solid #bbf7d0',
                            borderRadius: '14px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <User size={18} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{driverName}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Assigned Dairy Partner • TS 09 EA 4812</div>
                            </div>
                          </div>

                          <a
                            href="tel:+919876543210"
                            style={{
                              background: '#059669',
                              color: '#ffffff',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Phone size={12} />
                            <span>Call</span>
                          </a>
                        </div>

                        {/* Direct Redirect to Delivery History */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsNotificationOpen(false);
                            if (window.location.pathname.startsWith('/customer')) {
                              window.location.href = '/customer?tab=deliveries';
                            } else {
                              window.location.href = '/customer-portal';
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            background: '#e8f5ee',
                            border: '1px solid #a7f3d0',
                            color: '#0d5c3a',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#d1fae5')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#e8f5ee')}
                        >
                          <Truck size={14} />
                          <span>View Full Delivery Drop Records</span>
                        </button>
                      </div>
                    )}

                    {/* Verified Doorstep Photo Proof (if available) */}
                    {proofUrl && (
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '14px',
                          padding: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#166534' }}>
                            <CheckCircle2 size={16} />
                            <span>Verified Doorstep Delivery Photo Proof</span>
                          </div>
                          <span style={{ fontSize: '0.66rem', fontWeight: 900, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>
                            VERIFIED
                          </span>
                        </div>
                        <img
                          src={proofUrl}
                          alt="Doorstep Photo Proof"
                          style={{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                          }}
                        />
                      </div>
                    )}

                    {/* Extra Metadata (if available) */}
                    {selectedNotification.data && Object.keys(selectedNotification.data).filter((k) => k !== 'originalType' && k !== 'partnerName' && k !== 'driverName' && k !== 'proofUrl' && k !== 'date').length > 0 && (
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Event Information
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                          {selectedNotification.data.customerName && (
                            <div>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Customer</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{selectedNotification.data.customerName}</span>
                            </div>
                          )}
                          {(selectedNotification.data.customerPhone || selectedNotification.data.phone) && (
                            <div>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Phone</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                                {selectedNotification.data.customerPhone || selectedNotification.data.phone}
                              </span>
                            </div>
                          )}
                          {(selectedNotification.data.customerArea || selectedNotification.data.area) && (
                            <div>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Area / Route</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                                {selectedNotification.data.customerArea || selectedNotification.data.area}
                              </span>
                            </div>
                          )}
                          {selectedNotification.data.category && (
                            <div>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Category</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{selectedNotification.data.category}</span>
                            </div>
                          )}
                          {selectedNotification.data.priority && (
                            <div>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Priority</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{selectedNotification.data.priority}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bottom Back Button */}
                    <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedNotification(null)}
                        style={{
                          width: '100%',
                          padding: '11px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      >
                        ← Return to All Notifications
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          /* ================= Scrollable Notification Cards Feed ================= */
          <div
            className="nmd-notification-list"
            style={{
              padding: '16px 20px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: '#ffffff',
            }}
          >
            {filteredNotifications.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 24px',
                  textAlign: 'center',
                  margin: 'auto 0',
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
                    marginBottom: '14px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  <BellOff size={24} />
                </div>
                <h3
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: '#1e293b',
                    margin: '0 0 6px 0',
                  }}
                >
                  {activeTab === 'unread' ? 'All Caught Up!' : 'No Notifications'}
                </h3>
                <p
                  style={{
                    fontSize: '0.78rem',
                    color: '#64748b',
                    margin: 0,
                    maxWidth: '280px',
                    lineHeight: 1.45,
                  }}
                >
                  {activeTab === 'unread'
                    ? 'You have read all incoming alerts. Any new deliveries or updates will appear here.'
                    : 'There are no active notifications in this category right now.'}
                </p>
                {activeTab !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    style={{
                      marginTop: '16px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#059669',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ecfdf5';
                      e.currentTarget.style.borderColor = '#a7f3d0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    View All Notifications
                  </button>
                )}
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const meta = getTypeMeta(item.type);
                const isUnread = !item.isRead;

                return (
                  <SwipeableNotificationCard
                    key={item.id || item._id}
                    item={item}
                    meta={meta}
                    isUnread={isUnread}
                    getRelativeTime={getRelativeTime}
                    onSelect={(selected) => {
                      markAsRead(selected.id || selected._id);
                      setSelectedNotification({ ...selected, isRead: true });
                    }}
                    onDelete={(id) => {
                      deleteNotification(id);
                    }}
                  />
                );
              })
            )}
          </div>
        )}

        {/* Professional Drawer Footer (Hidden on mobile response) */}
        <div
          className="nmd-notification-footer"
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: '#64748b',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                display: 'inline-block',
              }}
            />
            <span style={{ fontWeight: 600, color: '#334155' }}>Live Real-Time Sync</span>
          </div>

          <button
            type="button"
            onClick={() => setIsNotificationOpen(false)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            Close
          </button>
        </div>
      </aside>

      {/* Global Embedded Styles for Animations & Scrollbar */}
      <style>{`
        @keyframes nmdFadeInBackdrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes nmdSlideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0.9;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .nmd-notification-list::-webkit-scrollbar {
          width: 5px;
        }

        .nmd-notification-list::-webkit-scrollbar-track {
          background: #f8fafc;
        }

        .nmd-notification-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }

        .nmd-notification-list::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        @media (max-width: 768px) {
          .nmd-notification-drawer {
            width: 100vw !important;
          }
          .nmd-notification-footer {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
