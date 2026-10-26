import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class AppConstants {
  static const String appName = 'Natural Milk Dairy';
  static const String appTagline = 'Pure • Fresh • Untampered';
  static const String supportPhone = '+919876543210';
  static const String supportDisplayPhone = '+91 98765 43210';
  static const String morningSlotTime = '5:00 AM – 6:30 AM';

  /// Candidate backend URLs tested automatically by ApiService
  static List<String> get candidateBaseUrls => const [
        'http://127.0.0.1:5000', // USB reverse port forwarding (physical phone)
        'http://192.168.1.68:5000', // Wi-Fi local network IP (physical phone)
        'http://10.0.2.2:5000', // Android Emulator loopback
        'http://localhost:5000', // Desktop & Web
      ];

  /// Resolves the default backend base URL dynamically
  static String get defaultBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000';
    }
    try {
      if (Platform.isAndroid) {
        // 127.0.0.1:5000 works on physical Android phones with adb reverse
        return 'http://127.0.0.1:5000';
      }
    } catch (_) {}
    return 'http://localhost:5000';
  }

  // Local storage keys
  static const String keyAuthToken = 'nmd_auth_token';
  static const String keyUserData = 'nmd_user_data';
  static const String keyOnboardingSeen = 'nmd_onboarding_seen';
  static const String keyCustomBaseUrl = 'nmd_custom_base_url';
}
