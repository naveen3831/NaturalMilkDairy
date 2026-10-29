import 'package:flutter/material.dart';
import '../../../data/models/product_model.dart';
import '../product_details_screen.dart';
import '../subscribe_checkout_screen.dart';

class LuxuryProductCard extends StatelessWidget {
  final ProductModel product;
  final VoidCallback? onSubscribe;

  const LuxuryProductCard({
    super.key,
    required this.product,
    this.onSubscribe,
  });

  @override
  Widget build(BuildContext context) {
    final highlights = product.highlights.isNotEmpty
        ? product.highlights
        : const ['100% Unadulterated', 'Chilled to 4°C', 'Eco Glass Bottle'];

    final String displayImageUrl = ProductModel.resolveImageUrl(
      product.imageUrl,
      product.name,
      product.category,
    );

    void openDetails() {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductDetailsScreen(product: product),
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2ECE4), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: openDetails,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          // Image Area with Badges matching Image 2
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(19)),
                child: SizedBox(
                  height: 230,
                  width: double.infinity,
                  child: Image.network(
                    displayImageUrl,
                    fit: BoxFit.cover,
                    loadingBuilder: (ctx, child, progress) {
                      if (progress == null) return child;
                      return Container(
                        color: const Color(0xFFF0F5F2),
                        child: const Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Color(0xFF0D5C3A),
                          ),
                        ),
                      );
                    },
                    errorBuilder: (ctx, err, stack) => Image.asset(
                      ProductModel.resolveAssetFallback(product.name, product.category),
                      fit: BoxFit.cover,
                      errorBuilder: (c, e, s) => Container(
                        color: const Color(0xFFF0F5F2),
                        child: const Center(
                          child: Icon(Icons.water_drop_rounded, size: 48, color: Color(0xFF0D5C3A)),
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // Top-Left Pill Badge: BESTSELLER
              Positioned(
                top: 14,
                left: 14,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    product.badge.toUpperCase(),
                    style: const TextStyle(
                      color: Color(0xFF0D5C3A),
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.6,
                    ),
                  ),
                ),
              ),

              // Bottom-Right Pill Badge: 4.2% Fat • 8.5% SNF
              Positioned(
                bottom: 12,
                right: 14,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.82),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    product.fat,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Details Area
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Product Name
                Text(
                  product.name,
                  style: const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0C2340),
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 6),

                // Description
                Text(
                  product.description,
                  style: const TextStyle(
                    fontSize: 13.5,
                    color: Color(0xFF597361),
                    height: 1.45,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 14),

                // Feature Highlights with green checkmark
                ...highlights.map(
                  (h) => Padding(
                    padding: const EdgeInsets.only(bottom: 7.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.check_rounded,
                          size: 18,
                          color: Color(0xFF0D5C3A),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            h,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF374151),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(height: 1, color: Color(0xFFE2ECE4)),
                const SizedBox(height: 16),

                // Price and Subscribe / Add Actions
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              product.price,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0D5C3A),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              product.unit,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF6B7280),
                              ),
                            ),
                          ],
                        ),
                        const Text(
                          'Free 5:00 AM Delivery',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF059669),
                          ),
                        ),
                      ],
                    ),

                    ElevatedButton.icon(
                      onPressed: onSubscribe ??
                          () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => SubscribeCheckoutScreen(product: product),
                              ),
                            );
                          },
                      icon: const Icon(Icons.calendar_month_rounded, size: 16),
                      label: const Text('Subscribe'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0D5C3A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5),
                        elevation: 0,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  ),
);
  }
}
