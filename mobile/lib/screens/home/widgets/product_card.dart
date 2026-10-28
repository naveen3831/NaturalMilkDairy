import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/models/product_model.dart';
import '../../../providers/product_provider.dart';
import '../product_details_screen.dart';

class ProductCard extends StatefulWidget {
  final ProductModel product;

  const ProductCard({super.key, required this.product});

  @override
  State<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<ProductCard> {
  bool _isFavorite = false;

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final nameLower = p.name.toLowerCase();
    final catLower = p.category.toLowerCase();

    // Badges & Colors matching Image
    String badgeText = 'FARM FRESH';
    Color badgeBg = const Color(0xFFDCFCE7);
    Color badgeTextColor = const Color(0xFF14532D);

    if (nameLower.contains('cow milk 1l') || nameLower == 'cow milk' || p.id == 'p1') {
      badgeText = 'BESTSELLER';
      badgeBg = const Color(0xFF0D5C3A);
      badgeTextColor = Colors.white;
    } else if (nameLower.contains('500ml') || p.id == 'p2') {
      badgeText = 'FARM FRESH';
      badgeBg = const Color(0xFFDCFCE7);
      badgeTextColor = const Color(0xFF14532D);
    } else if (nameLower.contains('buffalo') || p.id == 'p3') {
      badgeText = 'HIGH CREAM';
      badgeBg = const Color(0xFFFEF08A);
      badgeTextColor = const Color(0xFF854D0E);
    } else if (catLower == 'curd' || nameLower.contains('curd')) {
      badgeText = 'PURE DAIRY';
      badgeBg = const Color(0xFFBAE6FD);
      badgeTextColor = const Color(0xFF0369A1);
    } else if (catLower == 'ghee' || nameLower.contains('ghee')) {
      badgeText = 'VEDIC A2';
      badgeBg = const Color(0xFFFEF08A);
      badgeTextColor = const Color(0xFF854D0E);
    }

    // Description short line
    String shortDesc = p.description.trim();
    if (nameLower.contains('cow milk 1l')) {
      shortDesc = 'Freshly milked pure organic cow milk chilled to 4°C.';
    } else if (nameLower.contains('500ml')) {
      shortDesc = 'Naturally rich A2 milk from healthy native cows.';
    } else if (nameLower.contains('buffalo')) {
      shortDesc = 'Rich creamy high-fat pure buffalo milk.';
    } else if (nameLower.contains('curd')) {
      shortDesc = 'Thick, creamy and naturally probiotic curd.';
    }

    // Features matching Image
    IconData f1Icon = Icons.local_drink_outlined;
    String f1Line1 = 'Glass Bottle';
    String f1Line2 = 'Packaging';
    IconData f2Icon = Icons.ac_unit_rounded;
    String f2Line1 = 'Chilled to';
    String f2Line2 = '4°C in 30 Mins';

    if (catLower == 'curd' || nameLower.contains('curd')) {
      f1Icon = Icons.verified_user_outlined;
      f1Line1 = 'Hygienic';
      f1Line2 = 'Packaging';
      f2Icon = Icons.eco_outlined;
      f2Line1 = 'No';
      f2Line2 = 'Preservatives';
    } else if (catLower == 'ghee' || nameLower.contains('ghee')) {
      f1Icon = Icons.local_fire_department_outlined;
      f1Line1 = 'Vedic Bilona';
      f1Line2 = 'Process';
      f2Icon = Icons.verified_user_outlined;
      f2Line1 = '100% Pure';
      f2Line2 = 'A2 Desi Ghee';
    }

    // Clean price
    final cleanPrice = p.price.startsWith('₹') ? p.price : '₹${p.price}';
    String cleanUnit = p.unit.replaceAll('per ', '').replaceAll('/', '').trim();
    if (cleanUnit.isEmpty) {
      cleanUnit = nameLower.contains('500ml') ? '500ml' : (catLower == 'curd' ? '500g' : '1L');
    }

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ProductDetailsScreen(product: p),
          ),
        );
      },
      borderRadius: BorderRadius.circular(18),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2EBE5), width: 1.1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Image with Badge & Heart
            Stack(
              children: [
                SizedBox(
                  height: 125,
                  width: double.infinity,
                  child: Image.network(
                    ProductModel.resolveImageUrl(p.imageUrl, p.name, p.category),
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Image.asset(
                      ProductModel.resolveAssetFallback(p.name, p.category),
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Container(
                        color: const Color(0xFFF1F5F2),
                        child: const Center(
                          child: Icon(Icons.water_drop_rounded, size: 36, color: Color(0xFF0D5C3A)),
                        ),
                      ),
                    ),
                  ),
                ),

                // Badge top-left
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: badgeBg,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      badgeText,
                      style: TextStyle(
                        color: badgeTextColor,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),

                // Heart Button top-right
                Positioned(
                  top: 7,
                  right: 7,
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _isFavorite = !_isFavorite;
                      });
                    },
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.95),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.12),
                            blurRadius: 5,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Icon(
                          _isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                          size: 15,
                          color: _isFavorite ? const Color(0xFFE11D48) : const Color(0xFF475569),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Card Body
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Title & Description
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          shortDesc,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10,
                            color: Color(0xFF64748B),
                            height: 1.25,
                          ),
                        ),
                      ],
                    ),

                    // Feature row (2 columns matching Image)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(f1Icon, size: 12, color: const Color(0xFF0D5C3A)),
                              const SizedBox(width: 3),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      f1Line1,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF475569), height: 1.15),
                                    ),
                                    Text(
                                      f1Line2,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF475569), height: 1.15),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(f2Icon, size: 12, color: const Color(0xFF0D5C3A)),
                              const SizedBox(width: 3),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      f2Line1,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF475569), height: 1.15),
                                    ),
                                    Text(
                                      f2Line2,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF475569), height: 1.15),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // Bottom Row: Price & Subscribe Button (Overflow-safe with FittedBox and Expanded)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: [
                                Text(
                                  cleanPrice,
                                  style: const TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0D5C3A),
                                  ),
                                ),
                                const SizedBox(width: 1),
                                Text(
                                  '/$cleanUnit',
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),

                        // Subscribe Button matching Image
                        Flexible(
                          flex: 0,
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: InkWell(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ProductDetailsScreen(product: p),
                                  ),
                                );
                              },
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0D5C3A),
                                  borderRadius: BorderRadius.circular(9),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                                      blurRadius: 4,
                                      offset: const Offset(0, 1.5),
                                    ),
                                  ],
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.calendar_today_outlined, color: Colors.white, size: 10),
                                    SizedBox(width: 3),
                                    Text(
                                      'Subscribe',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -0.1,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
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
    );
  }
}
