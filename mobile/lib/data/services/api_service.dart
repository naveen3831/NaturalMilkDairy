import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
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

  String get baseUrl => _customBaseUrl ?? _activeBaseUrl ?? AppConstants.defaultBaseUrl;

  /// Quick ping to check if a backend server is live and responding
  Future<bool> testConnection([String? candidateUrl]) async {
    final target = (candidateUrl ?? baseUrl).trim();
    if (target.isEmpty) return false;
    try {
      final res = await http.get(Uri.parse('$target/api/health')).timeout(const Duration(milliseconds: 1800));
      return res.statusCode >= 200 && res.statusCode < 400;
    } catch (_) {
      return false;
    }
  }

  /// Probes candidate URLs (127.0.0.1, 192.168.1.68, 10.0.2.2, localhost) and binds the active one
  Future<String> resolveActiveBaseUrl() async {
    if (_customBaseUrl != null && _customBaseUrl!.isNotEmpty) {
      final ok = await testConnection(_customBaseUrl);
      if (ok) {
        _activeBaseUrl = _customBaseUrl;
        return _customBaseUrl!;
      }
    }

    for (final url in AppConstants.candidateBaseUrls) {
      final isAlive = await testConnection(url);
      if (isAlive) {
        _activeBaseUrl = url;
        debugPrint('🌐 ApiService auto-resolved active server at: $url');
        return url;
      }
    }

    _activeBaseUrl = AppConstants.defaultBaseUrl;
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

  /// Generic GET request with auto authentication
  Future<Map<String, dynamic>> get(String endpoint) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await http
          .get(url, headers: _getHeaders(requiresAuth: true))
          .timeout(const Duration(seconds: 10));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService GET error on $url: $e');
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Generic POST request with auto authentication
  Future<Map<String, dynamic>> post(String endpoint, [Map<String, dynamic>? body]) async {
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
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Generic PUT request with auto authentication
  Future<Map<String, dynamic>> put(String endpoint, [Map<String, dynamic>? body]) async {
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
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Generic DELETE request with auto authentication
  Future<Map<String, dynamic>> delete(String endpoint) async {
    final cleanPath = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final url = Uri.parse('$baseUrl$cleanPath');
    try {
      final response = await http
          .delete(url, headers: _getHeaders(requiresAuth: true))
          .timeout(const Duration(seconds: 10));
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('ApiService DELETE error on $url: $e');
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
}
