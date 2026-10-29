import 'package:flutter/material.dart';
import '../../../data/models/product_model.dart';
import '../product_details_screen.dart';
import '../subscribe_checkout_screen.dart';

class DairyCollectionCard extends StatelessWidget {
  final ProductModel product;
  final VoidCallback? onSubscribe;

  const DairyCollectionCard({
    super.key,
    required this.product,
    this.onSubscribe,
  });

  @override
  Widget build(BuildContext context) {
    final nameLower = product.name.toLowerCase();
    final catLower = product.category.toLowerCase();

    // 1. Dynamic Top-Left Badge (Capsule with white background and category-colored text)
    String badgeText = product.badge.trim();
    Color badgeTextColor = const Color(0xFF059669);

    if (nameLower.contains('ghee') || catLower == 'ghee') {
      badgeText = 'BILONA CHURNED';
      badgeTextColor = const Color(0xFFB45309);
    } else if (nameLower.contains('curd') || catLower == 'curd') {
      badgeText = 'PURE PRODUCE';
      badgeTextColor = const Color(0xFF059669);
    } else if (nameLower.contains('buffalo')) {
      badgeText = 'HIGH CREAM MALAI';
      badgeTextColor = const Color(0xFFD97706);
    } else if (nameLower.contains('paneer') || catLower == 'paneer') {
      badgeText = 'FARM MADE';
      badgeTextColor = const Color(0xFF166534);
    } else if (nameLower.contains('500') && nameLower.contains('cow')) {
      badgeText = 'FRESH DAILY';
      badgeTextColor = const Color(0xFF059669);
    } else if (badgeText.isEmpty || badgeText.toLowerCase() == 'fresh daily') {
      badgeText = 'BESTSELLER';
      badgeTextColor = const Color(0xFF059669);
    }

    // 2. Dynamic Bottom-Right Dark Overlay (e.g. 100% Pure, 100% Pure A2 Butter Fat)
    String overlayText = product.fat.trim();
    if (overlayText.isEmpty || overlayText == '100% Pure') {
      if (nameLower.contains('ghee') || catLower == 'ghee') {
        overlayText = '100% Pure A2 Butter Fat';
      } else if (nameLower.contains('curd') || catLower == 'curd') {
        overlayText = '100% Pure';
      } else if (nameLower.contains('paneer') || catLower == 'paneer') {
        overlayText = 'High Protein • Pure Cow Milk';
      } else if (nameLower.contains('buffalo')) {
        overlayText = '7.5% Fat • 9.0% SNF';
      } else {
        overlayText = '4.2% Fat • 8.5% SNF';
      }
    }

    // 3. Dynamic Tagline / Kicker
    String taglineText = product.tagline.trim().toUpperCase();
    if (taglineText.isEmpty || taglineText == 'SINGLE-ORIGIN MORNING HARVEST') {
      if (nameLower.contains('ghee') || catLower == 'ghee') {
        taglineText = 'TRADITIONAL BILONA CHURNED';
      } else if (nameLower.contains('buffalo')) {
        taglineText = 'RICH, THICK & VELVETY';
      } else if (nameLower.contains('paneer') || catLower == 'paneer') {
        taglineText = 'MELT-IN-YOUR-MOUTH SOFT';
      } else {
        taglineText = 'SINGLE-ORIGIN MORNING HARV...';
      }
    }

    // 4. Dynamic Highlight Chips (Chip 1: Green checkmark, Chip 2: Amber sparkles)
    String chip1 = 'Glass Bottle P';
    String chip2 = 'No Hormones /';

    if (nameLower.contains('ghee') || catLower == 'ghee') {
      chip1 = 'Traditional Bilo';
      chip2 = 'Granular Gold';
    } else if (nameLower.contains('buffalo')) {
      chip1 = 'Heavy Malai';
      chip2 = 'Zero Dilution';
    } else if (nameLower.contains('paneer') || catLower == 'paneer') {
      chip1 = 'Melt-in-mouth';
      chip2 = 'High Protein';
    } else if (product.highlights.isNotEmpty) {
      chip1 = product.highlights[0].length > 15
          ? '${product.highlights[0].substring(0, 14)}...'
          : product.highlights[0];
      if (product.highlights.length > 1) {
        chip2 = product.highlights[1].length > 15
            ? '${product.highlights[1].substring(0, 14)}...'
            : product.highlights[1];
      }
    }

    // 5. Image URL Resolver
    final String displayImageUrl = ProductModel.resolveImageUrl(
      product.imageUrl,
      product.name,
      product.category,
    );

    // 6. Formatted Price and Unit
    final double priceVal = product.numericPrice > 0 ? product.numericPrice : 65.0;
    String rawUnit = product.unit.trim();
    String formattedUnit;
    if (rawUnit.startsWith('/')) {
      final unitPart = rawUnit.substring(1).trim();
      formattedUnit = '/ $unitPart';
    } else {
      formattedUnit = '/ $rawUnit';
    }

    void openDetails() {
      if (onSubscribe != null) {
        onSubscribe!();
      } else {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ProductDetailsScreen(product: product),
          ),
        );
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2EBE5), width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
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
              // 1. TOP IMAGE STACK (With Floating Badges matching Reference Image)
              Stack(
                children: [
                  AspectRatio(
                    aspectRatio: 1.25,
                    child: Image.network(
                      displayImageUrl,
                      fit: BoxFit.cover,
                      loadingBuilder: (ctx, child, progress) {
                        if (progress == null) return child;
                        return Container(
                          color: const Color(0xFFF3F7F5),
                          child: const Center(
                            child: SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Color(0xFF059669),
                              ),
                            ),
                          ),
                        );
                      },
                      errorBuilder: (ctx, err, stack) => Image.asset(
                        ProductModel.resolveAssetFallback(product.name, product.category),
                        fit: BoxFit.cover,
                        errorBuilder: (c, e, s) => Container(
                          color: const Color(0xFFE8F3EE),
                          child: const Center(
                            child: Icon(
                              Icons.water_drop_rounded,
                              size: 36,
                              color: Color(0xFF059669),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Top-Left Pill Badge: White background + category text color
                  Positioned(
                    top: 9,
                    left: 9,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Colors.black.withValues(alpha: 0.05),
                          width: 0.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.12),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Text(
                        badgeText.toUpperCase(),
                        style: TextStyle(
                          color: badgeTextColor,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                  ),

                  // Bottom-Right Dark Pill Badge (e.g. 100% Pure, 100% Pure A2 Butter Fat)
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.82),
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

              // 2. PRODUCT DETAILS SECTION (Expanded to anchor price & button at bottom)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Top Sub-Column: Tagline, Title, Feature Chips
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Green Kicker Subtitle
                          Text(
                            taglineText,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF059669),
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.3,
                            ),
                          ),
                          const SizedBox(height: 3),

                          // Product Title (Fixed height for perfect grid row alignment)
                          SizedBox(
                            height: 38,
                            child: Text(
                              product.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Color(0xFF0F172A),
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                height: 1.25,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),

                          // Highlights Chips Row: Chip 1 (Green/Mint) + Chip 2 (Warm Amber)
                          Row(
                            children: [
                              Flexible(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE8F8F0),
                                    borderRadius: BorderRadius.circular(5),
                                    border: Border.all(
                                      color: const Color(0xFFD1FAE5),
                                      width: 0.8,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.check_rounded,
                                        size: 10,
                                        color: Color(0xFF059669),
                                      ),
                                      const SizedBox(width: 2.5),
                                      Flexible(
                                        child: Text(
                                          chip1,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            color: Color(0xFF047857),
                                            fontSize: 8.5,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(5),
                                    border: Border.all(
                                      color: const Color(0xFFFDE68A),
                                      width: 0.8,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.auto_awesome,
                                        size: 9,
                                        color: Color(0xFFD97706),
                                      ),
                                      const SizedBox(width: 2.5),
                                      Flexible(
                                        child: Text(
                                          chip2,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            color: Color(0xFFB45309),
                                            fontSize: 8.5,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      // Bottom Sub-Column: Price Row + Subscribe Daily Button
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Price Row: Green Bold Price + Grey Unit (e.g. ₹65 / 1 kg)
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                '₹${priceVal.toInt()}',
                                style: const TextStyle(
                                  fontSize: 17.5,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF059669),
                                ),
                              ),
                              const SizedBox(width: 3),
                              Text(
                                formattedUnit,
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: Color(0xFF6B7280),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 7),

                          // Green Action Button: Subscribe Daily →
                          SizedBox(
                            width: double.infinity,
                            height: 34,
                            child: ElevatedButton(
                              onPressed: onSubscribe ??
                                  () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => SubscribeCheckoutScreen(product: product),
                                      ),
                                    );
                                  },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF059669),
                                foregroundColor: Colors.white,
                                padding: EdgeInsets.zero,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Subscribe Daily',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  SizedBox(width: 4),
                                  Icon(Icons.arrow_forward_rounded, size: 13),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
