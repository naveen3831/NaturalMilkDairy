import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_constants.dart';
import '../models/user_model.dart';
import '../models/product_model.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _cachedToken;
  String? _customBaseUrl;
  String? _activeBaseUrl;
  final http.Client _client = http.Client();

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString(AppConstants.keyAuthToken);
    if (AppConfig.isLiveServerActive) {
      _activeBaseUrl = AppConfig.liveBaseUrl;
      debugPrint('🌐 ApiService: [LIVE PRODUCTION MODE] Locked to: ${AppConfig.liveBaseUrl}');
    } else {
      _customBaseUrl = prefs.getString(AppConstants.keyCustomBaseUrl);
      await resolveActiveBaseUrl();
    }
  }

  String get baseUrl {
    if (AppConfig.isLiveServerActive) {
      return AppConfig.liveBaseUrl;
    }
    return _customBaseUrl ??
        _activeBaseUrl ??
        AppConstants.defaultBaseUrl;
  }

  /// Quick ping to check if a backend server is live and responding
  Future<bool> testConnection([String? candidateUrl]) async {
    final target = (candidateUrl ?? baseUrl).trim();
    if (target.isEmpty) return false;
    try {
      final res = await http
          .get(Uri.parse('$target/api/health'))
          .timeout(const Duration(milliseconds: 8000));
      return res.statusCode >= 200 && res.statusCode < 400;
    } catch (_) {
      return false;
    }
  }

  /// Probes candidate URLs or binds the production server depending on connectivity
  Future<String> resolveActiveBaseUrl() async {
    if (AppConfig.isLiveServerActive) {
      _activeBaseUrl = AppConfig.liveBaseUrl;
      return AppConfig.liveBaseUrl;
    }

    // 1. If custom developer URL was saved in shared preferences, check that first
    if (_customBaseUrl != null && _customBaseUrl!.isNotEmpty) {
      final ok = await testConnection(_customBaseUrl);
      if (ok) {
        _activeBaseUrl = _customBaseUrl;
        debugPrint('🌐 ApiService: Using custom base URL: $_customBaseUrl');
        return _customBaseUrl!;
      }
    }

    // 2. Scan all candidate local development backend addresses
    for (final url in AppConstants.candidateBaseUrls) {
      final isAlive = await testConnection(url);
      if (isAlive) {
        _activeBaseUrl = url;
        debugPrint('🌐 ApiService: Auto-detected active local backend at: $url');
        return url;
      }
    }

    // 3. Fallback when local candidates were unreachable
    _activeBaseUrl = AppConstants.defaultBaseUrl;
    debugPrint('🌐 ApiService: Active backend URL: $_activeBaseUrl');
    return _activeBaseUrl!;
  }

  Future<void> setCustomBaseUrl(String url) async {
    _customBaseUrl = url.trim();
    _activeBaseUrl = _customBaseUrl;
    final prefs = await SharedPreferences.getInstance();
    if (_customBaseUrl != null && _customBaseUrl!.isNotEmpty) {
      await prefs.setString(AppConstants.keyCustomBaseUrl, _customBaseUrl!);
    } else {
      await prefs.remove(AppConstants.keyCustomBaseUrl);
    }
  }

  String? get token => _cachedToken;

  /// Generate full PDF report URL for customer / partner / admin
  String getReportPdfUrl({
    required String role, // 'customer', 'partner', 'admin'
    String period = 'monthly', // 'weekly', 'monthly', 'all', 'custom'
    String? customerId,
    String? partnerId,
    String? startDate,
    String? endDate,
  }) {
    final queryParams = <String, String>{
      'period': period,
    };
    if (_cachedToken != null && _cachedToken!.isNotEmpty) {
      queryParams['token'] = _cachedToken!;
    }
    if (customerId != null && customerId.isNotEmpty) {
      queryParams['customerId'] = customerId;
    }
    if (partnerId != null && partnerId.isNotEmpty) {
      queryParams['partnerId'] = partnerId;
    }
    if (startDate != null && startDate.isNotEmpty) {
      queryParams['startDate'] = startDate;
    }
    if (endDate != null && endDate.isNotEmpty) {
      queryParams['endDate'] = endDate;
    }

    final cleanBase = baseUrl.replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.parse('$cleanBase/api/reports/$role/pdf').replace(
      queryParameters: queryParams,
    );
    return uri.toString();
  }

  Future<void> setToken(String? token) async {
    _cachedToken = token;
    final prefs = await SharedPreferences.getInstance();
    if (token != null) {
      await prefs.setString(AppConstants.keyAuthToken, token);
    } else {
      await prefs.remove(AppConstants.keyAuthToken);
      await prefs.remove(AppConstants.keyUserData);
    }
  }

  Map<String, String> _getHeaders({bool requiresAuth = true}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requiresAuth && _cachedToken != null && _cachedToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_cachedToken';
    }
    return headers;
  }

  String _cleanErrorMessage(dynamic e) {
    final str = e.toString();
    if (str.contains('SocketException') ||
        str.contains('Connection refused') ||
        str.contains('ClientException') ||
        str.contains('Failed host lookup')) {
      return 'Unable to reach dairy server at $baseUrl. Please verify your connection.';
    }
    if (str.contains('TimeoutException')) {
      return 'Server response timed out. Please check your network and try again.';
    }
    return str;
  }

  /// Automatically switch to another responding candidate backend if current one dropped
  Future<bool> _trySwitchToWorkingBackend() async {
    for (final candidate in AppConstants.candidateBaseUrls) {
      if (candidate != _activeBaseUrl && await testConnection(candidate)) {
        _activeBaseUrl = candidate;
        debugPrint('🌐 ApiService: Switched active backend to: $candidate');
        return true;
      }
    }
    // Also try live server if local candidates are not responding
    if (await testConnection(AppConfig.liveBaseUrl)) {
      _activeBaseUrl = AppConfig.liveBaseUrl;
      debugPrint('🌐 ApiService: Switched active backend to live server: ${AppConfig.liveBaseUrl}');
      return true;
    }
    return false;
  }

  /// Generic GET request with auto authentication and fallback retry
  Future<Map<String, dynamic>> get(String endpoint, [bool retry = true]) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await _client
          .get(url, headers: _getHeaders(requiresAuth: true))
          .timeout(const Duration(seconds: 25));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService GET error on $url: $e');
      if (retry) {
        final switched = await _trySwitchToWorkingBackend();
        if (switched) {
          return get(endpoint, false);
        }
      }
      return {'success': false, 'message': _cleanErrorMessage(e)};
    }
  }

  /// Generic POST request with auto authentication and fallback retry
  Future<Map<String, dynamic>> post(String endpoint, [Map<String, dynamic>? body, bool retry = true]) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await _client
          .post(
            url,
            headers: _getHeaders(requiresAuth: true),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 45));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService POST error on $url: $e');
      if (retry) {
        final switched = await _trySwitchToWorkingBackend();
        if (switched) {
          return post(endpoint, body, false);
        }
      }
      return {'success': false, 'message': _cleanErrorMessage(e)};
    }
  }

  /// Generic PUT request with auto authentication and fallback retry
  Future<Map<String, dynamic>> put(String endpoint, [Map<String, dynamic>? body, bool retry = true]) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await _client
          .put(
            url,
            headers: _getHeaders(requiresAuth: true),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 25));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService PUT error on $url: $e');
      if (retry) {
        final switched = await _trySwitchToWorkingBackend();
        if (switched) {
          return put(endpoint, body, false);
        }
      }
      return {'success': false, 'message': _cleanErrorMessage(e)};
    }
  }

  /// Generic DELETE request with auto authentication and fallback retry
  Future<Map<String, dynamic>> delete(String endpoint, [bool retry = true]) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await _client
          .delete(url, headers: _getHeaders(requiresAuth: true))
          .timeout(const Duration(seconds: 20));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService DELETE error on $url: $e');
      if (retry) {
        final switched = await _trySwitchToWorkingBackend();
        if (switched) {
          return delete(endpoint, false);
        }
      }
      return {'success': false, 'message': _cleanErrorMessage(e)};
    }
  }

  /// 1. Login user
  Future<Map<String, dynamic>> login({
    required String identifier,
    required String password,
    bool retryIfFailed = true,
  }) async {
    final url = Uri.parse('$baseUrl/api/auth/login');
    try {
      final response = await http
          .post(
            url,
            headers: _getHeaders(requiresAuth: false),
            body: jsonEncode({
              'identifier': identifier.trim(),
              'password': password,
            }),
          )
          .timeout(const Duration(seconds: 25));

      final data = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (data['success'] == true) {
          final token = data['token']?.toString();
          if (token != null) {
            await setToken(token);
          }
          final userJson = data['user'] as Map<String, dynamic>?;
          if (userJson != null) {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString(AppConstants.keyUserData, jsonEncode(userJson));
          }
        }
        return data;
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Login failed. Please check your credentials.',
        };
      }
    } catch (e) {
      debugPrint('ApiService login error on $baseUrl: $e');
      if (retryIfFailed) {
        for (final candidate in AppConstants.candidateBaseUrls) {
          if (candidate != baseUrl && await testConnection(candidate)) {
            _activeBaseUrl = candidate;
            debugPrint('Switching baseUrl to active candidate: $candidate');
            return login(identifier: identifier, password: password, retryIfFailed: false);
          }
        }
      }
      return {
        'success': false,
        'message': 'Cannot reach server at $baseUrl. Ensure server is running on port 5000.',
      };
    }
  }

  /// Check if an email already exists in the system
  Future<Map<String, dynamic>> checkEmail(String email) async {
    final cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.isEmpty) return {'success': false, 'exists': false};
    try {
      final url = Uri.parse('$baseUrl/api/auth/check-email');
      final response = await http
          .post(
            url,
            headers: _getHeaders(requiresAuth: false),
            body: jsonEncode({'email': cleanEmail}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic>) return data;
      }
    } catch (_) {}
    return {'success': false, 'exists': false};
  }

  Map<String, dynamic> _decodeIdTokenPayload(String token) {
    try {
      final parts = token.split('.');
      if (parts.length >= 2) {
        final norm = base64Url.normalize(parts[1]);
        final decoded = utf8.decode(base64Url.decode(norm));
        final data = jsonDecode(decoded);
        if (data is Map<String, dynamic>) return data;
      }
    } catch (_) {}
    return {};
  }

  /// Login via Google / Firebase ID token
  Future<Map<String, dynamic>> loginWithGoogle({
    required String idToken,
    String portal = 'customer',
    String? email,
    String? name,
    String? mobile,
    String? password,
    bool retryIfFailed = true,
  }) async {
    if (!AppConfig.isLiveServerActive && retryIfFailed) {
      await resolveActiveBaseUrl();
    }
    final url = Uri.parse('$baseUrl/api/auth/google');
    try {
      final payload = <String, dynamic>{
        'idToken': idToken,
        'portal': portal,
      };
      if (email != null && email.trim().isNotEmpty) {
        payload['email'] = email.trim();
      }
      if (name != null && name.trim().isNotEmpty) {
        payload['name'] = name.trim();
      }
      if (mobile != null && mobile.trim().isNotEmpty) {
        payload['mobile'] = mobile.trim();
      }
      if (password != null && password.trim().isNotEmpty) {
        payload['password'] = password.trim();
      }

      final response = await http
          .post(
            url,
            headers: _getHeaders(requiresAuth: false),
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 25));

      Map<String, dynamic> data = {};
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          data = decoded;
        }
      } catch (_) {}

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (data['success'] == true && data['requiresMobile'] != true && data['requiresProfileCompletion'] != true) {
          final t = data['token']?.toString();
          if (t != null) {
            await setToken(t);
          }
          final userJson = data['user'] as Map<String, dynamic>?;
          if (userJson != null) {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString(AppConstants.keyUserData, jsonEncode(userJson));
          }
        }
        return data;
      } else if (response.statusCode == 404) {
        // Fallback when remote backend does not have /api/auth/google mounted yet:
        final tokenPayload = _decodeIdTokenPayload(idToken);
        final resolvedEmail = (email != null && email.trim().isNotEmpty)
            ? email.trim()
            : (tokenPayload['email']?.toString() ?? '');
        final resolvedName = (name != null && name.trim().isNotEmpty)
            ? name.trim()
            : (tokenPayload['name']?.toString() ?? tokenPayload['displayName']?.toString() ?? 'Customer');

        final cleanMobile = mobile?.trim().replaceAll(RegExp(r'\D'), '');
        final cleanPassword = password?.trim();

        if (cleanMobile != null && cleanMobile.length == 10 && cleanPassword != null && cleanPassword.isNotEmpty) {
          // Both mobile and password provided -> complete registration or login via active endpoints
          final regRes = await register({
            'name': resolvedName,
            'email': resolvedEmail.isNotEmpty ? resolvedEmail : 'user_$cleanMobile@naturalmilkdairy.com',
            'mobile': cleanMobile,
            'password': cleanPassword,
            'address': 'Doorstep Address, Hyderabad',
            'area': 'Madhapur',
          });

          if (regRes['success'] == true) {
            return regRes;
          }

          // If already registered, log in directly
          final loginRes = await login(
            identifier: cleanMobile,
            password: cleanPassword,
          );
          if (loginRes['success'] == true) {
            return loginRes;
          }
          return {
            'success': false,
            'message': regRes['message'] ?? loginRes['message'] ?? 'Authentication failed.',
          };
        }

        // Initial Google tap without mobile/password:
        // Do NOT falsely assume an existing user is new!
        return {
          'success': false,
          'email': resolvedEmail,
          'name': resolvedName,
          'message': 'Google Sign-In endpoint is updating on the server. Please sign in with your password, or restart the Node.js App in Speshway cPanel.',
        };
      }
      return {
        'success': false,
        'message': data['message'] ?? 'Google Sign-In failed (${response.statusCode})',
      };
    } catch (e) {
      if (!AppConfig.isLiveServerActive && retryIfFailed) {
        for (final candidate in AppConstants.candidateBaseUrls) {
          if (candidate != baseUrl && await testConnection(candidate)) {
            _activeBaseUrl = candidate;
            return await loginWithGoogle(
              idToken: idToken,
              portal: portal,
              email: email,
              name: name,
              mobile: mobile,
              password: password,
              retryIfFailed: false,
            );
          }
        }
      }
      return {
        'success': false,
        'message': 'Cannot reach server at $baseUrl. Please verify your internet connection.',
      };
    }
  }

  /// 2. Register new customer
  Future<Map<String, dynamic>> register(Map<String, dynamic> payload) async {
    final url = Uri.parse('$baseUrl/api/auth/register');
    try {
      final response = await http
          .post(
            url,
            headers: _getHeaders(requiresAuth: false),
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 15));

      final data = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (data['success'] == true) {
          final token = data['token']?.toString();
          if (token != null) {
            await setToken(token);
          }
        }
        return data;
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Registration failed. Please check your inputs.',
        };
      }
    } catch (e) {
      debugPrint('ApiService register error: $e');
      return {
        'success': false,
        'message': 'Network error connecting to $baseUrl. Ensure server is online.',
      };
    }
  }

  /// 3. Get delivery areas list
  Future<List<String>> getDeliveryAreas() async {
    const defaultAreas = [
      'Madhapur',
      'Hitec City',
      'Gachibowli',
      'Kondapur',
      'Jubilee Hills',
      'Banjara Hills',
      'Kukatpally',
      'Manikonda',
      'Financial District',
    ];

    final url = Uri.parse('$baseUrl/api/auth/delivery-areas');
    try {
      final response = await _client.get(url, headers: _getHeaders(requiresAuth: false)).timeout(const Duration(seconds: 15));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (data['success'] == true && data['areas'] is List) {
          final list = (data['areas'] as List).map((e) {
            if (e is Map) return e['name']?.toString() ?? '';
            return e.toString();
          }).where((e) => e.isNotEmpty).toList();
          if (list.isNotEmpty) return list;
        }
      }
    } catch (e) {
      debugPrint('ApiService getDeliveryAreas error: $e');
    }
    return defaultAreas;
  }

  /// 4. Fetch current user profile
  Future<UserModel?> getMe() async {
    if (_cachedToken == null) return null;
    final url = Uri.parse('$baseUrl/api/auth/me');
    try {
      final response = await _client.get(url, headers: _getHeaders()).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (data['success'] == true && data['user'] is Map<String, dynamic>) {
          return UserModel.fromJson(data['user'] as Map<String, dynamic>);
        }
      }
    } catch (e) {
      debugPrint('ApiService getMe error: $e');
    }
    return null;
  }

  /// 5. Fetch product catalog
  Future<List<ProductModel>> getProducts({bool retryIfFailed = true}) async {
    final url = Uri.parse('$baseUrl/api/products');
    try {
      final response = await _client.get(url, headers: _getHeaders(requiresAuth: false)).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        List rawList = [];
        if (data is List) {
          rawList = data;
        } else if (data is Map && data['products'] is List) {
          rawList = data['products'] as List;
        }
        if (rawList.isNotEmpty) {
          return rawList.map((item) => ProductModel.fromJson(item as Map<String, dynamic>)).toList();
        }
      }
    } catch (e) {
      debugPrint('ApiService getProducts error on $baseUrl: $e');
      if (retryIfFailed) {
        final prev = baseUrl;
        final next = await resolveActiveBaseUrl();
        if (next != prev) {
          debugPrint('Retrying getProducts with newly resolved endpoint: $next');
          return getProducts(retryIfFailed: false);
        }
      }
    }
    return ProductModel.defaultCatalog;
  }

  /// 6. Fetch Contact Details & Social Media Links
  Future<Map<String, dynamic>?> getContactInfo() async {
    final res = await get('/api/contact-info');
    if (res['success'] == true && res['contactInfo'] is Map<String, dynamic>) {
      return res['contactInfo'] as Map<String, dynamic>;
    }
    return null;
  }

  /// 7. Update Contact Details & Social Media Links (Admin)
  Future<Map<String, dynamic>> updateContactInfo(Map<String, dynamic> payload) async {
    return await put('/api/contact-info', payload);
  }

  /// 8. Reset Contact Details & Social Media Links to Factory Defaults (Admin)
  Future<Map<String, dynamic>> resetContactInfo() async {
    return await post('/api/contact-info/reset', {});
  }

  /// 9. Upload image (base64 data URI or URL) to Cloudinary via backend
  Future<String?> uploadBase64Image(
    String imageDataOrUrl, {
    String folder = 'natural-milk-dairy',
  }) async {
    final clean = imageDataOrUrl.trim();
    if (clean.isEmpty) return null;
    if (clean.startsWith('https://res.cloudinary.com/')) {
      return clean;
    }
    final res = await post('/api/upload/base64', {
      'image': clean,
      'folder': folder,
    });
    if (res['success'] == true && res['url'] != null && res['url'].toString().isNotEmpty) {
      return res['url'].toString();
    }
    return null;
  }

  /// 10. Register FCM device push token with backend
  Future<bool> registerFcmToken(String token, {String platform = 'android'}) async {
    final clean = token.trim();
    if (clean.isEmpty) return false;
    try {
      final res = await post('/api/notifications/fcm-token', {
        'token': clean,
        'platform': platform,
      });
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// 11. Unregister FCM device push token (e.g. on logout)
  Future<void> unregisterFcmToken(String token) async {
    final clean = token.trim();
    if (clean.isEmpty) return;
    try {
      await delete('/api/notifications/fcm-token');
    } catch (_) {}
  }
}
