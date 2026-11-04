import 'package:flutter/foundation.dart';

/// Application Network & Server Configuration
///
/// ═══════════════════════════════════════════════════════════════════
/// 🌐 SERVER ENVIRONMENT SWITCH:
/// ═══════════════════════════════════════════════════════════════════
///
/// 👉 Change this value below:
///
///    - `true`  = LIVE PRODUCTION CLOUD SERVER (Recommended & Default)
///               Connects to: https://naturalmilkdairy.speshway.site
///               WebSocket:   wss://naturalmilkdairy.speshway.site/ws
///               Works on ANY phone, ANY SIM network (Jio, Airtel, 4G/5G), and any Wi-Fi.
///
///    - `false` = LOCAL DEVELOPMENT ONLY
///               Connects to: http://192.168.1.68:5000 (or 127.0.0.1 / localhost)
///               WebSocket:   ws://192.168.1.68:5000/ws
/// ═══════════════════════════════════════════════════════════════════
class AppConfig {
  /// ⬇️ ⬇️ ⬇️ [CHANGE HERE: true OR false] ⬇️ ⬇️ ⬇️
  /// Set to `true` for Production (Any Network) or `false` for Local Testing
  static const bool useLiveServer = true;

  /// When you release the APK (flutter build apk --release / without debugging),
  /// this safety guard ensures it ALWAYS connects to the live production server,
  /// preventing accidental releases set to local IP.
  static const bool autoEnforceLiveInRelease = true;

  /// Effective active server flag
  static bool get isLiveServerActive =>
      (kReleaseMode && autoEnforceLiveInRelease) ? true : useLiveServer;

  /// Convenience aliases
  static bool get isProduction => isLiveServerActive;
  static bool get useProductionUrl => isLiveServerActive;
  static bool get isLive => isLiveServerActive;

  /// Effective active HTTP Base URL
  static String get activeBaseUrl =>
      isLiveServerActive ? liveBaseUrl : 'http://192.168.1.68:$localPort';

  /// Live Cloud Production URL (SSL/HTTPS)
  static const String liveBaseUrl = 'https://naturalmilkdairy.speshway.site';

  /// Live Cloud Production Health Endpoint
  static const String liveHealthUrl = 'https://naturalmilkdairy.speshway.site/api/health';

  /// Live Cloud Production WebSocket URL (WSS)
  static const String liveWebSocketUrl = 'wss://naturalmilkdairy.speshway.site/ws';

  /// Local development port
  static const int localPort = 5000;
}
