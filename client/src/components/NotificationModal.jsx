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
} from 'lucide-react';

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
        item.type === 'route_update'
      );
    }
    if (activeTab === 'system') {
      return item.type === 'system' || !item.type;
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
          border: '#bfdbfe',
          tag: 'DISPATCH',
          tagColor: '#1d4ed8',
          tagBg: '#dbeafe',
        };
      case 'delivery_completed':
        return {
          icon: <CheckCircle2 size={17} color="#059669" />,
          bg: '#ecfdf5',
          border: '#a7f3d0',
          tag: 'DELIVERED',
          tagColor: '#047857',
          tagBg: '#d1fae5',
        };
      case 'delivery_missed':
        return {
          icon: <AlertCircle size={17} color="#dc2626" />,
          bg: '#fef2f2',
          border: '#fecaca',
          tag: 'ALERT',
          tagColor: '#b91c1c',
          tagBg: '#fee2e2',
        };
      case 'route_update':
        return {
          icon: <Package size={17} color="#7c3aed" />,
          bg: '#f5f3ff',
          border: '#ddd6fe',
          tag: 'ROUTE PLAN',
          tagColor: '#6d28d9',
          tagBg: '#ede9fe',
        };
      case 'system':
      default:
        return {
          icon: <Sparkles size={17} color="#059669" />,
          bg: '#f0fdf4',
          border: '#bbf7d0',
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

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsNotificationOpen(false)}
              aria-label="Close notification panel"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <X size={17} />
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
              { id: 'system', label: 'Updates' },
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

          {/* Quick Header Actions */}
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

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
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
                title="Clear all notifications"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Notification Cards Feed */}
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
                <div
                  key={item.id}
                  className="nmd-notification-card"
                  onClick={() => isUnread && markAsRead(item.id)}
                  style={{
                    padding: '14px 15px',
                    borderRadius: '13px',
                    background: isUnread
                      ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
                      : '#ffffff',
                    border: isUnread ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    borderLeft: isUnread ? '3.5px solid #059669' : '1px solid #e2e8f0',
                    boxShadow: isUnread
                      ? '0 2px 8px rgba(5, 150, 105, 0.06)'
                      : '0 1px 3px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    gap: '12px',
                    cursor: isUnread ? 'pointer' : 'default',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.06)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = isUnread
                      ? '0 2px 8px rgba(5, 150, 105, 0.06)'
                      : '0 1px 3px rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Category Type Icon Box */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
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
                    {/* Top Meta Strip: Category Tag + Relative Time */}
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

                    {/* Notification Description */}
                    <p
                      style={{
                        fontSize: '0.78rem',
                        color: isUnread ? '#334155' : '#64748b',
                        margin: '4px 0 0 0',
                        lineHeight: 1.45,
                      }}
                    >
                      {item.message}
                    </p>

                    {/* Action Bar for Card */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '1px dashed #f1f5f9',
                      }}
                    >
                      {isUnread ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(item.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#059669',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 0',
                          }}
                        >
                          <Check size={12} strokeWidth={3} />
                          <span>Tap to mark read</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Read</span>
                      )}

                      {/* Single Dismiss Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (deleteNotification) {
                            deleteNotification(item.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#cbd5e1',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.68rem',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.background = '#fef2f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#cbd5e1';
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Dismiss notification"
                      >
                        <X size={12} />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Professional Drawer Footer */}
        <div
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

        @media (max-width: 480px) {
          .nmd-notification-drawer {
            width: 100vw !important;
          }
        }
      `}</style>
    </>
  );
}
