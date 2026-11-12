import 'package:flutter/services.dart';

class LauncherService {
  static const MethodChannel _channel = MethodChannel('com.naturalmilk.dairy/app_launcher');

  /// Open Google Maps or navigation intent to the given lat/long or address query
  static Future<bool> openMap({num? lat, num? lng, String? address}) async {
    try {
      String url;
      if (lat != null && lng != null && lat != 0 && lng != 0) {
        url = 'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng';
      } else if (address != null && address.trim().isNotEmpty) {
        final query = Uri.encodeComponent(address.trim());
        url = 'https://www.google.com/maps/search/?api=1&query=$query';
      } else {
        return false;
      }

      final bool? res = await _channel.invokeMethod<bool>('openMap', {'url': url});
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Open phone dialer
  static Future<bool> openDialer(String phone) async {
    try {
      final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
      if (clean.isEmpty) return false;
      final bool? res = await _channel.invokeMethod<bool>('openDialer', {'phone': clean});
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Open external URL or download link (e.g. PDF statement download or browser link)
  static Future<bool> openUrl(String url) async {
    try {
      final clean = url.trim();
      if (clean.isEmpty) return false;
      final bool? res = await _channel.invokeMethod<bool>('openUrl', {'url': clean});
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Print or Save HTML Report to PDF natively via Android PrintManager
  static Future<bool> printHtml(String html, {String jobName = 'Natural_Milk_Dairy_Report'}) async {
    try {
      final bool? res = await _channel.invokeMethod<bool>('printHtml', {
        'html': html,
        'jobName': jobName,
      });
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Download HTML Report directly as a .pdf file saved into device Downloads folder
  static Future<String?> downloadPdf(String html, {required String fileName}) async {
    try {
      final String? filePath = await _channel.invokeMethod<String>('downloadPdf', {
        'html': html,
        'fileName': fileName,
      });
      return filePath;
    } catch (e) {
      return null;
    }
  }

  /// Open device camera to click doorstep delivery proof photo.
  /// Automatically asks for CAMERA runtime permission on Android.
  static Future<String?> takePhoto() async {
    try {
      final String? photoBase64 = await _channel.invokeMethod<String>('takePhoto');
      return photoBase64;
    } on PlatformException catch (e) {
      if (e.code == 'PERMISSION_DENIED') {
        throw 'Camera permission was denied. Please allow camera permission to capture delivery proof.';
      } else if (e.code == 'MissingPluginException' || e.message?.contains('No implementation') == true) {
        throw 'Native updates require full restart: Please STOP the app and press F5 / "flutter run" to rebuild with camera support.';
      }
      throw e.message ?? e.code;
    } catch (e) {
      rethrow;
    }
  }

  /// Fetch device GPS location (latitude & longitude) natively on Android.
  /// Returns null gracefully if permission is denied or location unavailable.
  static Future<Map<String, double>?> getCurrentLocation({bool requestPermission = true}) async {
    try {
      final res = await _channel.invokeMethod<dynamic>('getCurrentLocation', {
        'requestPermission': requestPermission,
      });
      if (res is Map) {
        final lat = (res['latitude'] as num?)?.toDouble();
        final lng = (res['longitude'] as num?)?.toDouble();
        if (lat != null && lng != null) {
          return {
            'latitude': lat,
            'longitude': lng,
            if (res['accuracy'] is num) 'accuracy': (res['accuracy'] as num).toDouble(),
          };
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
