import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../data/services/realtime_service.dart';
import '../screens/home/widgets/notification_modal.dart';
import 'launcher_service.dart';

class InAppNotificationService {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  static final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

  static StreamSubscription? _realtimeSub;
  static bool _initialized = false;
  static OverlayEntry? _activeOverlay;
  static Timer? _overlayTimer;
  static String? _lastAlertSignature;
  static int _lastAlertTime = 0;

  static void init() {
    if (_initialized) return;
    _initialized = true;

    // Trigger persistent WebSocket connection
    RealtimeService().connect();

    _realtimeSub = RealtimeService().eventStream.listen((event) {
      final type = event['type']?.toString() ?? '';
      final payload = (event['payload'] as Map<String, dynamic>?) ?? event;

      if (type == 'NOTIFICATION_CREATED' || type == 'NOTIFICATION_RECEIVED') {
        final title = payload['title']?.toString() ?? event['title']?.toString() ?? 'Natural Milk Dairy';
        final message = payload['message']?.toString() ?? event['message']?.toString() ?? 'You have a new update';
        showNotification(title: title, message: message);
      } else if (type == 'DELIVERY_COMPLETED' || type == 'DELIVERY_UPDATED') {
        final status = (payload['status'] ?? (payload['delivery'] is Map ? payload['delivery']['status'] : null))?.toString().toLowerCase();
        final isDelivered = status == 'delivered' || type == 'DELIVERY_COMPLETED';
        if (isDelivered) {
          final custName = payload['customerName']?.toString() ??
              (payload['delivery'] is Map ? payload['delivery']['customerName']?.toString() : null) ??
              'Customer';
          final title = payload['title']?.toString() ?? '🥛 Delivery Completed!';
          final msg = payload['message']?.toString() ??
              'Doorstep delivery for $custName completed successfully. Fresh milk delivered!';
          showNotification(
            title: title,
            message: msg,
          );
        }
      } else if (type == 'DELIVERY_ASSIGNED') {
        showNotification(
          title: '🚚 Route Dispatched',
          message: 'Your morning delivery route has been scheduled with your delivery partner.',
        );
      } else if (type == 'SUBSCRIPTION_ACTIVATED' || (type == 'SUBSCRIPTION_UPDATED' && payload['status'] == 'active')) {
        final title = payload['title']?.toString() ?? '🎉 Subscription Successful';
        final msg = payload['message']?.toString() ?? 'Your milk subscription has been activated successfully! Deliveries start at 5:00 AM.';
        showNotification(
          title: title,
          message: msg,
        );
      } else if (type == 'SUBSCRIPTION_EXTENDED') {
        final title = payload['title']?.toString() ?? '🎉 Subscription Extended';
        final msg = payload['message']?.toString() ?? 'Your milk subscription has been extended successfully!';
        showNotification(
          title: title,
          message: msg,
        );
      } else if (type == 'PAYMENT_RECEIVED' || type == 'PAYMENT_RECORDED' || type == 'PAYMENT_UPDATED') {
        final payment = payload['payment'] ?? event['payment'] ?? payload;
        final amount = payment is Map ? (payment['amount']?.toString() ?? '') : '';
        showNotification(
          title: '💰 Payment Recorded',
          message: amount.isNotEmpty ? 'Payment of ₹$amount received.' : 'Payment successfully recorded.',
        );
      } else if (type == 'DRIVER_DUTY_UPDATED' || type == 'DELIVERY_BOY_UPDATED') {
        final boyName = payload['name']?.toString() ?? payload['boyName']?.toString() ?? 'Partner';
        final isOnline = payload['isOnline'] == true;
        showNotification(
          title: isOnline ? '🟢 Partner On Duty' : '⏸ Partner Off Duty',
          message: '$boyName is now ${isOnline ? "active on delivery route" : "off duty"}.',
        );
      }
    });
  }

  /// Displays push notification in:
  /// 1. Android native system tray (Heads-up banner)
  /// 2. Floating in-app push-up banner sliding down from the top notch/status bar
  /// 3. Device haptics
  static void showNotification({required String title, required String message, VoidCallback? onTap}) {
    final now = DateTime.now().millisecondsSinceEpoch;
    final signature = '$title::$message';
    if (_lastAlertSignature == signature && (now - _lastAlertTime) < 2000) {
      return; // Deduplicate rapid-fire duplicate alerts within 2 seconds
    }
    _lastAlertSignature = signature;
    _lastAlertTime = now;

    // 1. Android Native Heads-Up Push Notification
    try {
      LauncherService.showNativeNotification(title: title, body: message);
    } catch (_) {}

    // 2. Strong device haptic feedback
    try {
      HapticFeedback.heavyImpact();
    } catch (_) {}

    // 3. Floating In-App Push-Up Banner Overlay (Slides down from top of screen)
    _showFloatingPushBanner(title: title, message: message, onTap: onTap);
  }

  static void _showFloatingPushBanner({
    required String title,
    required String message,
    VoidCallback? onTap,
  }) {
    final overlayState = navigatorKey.currentState?.overlay;
    if (overlayState == null) {
      _showFallbackMaterialBanner(title, message);
      return;
    }

    _overlayTimer?.cancel();
    try {
      _activeOverlay?.remove();
      _activeOverlay = null;
    } catch (_) {}

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (context) => _PushNotificationBannerWidget(
        title: title,
        message: message,
        onDismiss: () {
          try {
            entry.remove();
            if (_activeOverlay == entry) _activeOverlay = null;
          } catch (_) {}
        },
        onTap: () {
          try {
            entry.remove();
            if (_activeOverlay == entry) _activeOverlay = null;
          } catch (_) {}
          if (onTap != null) {
            onTap();
          } else {
            // Open Notification Modal on tap
            final navContext = navigatorKey.currentContext;
            if (navContext != null) {
              Navigator.of(navContext).push(
                MaterialPageRoute(builder: (_) => const NotificationModal()),
              );
            }
          }
        },
      ),
    );

    _activeOverlay = entry;
    overlayState.insert(entry);

    // Auto-dismiss floating banner after 5.5 seconds
    _overlayTimer = Timer(const Duration(milliseconds: 5500), () {
      try {
        if (_activeOverlay == entry) {
          entry.remove();
          _activeOverlay = null;
        }
      } catch (_) {}
    });
  }

  static void _showFallbackMaterialBanner(String title, String message) {
    final state = scaffoldMessengerKey.currentState;
    if (state == null) return;

    state.hideCurrentMaterialBanner();
    state.showMaterialBanner(
      MaterialBanner(
        elevation: 8,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        backgroundColor: Colors.white,
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFA7F3D0)),
          ),
          child: const Icon(Icons.notifications_active_rounded, color: Color(0xFF059669), size: 22),
        ),
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontWeight: FontWeight.w800,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              message,
              style: const TextStyle(
                color: Color(0xFF475569),
                fontWeight: FontWeight.w500,
                fontSize: 12.5,
                height: 1.3,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => state.hideCurrentMaterialBanner(),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF059669),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            child: const Text('DISMISS'),
          ),
        ],
      ),
    );

    Timer(const Duration(seconds: 5), () {
      state.hideCurrentMaterialBanner();
    });
  }

  static void dispose() {
    _overlayTimer?.cancel();
    _activeOverlay?.remove();
    _activeOverlay = null;
    _realtimeSub?.cancel();
    _initialized = false;
  }
}

/// Floating Heads-Up Banner Widget with smooth slide-down animation
class _PushNotificationBannerWidget extends StatefulWidget {
  final String title;
  final String message;
  final VoidCallback onDismiss;
  final VoidCallback onTap;

  const _PushNotificationBannerWidget({
    required this.title,
    required this.message,
    required this.onDismiss,
    required this.onTap,
  });

  @override
  State<_PushNotificationBannerWidget> createState() => _PushNotificationBannerWidgetState();
}

class _PushNotificationBannerWidgetState extends State<_PushNotificationBannerWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() async {
    await _controller.reverse();
    widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return Positioned(
      top: topPadding + 10,
      left: 14,
      right: 14,
      child: SlideTransition(
        position: _slideAnimation,
        child: Material(
          color: Colors.transparent,
          child: Dismissible(
            key: const Key('in_app_push_banner'),
            direction: DismissDirection.up,
            onDismissed: (_) => widget.onDismiss(),
            child: GestureDetector(
              onTap: widget.onTap,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2EBE5), width: 1.2),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x330C2340),
                      blurRadius: 24,
                      spreadRadius: 2,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0D5C3A), Color(0xFF059669)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x33059669),
                            blurRadius: 8,
                            offset: Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.notifications_active_rounded, color: Colors.white, size: 24),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  widget.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Color(0xFF0C2340),
                                    fontWeight: FontWeight.w900,
                                    fontSize: 14,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFA7F3D0)),
                                ),
                                child: const Text(
                                  'NOW',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF047857),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            widget.message,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF475569),
                              fontSize: 12.2,
                              height: 1.35,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _dismiss,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFFF1F5F9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF64748B)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
