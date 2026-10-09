import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Truck,
  CheckCircle2,
  AlertCircle,
  Package,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function NotificationModal() {
  const {
    notifications,
    unreadCount,
    isNotificationOpen,
    setIsNotificationOpen,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    currentRole,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');

  if (!isNotificationOpen) return null;

  // Filter notifications based on tab
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.isRead;
    if (activeTab === 'deliveries') {
      return (
        item.type === 'delivery_assigned' ||
        item.type === 'delivery_completed' ||
        item.type === 'delivery_missed' ||
        item.type === 'route_update'
      );
    }
    return true;
  });

  // Relative time helper
  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Get icon by notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'delivery_assigned':
        return <Package size={18} color="#059669" />;
      case 'delivery_completed':
        return <CheckCircle2 size={18} color="#059669" />;
      case 'delivery_missed':
        return <AlertCircle size={18} color="#dc2626" />;
      case 'route_update':
        return <Truck size={18} color="#2563eb" />;
      default:
        return <Bell size={18} color="#059669" />;
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={() => setIsNotificationOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-content driver-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'slideUpMobile 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(90deg, #f0fdf4 0%, #ecfdf5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#059669',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: '#e11d48',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '12px',
                    }}
                  >
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0 0' }}>
                {currentRole === 'admin' ? 'Live updates for dairy owner & dispatch' : 'Live updates for delivery partner'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsNotificationOpen(false)}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter Tabs & Quick Actions */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {[
              { id: 'all', label: `All (${notifications.length})` },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'deliveries', label: 'Deliveries' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: activeTab === t.id ? 700 : 500,
                  background: activeTab === t.id ? '#ffffff' : 'transparent',
                  color: activeTab === t.id ? '#059669' : '#64748b',
                  boxShadow: activeTab === t.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#059669',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 6px',
                }}
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span>Mark read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '4px 6px',
                }}
                title="Clear all notifications"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div
          style={{
            padding: '12px 16px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#f8fafc',
                  color: '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px',
                }}
              >
                <Bell size={22} />
              </div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>
                No notifications found
              </h4>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>
                {activeTab === 'unread' ? 'All notifications have been read!' : 'You are all caught up with recent updates.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => !item.isRead && markAsRead(item.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: item.isRead ? '#ffffff' : '#f0fdf4',
                  border: `1px solid ${item.isRead ? '#e2e8f0' : '#bbf7d0'}`,
                  display: 'flex',
                  gap: '12px',
                  cursor: item.isRead ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    background: item.isRead ? '#f1f5f9' : '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getNotificationIcon(item.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <h4
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: item.isRead ? 700 : 800,
                        color: item.isRead ? '#334155' : '#0f172a',
                        margin: 0,
                      }}
                    >
                      {item.title}
                    </h4>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {getRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: item.isRead ? '#64748b' : '#334155',
                      margin: '4px 0 0 0',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.message}
                  </p>

                  {!item.isRead && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#059669',
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                        Tap to mark as read
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: '#64748b',
          }}
        >
          <span>Natural Milk Dairy Dispatch Network</span>
          <button
            type="button"
            onClick={() => setIsNotificationOpen(false)}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
