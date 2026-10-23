import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class AppConstants {
  static const String appName = 'Natural Milk Dairy';
  static const String appTagline = 'Pure • Fresh • Untampered';
  static const String supportPhone = '+919876543210';
  static const String supportDisplayPhone = '+91 98765 43210';
  static const String morningSlotTime = '5:00 AM – 6:30 AM';

  /// Resolves the backend base URL dynamically based on execution platform
  static String get defaultBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000';
    }
    try {
      if (Platform.isAndroid) {
        // Android Emulator maps host machine localhost to 10.0.2.2
        return 'http://10.0.2.2:5000';
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
