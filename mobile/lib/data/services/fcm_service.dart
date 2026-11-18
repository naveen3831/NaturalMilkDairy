import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../../services/in_app_notification_service.dart';
import 'api_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}
}

class FcmService {
  static final FcmService _instance = FcmService._internal();
  factory FcmService() => _instance;
  FcmService._internal();

  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  bool _initialized = false;

  /// Initialize Firebase & register FCM push notification handlers
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    try {
      await Firebase.initializeApp();

      // Register background message handler safely
      try {
        FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
      } catch (e) {
        if (kDebugMode) {
          print('FCM background handler notice: $e');
        }
      }

      final messaging = FirebaseMessaging.instance;

      // Request user permission for notifications (required on Android 13+ and iOS)
      final settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (kDebugMode) {
        print('FCM Permission Status: ${settings.authorizationStatus}');
      }

      // Set foreground notification presentation options for heads-up alert
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // Get device FCM token
      _fcmToken = await messaging.getToken();
      if (_fcmToken != null && _fcmToken!.isNotEmpty) {
        if (kDebugMode) {
          print('FCM Device Token: $_fcmToken');
        }
        await _syncTokenWithBackend(_fcmToken!);
      }

      // Listen for token refreshes
      messaging.onTokenRefresh.listen((newToken) async {
        _fcmToken = newToken;
        await _syncTokenWithBackend(newToken);
      });

      // Listen for incoming foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        final title = message.notification?.title ?? message.data['title'] ?? 'Natural Milk Dairy';
        final body = message.notification?.body ?? message.data['message'] ?? 'New notification received';
        InAppNotificationService.showNotification(title: title.toString(), message: body.toString());
      });

      // Handle notification opened app events
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        if (kDebugMode) {
          print('Notification opened app: ${message.data}');
        }
      });

      _initialized = true;
    } catch (e) {
      if (kDebugMode) {
        print('FCM Service initialization warning: $e');
      }
    }
  }

  /// Send device FCM token to backend
  Future<void> _syncTokenWithBackend(String token) async {
    try {
      await ApiService().registerFcmToken(token, platform: defaultTargetPlatform.name.toLowerCase());
    } catch (_) {}
  }

  /// Remove device token on logout
  Future<void> unregister() async {
    if (_fcmToken != null) {
      await ApiService().unregisterFcmToken(_fcmToken!);
    }
  }
}
