import 'package:flutter/material.dart';
import '../data/models/product_model.dart';
import '../data/services/api_service.dart';

class ProductProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<ProductModel> _products = [];
  String _selectedCategory = 'all';
  bool _isLoading = false;
  final Map<String, int> _cart = {}; // productId -> quantity

  List<ProductModel> get products => _products;
  String get selectedCategory => _selectedCategory;
  bool get isLoading => _isLoading;
  Map<String, int> get cart => _cart;

  int get totalCartItems => _cart.values.fold(0, (sum, qty) => sum + qty);

  List<ProductModel> get filteredProducts {
    if (_selectedCategory == 'all') return _products;
    return _products.where((p) => p.category.toLowerCase() == _selectedCategory.toLowerCase()).toList();
  }

  Future<void> loadProducts() async {
    _isLoading = true;
    notifyListeners();

    _products = await _apiService.getProducts();

    _isLoading = false;
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
