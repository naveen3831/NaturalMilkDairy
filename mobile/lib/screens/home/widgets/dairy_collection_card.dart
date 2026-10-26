import 'package:flutter/material.dart';
import '../../../data/models/product_model.dart';

class DairyCollectionCard extends StatelessWidget {
  final ProductModel product;
  final VoidCallback onSubscribe;

  const DairyCollectionCard({
    super.key,
    required this.product,
    required this.onSubscribe,
  });

  @override
  Widget build(BuildContext context) {
    // Dynamic badge and overlay configuration
    final nameLower = product.name.toLowerCase();
    String badgeText = product.badge;
    Color badgeBg = const Color(0xFF0D5C3A);
    Color badgeTextColor = Colors.white;

    if (nameLower.contains('500ml') && nameLower.contains('cow')) {
      badgeText = 'FRESH DAILY';
      badgeBg = Colors.white.withValues(alpha: 0.95);
      badgeTextColor = const Color(0xFF059669);
    } else if (nameLower.contains('buffalo')) {
      badgeText = 'HIGH CREAM MALAI';
      badgeBg = Colors.white.withValues(alpha: 0.95);
      badgeTextColor = const Color(0xFFD97706);
    } else if (nameLower.contains('curd')) {
      badgeText = 'PURE PROBIOTIC';
      badgeBg = Colors.white.withValues(alpha: 0.95);
      badgeTextColor = const Color(0xFF059669);
    } else if (nameLower.contains('ghee')) {
      badgeText = 'A2 BILONA';
      badgeBg = const Color(0xFFD97706);
      badgeTextColor = Colors.white;
    } else if (nameLower.contains('paneer')) {
      badgeText = 'FRESH BATCH';
      badgeBg = Colors.white.withValues(alpha: 0.95);
      badgeTextColor = const Color(0xFF0284C7);
    } else if (badgeText.isEmpty) {
      badgeText = 'BESTSELLER';
    }

    String overlayText = product.fat;
    if (overlayText.isEmpty || overlayText == '100% Pure') {
      if (nameLower.contains('curd')) {
        overlayText = 'Live Gut Cultures';
      } else if (nameLower.contains('ghee')) {
        overlayText = '100% Desi A2 Cow';
      } else if (nameLower.contains('paneer')) {
        overlayText = 'Soft & Spongy';
      } else if (nameLower.contains('buffalo')) {
        overlayText = '6.5% Fat • 9.0% SNF';
      } else {
        overlayText = '4.2% Fat • 8.5% SNF';
      }
    }

    // Guaranteed high-resolution image using ProductModel resolver
    final String displayImageUrl = ProductModel.resolveImageUrl(
      product.imageUrl,
      product.name,
      product.category,
    );

    final double priceVal = product.numericPrice > 0 ? product.numericPrice : 65.0;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2EBE5), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. TOP IMAGE STACK (With badges matching Image 1)
          Stack(
            children: [
              AspectRatio(
                aspectRatio: 1.20,
                child: Image.network(
                  displayImageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (ctx, err, stack) => Image.network(
                    ProductModel.resolveImageUrl('', product.name, product.category),
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) => Container(
                      color: const Color(0xFFE2F1EA),
                      child: const Center(
                        child: Icon(Icons.water_drop_rounded, size: 36, color: Color(0xFF0D5C3A)),
                      ),
                    ),
                  ),
                ),
              ),

              // Top-Left Badge (e.g. BESTSELLER / FRESH DAILY)
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Text(
                    badgeText,
                    style: TextStyle(
                      color: badgeTextColor,
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
              ),

              // Bottom-Right Overlay Badge (e.g. 4.2% Fat • 8.5% SNF)
              Positioned(
                bottom: 7,
                right: 7,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.72),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    overlayText,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ),
            ],
          ),

          // 2. PRODUCT DETAILS SECTION
          Padding(
            padding: const EdgeInsets.fromLTRB(9, 7, 9, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Green Kicker
                const Text(
                  'SINGLE-ORIGIN MORNING HARV...',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Color(0xFF059669),
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 2),

                // Product Title
                SizedBox(
                  height: 34,
                  child: Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF0C2340),
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      height: 1.2,
                    ),
                  ),
                ),
                const SizedBox(height: 5),

                // Highlights Row: Glass Bottle + No Hormones
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F8F0),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.check, size: 10, color: Color(0xFF059669)),
                            SizedBox(width: 2),
                            Text(
                              'Glass Bottle P',
                              style: TextStyle(color: Color(0xFF047857), fontSize: 9, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.auto_awesome, size: 9, color: Color(0xFFD97706)),
                            SizedBox(width: 2),
                            Text(
                              'No Hormones /',
                              style: TextStyle(color: Color(0xFFB45309), fontSize: 9, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),

                // Price Row: ₹65 / 1 L
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '₹${priceVal.toInt()}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0C2340),
                      ),
                    ),
                    const SizedBox(width: 3),
                    Text(
                      product.unit.startsWith('/') ? product.unit : '/ ${product.unit}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF6B7280),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Green Action Button: Subscribe Daily →
                SizedBox(
                  width: double.infinity,
                  height: 32,
                  child: ElevatedButton(
                    onPressed: onSubscribe,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.zero,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Subscribe Daily',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
                        ),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded, size: 13),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
