import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../data/services/realtime_service.dart';

class InAppNotificationService {
  static final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

  static StreamSubscription? _realtimeSub;
  static bool _initialized = false;

  static void init() {
    if (_initialized) return;
    _initialized = true;

    _realtimeSub = RealtimeService().eventStream.listen((event) {
      final type = event['type']?.toString() ?? '';
      final payload = (event['payload'] as Map<String, dynamic>?) ?? event;

      if (type == 'NOTIFICATION_CREATED' || type == 'NOTIFICATION_RECEIVED') {
        final title = payload['title']?.toString() ?? event['title']?.toString() ?? 'Natural Milk Dairy';
        final message = payload['message']?.toString() ?? event['message']?.toString() ?? 'You have a new update';
        showNotification(title: title, message: message);
      } else if (type == 'DELIVERY_COMPLETED') {
        final delivery = payload['delivery'] ?? event['delivery'] ?? payload;
        final custName = delivery is Map ? (delivery['customerName']?.toString() ?? 'Customer') : 'Customer';
        showNotification(
          title: '✅ Delivery Completed',
          message: 'Delivery successfully completed for $custName',
        );
      } else if (type == 'DELIVERY_ASSIGNED') {
        showNotification(
          title: '📦 Route Assigned',
          message: 'Your morning delivery route has been updated by dispatch.',
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

  static const MethodChannel _nativeChannel = MethodChannel('com.naturalmilk.dairy/app_launcher');

  static void showNotification({required String title, required String message}) {
    // 1. Trigger System Push-Up Heads-Up Notification in Android Tray
    try {
      _nativeChannel.invokeMethod('showNativeNotification', {
        'title': title,
        'body': message,
      });
    } catch (_) {}

    try {
      HapticFeedback.mediumImpact();
    } catch (_) {}

    final state = scaffoldMessengerKey.currentState;
    if (state == null) return;

    state.hideCurrentMaterialBanner();
    state.showMaterialBanner(
      MaterialBanner(
        elevation: 6,
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
            onPressed: () {
              state.hideCurrentMaterialBanner();
            },
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF059669),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            child: const Text('DISMISS'),
          ),
        ],
      ),
    );

    // Auto-dismiss banner after 5 seconds
    Timer(const Duration(seconds: 5), () {
      state.hideCurrentMaterialBanner();
    });
  }

  static void dispose() {
    _realtimeSub?.cancel();
    _initialized = false;
  }
}
