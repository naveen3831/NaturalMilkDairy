import 'dart:async';
import 'package:flutter/material.dart';
import '../data/models/product_model.dart';
import '../data/services/api_service.dart';
import '../data/services/realtime_service.dart';

class ProductProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final RealtimeService _realtimeService = RealtimeService();

  List<ProductModel> _products = [];
  String _selectedCategory = 'all';
  bool _isLoading = false;
  final Map<String, int> _cart = {}; // productId -> quantity
  StreamSubscription? _wsSubscription;
  Timer? _pollingTimer;

  ProductProvider() {
    _initRealtime();
  }

  void _initRealtime() {
    _realtimeService.connect();
    _wsSubscription = _realtimeService.eventStream.listen((event) {
      final type = event['type']?.toString();
      if (type == 'PRODUCT_UPDATED' ||
          type == 'INVENTORY_UPDATED' ||
          type == 'STOCK_UPDATED' ||
          type == 'PRICE_UPDATED') {
        debugPrint('⚡ Realtime $type event received, syncing catalog');
        loadProducts(silent: true);
      }
    });

    // Quiet backup polling every 30 seconds
    _pollingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      loadProducts(silent: true);
    });
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    _pollingTimer?.cancel();
    super.dispose();
  }

  List<ProductModel> get products => _products;
  String get selectedCategory => _selectedCategory;
  bool get isLoading => _isLoading;
  Map<String, int> get cart => _cart;

  int get totalCartItems => _cart.values.fold(0, (sum, qty) => sum + qty);

  List<ProductModel> get filteredProducts {
    if (_selectedCategory == 'all') return _products;
    final sel = _selectedCategory.toLowerCase();
    return _products.where((p) {
      final c = p.category.toLowerCase();
      if (sel == 'curd') {
        return c == 'curd' || c == 'paneer';
      }
      return c == sel;
    }).toList();
  }

  Future<void> loadProducts({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      notifyListeners();
    }

    final fresh = await _apiService.getProducts();
    if (fresh.isNotEmpty) {
      _products = fresh;
    }

    if (!silent) {
      _isLoading = false;
    }
    notifyListeners();
  }

  void selectCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void updateQuantity(String productId, int delta) {
    final current = _cart[productId] ?? 0;
    final next = current + delta;
    if (next <= 0) {
      _cart.remove(productId);
    } else {
      _cart[productId] = next;
    }
    notifyListeners();
  }

  int getQuantity(String productId) => _cart[productId] ?? 0;
}
