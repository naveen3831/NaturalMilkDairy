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
}
