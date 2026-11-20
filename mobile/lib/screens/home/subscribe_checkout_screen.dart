import 'package:flutter/material.dart';
import '../../data/models/product_model.dart';
import 'product_details_screen.dart';

/// Unified Screen: Merged Product Details & Checkout Screen
/// Provides a single, seamless, and professional experience for both One-Time and Subscription orders.
class SubscribeCheckoutScreen extends StatelessWidget {
  final ProductModel? product;
  final double? initialQty;
  final int? initialCurd;
  final String? initialFrequency;

  const SubscribeCheckoutScreen({
    super.key,
    this.product,
    this.initialQty,
    this.initialCurd,
    this.initialFrequency,
  });

  @override
  Widget build(BuildContext context) {
    return ProductDetailsScreen(
      product: product,
      initialQty: initialQty,
      initialCurd: initialCurd,
      initialFrequency: initialFrequency,
    );
  }
}
