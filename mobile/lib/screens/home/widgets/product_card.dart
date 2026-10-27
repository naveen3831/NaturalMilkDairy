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
    final productProvider = context.watch<ProductProvider>();
    final int qty = productProvider.getQuantity(widget.product.id);
    final p = widget.product;
    final nameLower = p.name.toLowerCase();
    final catLower = p.category.toLowerCase();

    // Features
    IconData feat1Icon = Icons.eco_rounded;
    String feat1Text = 'Glass Bottle\nPackaging';
    IconData feat2Icon = Icons.ac_unit_rounded;
    String feat2Text = 'Chilled to\n4°C in 30 Mins';

    if (nameLower.contains('curd') || catLower == 'curd') {
      feat1Icon = Icons.eco_rounded;
      feat1Text = 'No Preservatives';
      feat2Icon = Icons.spa_rounded;
      feat2Text = '100% Natural';
    } else if (nameLower.contains('ghee') || catLower == 'ghee') {
      feat1Icon = Icons.eco_rounded;
      feat1Text = '100% Pure';
      feat2Icon = Icons.verified_user_rounded;
      feat2Text = 'No Additives';
    } else if (nameLower.contains('paneer') || catLower == 'paneer') {
      feat1Icon = Icons.eco_rounded;
      feat1Text = 'Melt in Mouth';
      feat2Icon = Icons.fitness_center_rounded;
      feat2Text = 'High Protein';
    }

    // Description
    String descText = p.description.trim();
    if (descText.isEmpty) {
      if (nameLower.contains('cow')) {
        descText = 'Freshly milked pure organic cow milk, chilled to 4°C.';
      } else if (nameLower.contains('buffalo')) {
        descText = 'Rich, creamy and naturally nutritious buffalo milk.';
      } else if (nameLower.contains('curd')) {
        descText = 'Thick, creamy and probiotic curd made from pure milk.';
      } else if (nameLower.contains('ghee')) {
        descText = 'Traditionally crafted from pure bilona method.';
      } else {
        descText = 'Freshly harvested daily farm dairy product.';
      }
    }

    // Badge
    String badgeText = p.badge.trim().toUpperCase();
    if (badgeText.isEmpty || badgeText == 'FRESH DAILY' || badgeText == 'BESTSELLER') {
      badgeText = nameLower.contains('cow') ? 'BESTSELLER' : (nameLower.contains('buffalo') ? 'HIGH CREAM' : (nameLower.contains('ghee') ? 'BILONA' : 'PROBIOTIC'));
    }

    // Clean price
    final cleanPrice = p.price.startsWith('₹') ? p.price : '₹${p.price}';
    final cleanUnit = p.unit.replaceAll('per ', '').replaceAll('/', '').trim();

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ProductDetailsScreen(product: p),
          ),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
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
            // Image with Bestseller badge & Heart button
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

                // Top Left Badge
                if (badgeText.isNotEmpty)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0D5C3A),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badgeText,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                  ),

                // Top Right Heart Button
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
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.95),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.12),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Icon(
                          _isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                          size: 16,
                          color: _isFavorite ? const Color(0xFFE11D48) : const Color(0xFF475569),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Content Area
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
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
                            fontSize: 13.5,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          descText,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: Color(0xFF64748B),
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),

                    // Feature row (2 chips)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(feat1Icon, size: 12, color: const Color(0xFF0D5C3A)),
                              const SizedBox(width: 3),
                              Expanded(
                                child: Text(
                                  feat1Text,
                                  style: const TextStyle(
                                    fontSize: 9,
                                    color: Color(0xFF475569),
                                    fontWeight: FontWeight.w600,
                                    height: 1.15,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
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
                              Icon(feat2Icon, size: 12, color: const Color(0xFF0D5C3A)),
                              const SizedBox(width: 3),
                              Expanded(
                                child: Text(
                                  feat2Text,
                                  style: const TextStyle(
                                    fontSize: 9,
                                    color: Color(0xFF475569),
                                    fontWeight: FontWeight.w600,
                                    height: 1.15,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // Price & Delivery & Add Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        // Price & Delivery
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Text(
                                    cleanPrice,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF0D5C3A),
                                    ),
                                  ),
                                  if (cleanUnit.isNotEmpty) ...[
                                    const SizedBox(width: 2),
                                    Flexible(
                                      child: Text(
                                        '/ $cleanUnit',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 2),
                              const Row(
                                children: [
                                  Icon(Icons.local_shipping_outlined, size: 10, color: Color(0xFF059669)),
                                  SizedBox(width: 3),
                                  Expanded(
                                    child: Text(
                                      'Free 5:00 AM Delivery',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 8,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF059669),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),

                        // [🛒 Add] Button or Counter
                        qty == 0
                            ? InkWell(
                                onTap: () => productProvider.updateQuantity(p.id, 1),
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0D5C3A),
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 12),
                                      SizedBox(width: 4),
                                      Text(
                                        'Add',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            : Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0D5C3A),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    InkWell(
                                      onTap: () => productProvider.updateQuantity(p.id, -1),
                                      child: const Padding(
                                        padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                        child: Icon(Icons.remove, size: 14, color: Colors.white),
                                      ),
                                    ),
                                    Text(
                                      '$qty',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 11.5,
                                      ),
                                    ),
                                    InkWell(
                                      onTap: () => productProvider.updateQuantity(p.id, 1),
                                      child: const Padding(
                                        padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                        child: Icon(Icons.add, size: 14, color: Colors.white),
                                      ),
                                    ),
                                  ],
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
