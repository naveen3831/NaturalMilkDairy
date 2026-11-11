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

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString(AppConstants.keyAuthToken);
    _customBaseUrl = prefs.getString(AppConstants.keyCustomBaseUrl);
    await resolveActiveBaseUrl();
  }

  String get baseUrl =>
      _customBaseUrl ??
      _activeBaseUrl ??
      (AppConfig.isLiveServerActive
          ? AppConfig.liveBaseUrl
          : AppConstants.defaultBaseUrl);

  /// Quick ping to check if a backend server is live and responding
  Future<bool> testConnection([String? candidateUrl]) async {
    final target = (candidateUrl ?? baseUrl).trim();
    if (target.isEmpty) return false;
    try {
      final res = await http
          .get(Uri.parse('$target/api/health'))
          .timeout(const Duration(milliseconds: 3000));
      return res.statusCode >= 200 && res.statusCode < 400;
    } catch (_) {
      return false;
    }
  }

  /// Probes candidate URLs or binds the production server depending on connectivity
  Future<String> resolveActiveBaseUrl() async {
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

    // 3. Scan live cloud production server
    final isLiveAlive = await testConnection(AppConfig.liveBaseUrl);
    if (isLiveAlive) {
      _activeBaseUrl = AppConfig.liveBaseUrl;
      debugPrint('🌐 ApiService: [LIVE CLOUD SERVER] Active at: ${AppConfig.liveBaseUrl}');
      return _activeBaseUrl!;
    }

    _activeBaseUrl = AppConfig.isLiveServerActive ? AppConfig.liveBaseUrl : AppConstants.defaultBaseUrl;
    debugPrint('🌐 ApiService: Falling back to: $_activeBaseUrl');
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
    String period = 'monthly', // 'weekly', 'monthly', 'all'
    String? customerId,
    String? partnerId,
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

  /// Generic GET request with auto authentication and fallback retry
  Future<Map<String, dynamic>> get(String endpoint, [bool retry = true]) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await http
          .get(url, headers: _getHeaders(requiresAuth: true))
          .timeout(const Duration(seconds: 10));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService GET error on $url: $e');
      if (retry) {
        await resolveActiveBaseUrl();
        return get(endpoint, false);
      }
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Generic POST request with auto authentication and fallback retry
  Future<Map<String, dynamic>> post(String endpoint, [Map<String, dynamic>? body, bool retry = true]) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await http
          .post(
            url,
            headers: _getHeaders(requiresAuth: true),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 10));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService POST error on $url: $e');
      if (retry) {
        await resolveActiveBaseUrl();
        return post(endpoint, body, false);
      }
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Generic PUT request with auto authentication and fallback retry
  Future<Map<String, dynamic>> put(String endpoint, [Map<String, dynamic>? body, bool retry = true]) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await http
          .put(
            url,
            headers: _getHeaders(requiresAuth: true),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 10));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService PUT error on $url: $e');
      if (retry) {
        await resolveActiveBaseUrl();
        return put(endpoint, body, false);
      }
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Generic DELETE request with auto authentication and fallback retry
  Future<Map<String, dynamic>> delete(String endpoint, [bool retry = true]) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await http
          .delete(url, headers: _getHeaders(requiresAuth: true))
          .timeout(const Duration(seconds: 10));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService DELETE error on $url: $e');
      if (retry) {
        await resolveActiveBaseUrl();
        return delete(endpoint, false);
      }
      return {'success': false, 'message': e.toString()};
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
          .timeout(const Duration(seconds: 10));

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
      final response = await http.get(url, headers: _getHeaders(requiresAuth: false)).timeout(const Duration(seconds: 8));
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
      final response = await http.get(url, headers: _getHeaders()).timeout(const Duration(seconds: 8));
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
      final response = await http.get(url, headers: _getHeaders(requiresAuth: false)).timeout(const Duration(seconds: 8));
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
}
