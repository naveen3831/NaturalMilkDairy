import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:natural_milk_dairy/data/models/product_model.dart';
import 'package:natural_milk_dairy/providers/auth_provider.dart';
import 'package:natural_milk_dairy/providers/customer_provider.dart';
import 'contact_support_screen.dart';
import 'subscribe_checkout_screen.dart';
import '../auth/login_screen.dart';

class ProductDetailsScreen extends StatefulWidget {
  final ProductModel product;

  const ProductDetailsScreen({
    super.key,
    required this.product,
  });

  @override
  State<ProductDetailsScreen> createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends State<ProductDetailsScreen> {
  int _quantity = 1;
  String _orderFrequency = 'subscription'; // 'subscription' or 'one_time'

  double get _unitPrice => widget.product.numericPrice > 0
      ? widget.product.numericPrice
      : (double.tryParse(widget.product.price.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 65.0);

  double get _totalPrice => _unitPrice * _quantity;

  String get _cleanUnit {
    final raw = widget.product.unit.replaceAll('/', '').trim();
    return raw.isNotEmpty ? raw : '1 L';
  }

  List<int> _getPresetQuantities() {
    return [1, 2, 3];
  }

  String _getPresetLabel(int qty) {
    final u = widget.product.unit.toLowerCase();
    final n = widget.product.name.toLowerCase();
    if (u.contains('litre') || u.contains('1 l') || n.contains('1l') || n.contains('1 l')) {
      return '$qty ${qty == 1 ? "Litre" : "Litres"}';
    }
    if (u.contains('500') || n.contains('500')) {
      return '$qty ${qty == 1 ? "Pack" : "Packs"} (${qty * 500}g)';
    }
    if (u.contains('kg') || n.contains('kg')) {
      return '$qty kg';
    }
    return '$qty ${qty == 1 ? "Unit" : "Units"}';
  }

  Future<void> _handleStartSubscription() async {
    final auth = context.read<AuthProvider>();
    final isGuest = auth.user == null || auth.user?.isGuest == true;

    if (isGuest) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      return;
    }

    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => SubscribeCheckoutScreen(
          product: widget.product,
          initialQty: _quantity.toDouble(),
          initialFrequency: _orderFrequency == 'subscription' ? 'daily' : 'daily',
        ),
      ),
    );

    if (result == true && mounted) {
      context.read<CustomerProvider>().loadAllCustomerData(silent: true);
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayImageUrl = ProductModel.resolveImageUrl(
      widget.product.imageUrl,
      widget.product.name,
      widget.product.category,
    );

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        leading: Padding(
          padding: const EdgeInsets.only(left: 14.0),
          child: Center(
            child: InkWell(
              onTap: () => Navigator.pop(context),
              borderRadius: BorderRadius.circular(30),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F7F4),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                ),
                child: const Icon(
                  Icons.arrow_back_rounded,
                  color: Color(0xFF0D5C3A),
                  size: 20,
                ),
              ),
            ),
          ),
        ),
        title: Text(
          widget.product.name,
          style: const TextStyle(
            color: Color(0xFF0C2340),
            fontWeight: FontWeight.w900,
            fontSize: 16,
            letterSpacing: -0.2,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14.0),
            child: Center(
              child: InkWell(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Product link copied to clipboard!'),
                      backgroundColor: Color(0xFF0D5C3A),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(30),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F7F4),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                  ),
                  child: const Icon(
                    Icons.share_outlined,
                    color: Color(0xFF0D5C3A),
                    size: 19,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. HERO PRODUCT IMAGE CARD WITH FLOATING BADGES
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 14,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    children: [
                      // Product Image
                      AspectRatio(
                        aspectRatio: 1.15,
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
                          errorBuilder: (ctx, err, stack) => Image.network(
                            ProductModel.resolveImageUrl('', widget.product.name, widget.product.category),
                            fit: BoxFit.cover,
                            errorBuilder: (c, e, s) => Container(
                              color: const Color(0xFFE8F3EE),
                              child: const Center(
                                child: Icon(Icons.water_drop_rounded, size: 48, color: Color(0xFF0D5C3A)),
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Top-Left Badge: 100% FARM FRESH
                      Positioned(
                        top: 14,
                        left: 14,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.95),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: const Color(0xFFD1FAE5), width: 1),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.1),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.eco_rounded, color: Color(0xFF059669), size: 14),
                              SizedBox(width: 5),
                              Text(
                                '100% FARM FRESH',
                                style: TextStyle(
                                  color: Color(0xFF047857),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Bottom Overlay Dark Strip: 100% Raw & Unadulterated + Next Drop 5:30 AM
                      Positioned(
                        bottom: 12,
                        left: 12,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF13281C).withValues(alpha: 0.88),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 1),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Expanded(
                                child: Row(
                                  children: [
                                    Icon(Icons.verified_user_rounded, color: Color(0xFF10B981), size: 16),
                                    SizedBox(width: 7),
                                    Expanded(
                                      child: Text(
                                        '100% Raw &\nUnadulterated Pure Dairy',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w800,
                                          height: 1.25,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                width: 1,
                                height: 26,
                                color: Colors.white.withValues(alpha: 0.18),
                                margin: const EdgeInsets.symmetric(horizontal: 8),
                              ),
                              const Row(
                                children: [
                                  Icon(Icons.schedule_rounded, color: Color(0xFFF5C249), size: 15),
                                  SizedBox(width: 6),
                                  Text(
                                    'Next Drop:\n5:30 AM',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800,
                                      height: 1.25,
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
                const SizedBox(height: 16),

                // 2. MAIN PRODUCT DETAILS CARD
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Direct Farm Doorstep Fresh Subtitle
                      const Row(
                        children: [
                          Icon(Icons.auto_awesome_rounded, color: Color(0xFF059669), size: 14),
                          SizedBox(width: 6),
                          Text(
                            'DIRECT FARM DOORSTEP FRESH',
                            style: TextStyle(
                              color: Color(0xFF059669),
                              fontWeight: FontWeight.w900,
                              fontSize: 11,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Product Title
                      Text(
                        widget.product.name,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0C2340),
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Rating & Subscribers Count
                      Row(
                        children: [
                          ...List.generate(
                            5,
                            (index) => const Icon(
                              Icons.star_rounded,
                              color: Color(0xFFF59E0B),
                              size: 16,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            '4.9',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF1F2937)),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            '(1,240+ morning subscribers)',
                            style: TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Price Strip Box (Mint container with Free Doorstep Delivery tag)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF4F9F5),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFDCEBDF), width: 1),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Text(
                                    '₹${_unitPrice.toInt()}',
                                    style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF059669),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      '/ $_cleanUnit',
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF55725F),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Flexible(
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerRight,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE0F2E4),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.check_rounded, color: Color(0xFF0A633B), size: 14),
                                      SizedBox(width: 4),
                                      Text(
                                        'Free Doorstep Delivery',
                                        style: TextStyle(
                                          color: Color(0xFF0A633B),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // 3. CHOOSE ORDER FREQUENCY
                      const Text(
                        'CHOOSE ORDER FREQUENCY',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF496653),
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          // One-Time Order Card
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _orderFrequency = 'one_time'),
                              borderRadius: BorderRadius.circular(16),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: _orderFrequency == 'one_time' ? const Color(0xFF0D5C3A) : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: _orderFrequency == 'one_time' ? const Color(0xFF0D5C3A) : const Color(0xFFDCE8DF),
                                    width: 1.5,
                                  ),
                                  boxShadow: _orderFrequency == 'one_time'
                                      ? [
                                          BoxShadow(
                                            color: const Color(0xFF0D5C3A).withValues(alpha: 0.2),
                                            blurRadius: 10,
                                            offset: const Offset(0, 3),
                                          ),
                                        ]
                                      : [],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.inventory_2_outlined,
                                          size: 16,
                                          color: _orderFrequency == 'one_time' ? Colors.white : const Color(0xFF0D5C3A),
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          'One-Time',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w900,
                                            color: _orderFrequency == 'one_time' ? Colors.white : const Color(0xFF0C2340),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Single delivery tomorrow morning',
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        color: _orderFrequency == 'one_time'
                                            ? Colors.white.withValues(alpha: 0.85)
                                            : const Color(0xFF6B7280),
                                        height: 1.25,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),

                          // Daily Subscription Card
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _orderFrequency = 'subscription'),
                              borderRadius: BorderRadius.circular(16),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: _orderFrequency == 'subscription' ? const Color(0xFF0D5C3A) : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: _orderFrequency == 'subscription' ? const Color(0xFF0D5C3A) : const Color(0xFFDCE8DF),
                                    width: 1.5,
                                  ),
                                  boxShadow: _orderFrequency == 'subscription'
                                      ? [
                                          BoxShadow(
                                            color: const Color(0xFF0D5C3A).withValues(alpha: 0.2),
                                            blurRadius: 10,
                                            offset: const Offset(0, 3),
                                          ),
                                        ]
                                      : [],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.calendar_month_rounded,
                                          size: 16,
                                          color: _orderFrequency == 'subscription' ? Colors.white : const Color(0xFF0D5C3A),
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Daily Drop',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w900,
                                            color: _orderFrequency == 'subscription' ? Colors.white : const Color(0xFF0C2340),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Every morning by 6:30 AM · Pause anytime',
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        color: _orderFrequency == 'subscription'
                                            ? Colors.white.withValues(alpha: 0.85)
                                            : const Color(0xFF6B7280),
                                        height: 1.25,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // 4. QUANTITY SELECTOR & QUICK PRESETS
                      const Text(
                        'SELECT QUANTITY',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF496653),
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F7F4),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFDCE8DF)),
                            ),
                            child: Row(
                              children: [
                                IconButton(
                                  onPressed: () {
                                    if (_quantity > 1) {
                                      setState(() => _quantity--);
                                    }
                                  },
                                  icon: const Icon(Icons.remove_rounded, color: Color(0xFF0D5C3A), size: 20),
                                  constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                                  padding: EdgeInsets.zero,
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14),
                                  child: Text(
                                    '$_quantity',
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF0C2340),
                                    ),
                                  ),
                                ),
                                IconButton(
                                  onPressed: () => setState(() => _quantity++),
                                  icon: const Icon(Icons.add_rounded, color: Color(0xFF0D5C3A), size: 20),
                                  constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                                  padding: EdgeInsets.zero,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: _getPresetQuantities().map((q) {
                                  final isSelected = _quantity == q;
                                  return Padding(
                                    padding: const EdgeInsets.only(right: 6.0),
                                    child: InkWell(
                                      onTap: () => setState(() => _quantity = q),
                                      borderRadius: BorderRadius.circular(10),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                        decoration: BoxDecoration(
                                          color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFF3F7F4),
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(
                                            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFDCE8DF),
                                          ),
                                        ),
                                        child: Text(
                                          _getPresetLabel(q),
                                          style: TextStyle(
                                            color: isSelected ? Colors.white : const Color(0xFF374151),
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 22),

                      // 5. PURITY HIGHLIGHTS
                      const Divider(color: Color(0xFFE2EBE5), height: 1),
                      const SizedBox(height: 16),
                      const Text(
                        'FARM FRESH PROMISE',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF496653),
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 10),
                      ...[
                        'Delivered chilled to 4°C directly from farm to doorstep',
                        'Packaged in sterilized, reusable eco-glass bottles',
                        'Zero preservatives, zero oxytocin, unadulterated pure milk',
                        'Free early-morning delivery before 6:30 AM across Mumbai',
                      ].map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(bottom: 7.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  item,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    color: Color(0xFF4B5563),
                                    fontWeight: FontWeight.w500,
                                    height: 1.35,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 3. FLOATING CONTACT US BUTTON (Right above bottom bar, matching reference image)
          Positioned(
            right: 18,
            bottom: 90,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const ContactSupportScreen(initialTab: 0),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(30),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF059669),
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF059669).withValues(alpha: 0.35),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.phone_in_talk_rounded, color: Colors.white, size: 16),
                      SizedBox(width: 6),
                      Text(
                        'Contact Us',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // 4. STICKY BOTTOM ACTION BAR (Matching Reference Image)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
              decoration: BoxDecoration(
                color: Colors.white,
                border: const Border(top: BorderSide(color: Color(0xFFE5E7EB), width: 1)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Total Price & Frequency Label
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '₹${_totalPrice.toInt()}',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF059669),
                          ),
                        ),
                        Text(
                          _orderFrequency == 'subscription' ? 'Daily Morning Drop' : 'One-Time Morning Drop',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Start Subscription Button
                  ElevatedButton(
                    onPressed: _handleStartSubscription,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D5C3A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(28),
                      ),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _orderFrequency == 'subscription' ? 'Start Subscription' : 'Confirm Order',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.arrow_forward_rounded, size: 16),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

