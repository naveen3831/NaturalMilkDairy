import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/customer_provider.dart';
import '../../providers/product_provider.dart';
import '../auth/login_screen.dart';
import '../../data/models/product_model.dart';
import 'widgets/dairy_collection_card.dart';
import 'widgets/luxury_product_card.dart';
import 'widgets/notification_modal.dart';
import 'widgets/story_tab.dart';
import 'contact_support_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  String _collectionFilter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().loadProducts();
      context.read<CustomerProvider>().loadAllCustomerData();
    });
  }

  void _showProofPhotoDialog(String date, String? proofUrl, String? driverName) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog.fullscreen(
        child: Scaffold(
          backgroundColor: AppColors.milkWhite,
          appBar: AppBar(
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Delivery Photo Proof', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                Text(date, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.pop(ctx),
              ),
            ],
          ),
          body: Column(
            children: [
              Expanded(
                child: Container(
                  width: double.infinity,
                  color: AppColors.creamBg,
                  padding: const EdgeInsets.all(16),
                  child: Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: (proofUrl != null && proofUrl.isNotEmpty)
                          ? Image.network(
                              proofUrl,
                              fit: BoxFit.contain,
                              loadingBuilder: (c, w, p) => p == null
                                  ? w
                                  : const Center(child: CircularProgressIndicator()),
                              errorBuilder: (c, e, s) => Image.network(
                                'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
                                fit: BoxFit.contain,
                              ),
                            )
                          : Image.network(
                              'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
                              fit: BoxFit.contain,
                            ),
                    ),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  color: AppColors.milkWhite,
                  border: Border(top: BorderSide(color: AppColors.borderSubtle)),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.badgeSuccessBg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.verified_rounded, size: 18, color: AppColors.badgeSuccessText),
                          const SizedBox(width: 8),
                          Text(
                            driverName != null && driverName.isNotEmpty
                                ? 'Delivered by $driverName'
                                : 'Verified Contactless Doorstep Drop',
                            style: const TextStyle(
                              color: AppColors.badgeSuccessText,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Close'),
                      ),
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

  void _showDeliveriesModal(CustomerProvider customerProvider) {
    final deliveries = customerProvider.deliveries;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Verified Delivery Drops',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: deliveries.isEmpty
                    ? const Center(
                        child: Text(
                          'No verified delivery drops recorded yet.',
                          style: TextStyle(color: Color(0xFF6B7280), fontWeight: FontWeight.w600),
                        ),
                      )
                    : ListView.separated(
                        controller: scrollController,
                        itemCount: deliveries.length,
                        separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                        itemBuilder: (ctx, i) {
                          final item = deliveries[i];
                          final String rawDate = item['date']?.toString() ?? 'Morning Drop';
                          final String rawTime = item['time']?.toString() ?? '5:00 AM';
                          final String dateStr = _formatDeliveryDate(rawDate);
                          final String timeStr = _formatDeliveryTime(rawTime);
                          final String? proofImg = item['proofImage']?.toString();
                          final String driver = item['deliveryBoyName']?.toString() ?? 'Dairy Partner';

                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF9FAF9),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE2EBE5)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE2F1EA),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.verified_rounded, color: Color(0xFF0D5C3A), size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '$dateStr • $timeStr',
                                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0C2340)),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Delivered by $driver',
                                        style: const TextStyle(fontSize: 12, color: Color(0xFF597361)),
                                      ),
                                    ],
                                  ),
                                ),
                                if (proofImg != null && proofImg.isNotEmpty)
                                  TextButton.icon(
                                    onPressed: () => _showProofPhotoDialog(dateStr, proofImg, driver),
                                    icon: const Icon(Icons.photo_camera_rounded, size: 16, color: Color(0xFF0D5C3A)),
                                    label: const Text('View Proof', style: TextStyle(color: Color(0xFF0D5C3A), fontWeight: FontWeight.w800, fontSize: 12)),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showNotificationsSheet() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => NotificationModal(
          onViewProof: (date, proofUrl, driverName) {
            _showProofPhotoDialog(date, proofUrl, driverName);
          },
          onOpenDeliveries: () {
            _showDeliveriesModal(context.read<CustomerProvider>());
          },
          onNotificationChanged: () {
            setState(() {});
          },
        ),
      ),
    );
  }

  void _showContactSupportSheet() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const ContactSupportScreen(initialTab: 0),
      ),
    );
  }


  String _formatDeliveryDate(String raw) {
    if (raw.isEmpty) return 'Morning Drop';
    if (raw.startsWith('Today') || raw.startsWith('Yesterday')) return raw;
    if (raw.contains('-')) {
      final parts = raw.split('-');
      if (parts.length == 3) {
        final year = parts[0];
        final month = int.tryParse(parts[1]) ?? 1;
        final day = parts[2];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        final monthStr = (month >= 1 && month <= 12) ? months[month - 1] : parts[1];
        return '$day $monthStr $year';
      }
    }
    return raw;
  }

  String _formatDeliveryTime(String raw) {
    if (raw.isEmpty) return '5:00 AM – 6:30 AM';
    if (raw.contains(':') && (raw.contains('AM') || raw.contains('PM'))) return raw;
    if (raw.contains('T')) {
      try {
        final dt = DateTime.parse(raw).toLocal();
        final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
        final period = dt.hour >= 12 ? 'PM' : 'AM';
        final minute = dt.minute.toString().padLeft(2, '0');
        return '$hour:$minute $period';
      } catch (_) {}
    }
    return raw;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final List<Widget> pages = [
      _buildHomeFeed(user),
      _buildProductsTab(),
      _buildSubscriptionTab(user),
      StoryTab(onExploreProducts: () => setState(() => _currentIndex = 1)),
      _buildProfileTab(user, auth),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAF9),
      body: Column(
        children: [
          // Top Brand Header matching Image 1
          _buildTopBrandHeader(),

          // Active Tab Page Body
          Expanded(child: pages[_currentIndex]),
        ],
      ),
      floatingActionButton: _buildFloatingContactButton(),
      bottomNavigationBar: _buildCustomBottomNav(),
    );
  }

  // 1. TOP BRAND HEADER (Matching Image 1)
  Widget _buildTopBrandHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFEAEFEB), width: 1)),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: Padding(
                      padding: const EdgeInsets.all(4.0),
                      child: Image.asset(
                        'assets/images/logo.png',
                        fit: BoxFit.contain,
                        errorBuilder: (ctx, err, stack) => const Icon(
                          Icons.water_drop_rounded,
                          color: Color(0xFF0D5C3A),
                          size: 24,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'NATURAL MILK DAIRY',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0D5C3A),
                        letterSpacing: 0.5,
                      ),
                    ),
                    Text(
                      'NATURAL • PURE • HEALTHY',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E5E41),
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            // Notification Bell with Badge "4"
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    border: Border.all(color: const Color(0xFFE2EBE5)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: const Icon(Icons.notifications_outlined, color: Color(0xFF0D5C3A), size: 21),
                    onPressed: _showNotificationsSheet,
                  ),
                ),
                Positioned(
                  top: -2,
                  right: -2,
                  child: Container(
                    padding: const EdgeInsets.all(4.5),
                    decoration: const BoxDecoration(
                      color: Color(0xFFE11D48),
                      shape: BoxShape.circle,
                    ),
                    child: const Text(
                      '4',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // 2. HERO BANNER (Matching Image 1)
  Widget _buildHeroBanner() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        image: DecorationImage(
          image: NetworkImage(
            'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454813/natural-milk-dairy/hero-dairy.jpg',
          ),
          fit: BoxFit.cover,
        ),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 34),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black.withValues(alpha: 0.25),
              Colors.black.withValues(alpha: 0.72),
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sparkle Eyebrow Tag
            const Row(
              children: [
                Icon(Icons.auto_awesome, color: Color(0xFFF5C249), size: 16),
                SizedBox(width: 8),
                Text(
                  'FRESH FROM OUR FARM TO YOUR FAMILY',
                  style: TextStyle(
                    color: Color(0xFFF5C249),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.9,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Headline
            const Text(
              'A better start to\nevery morning.',
              style: TextStyle(
                fontSize: 34,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                height: 1.15,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 8),

            // Accent Subtitle
            const Text(
              'Pure dairy. Simply delivered.',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFFE5C07B),
              ),
            ),
            const SizedBox(height: 14),

            // Description Paragraph
            Text(
              'Thoughtfully sourced milk and dairy, prepared fresh and delivered to your doorstep each morning.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.92),
                height: 1.45,
              ),
            ),
            const SizedBox(height: 24),

            // Primary Golden Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => setState(() => _currentIndex = 1),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE5C07B),
                  foregroundColor: const Color(0xFF1A202C),
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Explore our dairy',
                      style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800),
                    ),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward_rounded, size: 18),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Secondary Translucent Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  final auth = context.read<AuthProvider>();
                  if (auth.isGuest || auth.user == null) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    );
                  } else {
                    setState(() => _currentIndex = 2);
                  }
                },
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.black.withValues(alpha: 0.40),
                  foregroundColor: Colors.white,
                  side: BorderSide(color: Colors.white.withValues(alpha: 0.5), width: 1.2),
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.water_drop_outlined, size: 19, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'Start a subscription',
                      style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Trust highlights
            Wrap(
              spacing: 16,
              runSpacing: 10,
              children: [
                _buildTrustItem(Icons.check_circle_outline_rounded, 'Carefully sourced'),
                _buildTrustItem(Icons.schedule_rounded, 'Morning delivery'),
                _buildTrustItem(Icons.verified_user_outlined, 'Quality you can trust'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrustItem(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 17, color: const Color(0xFFE5C07B)),
        const SizedBox(width: 6),
        Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  // TAB 0: HOME FEED
  Widget _buildHomeFeed(dynamic user) {
    final productProvider = context.watch<ProductProvider>();
    final customerProvider = context.watch<CustomerProvider>();
    final bool isGuest = user == null || user.isGuest == true;

    final rawProducts = productProvider.products.isNotEmpty
        ? productProvider.products
        : ProductModel.defaultCatalog;
    final displayProducts = rawProducts;
    final filteredCollectionProducts = displayProducts.where((p) {
      if (_collectionFilter == 'all') return true;
      final cat = p.category.toLowerCase();
      final name = p.name.toLowerCase();
      if (_collectionFilter == 'milk') {
        return cat == 'milk' || name.contains('milk');
      }
      if (_collectionFilter == 'curd_paneer') {
        return cat == 'curd' || cat == 'paneer' || name.contains('curd') || name.contains('paneer');
      }
      if (_collectionFilter == 'ghee') {
        return cat == 'ghee' || name.contains('ghee');
      }
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([
          productProvider.loadProducts(),
          if (!isGuest) customerProvider.loadAllCustomerData(silent: true),
        ]);
      },
      color: const Color(0xFF0D5C3A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Section (Image 1)
            _buildHeroBanner(),

            Padding(
              padding: const EdgeInsets.all(18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Active Subscription / Drop Status Card if logged in
                  if (!isGuest) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0D5C3A), Color(0xFF083C25)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                            blurRadius: 14,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Container(
                                  margin: const EdgeInsets.only(right: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.18),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.alarm_rounded, color: Color(0xFFF5C249), size: 14),
                                      SizedBox(width: 5),
                                      Expanded(
                                        child: Text(
                                          'Morning Slot · 5:00 AM – 6:30 AM',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: customerProvider.isPaused ? AppColors.badgeDangerBg : const Color(0xFF059669),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  customerProvider.isPaused ? 'Paused' : 'Active Drop',
                                  style: TextStyle(
                                    color: customerProvider.isPaused ? AppColors.badgeDangerText : Colors.white,
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Text(
                            customerProvider.isPaused
                                ? 'Morning Deliveries Paused'
                                : 'Tomorrow Morning Delivery Drop',
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            customerProvider.isPaused
                                ? 'Resume anytime in the Profile tab.'
                                : '${customerProvider.milkQuantity} Litre Farm Fresh Milk${customerProvider.curdQuantity > 0 ? " + ${customerProvider.curdQuantity}g Curd" : ""} to your door',
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.88), fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // OUR PURE DAIRY COLLECTION (Matching Image 1)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.auto_awesome_rounded, color: Color(0xFFD97706), size: 15),
                          SizedBox(width: 6),
                          Text(
                            'DIRECT FROM SINGLE-SOURCE FARM',
                            style: TextStyle(
                              color: Color(0xFF059669),
                              fontWeight: FontWeight.w800,
                              fontSize: 11.5,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ],
                      ),
                      TextButton(
                        onPressed: () => setState(() => _currentIndex = 1),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('View All', style: TextStyle(color: Color(0xFF0D5C3A), fontWeight: FontWeight.w800, fontSize: 12)),
                            Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF0D5C3A)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Our Pure Dairy Collection',
                    style: TextStyle(
                      fontSize: 23,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0C2340),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Zero adulteration, raw farm chilling to 4°C within 30 minutes, delivered in sterilized glass bottles before 6:30 AM across Mumbai.',
                    style: TextStyle(
                      fontSize: 13,
                      color: Color(0xFF526E5C),
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Category Filter Pills (Matching Image 1)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildCollectionFilterChip('all', 'All Products (${displayProducts.length})'),
                        const SizedBox(width: 8),
                        _buildCollectionFilterChip('milk', 'Fresh Milks'),
                        const SizedBox(width: 8),
                        _buildCollectionFilterChip('curd_paneer', 'Curd & Paneer'),
                        const SizedBox(width: 8),
                        _buildCollectionFilterChip('ghee', 'Desi A2 Ghee'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2-Column Product Grid (Matching Image 1)
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filteredCollectionProducts.length,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 14,
                      childAspectRatio: 0.465,
                    ),
                    itemBuilder: (ctx, i) {
                      final product = filteredCollectionProducts[i];
                      return DairyCollectionCard(
                        product: product,
                        onSubscribe: () => setState(() => _currentIndex = 2),
                      );
                    },
                  ),

                  const SizedBox(height: 16),

                  // Dairy Purity Promise Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2EBE5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.verified_user_rounded, color: Color(0xFF0D5C3A), size: 22),
                            SizedBox(width: 8),
                            Text(
                              'The Natural Milk Dairy Promise',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        _buildPromiseItem(Icons.eco_rounded, 'Zero Hormones & Oxytocin', '100% natural organic fodder fed cattle.'),
                        const SizedBox(height: 10),
                        _buildPromiseItem(Icons.ac_unit_rounded, 'Chilled to 4°C within 30 mins', 'Locks in vital vitamins, minerals & natural sweetness.'),
                        const SizedBox(height: 10),
                        _buildPromiseItem(Icons.wine_bar_rounded, 'Sterilized Glass Bottle Packaging', 'Eco-friendly and free from harmful microplastics.'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCollectionFilterChip(String key, String label) {
    final bool isSelected = _collectionFilter == key;

    return InkWell(
      onTap: () => setState(() => _collectionFilter = key),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0D5C3A) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE5E7EB),
            width: 1.2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF0D5C3A).withValues(alpha: 0.18),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF4B5563),
          ),
        ),
      ),
    );
  }

  Widget _buildPromiseItem(IconData icon, String title, String subtitle) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: const Color(0xFFE2F1EA),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: const Color(0xFF0D5C3A)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF0C2340))),
              Text(subtitle, style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280))),
            ],
          ),
        ),
      ],
    );
  }

  // TAB 1: PRODUCTS TAB (Matching Image 2)
  Widget _buildProductsTab() {
    final productProvider = context.watch<ProductProvider>();

    return RefreshIndicator(
      onRefresh: () => productProvider.loadProducts(),
      color: const Color(0xFF0D5C3A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Headline matching Image 2
            const Text(
              'Our Products',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0D5C3A),
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 8),

            // Subtitle Description matching Image 2
            const Text(
              'Pure, cold-chain protected cow milk, rich buffalo milk, thick traditional curd, and artisanal desi ghee delivered fresh every dawn.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.5,
                color: Color(0xFF4B5563),
                height: 1.5,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 22),

            // Category Filter Buttons in 2x2 Grid matching Image 2
            Row(
              children: [
                Expanded(child: _buildCategoryBtn('all', 'All Products', productProvider)),
                const SizedBox(width: 10),
                Expanded(child: _buildCategoryBtn('milk', 'Fresh Milk', productProvider)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _buildCategoryBtn('curd', 'Curd & Paneer', productProvider)),
                const SizedBox(width: 10),
                Expanded(child: _buildCategoryBtn('ghee', 'Vedic Desi Ghee', productProvider)),
              ],
            ),
            const SizedBox(height: 24),

            // List of Luxury Product Cards (matching Image 2)
            if (productProvider.isLoading)
              const Padding(
                padding: EdgeInsets.all(40.0),
                child: Center(
                  child: CircularProgressIndicator(color: Color(0xFF0D5C3A)),
                ),
              )
            else if (productProvider.filteredProducts.isEmpty)
              Padding(
                padding: const EdgeInsets.all(40.0),
                child: Column(
                  children: [
                    const Icon(Icons.inventory_2_outlined, size: 48, color: Color(0xFF9CA3AF)),
                    const SizedBox(height: 12),
                    const Text('No products in this category', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => productProvider.selectCategory('all'),
                      child: const Text('Show All Products'),
                    ),
                  ],
                ),
              )
            else
              ...productProvider.filteredProducts.map(
                (prod) => LuxuryProductCard(product: prod),
              ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryBtn(String id, String label, ProductProvider provider) {
    final bool isSelected = provider.selectedCategory == id;
    return InkWell(
      onTap: () => provider.selectCategory(id),
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFF3F7F4),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
            width: 1.2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF0D5C3A).withValues(alpha: 0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : const Color(0xFF1E3A2B),
              fontWeight: FontWeight.w800,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  // TAB 2: SUBSCRIPTION TAB (Placed right after Products)
  Widget _buildSubscriptionTab(dynamic user) {
    final bool isGuest = user == null || user.isGuest == true;
    final customerProvider = context.watch<CustomerProvider>();
    final productProvider = context.watch<ProductProvider>();

    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([
          productProvider.loadProducts(),
          if (!isGuest) customerProvider.loadAllCustomerData(silent: true),
        ]);
      },
      color: const Color(0xFF0D5C3A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2F1EA),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.calendar_month_rounded, color: Color(0xFF0D5C3A), size: 22),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Doorstep Subscription',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                      ),
                      Text(
                        'Fresh pure milk delivered daily before 6:30 AM',
                        style: TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Active Customer Section OR Guest Section
            if (!isGuest) ...[
              // 1. ACTIVE SUBSCRIPTION STATUS CARD
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0D5C3A), Color(0xFF083C25)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.alarm_rounded, color: Color(0xFFF5C249), size: 14),
                                const SizedBox(width: 5),
                                Expanded(
                                  child: Text(
                                    customerProvider.deliverySlot,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: customerProvider.isPaused ? const Color(0xFFDC2626) : const Color(0xFF10B981),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            customerProvider.isPaused ? 'PAUSED' : 'ACTIVE PLAN',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      customerProvider.isPaused
                          ? 'Morning Deliveries Paused'
                          : 'Your Daily Doorstep Plan',
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      customerProvider.isPaused
                          ? 'Tap resume below to restart fresh morning drops.'
                          : 'Delivered in sterile glass bottles to your doorstep before 6:30 AM.',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.88), fontSize: 13),
                    ),
                    const SizedBox(height: 18),

                    // Daily Quantities Box
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Row(
                                  children: const [
                                    Icon(Icons.water_drop_rounded, color: Color(0xFFE5C07B), size: 17),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Farm Fresh Cow Milk',
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13.5),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${customerProvider.milkQuantity} Litre / Day',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                              ),
                            ],
                          ),
                          if (customerProvider.curdQuantity > 0) ...[
                            const SizedBox(height: 10),
                            const Divider(color: Colors.white24, height: 1),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    children: const [
                                      Icon(Icons.breakfast_dining_rounded, color: Color(0xFFE5C07B), size: 17),
                                      SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          'Clay Pot Farm Curd',
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13.5),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${customerProvider.curdQuantity}g / Day',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Action Buttons Row: Pause/Resume + History
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: customerProvider.isLoading
                                ? null
                                : () async {
                                    final messenger = ScaffoldMessenger.of(context);
                                    if (customerProvider.isPaused) {
                                      final ok = await customerProvider.resumeSubscription();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text(ok ? 'Daily deliveries resumed!' : 'Failed to resume delivery drop.'),
                                          backgroundColor: ok ? const Color(0xFF0D5C3A) : Colors.red,
                                        ),
                                      );
                                    } else {
                                      final ok = await customerProvider.pauseSubscription();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text(ok ? 'Daily deliveries paused.' : 'Failed to pause delivery drop.'),
                                          backgroundColor: ok ? const Color(0xFF0D5C3A) : Colors.red,
                                        ),
                                      );
                                    }
                                  },
                            icon: Icon(
                              customerProvider.isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                              size: 18,
                            ),
                            label: Text(customerProvider.isPaused ? 'Resume Drop' : 'Pause Drop'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: customerProvider.isPaused ? const Color(0xFF10B981) : Colors.white,
                              foregroundColor: customerProvider.isPaused ? Colors.white : const Color(0xFF083C25),
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        OutlinedButton.icon(
                          onPressed: () => _showDeliveriesModal(customerProvider),
                          icon: const Icon(Icons.history_rounded, size: 17),
                          label: const Text('Proofs'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: BorderSide(color: Colors.white.withValues(alpha: 0.45)),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),

              // 2. UPCOMING 7-DAY DELIVERY SCHEDULE
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2EBE5)),
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
                    const Row(
                      children: [
                        Icon(Icons.event_note_rounded, color: Color(0xFF0D5C3A), size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Upcoming Morning Schedule',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Doorstep drops scheduled every morning by 6:30 AM',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
                    ),
                    const SizedBox(height: 14),
                    _buildWeeklyScheduleCards(customerProvider),
                  ],
                ),
              ),
              const SizedBox(height: 22),
            ] else ...[
              // GUEST HERO BANNER
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0D5C3A), Color(0xFF083C25)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'ZERO DEPOSIT · PAUSE ANYTIME',
                        style: TextStyle(color: Color(0xFFE5C07B), fontSize: 10.5, fontWeight: FontWeight.w800),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Pure Milk at Your Doorstep Every Morning by 6:30 AM',
                      style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w900, height: 1.25),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Milked at 3:30 AM, chilled instantly to 4°C, and delivered fresh to your door in eco-friendly glass bottles.',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13, height: 1.4),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const LoginScreen()),
                          );
                        },
                        icon: const Icon(Icons.login_rounded, size: 18),
                        label: const Text('Sign In to Start Subscription'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE5C07B),
                          foregroundColor: const Color(0xFF1A202C),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                          textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
            ],

            // 3. EXPLORE ALL SUBSCRIPTION PLANS
            const Text(
              'Select a Daily Plan',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
            ),
            const SizedBox(height: 4),
            const Text(
              'Choose your daily morning essentials. Adjust or pause anytime.',
              style: TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 14),

            // Plan 1: Desi Cow Milk
            _buildSubscriptionPlanCard(
              title: 'Desi Cow Milk (A2)',
              badge: 'Most Popular',
              price: '₹60',
              unit: '/ Litre',
              features: const [
                '100% Raw, unpasteurized natural A2 milk',
                'Delivered cold before 6:30 AM',
                'Sterilized returnable glass bottles',
                'Pause anytime with 1 tap from app',
              ],
              color: const Color(0xFF0D5C3A),
              bgColor: const Color(0xFFE2F1EA),
              onSelect: () => _handlePlanSelect(context, 'cow-milk', isGuest),
            ),
            const SizedBox(height: 14),

            // Plan 2: Rich Buffalo Milk
            _buildSubscriptionPlanCard(
              title: 'Rich Buffalo Milk',
              badge: 'Creamy & Thick',
              price: '₹75',
              unit: '/ Litre',
              features: const [
                'High-fat, rich whole milk with thick malai',
                'Delivered cold before 6:30 AM',
                'Zero preservatives or chemicals',
                'Flexible alternate day or daily drop',
              ],
              color: const Color(0xFF0284C7),
              bgColor: const Color(0xFFE0F2FE),
              onSelect: () => _handlePlanSelect(context, 'buffalo-milk', isGuest),
            ),
            const SizedBox(height: 14),

            // Plan 3: Morning Essentials Combo
            _buildSubscriptionPlanCard(
              title: 'Morning Essentials Combo',
              badge: 'Best Value',
              price: '₹95',
              unit: '/ Day',
              features: const [
                '1L Farm Fresh Milk + 500g Clay Pot Curd',
                'Save ₹15 daily on breakfast bundle',
                'Freshly set artisanal dahi with live cultures',
                'Skip or pause drops when traveling',
              ],
              color: const Color(0xFFD97706),
              bgColor: const Color(0xFFFEF3C7),
              onSelect: () => _handlePlanSelect(context, 'combo', isGuest),
            ),
            const SizedBox(height: 24),

            // 4. HOW SUBSCRIPTIONS WORK
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2EBE5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'How Doorstep Subscription Works',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                  ),
                  const SizedBox(height: 14),
                  _buildHowStep('1', 'Choose Your Quantity', 'Select daily milk (1L, 2L) and optional curd.'),
                  const SizedBox(height: 10),
                  _buildHowStep('2', 'Morning Drop by 6:30 AM', 'Delivered fresh in chilled glass bottles.'),
                  const SizedBox(height: 10),
                  _buildHowStep('3', 'Pause Anytime with 1 Tap', 'Going on vacation? Pause drop directly in app.'),
                  const SizedBox(height: 10),
                  _buildHowStep('4', 'Live Photo Delivery Proofs', 'Every drop photographed and recorded in ledger.'),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildWeeklyScheduleCards(CustomerProvider cp) {
    final now = DateTime.now();
    final days = List.generate(7, (i) => now.add(Duration(days: i)));
    final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: days.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final d = days[i];
          final isToday = i == 0;
          final isTomorrow = i == 1;
          final weekday = weekdays[d.weekday - 1];
          final isPaused = cp.isPaused;

          return Container(
            width: 72,
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
            decoration: BoxDecoration(
              color: isToday
                  ? const Color(0xFF0D5C3A)
                  : (isTomorrow ? const Color(0xFFE2F1EA) : const Color(0xFFF9FAF9)),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isToday
                    ? const Color(0xFF0D5C3A)
                    : (isTomorrow ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5)),
                width: isToday || isTomorrow ? 1.5 : 1,
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  weekday,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isToday ? Colors.white70 : const Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${d.day}',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: isToday ? Colors.white : const Color(0xFF0C2340),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  isPaused
                      ? 'Paused'
                      : (isToday ? 'Today' : (isTomorrow ? '6:30 AM' : '${cp.milkQuantity}L')),
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: isToday
                        ? const Color(0xFFF5C249)
                        : (isPaused ? Colors.red : const Color(0xFF0D5C3A)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSubscriptionPlanCard({
    required String title,
    required String badge,
    required String price,
    required String unit,
    required List<String> features,
    required Color color,
    required Color bgColor,
    required VoidCallback onSelect,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2EBE5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  badge,
                  style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w800),
                ),
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(price, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0C2340))),
                  Text(unit, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280), fontWeight: FontWeight.w600)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w900, color: Color(0xFF0C2340))),
          const SizedBox(height: 10),
          ...features.map((f) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Icon(Icons.check_circle_rounded, color: color, size: 15),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text(
                        f,
                        style: const TextStyle(fontSize: 12.5, color: Color(0xFF4B5563), fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onSelect,
              style: ElevatedButton.styleFrom(
                backgroundColor: color,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: const Text('Subscribe Daily', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }

  void _handlePlanSelect(BuildContext ctx, String planType, bool isGuest) {
    if (isGuest) {
      Navigator.push(ctx, MaterialPageRoute(builder: (_) => const LoginScreen()));
    } else {
      ScaffoldMessenger.of(ctx).showSnackBar(
        const SnackBar(
          content: Text('Your daily doorstep plan is active and synchronized in realtime!'),
          backgroundColor: Color(0xFF0D5C3A),
        ),
      );
    }
  }

  Widget _buildHowStep(String num, String title, String subtitle) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: const Color(0xFFE2F1EA),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              num,
              style: const TextStyle(color: Color(0xFF0D5C3A), fontWeight: FontWeight.w900, fontSize: 13),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0C2340)),
              ),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // TAB 4: PROFILE TAB (Subscription, Deliveries, Balance, Support)
  Widget _buildProfileTab(dynamic user, AuthProvider auth) {
    final bool isGuest = user == null || user.isGuest == true;
    final customerProvider = context.watch<CustomerProvider>();

    return RefreshIndicator(
      onRefresh: () async {
        if (!isGuest) await customerProvider.loadAllCustomerData(silent: true);
      },
      color: const Color(0xFF0D5C3A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // User Profile Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2EBE5)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: const Color(0xFFE2F1EA),
                    child: isGuest
                        ? const Icon(Icons.person_rounded, size: 36, color: Color(0xFF0D5C3A))
                        : Text(
                            (user?.name.isNotEmpty == true) ? user.name[0].toUpperCase() : 'U',
                            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                          ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isGuest ? 'Guest Explorer' : (user?.name ?? 'Customer Profile'),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isGuest ? 'Browsing Natural Milk Dairy' : (user?.mobile ?? '+91 98765 43210'),
                    style: const TextStyle(color: Color(0xFF6B7280), fontSize: 13),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2F1EA),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      isGuest ? 'Guest Mode' : 'Assigned Route: ${user?.area ?? "Madhapur"}',
                      style: const TextStyle(color: Color(0xFF0D5C3A), fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (!isGuest) ...[
              // Summary Stats Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2EBE5)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Column(
                      children: [
                        const Text('BALANCE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF9CA3AF))),
                        const SizedBox(height: 4),
                        Text(
                          '₹${customerProvider.currentBalance}',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 17,
                            color: customerProvider.currentBalance > 0 ? Colors.redAccent : const Color(0xFF0D5C3A),
                          ),
                        ),
                      ],
                    ),
                    Container(height: 36, width: 1, color: const Color(0xFFE2EBE5)),
                    Column(
                      children: [
                        const Text('DELIVERED', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF9CA3AF))),
                        const SizedBox(height: 4),
                        Text(
                          '${customerProvider.ledgerSummary?['totalMilkDelivered'] ?? 0} L',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: Color(0xFF0C2340)),
                        ),
                      ],
                    ),
                    Container(height: 36, width: 1, color: const Color(0xFFE2EBE5)),
                    Column(
                      children: [
                        const Text('DROP STATUS', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF9CA3AF))),
                        const SizedBox(height: 4),
                        Text(
                          customerProvider.isPaused ? 'Paused' : 'Active',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                            color: customerProvider.isPaused ? Colors.redAccent : const Color(0xFF0D5C3A),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Daily Morning Drop Plan Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2EBE5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Daily Milk Plan', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0C2340))),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: customerProvider.isPaused ? AppColors.badgeDangerBg : const Color(0xFFE2F1EA),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            customerProvider.isPaused ? 'PAUSED' : 'ACTIVE',
                            style: TextStyle(
                              color: customerProvider.isPaused ? AppColors.badgeDangerText : const Color(0xFF0D5C3A),
                              fontWeight: FontWeight.w800,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Morning Cow Milk', style: TextStyle(color: Color(0xFF6B7280), fontSize: 13)),
                        Text('${customerProvider.milkQuantity} Litre / day', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0C2340))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Thick Farm Curd', style: TextStyle(color: Color(0xFF6B7280), fontSize: 13)),
                        Text('${customerProvider.curdQuantity} Grams / day', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0C2340))),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: customerProvider.isLoading
                            ? null
                            : () async {
                                final messenger = ScaffoldMessenger.of(context);
                                if (customerProvider.isPaused) {
                                  final ok = await customerProvider.resumeSubscription();
                                  messenger.showSnackBar(SnackBar(content: Text(ok ? 'Delivery drop resumed!' : 'Failed to resume drop.')));
                                } else {
                                  final ok = await customerProvider.pauseSubscription();
                                  messenger.showSnackBar(SnackBar(content: Text(ok ? 'Delivery drop paused.' : 'Failed to pause drop.')));
                                }
                              },
                        icon: Icon(customerProvider.isPaused ? Icons.play_circle_outline : Icons.pause_circle_outline, size: 18),
                        label: Text(customerProvider.isPaused ? 'Resume Drop' : 'Pause Drop'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF0D5C3A),
                          side: const BorderSide(color: Color(0xFF0D5C3A)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
            ],

            if (isGuest)
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFFE2F1EA),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFF0D5C3A).withValues(alpha: 0.2)),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.lock_open_rounded, size: 30, color: Color(0xFF0D5C3A)),
                    const SizedBox(height: 10),
                    const Text(
                      'Sign In to Subscribe',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Access 5:00 AM daily doorstep drops, pause deliveries, and view real-time photo proofs.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF4B5563), fontSize: 12.5),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const LoginScreen()),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D5C3A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Sign In or Register', style: TextStyle(fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ],
                ),
              ),

            if (!isGuest) ...[
              _buildProfileTile(
                icon: Icons.camera_alt_outlined,
                title: 'Verified Delivery Records',
                subtitle: 'View doorstep drop history & photo proofs',
                onTap: () => _showDeliveriesModal(customerProvider),
              ),
            ],

            // Quick Support Tile
            _buildProfileTile(
              icon: Icons.support_agent_rounded,
              title: 'Helpline & Support',
              subtitle: '5:00 AM – 9:00 PM Helpline',
              onTap: _showContactSupportSheet,
            ),

            if (!isGuest)
              _buildProfileTile(
                icon: Icons.logout_rounded,
                title: 'Sign Out',
                subtitle: 'Log out of your dairy account',
                isDestructive: true,
                onTap: () async {
                  final navigator = Navigator.of(context);
                  await auth.logout();
                  if (!mounted) return;
                  navigator.pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const HomeScreen()),
                    (route) => false,
                  );
                },
              ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2EBE5)),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: ListTile(
          onTap: onTap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isDestructive ? const Color(0xFFFEE2E2) : const Color(0xFFE2F1EA),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: isDestructive ? Colors.red : const Color(0xFF0D5C3A), size: 20),
          ),
          title: Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: isDestructive ? Colors.red : const Color(0xFF0C2340),
            ),
          ),
          subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
          trailing: const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF)),
        ),
      ),
    );
  }

  // 3. FLOATING CONTACT BUTTON (Matching Image 1 & 2)
  Widget _buildFloatingContactButton() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: InkWell(
        onTap: _showContactSupportSheet,
        borderRadius: BorderRadius.circular(30),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
          decoration: BoxDecoration(
            color: const Color(0xFF0D5C3A),
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0D5C3A).withValues(alpha: 0.35),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.call_rounded, color: Colors.white, size: 18),
              SizedBox(width: 8),
              Text(
                'Contact Us',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 4. CUSTOM BOTTOM NAVIGATION BAR (Matching Image 1 & 2 with Subscription tab)
  Widget _buildCustomBottomNav() {
    final navItems = [
      {'index': 0, 'label': 'Home', 'icon': Icons.home_outlined, 'activeIcon': Icons.home_rounded},
      {'index': 1, 'label': 'Products', 'icon': Icons.shopping_bag_outlined, 'activeIcon': Icons.shopping_bag_rounded},
      {'index': 2, 'label': 'Subscription', 'icon': Icons.calendar_today_outlined, 'activeIcon': Icons.calendar_month_rounded},
      {'index': 3, 'label': 'Story', 'icon': Icons.menu_book_outlined, 'activeIcon': Icons.menu_book_rounded},
      {'index': 4, 'label': 'Profile', 'icon': Icons.person_outline_rounded, 'activeIcon': Icons.person_rounded},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: Color(0xFFEAEFEB), width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: navItems.map((item) {
            final int idx = item['index'] as int;
            final bool isSelected = _currentIndex == idx;
            final label = item['label'] as String;
            final icon = (isSelected ? item['activeIcon'] : item['icon']) as IconData;

            return InkWell(
              onTap: () => setState(() => _currentIndex = idx),
              borderRadius: BorderRadius.circular(16),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: isSelected
                    ? const EdgeInsets.symmetric(horizontal: 10, vertical: 5)
                    : const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFE2F1EA) : Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 21,
                      color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF6B7280),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                        color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}
