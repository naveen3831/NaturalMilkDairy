import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_constants.dart';
import '../data/models/user_model.dart';
import '../data/services/api_service.dart';
import '../data/services/realtime_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final RealtimeService _realtimeService = RealtimeService();

  UserModel? _user;
  String? _token;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isGuest = false;

  UserModel? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;
  bool get isGuest => _isGuest || _user?.isGuest == true;
  bool get isAdmin => _user?.isAdmin == true;
  bool get isDeliveryBoy => _user?.isDeliveryBoy == true;
  bool get isCustomer => _user?.isCustomer == true;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void continueAsGuest() {
    _isGuest = true;
    _user = UserModel.guest();
    _token = null;
    _errorMessage = null;
    _realtimeService.updateToken('guest');
    notifyListeners();
  }

  /// Initialize auth on application startup
  Future<bool> initAuth() async {
    _isLoading = true;
    notifyListeners();

    await _apiService.init();
    _token = _apiService.token;

    if (_token != null && _token!.isNotEmpty) {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString(AppConstants.keyUserData);
      if (userJson != null) {
        try {
          _user = UserModel.fromJson(jsonDecode(userJson));
        } catch (_) {}
      }

      // Verify and refresh with server
      final freshUser = await _apiService.getMe();
      if (freshUser != null) {
        _user = freshUser;
        await prefs.setString(AppConstants.keyUserData, jsonEncode(freshUser.toJson()));
      }
      _realtimeService.updateToken(_token);
    } else {
      _realtimeService.updateToken('guest');
    }

    _isLoading = false;
    notifyListeners();
    return isAuthenticated;
  }

  /// Sign in customer
  Future<bool> login(String identifier, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await _apiService.login(identifier: identifier, password: password);

    _isLoading = false;
    if (res['success'] == true) {
      _isGuest = false;
      _token = res['token']?.toString();
      if (res['user'] is Map<String, dynamic>) {
        _user = UserModel.fromJson(res['user'] as Map<String, dynamic>);
      }
      _realtimeService.updateToken(_token);
      notifyListeners();
      return true;
    } else {
      _errorMessage = res['message']?.toString() ?? 'Invalid credentials.';
      notifyListeners();
      return false;
    }
  }

  /// Register new customer
  Future<bool> register(Map<String, dynamic> payload) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await _apiService.register(payload);

    _isLoading = false;
    if (res['success'] == true) {
      _isGuest = false;
      _token = res['token']?.toString();
      if (res['user'] is Map<String, dynamic>) {
        _user = UserModel.fromJson(res['user'] as Map<String, dynamic>);
      }
      _realtimeService.updateToken(_token);
      notifyListeners();
      return true;
    } else {
      _errorMessage = res['message']?.toString() ?? 'Registration failed.';
      notifyListeners();
      return false;
    }
  }

  /// Sign out
  Future<void> logout() async {
    _user = null;
    _token = null;
    _isGuest = false;
    await _apiService.setToken(null);
    _realtimeService.updateToken('guest');
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
