import 'dart:async';
import 'package:flutter/material.dart';
import '../../../data/services/api_service.dart';
import '../../../data/services/realtime_service.dart';

class NotificationModal extends StatefulWidget {
  final Function(String date, String? proofUrl, String? driverName)? onViewProof;
  final VoidCallback? onNotificationChanged;
  final VoidCallback? onOpenDeliveries;

  const NotificationModal({
    super.key,
    this.onViewProof,
    this.onNotificationChanged,
    this.onOpenDeliveries,
  });

  @override
  State<NotificationModal> createState() => _NotificationModalState();
}

class _NotificationModalState extends State<NotificationModal> {
  final ApiService _api = ApiService();
  String _activeTab = 'all'; // 'all', 'unread', 'deliveries'

  StreamSubscription? _realtimeSub;

  // Track marked-read notification IDs locally so server sync never reverts them
  final Set<String> _readIds = {};

  // Realtime notification list from server
  List<Map<String, dynamic>> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchServerNotifications();

    // Subscribe to real-time events for instant live updates across all dashboards
    _realtimeSub = RealtimeService().eventStream.listen((event) {
      final type = event['type']?.toString();
      if (type == 'NOTIFICATION_DELETED') {
        final delId = event['id']?.toString() ?? event['payload']?['id']?.toString();
        if (delId != null && delId.isNotEmpty && mounted) {
          setState(() {
            _notifications.removeWhere((n) => n['id'] == delId || n['_id'] == delId);
            _readIds.remove(delId);
          });
          widget.onNotificationChanged?.call();
        }
        _fetchServerNotifications();
      } else if (type == 'NOTIFICATIONS_CLEARED') {
        if (mounted) {
          setState(() {
            _notifications.clear();
            _readIds.clear();
          });
          widget.onNotificationChanged?.call();
        }
        _fetchServerNotifications();
      } else if (type == 'NOTIFICATION_CREATED' ||
          type == 'NOTIFICATION_UPDATED' ||
          type == 'DELIVERY_UPDATED' ||
          type == 'DELIVERY_COMPLETED' ||
          type == 'STATUS_CHANGED' ||
          type == 'ORDER_UPDATED' ||
          type == 'SUBSCRIPTION_UPDATED') {
        _fetchServerNotifications();
      }
    });
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    super.dispose();
  }

  Future<void> _fetchServerNotifications() async {
    try {
      final res = await _api.get('/api/notifications');
      if (res['success'] == true && res['notifications'] is List && mounted) {
        final serverList = res['notifications'] as List;
        setState(() {
          _notifications = serverList.map((item) {
            final type = item['type']?.toString() ?? 'system';
            final isDispatch = type == 'delivery_assigned';
            final isDelivered = type == 'delivery_completed';
            final notifId = item['_id']?.toString() ?? item['id']?.toString() ?? '';
            final isMarkedReadLocally = _readIds.contains(notifId);

            return {
              'id': notifId,
              '_id': notifId,
              'type': type,
              'tag': isDispatch ? 'DISPATCH' : (isDelivered ? 'DELIVERED' : 'ALERT'),
              'tagColor': isDispatch
                  ? const Color(0xFF1D4ED8)
                  : (isDelivered ? const Color(0xFF047857) : const Color(0xFF065F46)),
              'tagBg': isDispatch
                  ? const Color(0xFFDBEAFE)
                  : (isDelivered ? const Color(0xFFD1FAE5) : const Color(0xFFECFDF5)),
              'icon': isDispatch
                  ? Icons.local_shipping_outlined
                  : (isDelivered ? Icons.check_circle_outline_rounded : Icons.notifications_active_rounded),
              'iconColor': isDispatch
                  ? const Color(0xFF2563EB)
                  : (isDelivered ? const Color(0xFF059669) : const Color(0xFF0D5C3A)),
              'iconBg': isDispatch
                  ? const Color(0xFFEFF6FF)
                  : (isDelivered ? const Color(0xFFECFDF5) : const Color(0xFFE8F5EE)),
              'title': item['title']?.toString() ?? 'Delivery Notification',
              'body': item['message']?.toString() ?? '',
              'time': _formatRelativeTime(item['createdAt']?.toString()),
              'isRead': isMarkedReadLocally || item['isRead'] == true,
              'date': item['data']?['date']?.toString() ?? 'Today',
              'proofUrl': item['data']?['proofUrl']?.toString() ?? item['proofUrl']?.toString(),
              'driverName': item['data']?['driverName']?.toString() ?? 'Naveen Kumar',
            };
          }).toList();
          _isLoading = false;
        });
        widget.onNotificationChanged?.call();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatRelativeTime(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'Just now';
    try {
      final dt = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays == 1) return 'Yesterday';
      return '${diff.inDays}d ago';
    } catch (_) {
      return 'Just now';
    }
  }

  int get _unreadCount => _notifications.where((n) => n['isRead'] == false).length;

  List<Map<String, dynamic>> get _filteredNotifications {
    return _notifications.where((n) {
      if (_activeTab == 'unread') return n['isRead'] != true;
      if (_activeTab == 'deliveries') {
        return n['type'] == 'delivery_assigned' || n['type'] == 'delivery_completed';
      }
      return true;
    }).toList();
  }

  void _markAllAsRead() {
    setState(() {
      for (final n in _notifications) {
        n['isRead'] = true;
        final nId = n['id']?.toString() ?? '';
        if (nId.isNotEmpty) _readIds.add(nId);
      }
    });
    widget.onNotificationChanged?.call();
    try {
      _api.put('/api/notifications/read-all', {});
    } catch (_) {}
  }

  void _clearAll() {
    setState(() {
      _notifications.clear();
      _readIds.clear();
    });
    widget.onNotificationChanged?.call();
    try {
      _api.delete('/api/notifications/clear-all');
    } catch (_) {}
  }

  void _deleteNotification(String id) {
    setState(() {
      _notifications.removeWhere((n) => n['id'] == id || n['_id'] == id);
      _readIds.remove(id);
    });
    widget.onNotificationChanged?.call();
    try {
      _api.delete('/api/notifications/$id');
    } catch (_) {}
  }

  void _markSingleRead(String id, [Map<String, dynamic>? directItem]) {
    setState(() {
      if (id.isNotEmpty) _readIds.add(id);
      if (directItem != null) {
        directItem['isRead'] = true;
      }
      for (final n in _notifications) {
        final nId = n['id']?.toString() ?? '';
        final isMatch = (id.isNotEmpty && nId == id) ||
            (directItem != null && identical(n, directItem)) ||
            (directItem != null &&
                n['title'] == directItem['title'] &&
                n['body'] == directItem['body']);
        if (isMatch) {
          n['isRead'] = true;
          if (nId.isNotEmpty) _readIds.add(nId);
        }
      }
    });
    widget.onNotificationChanged?.call();
    if (id.isNotEmpty && !id.startsWith('notif-')) {
      try {
        _api.put('/api/notifications/$id/read', {});
      } catch (_) {}
    }
  }

  // Open Full Details of Notification (or Exact Delivery Update if it's a delivery notification)
  void _openNotificationDetails(Map<String, dynamic> item) {
    final String id = item['id']?.toString() ?? '';
    // 1. Immediately mark read synchronously so unread badge and card highlight update without lag
    _markSingleRead(id, item);

    final String type = item['type']?.toString() ?? '';
    final String tag = item['tag']?.toString() ?? 'ALERT';
    final bool isDispatch = type == 'delivery_assigned' || tag == 'DISPATCH';
    final bool isDelivered = type == 'delivery_completed' || tag == 'DELIVERED';
    final bool isDelivery = isDispatch || isDelivered || item['driverName'] != null || item['proofUrl'] != null;

    final Color tagColor = item['tagColor'] as Color? ??
        (isDispatch
            ? const Color(0xFF1D4ED8)
            : (isDelivered ? const Color(0xFF047857) : const Color(0xFF0D5C3A)));
    final Color tagBg = item['tagBg'] as Color? ??
        (isDispatch
            ? const Color(0xFFDBEAFE)
            : (isDelivered ? const Color(0xFFD1FAE5) : const Color(0xFFDCFCE7)));
    final IconData icon = item['icon'] as IconData? ??
        (isDispatch
            ? Icons.local_shipping_outlined
            : (isDelivered ? Icons.check_circle_outline_rounded : Icons.notifications_active_rounded));

    final String title = item['title'] as String? ?? (isDelivery ? 'Delivery Update' : 'Notification Details');
    final String body = item['body'] as String? ?? '';
    final String time = item['time'] as String? ?? 'Just now';
    final String date = item['date']?.toString() ?? 'Today';
    final String? proofUrl = item['proofUrl']?.toString();
    final String driverName = item['driverName']?.toString() ?? 'Naveen Kumar';

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
              onPressed: () => Navigator.pop(ctx),
            ),
            title: Text(
              isDelivery ? 'Delivery Details' : 'Notification Details',
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444)),
                tooltip: 'Delete Notification',
                onPressed: () {
                  Navigator.pop(ctx);
                  _deleteNotification(id);
                },
              ),
            ],
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(color: const Color(0xFFF1F5F9), height: 1),
            ),
          ),
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Tag Badge + Time Strip
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: tagBg,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(icon, size: 14, color: tagColor),
                                  const SizedBox(width: 6),
                                  Text(
                                    isDelivery ? (isDispatch ? 'OUT FOR DELIVERY' : 'DELIVERED TO DOORSTEP') : tag,
                                    style: TextStyle(
                                      color: tagColor,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                const Icon(Icons.access_time_rounded, size: 13, color: Color(0xFF94A3B8)),
                                const SizedBox(width: 4),
                                Text(
                                  time,
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // Main Title
                        Text(
                      title,
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Message Banner
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: isDelivery ? (isDispatch ? const Color(0xFFF0F7FF) : const Color(0xFFF4FBF7)) : const Color(0xFFF8FAF9),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDelivery ? (isDispatch ? const Color(0xFFBFDBFE) : const Color(0xFFBBF7D0)) : const Color(0xFFE2ECE5),
                        ),
                      ),
                      child: Text(
                        body,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFF334155),
                          height: 1.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),

                    // ================= EXACT DELIVERY DROP DETAILS & LIVE TRACKER =================
                    if (isDelivery) ...[
                      const SizedBox(height: 18),

                      // Live 4-Step Delivery Progress Tracker
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.02),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.route_rounded, size: 17, color: Color(0xFF059669)),
                                    SizedBox(width: 6),
                                    Text(
                                      'Live Delivery Tracker',
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isDispatch ? const Color(0xFFDBEAFE) : const Color(0xFFD1FAE5),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    isDispatch ? 'IN TRANSIT' : 'COMPLETED',
                                    style: TextStyle(
                                      color: isDispatch ? const Color(0xFF1D4ED8) : const Color(0xFF047857),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            // Tracker Steps
                            _buildTrackerStep(
                              title: 'Order Confirmed & Scheduled',
                              subtitle: 'Farm fresh morning batch reserved',
                              isDone: true,
                              isActive: false,
                              isLast: false,
                            ),
                            _buildTrackerStep(
                              title: 'Chilled & Bottled at 3.8°C',
                              subtitle: 'Cold-chain verified & packed at depot',
                              isDone: true,
                              isActive: false,
                              isLast: false,
                            ),
                            _buildTrackerStep(
                              title: 'Out for Doorstep Delivery',
                              subtitle: 'With delivery partner $driverName',
                              isDone: isDelivered,
                              isActive: isDispatch,
                              isLast: false,
                            ),
                            _buildTrackerStep(
                              title: isDelivered ? 'Doorstep Drop Completed' : 'Doorstep Drop Pending',
                              subtitle: isDelivered ? 'Placed safely in your doorstep bag' : 'Estimated between 5:00 AM – 6:30 AM',
                              isDone: isDelivered,
                              isActive: false,
                              isLast: true,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Exact Drop Info Grid Card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            _buildDeliveryInfoRow(
                              Icons.calendar_today_rounded,
                              const Color(0xFF0284C7),
                              'Delivery Date',
                              date,
                            ),
                            const Divider(height: 16, color: Color(0xFFE2E8F0)),
                            _buildDeliveryInfoRow(
                              Icons.access_time_rounded,
                              const Color(0xFFD97706),
                              'Delivery Slot',
                              'Morning Shift (5:00 AM – 6:30 AM)',
                            ),
                            const Divider(height: 16, color: Color(0xFFE2E8F0)),
                            _buildDeliveryInfoRow(
                              Icons.local_drink_rounded,
                              const Color(0xFF059669),
                              'Package',
                              '1.5L Farm Fresh Cow Milk (Glass Bottle)',
                            ),
                            const Divider(height: 16, color: Color(0xFFE2E8F0)),
                            _buildDeliveryInfoRow(
                              Icons.location_on_rounded,
                              const Color(0xFFDC2626),
                              'Drop Point',
                              'Customer Doorstep Bag • Madhapur',
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Assigned Delivery Partner Contact Card
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFBBF7D0)),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF059669).withValues(alpha: 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: const Icon(Icons.delivery_dining_rounded, color: Color(0xFF059669), size: 24),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    driverName,
                                    style: const TextStyle(
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  const Text(
                                    'Assigned Dairy Partner • TS 09 EA 4812',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Contacting $driverName at +91 98765 43210...'),
                                    duration: const Duration(seconds: 2),
                                    backgroundColor: const Color(0xFF0D5C3A),
                                  ),
                                );
                              },
                              icon: const Icon(Icons.call_rounded, size: 14, color: Colors.white),
                              label: const Text('Call', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF059669),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 0,
                                minimumSize: Size.zero,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Photo Proof Section
                      if (proofUrl != null && proofUrl.isNotEmpty) ...[
                        const SizedBox(height: 18),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.verified_rounded, size: 17, color: Color(0xFF059669)),
                                SizedBox(width: 6),
                                Text(
                                  'Doorstep Delivery Photo Proof',
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDCFCE7),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text('Verified Drop', style: TextStyle(color: Color(0xFF15803D), fontSize: 10, fontWeight: FontWeight.w800)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            height: 180,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Image.network(
                              proofUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Container(
                                color: const Color(0xFFF1F5F9),
                                child: const Center(
                                  child: Text('Doorstep photo on verified delivery record', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.fullscreen_rounded, size: 18, color: Color(0xFF059669)),
                            label: const Text('View Fullscreen Photo Proof', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w800)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFF059669)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () {
                              Navigator.pop(ctx);
                              if (widget.onViewProof != null) {
                                widget.onViewProof!(date, proofUrl, driverName);
                              }
                            },
                          ),
                        ),
                      ] else if (isDispatch) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.camera_alt_outlined, color: Color(0xFF2563EB), size: 18),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Doorstep photo proof will be captured by $driverName immediately upon delivery.',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF1E40AF), fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      // Direct Redirection Button: View All Verified Deliveries
                      if (widget.onOpenDeliveries != null) ...[
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.history_rounded, size: 17, color: Color(0xFF0D5C3A)),
                            label: const Text('View All Verified Delivery Records', style: TextStyle(color: Color(0xFF0D5C3A), fontWeight: FontWeight.w800, fontSize: 13)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFE8F5EE),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            onPressed: () {
                              Navigator.pop(ctx);
                              widget.onOpenDeliveries!();
                            },
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),

                // Bottom Action Bar Redirecting directly
                Container(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        if (isDelivery && widget.onOpenDeliveries != null) {
                          Navigator.pop(ctx);
                          widget.onOpenDeliveries!();
                        } else {
                          Navigator.pop(ctx);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0D5C3A),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text(
                        isDelivery ? 'Go to Delivery Details' : 'Back to Notifications',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTrackerStep({
    required String title,
    required String subtitle,
    required bool isDone,
    required bool isActive,
    required bool isLast,
  }) {
    final Color circleColor = isDone
        ? const Color(0xFF059669)
        : (isActive ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1));

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: circleColor,
                shape: BoxShape.circle,
                boxShadow: isActive
                    ? [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Center(
                child: isDone
                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                    : (isActive
                        ? const Icon(Icons.local_shipping, size: 12, color: Colors.white)
                        : Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                          )),
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 28,
                color: isDone ? const Color(0xFF059669) : const Color(0xFFE2E8F0),
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isDone || isActive ? FontWeight.w800 : FontWeight.w600,
                    color: isDone || isActive ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11.5,
                    color: isActive ? const Color(0xFF2563EB) : const Color(0xFF64748B),
                    fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
                if (!isLast) const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDeliveryInfoRow(IconData icon, Color iconColor, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: iconColor),
        const SizedBox(width: 10),
        Text(
          '$label: ',
          style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
        ),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontSize: 12.5, color: Color(0xFF0F172A), fontWeight: FontWeight.w800),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredNotifications;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // 1. TOP HEADER (No top-right cross symbol)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Back Button on left
                  InkWell(
                    onTap: () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: const Icon(Icons.arrow_back_rounded, size: 20, color: Color(0xFF0F172A)),
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Green Rounded Square with Bell Icon & Red Dot
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: const Color(0xFF059669),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF059669).withValues(alpha: 0.25),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        const Center(
                          child: Icon(Icons.notifications_none_rounded, color: Colors.white, size: 22),
                        ),
                        if (_unreadCount > 0)
                          Positioned(
                            top: 7,
                            right: 8,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Color(0xFFEF4444),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Title + Unread Badge + Subtitle
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'Notifications',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                                letterSpacing: -0.2,
                              ),
                            ),
                            const SizedBox(width: 6),
                            if (_unreadCount > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDCFCE7),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '• $_unreadCount unread',
                                  style: const TextStyle(
                                    color: Color(0xFF15803D),
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Doorstep deliveries, fresh batch & alerts',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // 2. FILTER PILLS ROW (Updates removed: All, Unread, Deliveries only)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildTabPill('all', 'All', _notifications.length),
                    const SizedBox(width: 8),
                    _buildTabPill('unread', 'Unread', _unreadCount),
                    const SizedBox(width: 8),
                    _buildTabPill(
                      'deliveries',
                      'Deliveries',
                      _notifications
                          .where((n) => n['type'] == 'delivery_assigned' || n['type'] == 'delivery_completed')
                          .length,
                    ),
                  ],
                ),
              ),
            ),

            // 3. ACTION BAR (Only shown when notifications are available)
            if (list.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                child: Row(
                  mainAxisAlignment: _unreadCount > 0 ? MainAxisAlignment.spaceBetween : MainAxisAlignment.end,
                  children: [
                    if (_unreadCount > 0)
                      InkWell(
                        onTap: _markAllAsRead,
                        borderRadius: BorderRadius.circular(6),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                          child: Row(
                            children: [
                              Icon(Icons.check_rounded, size: 15, color: Color(0xFF059669)),
                              SizedBox(width: 5),
                              Text(
                                'Mark all read',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF059669),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    InkWell(
                      onTap: _clearAll,
                      borderRadius: BorderRadius.circular(6),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline_rounded, size: 15, color: Color(0xFF64748B)),
                            SizedBox(width: 5),
                            Text(
                              'Clear all',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // 4. NOTIFICATIONS CARDS LIST
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: Color(0xFF0D5C3A)),
                    )
                  : list.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(18),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Icon(Icons.notifications_off_outlined, size: 40, color: Color(0xFF94A3B8)),
                              ),
                              const SizedBox(height: 14),
                              const Text(
                                'No Notifications Found',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'You are all caught up with your deliveries and alerts.',
                                style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(18, 4, 18, 20),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (ctx, i) {
                        final item = list[i];
                        final notifId = item['id']?.toString() ?? 'notif-$i';
                        return Dismissible(
                          key: Key(notifId),
                          direction: DismissDirection.endToStart, // Swipe left to delete
                          background: Container(
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.only(right: 20),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Text(
                                  'Delete',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13.5,
                                  ),
                                ),
                                SizedBox(width: 8),
                                Icon(Icons.delete_outline_rounded, color: Colors.white, size: 22),
                              ],
                            ),
                          ),
                          onDismissed: (direction) {
                            _deleteNotification(notifId);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Notification deleted'),
                                duration: Duration(seconds: 2),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                          child: _buildNotificationCard(item),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabPill(String tabKey, String label, int count) {
    final bool isSelected = _activeTab == tabKey;

    return InkWell(
      onTap: () => setState(() => _activeTab = tabKey),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF1F5F9) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFFCBD5E1) : Colors.transparent,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF64748B),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  count.toString(),
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w900,
                    color: isSelected ? const Color(0xFF15803D) : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // Entire notification card is clickable to open full details; "View details" and cross symbol removed
  Widget _buildNotificationCard(Map<String, dynamic> item) {
    final String tag = item['tag'] as String;
    final Color tagColor = item['tagColor'] as Color;
    final Color tagBg = item['tagBg'] as Color;
    final IconData icon = item['icon'] as IconData;
    final Color iconColor = item['iconColor'] as Color;
    final Color iconBg = item['iconBg'] as Color;
    final String title = item['title'] as String;
    final String body = item['body'] as String;
    final String time = item['time'] as String;
    final bool isRead = item['isRead'] == true;

    return Container(
      decoration: BoxDecoration(
        color: isRead ? Colors.white : const Color(0xFFFAFCFA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isRead ? const Color(0xFFE2E8F0) : const Color(0xFFBBF7D0),
          width: isRead ? 1.0 : 1.3,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _openNotificationDetails(item),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Left Tinted Icon Box
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: iconBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, size: 20, color: iconColor),
                ),
                const SizedBox(width: 12),

                // Main Card Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top Row: Status Badge + Relative Timestamp
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Status Badge (DISPATCH / DELIVERED)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                decoration: BoxDecoration(
                                  color: tagBg,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  tag,
                                  style: TextStyle(
                                    color: tagColor,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),
                              if (!isRead) ...[
                                const SizedBox(width: 5),
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ],
                          ),

                          // Timestamp
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.access_time_rounded, size: 12, color: Color(0xFF94A3B8)),
                              const SizedBox(width: 3),
                              Text(
                                time,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Title
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isRead ? FontWeight.w700 : FontWeight.w900,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 4),

                      // Body text
                      Text(
                        body,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF475569),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
