import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import 'package:natural_milk_dairy/providers/auth_provider.dart';
import 'package:natural_milk_dairy/providers/customer_provider.dart';
import 'package:natural_milk_dairy/providers/product_provider.dart';
import '../../data/services/api_service.dart';
import '../../data/services/realtime_service.dart';
import '../onboarding/onboarding_screen.dart';
import '../../data/models/product_model.dart';
import 'widgets/product_card.dart';
import 'widgets/notification_modal.dart';
import 'contact_support_screen.dart';
import 'product_details_screen.dart';
import 'subscription_details_screen.dart';
import 'subscription_history_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  final Set<String> _favoriteProductIds = {};
  String _productSearchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  int _unreadNotifCount = 0;
  StreamSubscription? _notifRealtimeSub;
  final ApiService _api = ApiService();
  late final PageController _bannerPageController = PageController();
  int _currentBannerIndex = 0;
  Timer? _bannerTimer;
  String _deliveryFilterTab = 'all'; // 'all', 'upcoming', 'history'

  final List<Map<String, dynamic>> _defaultBanners = [
    {
      'title': 'Pure Milk. Healthier Lives.',
      'category': 'milk',
      'image': 'assets/images/hero_banner_card.png',
    },
    {
      'title': 'Artisanal Curd & Soft Paneer',
      'category': 'curd',
      'image': 'assets/images/banner_curd_paneer.png',
    },
    {
      'title': 'A2 Vedic Desi Cow Ghee',
      'category': 'ghee',
      'image': 'assets/images/banner_ghee_butter.png',
    },
    {
      'title': 'Pure Milk Dairy Sweets',
      'category': 'sweets',
      'image': 'assets/images/banner_dairy_sweets.png',
    },
  ];
  List<Map<String, dynamic>> _banners = [];

  @override
  void initState() {
    super.initState();
    _fetchUnreadNotifCount();
    _initNotifRealtime();
    _banners = List.from(_defaultBanners);
    _fetchBanners();
    _startBannerTimer();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().loadProducts();
      context.read<CustomerProvider>().loadAllCustomerData();
    });
  }

  void _initNotifRealtime() {
    _notifRealtimeSub = RealtimeService().eventStream.listen((event) {
      final type = event['type']?.toString();
      if (type == 'NOTIFICATION_CREATED' ||
          type == 'NOTIFICATION_UPDATED' ||
          type == 'NOTIFICATION_DELETED' ||
          type == 'NOTIFICATIONS_CLEARED' ||
          type == 'DELIVERY_UPDATED') {
        _fetchUnreadNotifCount();
      }
    });
  }

  Future<void> _fetchUnreadNotifCount() async {
    try {
      final res = await _api.get('/api/notifications');
      if (res['success'] == true && res['notifications'] is List && mounted) {
        final list = res['notifications'] as List;
        setState(() {
          _unreadNotifCount = list.where((n) => n['isRead'] != true).length;
        });
      }
    } catch (_) {}
  }


  Future<void> _fetchBanners() async {
    try {
      final res = await _api.get('/api/banners');
      if (res['success'] == true && res['banners'] is List && mounted) {
        final list = (res['banners'] as List).cast<Map<String, dynamic>>();
        if (list.isNotEmpty) {
          setState(() {
            _banners = list.map((b) => {
              'title': b['title']?.toString() ?? '',
              'category': b['category']?.toString() ?? 'milk',
              'image': b['imageUrl']?.toString() ?? 'assets/images/hero_banner_card.png',
            }).toList();
          });
        }
      }
    } catch (_) {}
  }

  void _startBannerTimer() {
    _bannerTimer?.cancel();
    _bannerTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (!mounted || _banners.isEmpty || !_bannerPageController.hasClients) return;
      final next = (_currentBannerIndex + 1) % _banners.length;
      _bannerPageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _bannerTimer?.cancel();
    _bannerPageController.dispose();
    _notifRealtimeSub?.cancel();
    _searchController.dispose();
    super.dispose();
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


  Future<void> _openSubscriptionDetails() async {
    final targetIndex = await Navigator.push<int>(
      context,
      MaterialPageRoute(
        builder: (_) => const SubscriptionDetailsScreen(),
      ),
    );
    if (targetIndex != null && mounted) {
      setState(() => _currentIndex = targetIndex);
    }
  }

  void _showUpcomingDeliveryDetails(Map<String, dynamic> delivery) {
    final authProvider = context.read<AuthProvider>();
    final customerProvider = context.read<CustomerProvider>();
    final user = authProvider.user;
    final String address = user?.address?.isNotEmpty == true
        ? user!.address!
        : (customerProvider.customerData?['address']?.toString() ?? 'Madhapur, Hyderabad, Telangana - 500081');
    final String driverName = delivery['driver']?.toString() ?? 'Naveen Kumar';
    final String milkQty = delivery['milkQty']?.toString() ?? '1 L';
    final String curdQty = delivery['curdQty']?.toString() ?? '0 g';
    final bool hasCurd = curdQty != '0 g' && curdQty != '0g' && curdQty != '0';
    final String dayStr = delivery['day']?.toString() ?? 'Wed';
    final String dayNum = delivery['dayNum']?.toString() ?? '28';
    final String monthYear = delivery['monthYear']?.toString() ?? 'Oct 2026';
    final String paymentStatus = delivery['paymentStatus']?.toString() ?? 'Advance';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, scrollController) => Column(
          children: [
            // Drag Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFD1D5DB),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2F1EA),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.local_shipping_rounded, color: Color(0xFF0D5C3A), size: 22),
                      ),
                      const SizedBox(width: 10),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Upcoming Delivery',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0C2340),
                            ),
                          ),
                          Text(
                            'Scheduled morning doorstep drop',
                            style: TextStyle(fontSize: 11.5, color: Color(0xFF6B7280), fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF6B7280)),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0xFFE2EBE5)),
            // Scrollable Content
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(20),
                children: [
                  // Schedule Card with Green Gradient
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0D5C3A), Color(0xFF166534)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0D5C3A).withValues(alpha: 0.2),
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
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.circle, color: Color(0xFF86EFAC), size: 7),
                                  SizedBox(width: 5),
                                  Text(
                                    'SCHEDULED DROP',
                                    style: TextStyle(
                                      color: Color(0xFFBBF7D0),
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.ac_unit_rounded, color: Color(0xFFDCFCE7), size: 12),
                                  SizedBox(width: 4),
                                  Text(
                                    'Chilled to 4°C',
                                    style: TextStyle(color: Color(0xFFDCFCE7), fontSize: 11, fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Text(
                          '$dayStr, $dayNum $monthYear',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Row(
                          children: [
                            Icon(Icons.access_time_filled_rounded, color: Color(0xFFF0FDF4), size: 15),
                            SizedBox(width: 6),
                            Text(
                              '5:00 AM – 6:30 AM (Daily Morning Slot)',
                              style: TextStyle(
                                color: Color(0xFFF0FDF4),
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Items In This Drop Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2EBE5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ITEMS IN THIS DROP',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF6B7280),
                            letterSpacing: 0.6,
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Milk Item
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAF9),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFEEF3F0)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE2F1EA),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.water_drop_rounded, color: Color(0xFF0D5C3A), size: 24),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Farm Fresh Cow Milk',
                                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Pure A2 • Glass Bottle • Chilled 4°C',
                                      style: TextStyle(fontSize: 11, color: Color(0xFF6B7280), fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    milkQty,
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0D5C3A)),
                                  ),
                                  const Text(
                                    'Packed fresh',
                                    style: TextStyle(fontSize: 10, color: Color(0xFF059669), fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        if (hasCurd) ...[
                          const SizedBox(height: 10),
                          // Curd Item
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAF9),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFEEF3F0)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.lunch_dining_rounded, color: Color(0xFFB45309), size: 22),
                                ),
                                const SizedBox(width: 12),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Fresh Artisanal Curd',
                                        style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                                      ),
                                      SizedBox(height: 2),
                                      Text(
                                        'Thick & Probiotic • Traditional clay setting',
                                        style: TextStyle(fontSize: 11, color: Color(0xFF6B7280), fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      curdQty,
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFFB45309)),
                                    ),
                                    const Text(
                                      'Packed fresh',
                                      style: TextStyle(fontSize: 10, color: Color(0xFFD97706), fontWeight: FontWeight.w700),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Delivery Address Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2EBE5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'DOORSTEP DROP LOCATION',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF6B7280),
                            letterSpacing: 0.6,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE0F2FE),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.location_on_rounded, color: Color(0xFF0284C7), size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Home Doorstep',
                                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    address,
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.35),
                                  ),
                                  const SizedBox(height: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF0FDF4),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFFDCFCE7)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.check_circle_rounded, color: Color(0xFF0D5C3A), size: 12),
                                        SizedBox(width: 4),
                                        Text(
                                          'Drop at door milk bag / ring bell once',
                                          style: TextStyle(color: Color(0xFF0D5C3A), fontSize: 10.5, fontWeight: FontWeight.w700),
                                        ),
                                      ],
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

                  const SizedBox(height: 14),

                  // Assigned Delivery Partner Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2EBE5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'MORNING DELIVERY PARTNER',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF6B7280),
                            letterSpacing: 0.6,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 20,
                              backgroundColor: const Color(0xFFDCFCE7),
                              child: Text(
                                driverName.isNotEmpty ? driverName[0] : 'N',
                                style: const TextStyle(color: Color(0xFF15803D), fontWeight: FontWeight.w900, fontSize: 16),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        driverName,
                                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                                      ),
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFDCFCE7),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: const Text(
                                          'Assigned',
                                          style: TextStyle(color: Color(0xFF15803D), fontSize: 9.5, fontWeight: FontWeight.w800),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  const Text(
                                    'Madhapur Station Hub • Insulated Carrier',
                                    style: TextStyle(fontSize: 11.5, color: Color(0xFF6B7280), fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFBBF7D0)),
                              ),
                              child: const Icon(Icons.phone_rounded, color: Color(0xFF0D5C3A), size: 18),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Payment & Proof Guarantee Box
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'PAYMENT STATUS',
                              style: TextStyle(fontSize: 10, color: Color(0xFF6B7280), fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              paymentStatus == 'Paid' ? 'Paid in Advance' : 'Advance Active Plan',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: paymentStatus == 'Paid' ? const Color(0xFF15803D) : const Color(0xFF0369A1),
                              ),
                            ),
                          ],
                        ),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'VERIFICATION',
                              style: TextStyle(fontSize: 10, color: Color(0xFF6B7280), fontWeight: FontWeight.w700),
                            ),
                            SizedBox(height: 2),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified_user_rounded, color: Color(0xFF0D5C3A), size: 14),
                                SizedBox(width: 4),
                                Text(
                                  'Doorstep Photo Proof',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(ctx);
                            setState(() {
                              _currentIndex = 2; // Switch to Subscription tab
                            });
                          },
                          icon: const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF0D5C3A)),
                          label: const Text('Manage Plan', style: TextStyle(color: Color(0xFF0D5C3A), fontWeight: FontWeight.w800, fontSize: 13)),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: const BorderSide(color: Color(0xFF0D5C3A)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => Navigator.pop(ctx),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0D5C3A),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 0,
                          ),
                          child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ],
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

  void _showNotificationsSheet() async {
    await Navigator.push(
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
            _fetchUnreadNotifCount();
          },
        ),
      ),
    );
    _fetchUnreadNotifCount();
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
    if (raw.isEmpty) return '5:00 AM - 6:30 AM';
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
      _buildDeliveriesTab(user),
      _buildProfileTab(user, auth),
    ];

    return PopScope(
      canPop: _currentIndex == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _currentIndex != 0) {
          setState(() => _currentIndex = 0);
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF9FAF9),
        body: Column(
          children: [
            // Top Brand Header: Only show on Home tab (_currentIndex == 0)
            // Removed on Products, Subscription, Deliveries, Profile screens as requested
            if (_currentIndex == 0) _buildTopBrandHeader(),

            // Active Tab Page Body
            Expanded(
              child: _currentIndex == 0
                  ? pages[0]
                  : SafeArea(bottom: false, child: pages[_currentIndex]),
            ),
          ],
        ),
        floatingActionButton: _currentIndex == 0 ? _buildFloatingContactButton() : null,
        bottomNavigationBar: _buildCustomBottomNav(),
      ),
    );
  }

  // 1. TOP BRAND HEADER (Matching Images 1, 2, 3, 4)
  Widget _buildTopBrandHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFEAEFEB), width: 1)),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Row(
                children: [
                  if (_currentIndex != 0) ...[
                    InkWell(
                      onTap: () => setState(() => _currentIndex = 0),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        width: 34,
                        height: 34,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F7F4),
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                        ),
                        child: const Icon(
                          Icons.arrow_back_rounded,
                          color: Color(0xFF0D5C3A),
                          size: 18,
                        ),
                      ),
                    ),
                  ],
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(color: const Color(0xFFBCE3CE), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0D5C3A).withValues(alpha: 0.12),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: ClipOval(
                      child: Padding(
                        padding: const EdgeInsets.all(2.5),
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
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'NATURAL MILK DAIRY',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0D5C3A),
                            letterSpacing: 0.4,
                          ),
                        ),
                        Text(
                          'NATURAL • PURE • HEALTHY',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF15803D),
                            letterSpacing: 0.7,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Notification Bell with Badge
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 38,
                  height: 38,
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
                    icon: const Icon(Icons.notifications_outlined, color: Color(0xFF0D5C3A), size: 20),
                    onPressed: _showNotificationsSheet,
                  ),
                ),
                if (_unreadNotifCount >= 0)
                  Positioned(
                    top: 2,
                    right: 2,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE11D48),
                        shape: BoxShape.circle,
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

  // 3. HERO BANNER CAROUSEL (Matching Image 2, Admin-manageable with category redirects)
  Widget _buildHeroBanner(List<ProductModel> products) {
    if (_banners.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: AspectRatio(
          aspectRatio: 455 / 298,
          child: Stack(
            children: [
              PageView.builder(
                controller: _bannerPageController,
                itemCount: _banners.length,
                onPageChanged: (idx) {
                  if (mounted) setState(() => _currentBannerIndex = idx);
                },
                itemBuilder: (context, idx) {
                  final banner = _banners[idx];
                  final String imgPath = banner['image']?.toString() ?? '';
                  final isNet = imgPath.startsWith('http://') || imgPath.startsWith('https://');

                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        final cat = banner['category']?.toString() ?? 'milk';
                        context.read<ProductProvider>().selectCategory(cat);
                        setState(() => _currentIndex = 1);
                      },
                      child: isNet
                          ? Image.network(
                              imgPath,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Image.asset(
                                'assets/images/hero_banner_card.png',
                                fit: BoxFit.cover,
                              ),
                            )
                          : Image.asset(
                              imgPath.startsWith('/')
                                  ? 'assets/images$imgPath'
                                  : (imgPath.startsWith('assets/') ? imgPath : 'assets/images/$imgPath'),
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Image.asset(
                                'assets/images/hero_banner_card.png',
                                fit: BoxFit.cover,
                              ),
                            ),
                    ),
                  );
                },
              ),

              // Carousel Dots Indicator
              Positioned(
                bottom: 12,
                left: 18,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(_banners.length, (i) {
                    final isSel = i == _currentBannerIndex;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.only(right: 5),
                      width: isSel ? 18 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(3),
                        boxShadow: isSel
                            ? [
                                BoxShadow(
                                  color: const Color(0xFF0D5C3A).withValues(alpha: 0.3),
                                  blurRadius: 4,
                                  offset: const Offset(0, 1),
                                )
                              ]
                            : null,
                      ),
                    );
                  }),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  // 4. FEATURE BADGES STRIP (Matching Image 1)
  Widget _buildFeatureBadgesStrip() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8EFEA), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildFeatureBadgeItem(
            icon: Icons.eco_rounded,
            title: '100%\nPure & Natural',
          ),
          Container(width: 1, height: 36, color: const Color(0xFFF1F5F2)),
          _buildFeatureBadgeItem(
            icon: Icons.verified_user_rounded,
            title: 'No\nAdulteration',
          ),
          Container(width: 1, height: 36, color: const Color(0xFFF1F5F2)),
          _buildFeatureBadgeItem(
            icon: Icons.ac_unit_rounded,
            title: 'Chilled at\n4°C',
          ),
          Container(width: 1, height: 36, color: const Color(0xFFF1F5F2)),
          _buildFeatureBadgeItem(
            icon: Icons.local_shipping_rounded,
            title: 'Daily Delivery\nbefore 6:30 AM',
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureBadgeItem({required IconData icon, required String title}) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: Color(0xFFE8F5E9),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: const Color(0xFF0D5C3A), size: 22),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E293B),
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }

  // 5. SHOP BY CATEGORY (Matching Image 1)
  Widget _buildShopByCategory() {
    final categories = [
      {
        'id': 'milk',
        'title': 'Fresh Milks',
        'color': const Color(0xFFFFF8E7),
        'image': 'assets/images/cat_img_milk.png',
      },
      {
        'id': 'curd',
        'title': 'Curd & Paneer',
        'color': const Color(0xFFEAF7EE),
        'image': 'assets/images/cat_img_curd.png',
      },
      {
        'id': 'ghee',
        'title': 'Ghee & Butter',
        'color': const Color(0xFFFFF3D6),
        'image': 'assets/images/cat_img_ghee.png',
      },
      {
        'id': 'curd',
        'title': 'Dairy Sweets',
        'color': const Color(0xFFFDF0ED),
        'image': 'assets/images/cat_img_sweets.png',
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Shop by Category',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0C2340),
                  letterSpacing: -0.3,
                ),
              ),
              InkWell(
                onTap: () {
                  context.read<ProductProvider>().selectCategory('all');
                  setState(() => _currentIndex = 1);
                },
                child: const Row(
                  children: [
                    Text(
                      'View All',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0D5C3A),
                      ),
                    ),
                    SizedBox(width: 3),
                    Icon(Icons.arrow_forward_rounded, color: Color(0xFF0D5C3A), size: 14),
                  ],
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 140,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: categories.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final cat = categories[i];
              return InkWell(
                onTap: () {
                  context.read<ProductProvider>().selectCategory(cat['id'] as String);
                  setState(() => _currentIndex = 1);
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: 105,
                  decoration: BoxDecoration(
                    color: cat['color'] as Color,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
                  ),
                  child: Column(
                    children: [
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.asset(
                              cat['image'] as String,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Container(
                                color: Colors.white.withValues(alpha: 0.5),
                                child: const Icon(Icons.inventory_2_rounded, color: Color(0xFF0D5C3A)),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10, left: 6, right: 6),
                        child: Text(
                          cat['title'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // 6. BEST SELLING PRODUCTS (Matching Image 1)
  Widget _buildBestSellingProducts(List<ProductModel> products) {
    final bestSellers = products.isNotEmpty ? products : ProductModel.defaultCatalog;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 20, 18, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Best Selling Products',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0C2340),
                  letterSpacing: -0.3,
                ),
              ),
              InkWell(
                onTap: () {
                  context.read<ProductProvider>().selectCategory('all');
                  setState(() => _currentIndex = 1);
                },
                child: const Row(
                  children: [
                    Text(
                      'View All',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0D5C3A),
                      ),
                    ),
                    SizedBox(width: 3),
                    Icon(Icons.arrow_forward_rounded, color: Color(0xFF0D5C3A), size: 14),
                  ],
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 180,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: bestSellers.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final prod = bestSellers[i];
              final isFav = _favoriteProductIds.contains(prod.id);
              return InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => ProductDetailsScreen(product: prod)),
                  );
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: 150,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE8EFEA)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Stack(
                        children: [
                          ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                            child: SizedBox(
                              height: 110,
                              width: double.infinity,
                              child: Image.network(
                                ProductModel.resolveImageUrl(prod.imageUrl, prod.name, prod.category),
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => Image.asset(
                                  ProductModel.resolveAssetFallback(prod.name, prod.category),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            top: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0D5C3A),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                i == 0 ? 'BESTSELLER' : (i == 1 ? 'FARM FRESH' : (prod.badge.isNotEmpty ? prod.badge : 'FRESH')),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            top: 6,
                            right: 6,
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  if (isFav) {
                                    _favoriteProductIds.remove(prod.id);
                                  } else {
                                    _favoriteProductIds.add(prod.id);
                                  }
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
                                      color: Colors.black.withValues(alpha: 0.1),
                                      blurRadius: 4,
                                    ),
                                  ],
                                ),
                                child: Icon(
                                  isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                  size: 16,
                                  color: isFav ? const Color(0xFFE11D48) : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Text(
                          prod.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }


  // 7. HOW TO SUBSCRIBE (Simple & Professional 3-Step Guide)
  Widget _buildHowToSubscribe() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5EDE7), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0D5C3A).withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFEEF6F1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'HOW IT WORKS',
              style: TextStyle(
                color: Color(0xFF0D5C3A),
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'How to Subscribe',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0C2340),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 3),
          const Text(
            'Pure farm dairy at your doorstep in 3 simple steps',
            style: TextStyle(
              fontSize: 12.5,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 18),
          _buildStepRow(
            number: '1',
            icon: Icons.check_circle_outline_rounded,
            title: 'Choose Your Product',
            desc: 'Select farm-fresh cow milk, buffalo milk, thick curd, or ghee.',
            isLast: false,
          ),
          _buildStepRow(
            number: '2',
            icon: Icons.calendar_today_rounded,
            title: 'Set Your Schedule',
            desc: 'Pick daily, alternate days, or custom days. Pause anytime with 0 charges.',
            isLast: false,
          ),
          _buildStepRow(
            number: '3',
            icon: Icons.local_shipping_outlined,
            title: 'Doorstep Delivery by 6:30 AM',
            desc: 'Chilled at 4°C in sterilized bottles, placed silently at your door.',
            isLast: true,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                setState(() => _currentIndex = 2);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D5C3A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 0,
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Start Subscription',
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(width: 6),
                  Icon(Icons.arrow_forward_rounded, size: 16),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepRow({
    required String number,
    required IconData icon,
    required String title,
    required String desc,
    required bool isLast,
  }) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 26,
                height: 26,
                decoration: const BoxDecoration(
                  color: Color(0xFF0D5C3A),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  number,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    color: const Color(0xFFD4E7DC),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(icon, size: 14, color: const Color(0xFF0D5C3A)),
                      const SizedBox(width: 6),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0C2340),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    desc,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF55725F),
                      height: 1.35,
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

  // GREETING HEADER (Matching Image)
  Widget _buildGreetingHeader(dynamic user) {
    final now = DateTime.now();
    final hour = now.hour;
    String salutation = 'Good Morning,';
    if (hour >= 12 && hour < 17) {
      salutation = 'Good Afternoon,';
    } else if (hour >= 17 || hour < 5) {
      salutation = 'Good Evening,';
    }

    final String name = (user?.name != null && user.name.toString().trim().isNotEmpty)
        ? user.name.toString().trim()
        : 'Naveen Kumar';

    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            salutation,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0C2340),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                '☀️',
                style: TextStyle(fontSize: 20),
              ),
            ],
          ),
          const SizedBox(height: 3),
          const Text(
            'Fresh farm goodness delivered to your doorstep every morning.',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: Color(0xFF64748B),
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }

  // TAB 0: HOME FEED (Matching Image 1)
  Widget _buildHomeFeed(dynamic user) {
    final productProvider = context.watch<ProductProvider>();
    final customerProvider = context.watch<CustomerProvider>();
    final bool isGuest = user == null || user.isGuest == true;

    final rawProducts = productProvider.products.isNotEmpty
        ? productProvider.products
        : ProductModel.defaultCatalog;

    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait<dynamic>([
          productProvider.loadProducts(),
          if (!isGuest) customerProvider.loadAllCustomerData(silent: true) as Future<dynamic>,
        ]);
      },
      color: const Color(0xFF0D5C3A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 0. Greeting Header matching Image
            _buildGreetingHeader(user),

            // 1. Hero Banner matching Image 1
            _buildHeroBanner(rawProducts),

            // 2. Feature Badges Strip (4 columns) matching Image 1
            _buildFeatureBadgesStrip(),

            // 3. Shop by Category matching Image 1
            _buildShopByCategory(),

            // 4. Best Selling Products matching Image 1
            _buildBestSellingProducts(rawProducts),

            // 5. How to Subscribe (Simple & Professional 3-Step Guide)
            _buildHowToSubscribe(),

            const SizedBox(height: 70),
          ],
        ),
      ),
    );
  }

  // TAB 1: PRODUCTS TAB (Matching Image 2)
  Widget _buildProductsTab() {
    final productProvider = context.watch<ProductProvider>();
    final rawList = productProvider.filteredProducts.isNotEmpty
        ? productProvider.filteredProducts
        : ProductModel.defaultCatalog;

    final displayList = rawList.where((p) {
      if (_productSearchQuery.trim().isEmpty) return true;
      final q = _productSearchQuery.trim().toLowerCase();
      return p.name.toLowerCase().contains(q) ||
             p.description.toLowerCase().contains(q) ||
             p.category.toLowerCase().contains(q);
    }).toList();

    final categories = [
      {'id': 'all', 'label': 'All Products', 'icon': Icons.grid_view_rounded},
      {'id': 'milk', 'label': 'Fresh Milk', 'icon': Icons.local_drink_outlined},
      {'id': 'curd', 'label': 'Curd & Paneer', 'icon': Icons.radio_button_checked_rounded},
      {'id': 'ghee', 'label': 'Ghee & Butter', 'icon': Icons.local_dining_outlined},
    ];

    return RefreshIndicator(
      onRefresh: () => productProvider.loadProducts(),
      color: const Color(0xFF0D5C3A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Left-Aligned Heading matching Image with Milk Splash
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Our Products',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0C2340),
                          letterSpacing: -0.4,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Pure, cold-chain protected cow milk, rich buffalo milk, thick traditional curd and artisanal desi ghee delivered fresh every dawn.',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                          height: 1.35,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Image.asset(
                  'assets/images/header_milk_splash.png',
                  width: 90,
                  height: 75,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Search Bar matching Image 2
            Container(
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F2),
                borderRadius: BorderRadius.circular(25),
                border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: (val) {
                        setState(() {
                          _productSearchQuery = val;
                        });
                      },
                      style: const TextStyle(fontSize: 13, color: Color(0xFF0C2340)),
                      decoration: const InputDecoration(
                        hintText: 'Search products...',
                        hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                  if (_productSearchQuery.isNotEmpty)
                    InkWell(
                      onTap: () {
                        _searchController.clear();
                        setState(() => _productSearchQuery = '');
                      },
                      child: const Icon(Icons.close_rounded, size: 18, color: Color(0xFF94A3B8)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Category Filter Pills matching Image 2
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: categories.map((cat) {
                  final catId = cat['id'] as String;
                  final isSelected = productProvider.selectedCategory == catId;
                  final icon = cat['icon'] as IconData?;

                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: InkWell(
                      onTap: () => productProvider.selectCategory(catId),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7.5),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF0D5C3A) : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF0D5C3A).withValues(alpha: 0.35),
                            width: 1.2,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (icon != null) ...[
                              Icon(
                                icon,
                                size: 14,
                                color: isSelected ? Colors.white : const Color(0xFF0D5C3A),
                              ),
                              const SizedBox(width: 5),
                            ],
                            Text(
                              cat['label'] as String,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? Colors.white : const Color(0xFF0C2340),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // 2-Column Product Grid matching Image 2
            if (displayList.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Text('No products match your search.', style: TextStyle(color: Color(0xFF64748B))),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: displayList.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 14,
                  childAspectRatio: 0.58,
                ),
                itemBuilder: (ctx, i) => ProductCard(product: displayList[i]),
              ),

            const SizedBox(height: 70),
          ],
        ),
      ),
    );
  }

  // TAB 2: SUBSCRIPTION TAB (Matching Image 2 - Subscription Overview Screen)
  Widget _buildSubscriptionTab(dynamic user) {
    final dynamic customerProvider = context.watch<CustomerProvider>();
    final productProvider = context.watch<ProductProvider>();
    final isGuest = user == null || user.isGuest == true;

    List<Map<String, dynamic>> subHistory = [];
    try {
      final dynamic h = customerProvider.subscriptionsHistory;
      if (h is List) {
        subHistory = h.cast<Map<String, dynamic>>();
      }
    } catch (_) {
      try {
        final dynamic s = customerProvider.subscriptions;
        if (s is List) {
          subHistory = s.cast<Map<String, dynamic>>();
        }
      } catch (_) {}
    }
    final latestSub = subHistory.isNotEmpty ? subHistory.first : null;
    final String subStatus = latestSub?['status']?.toString().toLowerCase() ??
        (customerProvider.customerData?['subscription'] is Map
            ? customerProvider.customerData!['subscription']['status']?.toString().toLowerCase() ?? ''
            : '');
    final bool isSubFailed = subStatus == 'failed';
    final bool isSubPaused = customerProvider.isPaused == true || subStatus == 'paused';

    final subData = customerProvider.customerData?['subscription'];
    dynamic rawEndDate = (subData is Map) ? subData['endDate'] : null;
    if (rawEndDate == null && subHistory.isNotEmpty) {
      rawEndDate = subHistory.first['endDate'];
    }
    DateTime? calcEndDate;
    if (rawEndDate != null) {
      try {
        calcEndDate = DateTime.parse(rawEndDate.toString()).toLocal();
      } catch (_) {}
    }
    calcEndDate ??= DateTime.now().add(const Duration(days: 30));

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final targetEnd = DateTime(calcEndDate.year, calcEndDate.month, calcEndDate.day);
    final int subDaysRemaining = targetEnd.difference(today).inDays;
    final bool subExpired = targetEnd.isBefore(today) || subDaysRemaining < 0;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final String subFormattedExpiry = '${calcEndDate.day.toString().padLeft(2, '0')} ${monthNames[calcEndDate.month - 1]} ${calcEndDate.year}';

    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait<dynamic>([
          productProvider.loadProducts(),
          if (!isGuest) customerProvider.loadAllCustomerData(silent: true) as Future<dynamic>,
        ]);
      },
      color: const Color(0xFF0D5C3A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 36),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title & Subtitle matching Image 2
            const Text(
              'Subscription',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0C2340),
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Manage your daily dairy plans and upcoming deliveries.',
              style: TextStyle(
                fontSize: 12.5,
                color: Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 16),

            // 1. HERO BANNER CARD (Fresh Dairy Every Morning - Unified card matching Image 2 perfectly)
            InkWell(
              onTap: () => setState(() => _currentIndex = 1),
              borderRadius: BorderRadius.circular(22),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0xFFCEE7D9)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0D5C3A).withValues(alpha: 0.08),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(21),
                  child: AspectRatio(
                    aspectRatio: 1376 / 768,
                    child: Image.asset(
                      'assets/images/sub_hero_banner.png',
                      fit: BoxFit.cover,
                      filterQuality: FilterQuality.high,
                      errorBuilder: (c, e, s) => Image.asset(
                        'assets/images/hero_banner_card.png',
                        fit: BoxFit.cover,
                        filterQuality: FilterQuality.high,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 2. 4 FEATURE BADGES (Single card with 4 columns matching Image 2)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2EBE5)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(child: _buildSubFeatureBadge(Icons.eco_rounded, '100%\nPure & Natural')),
                  Container(width: 1, height: 28, color: const Color(0xFFE5EDE7)),
                  Expanded(child: _buildSubFeatureBadge(Icons.ac_unit_rounded, 'Chilled\nto 4°C')),
                  Container(width: 1, height: 28, color: const Color(0xFFE5EDE7)),
                  Expanded(child: _buildSubFeatureBadge(Icons.local_shipping_outlined, 'Doorstep\nDelivery')),
                  Container(width: 1, height: 28, color: const Color(0xFFE5EDE7)),
                  Expanded(child: _buildSubFeatureBadge(Icons.calendar_month_outlined, 'Flexible\nPlans')),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 3. ACTIVE SUBSCRIPTIONS SECTION (with View All)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Active Subscriptions',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0C2340),
                  ),
                ),
                InkWell(
                  onTap: () {
                    _openSubscriptionDetails();
                  },
                  child: const Row(
                    children: [
                      Text(
                        'View All',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0D5C3A),
                        ),
                      ),
                      SizedBox(width: 3),
                      Icon(Icons.arrow_forward_rounded, color: Color(0xFF0D5C3A), size: 13),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // ACTIVE SUBSCRIPTION CARD (Matching Image 2)
            InkWell(
              onTap: () {
                _openSubscriptionDetails();
              },
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
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
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Thumbnail
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 60,
                            height: 64,
                            color: const Color(0xFFF3F7F4),
                            child: Image.asset(
                              'assets/images/sub_active_thumb.png',
                              fit: BoxFit.cover,
                              filterQuality: FilterQuality.high,
                              errorBuilder: (c, e, s) => Image.asset(
                                'assets/images/best_cow_milk.png',
                                fit: BoxFit.cover,
                                filterQuality: FilterQuality.high,
                                errorBuilder: (c2, e2, s2) => Image.network(
                                  'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80',
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Expanded(
                                    child: Text(
                                      'Daily Farm Pure Milk Plan',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                        color: Color(0xFF0C2340),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: isSubFailed
                                          ? const Color(0xFFFEE2E2)
                                          : isSubPaused
                                              ? const Color(0xFFFEF3C7)
                                              : const Color(0xFFE2F1EA),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          isSubFailed
                                              ? Icons.cancel_rounded
                                              : isSubPaused
                                                  ? Icons.pause_circle_filled_rounded
                                                  : Icons.circle,
                                          color: isSubFailed
                                              ? const Color(0xFFDC2626)
                                              : isSubPaused
                                                  ? const Color(0xFFD97706)
                                                  : const Color(0xFF0D5C3A),
                                          size: isSubFailed || isSubPaused ? 11 : 6,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          isSubFailed
                                              ? 'Failed'
                                              : isSubPaused
                                                  ? 'Paused'
                                                  : 'Active',
                                          style: TextStyle(
                                            color: isSubFailed
                                                ? const Color(0xFFDC2626)
                                                : isSubPaused
                                                    ? const Color(0xFFD97706)
                                                    : const Color(0xFF0D5C3A),
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(
                                'ID: ${user?.customerId ?? "CUST-101"} \u2022 ${customerProvider.frequency == "alternate" ? "Alternate Days" : "Daily Morning"}',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: Color(0xFF6B7280),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 5),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                decoration: BoxDecoration(
                                  color: subExpired
                                      ? const Color(0xFFFEE2E2)
                                      : subDaysRemaining <= 3
                                          ? const Color(0xFFFEF3C7)
                                          : const Color(0xFFE2F1EA),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: subExpired
                                        ? const Color(0xFFFCA5A5)
                                        : subDaysRemaining <= 3
                                            ? const Color(0xFFFDE68A)
                                            : const Color(0xFFBBF7D0),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.event_available_rounded,
                                      size: 13,
                                      color: subExpired
                                          ? const Color(0xFFDC2626)
                                          : subDaysRemaining <= 3
                                              ? const Color(0xFFD97706)
                                              : const Color(0xFF0D5C3A),
                                    ),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        subExpired
                                            ? 'Valid Until: $subFormattedExpiry (Expired)'
                                            : 'Valid Until: $subFormattedExpiry ($subDaysRemaining Days Left)',
                                        style: TextStyle(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w800,
                                          color: subExpired
                                              ? const Color(0xFFDC2626)
                                              : subDaysRemaining <= 3
                                                  ? const Color(0xFFB45309)
                                                  : const Color(0xFF0D5C3A),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // 3 Spec Boxes in a Row (Overflow-safe with FittedBox so text never truncates)
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F8F4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFDEEDE2)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.local_drink_outlined, size: 13, color: Color(0xFF0D5C3A)),
                                const SizedBox(width: 3),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: Text(
                                          '${customerProvider.milkQuantity > 0 ? customerProvider.milkQuantity : 1} L / day',
                                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                        ),
                                      ),
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: Text(
                                          'Pure A2 Milk',
                                          style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F8F4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFDEEDE2)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.access_time_rounded, size: 13, color: Color(0xFF0D5C3A)),
                                SizedBox(width: 3),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: Text(
                                          'Before 6:30 AM',
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                        ),
                                      ),
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: Text(
                                          'Morning Delivery',
                                          style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F8F4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFDEEDE2)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 13, color: Color(0xFF0D5C3A)),
                                const SizedBox(width: 3),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: Text(
                                          user?.area ?? 'Madhupur',
                                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                        ),
                                      ),
                                      const FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: Text(
                                          'Delivery Area',
                                          style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1, color: Color(0xFFF0F3F1)),
                    const SizedBox(height: 12),

                    // Two Buttons: View Details (outlined) & Manage Plan (dark green)
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 38,
                            child: OutlinedButton(
                              onPressed: () {
                                _openSubscriptionDetails();
                              },
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFF0D5C3A), width: 1.2),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: EdgeInsets.zero,
                              ),
                              child: const Text(
                                'View Details',
                                style: TextStyle(
                                  color: Color(0xFF0D5C3A),
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: SizedBox(
                            height: 38,
                            child: ElevatedButton(
                              onPressed: () {
                                _openSubscriptionDetails();
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0D5C3A),
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: EdgeInsets.zero,
                              ),
                              child: const Text(
                                'Manage Plan',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
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
            const SizedBox(height: 22),

            // 4. MORE SUBSCRIPTION PLANS (Horizontal scroll matching Image 2)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'More Subscription Plans',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0C2340),
                  ),
                ),
                InkWell(
                  onTap: () => setState(() => _currentIndex = 1),
                  child: const Row(
                    children: [
                      Text(
                        'View All',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0D5C3A),
                        ),
                      ),
                      SizedBox(width: 3),
                      Icon(Icons.arrow_forward_rounded, color: Color(0xFF0D5C3A), size: 13),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: [
                  _buildMorePlanCard(
                    title: 'Milk Plans',
                    subtitle: 'Cow & Buffalo Milk',
                    imageAsset: 'assets/images/cat_img_milk.png',
                    cardBg: const Color(0xFFEBF6F0),
                    onTap: () => setState(() => _currentIndex = 1),
                  ),
                  const SizedBox(width: 10),
                  _buildMorePlanCard(
                    title: 'Curd Plans',
                    subtitle: 'Fresh & Thick Curd',
                    imageAsset: 'assets/images/cat_img_curd.png',
                    cardBg: const Color(0xFFEFF4FB),
                    onTap: () => setState(() => _currentIndex = 1),
                  ),
                  const SizedBox(width: 10),
                  _buildMorePlanCard(
                    title: 'Ghee Plans',
                    subtitle: 'Vedic Desi Ghee',
                    imageAsset: 'assets/images/cat_img_ghee.png',
                    cardBg: const Color(0xFFFEF7EE),
                    onTap: () => setState(() => _currentIndex = 1),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSubFeatureBadge(IconData icon, String label) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: const BoxDecoration(
            color: Color(0xFFE2F1EA),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: const Color(0xFF0D5C3A), size: 18),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0C2340),
            height: 1.2,
          ),
        ),
      ],
    );
  }

  Widget _buildMorePlanCard({
    required String title,
    required String subtitle,
    required String imageAsset,
    required Color cardBg,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 136,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2EBE5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Container(
                height: 72,
                width: double.infinity,
                color: Colors.white.withValues(alpha: 0.7),
                child: Image.asset(
                  imageAsset,
                  fit: BoxFit.contain,
                  errorBuilder: (c, e, s) => const Icon(Icons.water_drop_rounded, color: Color(0xFF0D5C3A)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: Color(0xFF0D5C3A), size: 16),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Map<String, String> _parseDateParts(String raw) {
    if (raw.isEmpty) return {'day': 'Wed', 'dayNum': '28', 'monthYear': 'Oct 2026'};
    try {
      final dt = DateTime.parse(raw);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final dayStr = days[dt.weekday - 1];
      final monthStr = months[dt.month - 1];
      return {'day': dayStr, 'dayNum': dt.day.toString(), 'monthYear': '$monthStr ${dt.year}'};
    } catch (_) {
      return {'day': 'Wed', 'dayNum': '28', 'monthYear': 'Oct 2026'};
    }
  }

  Widget _buildDeliveryFilterTabPill(String tabKey, String label, int count) {
    final bool isSelected = _deliveryFilterTab == tabKey;

    return InkWell(
      onTap: () => setState(() => _deliveryFilterTab = tabKey),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: isSelected ? 13 : 11,
          vertical: 6,
        ),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0D5C3A) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(width: 5),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withValues(alpha: 0.25)
                    : (tabKey == 'upcoming'
                        ? const Color(0xFFFEF3C7)
                        : (tabKey == 'history' ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9))),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                count.toString(),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: isSelected
                      ? Colors.white
                      : (tabKey == 'upcoming'
                          ? const Color(0xFFB45309)
                          : (tabKey == 'history' ? const Color(0xFF15803D) : const Color(0xFF475569))),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // TAB 3: DELIVERIES TAB (Upcoming & Delivery History)
  Widget _buildDeliveriesTab(dynamic user) {
    final customerProvider = context.watch<CustomerProvider>();
    final isGuest = user == null || user.isGuest == true;
    final serverDeliveries = customerProvider.deliveries;

    // Build unified delivery entries list
    final List<Map<String, dynamic>> allDeliveries = serverDeliveries.isNotEmpty
        ? serverDeliveries.map((item) {
            final String rawDate = item['date']?.toString() ?? '2026-10-28';
            final bool isDelivered = item['status'] == 'delivered' || item['isDelivered'] == true;
            final dateParts = _parseDateParts(rawDate);
            return {
              'id': item['id'] ?? item['_id'],
              'date': rawDate,
              'day': dateParts['day'] ?? 'Wed',
              'dayNum': dateParts['dayNum'] ?? '28',
              'monthYear': dateParts['monthYear'] ?? 'Oct 2026',
              'timeSlot': isDelivered ? (_formatDeliveryTime(item['time']?.toString() ?? '6:15 AM')) : '5:00 AM - 6:30 AM',
              'milkQty': '${item['milkQuantity'] ?? item['actualMilk'] ?? 1} L',
              'curdQty': '${item['curdQuantity'] ?? item['actualCurd'] ?? 0} g',
              'isDelivered': isDelivered,
              'paymentStatus': isDelivered ? 'Paid' : 'Advance',
              'proofImage': item['proofImage']?.toString(),
              'driver': item['deliveryBoyName']?.toString() ?? 'Naveen Kumar',
            };
          }).toList()
        : [
            // Sample upcoming
            {
              'id': 'u1',
              'date': '2026-10-29',
              'day': 'Thu',
              'dayNum': '29',
              'monthYear': 'Oct 2026',
              'timeSlot': '5:00 AM - 6:30 AM',
              'milkQty': '1 L',
              'curdQty': '0 g',
              'isDelivered': false,
              'paymentStatus': 'Advance',
              'proofImage': null,
              'driver': 'Naveen Kumar',
            },
            {
              'id': 'u2',
              'date': '2026-10-28',
              'day': 'Wed',
              'dayNum': '28',
              'monthYear': 'Oct 2026',
              'timeSlot': '5:00 AM - 6:30 AM',
              'milkQty': '1 L',
              'curdQty': '500 g',
              'isDelivered': false,
              'paymentStatus': 'Advance',
              'proofImage': null,
              'driver': 'Naveen Kumar',
            },
            {
              'id': 'u3',
              'date': '2026-10-27',
              'day': 'Tue',
              'dayNum': '27',
              'monthYear': 'Oct 2026',
              'timeSlot': '5:00 AM - 6:30 AM',
              'milkQty': '1 L',
              'curdQty': '0 g',
              'isDelivered': false,
              'paymentStatus': 'Advance',
              'proofImage': null,
              'driver': 'Naveen Kumar',
            },
            // Sample delivery history
            {
              'id': 'h1',
              'date': '2026-10-26',
              'day': 'Mon',
              'dayNum': '26',
              'monthYear': 'Oct 2026',
              'timeSlot': 'Delivered 6:15 AM',
              'milkQty': '1 L',
              'curdQty': '500 g',
              'isDelivered': true,
              'paymentStatus': 'Paid',
              'proofImage': 'assets/images/dairy_hero.jpg',
              'driver': 'Naveen Kumar',
            },
            {
              'id': 'h2',
              'date': '2026-10-25',
              'day': 'Sun',
              'dayNum': '25',
              'monthYear': 'Oct 2026',
              'timeSlot': 'Delivered 6:05 AM',
              'milkQty': '1 L',
              'curdQty': '0 g',
              'isDelivered': true,
              'paymentStatus': 'Paid',
              'proofImage': 'assets/images/dairy_hero.jpg',
              'driver': 'Naveen Kumar',
            },
            {
              'id': 'h3',
              'date': '2026-10-24',
              'day': 'Sat',
              'dayNum': '24',
              'monthYear': 'Oct 2026',
              'timeSlot': 'Delivered 6:20 AM',
              'milkQty': '1 L',
              'curdQty': '500 g',
              'isDelivered': true,
              'paymentStatus': 'Paid',
              'proofImage': 'assets/images/dairy_hero.jpg',
              'driver': 'Naveen Kumar',
            },
            {
              'id': 'h4',
              'date': '2026-10-23',
              'day': 'Fri',
              'dayNum': '23',
              'monthYear': 'Oct 2026',
              'timeSlot': 'Delivered 6:10 AM',
              'milkQty': '1 L',
              'curdQty': '500 g',
              'isDelivered': true,
              'paymentStatus': 'Paid',
              'proofImage': 'assets/images/dairy_hero.jpg',
              'driver': 'Naveen Kumar',
            },
          ];

    final upcomingDeliveries = allDeliveries.where((d) => d['isDelivered'] != true).toList();
    final historyDeliveries = allDeliveries.where((d) => d['isDelivered'] == true).toList();

    return RefreshIndicator(
      onRefresh: () async {
        if (!isGuest) await customerProvider.loadAllCustomerData(silent: true);
      },
      color: const Color(0xFF0D5C3A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title & Subtitle matching Image 3
            const Text(
              'Deliveries',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0C2340),
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Track your doorstep deliveries and payments.',
              style: TextStyle(
                fontSize: 12.5,
                color: Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 16),

            // Hero Illustration Banner (Farm pasture with bottle and glass)
            Container(
              height: 140,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFCEE7D9)),
                image: const DecorationImage(
                  image: AssetImage('assets/images/dairy_hero.jpg'),
                  fit: BoxFit.cover,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 4 Stat Metric Cards (2x2 Grid)
            Row(
              children: [
                Expanded(
                  child: _buildDeliveryMetricCard(
                    icon: Icons.local_shipping_outlined,
                    iconBg: const Color(0xFFE0F2FE),
                    iconColor: const Color(0xFF0284C7),
                    value: allDeliveries.length.toString(),
                    label: 'Total Drops',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildDeliveryMetricCard(
                    icon: Icons.check_circle_outline_rounded,
                    iconBg: const Color(0xFFDCFCE7),
                    iconColor: const Color(0xFF16A34A),
                    value: historyDeliveries.length.toString(),
                    label: 'Delivered',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _buildDeliveryMetricCard(
                    icon: Icons.access_time_rounded,
                    iconBg: const Color(0xFFFEF3C7),
                    iconColor: const Color(0xFFD97706),
                    value: upcomingDeliveries.length.toString(),
                    label: 'Pending Drops',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildDeliveryMetricCard(
                    icon: Icons.ac_unit_rounded,
                    iconBg: const Color(0xFFE2F1EA),
                    iconColor: const Color(0xFF0D5C3A),
                    value: '100%',
                    label: 'Cold-Chain 4°C',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 3 Filter Pills: All, Upcoming, Delivery History
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildDeliveryFilterTabPill('all', 'All', allDeliveries.length),
                  const SizedBox(width: 8),
                  _buildDeliveryFilterTabPill('upcoming', 'Upcoming', upcomingDeliveries.length),
                  const SizedBox(width: 8),
                  _buildDeliveryFilterTabPill('history', 'Delivery History', historyDeliveries.length),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // SECTION 1: UPCOMING DELIVERIES
            if (_deliveryFilterTab == 'all' || _deliveryFilterTab == 'upcoming') ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Flexible(
                          child: Text(
                            'Upcoming Deliveries',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0C2340),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                          ),
                          child: Text(
                            '${upcomingDeliveries.length} Scheduled',
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFB45309),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Morning Slot',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              if (upcomingDeliveries.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2EBE5)),
                  ),
                  child: const Center(
                    child: Text(
                      'No upcoming deliveries scheduled for this cycle.',
                      style: TextStyle(color: Color(0xFF6B7280), fontSize: 12),
                    ),
                  ),
                )
              else
                ...upcomingDeliveries.map((delivery) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _buildUpcomingDeliveryCard(
                        day: delivery['day'] ?? 'Wed',
                        date: delivery['dayNum'] ?? '28',
                        monthYear: delivery['monthYear'] ?? 'Oct 2026',
                        timeSlot: delivery['timeSlot'] ?? '5:00 AM - 6:30 AM',
                        milkQty: delivery['milkQty'] ?? '1 L',
                        curdQty: delivery['curdQty'] ?? '0 g',
                        isDelivered: false,
                        paymentStatus: delivery['paymentStatus'] ?? 'Advance',
                        proofImage: delivery['proofImage'],
                        driverName: delivery['driver'],
                        onProofTap: () => _showProofPhotoDialog(
                          delivery['date'] ?? 'Morning Drop',
                          delivery['proofImage'],
                          delivery['driver'],
                        ),
                        onTap: () => _showUpcomingDeliveryDetails(delivery),
                      ),
                    )),
              const SizedBox(height: 10),
            ],

            // SECTION 2: DELIVERY HISTORY (Past Verified Drops)
            if (_deliveryFilterTab == 'all' || _deliveryFilterTab == 'history') ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Flexible(
                          child: Text(
                            'Delivery History',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0C2340),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: Text(
                            '${historyDeliveries.length} Drops',
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF15803D),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, size: 12, color: Color(0xFF059669)),
                      SizedBox(width: 3),
                      Text(
                        'Verified',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF059669),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),

              if (historyDeliveries.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2EBE5)),
                  ),
                  child: const Center(
                    child: Text(
                      'No completed deliveries in your history yet.',
                      style: TextStyle(color: Color(0xFF6B7280), fontSize: 12),
                    ),
                  ),
                )
              else
                ...historyDeliveries.map((delivery) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _buildUpcomingDeliveryCard(
                        day: delivery['day'] ?? 'Wed',
                        date: delivery['dayNum'] ?? '28',
                        monthYear: delivery['monthYear'] ?? 'Oct 2026',
                        timeSlot: delivery['timeSlot'] ?? 'Delivered 6:15 AM',
                        milkQty: delivery['milkQty'] ?? '1 L',
                        curdQty: delivery['curdQty'] ?? '0 g',
                        isDelivered: true,
                        paymentStatus: delivery['paymentStatus'] ?? 'Paid',
                        proofImage: delivery['proofImage'],
                        driverName: delivery['driver'],
                        onProofTap: () => _showProofPhotoDialog(
                          delivery['date'] ?? 'Morning Drop',
                          delivery['proofImage'],
                          delivery['driver'],
                        ),
                        onTap: () => _showDeliveriesModal(customerProvider),
                      ),
                    )),
              const SizedBox(height: 30),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDeliveryMetricCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String value,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2EBE5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 19),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0C2340),
                  ),
                ),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingDeliveryCard({
    required String day,
    required String date,
    required String monthYear,
    required String timeSlot,
    required String milkQty,
    required String curdQty,
    required bool isDelivered,
    required String paymentStatus,
    String? proofImage,
    String? driverName,
    VoidCallback? onProofTap,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2EBE5)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Left Date Box matching Image 3
            Container(
              width: 58,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F7F4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2EBE5)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    day,
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF4B5563),
                    ),
                  ),
                  Text(
                    date,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0C2340),
                      height: 1.1,
                    ),
                  ),
                  Text(
                    monthYear,
                    style: const TextStyle(
                      fontSize: 8.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),

            // Middle: Time Slot & Products
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.access_time_rounded, color: Color(0xFF0D5C3A), size: 12),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          timeSlot,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: SizedBox(
                              width: 16,
                              height: 18,
                              child: Image.asset('assets/images/cat_img_milk.png', fit: BoxFit.cover),
                            ),
                          ),
                          const SizedBox(width: 3),
                          Text(
                            'Milk $milkQty',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF0C2340)),
                          ),
                        ],
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: SizedBox(
                              width: 16,
                              height: 18,
                              child: Image.asset('assets/images/cat_img_curd.png', fit: BoxFit.cover),
                            ),
                          ),
                          const SizedBox(width: 3),
                          Text(
                            'Curd $curdQty',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF0C2340)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Right: Status Pill & Payment Badge
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isDelivered ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isDelivered ? Icons.check_circle_rounded : Icons.access_time_rounded,
                        color: isDelivered ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                        size: 11,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isDelivered ? 'Delivered' : 'Pending',
                        style: TextStyle(
                          color: isDelivered ? const Color(0xFF15803D) : const Color(0xFFB45309),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerRight,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Payment ', style: TextStyle(fontSize: 9.5, color: Color(0xFF6B7280))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: paymentStatus == 'Paid' ? const Color(0xFFDCFCE7) : const Color(0xFFFEF9C3),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          paymentStatus,
                          style: TextStyle(
                            color: paymentStatus == 'Paid' ? const Color(0xFF15803D) : const Color(0xFF854D0E),
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 16),
                    ],
                  ),
                ),
                if (isDelivered) ...[
                  const SizedBox(height: 5),
                  InkWell(
                    onTap: onProofTap ?? onTap,
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2F1EA),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.camera_alt_outlined, size: 10, color: Color(0xFF0D5C3A)),
                          SizedBox(width: 3),
                          Text(
                            'Proof',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0D5C3A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  // TAB 4: PROFILE TAB (Matching Image 4)
  Widget _buildProfileTab(dynamic user, AuthProvider auth) {
    final customerProvider = context.watch<CustomerProvider>();
    final isGuest = user == null || user.isGuest == true;

    final String name = isGuest ? 'Guest Explorer' : (user?.name ?? 'Naveen Kumar');
    final String customerId = isGuest ? 'GUEST-001' : (user?.customerId ?? 'CUST-101');
    final String mobile = isGuest ? '+91 77022 33931' : (user?.mobile ?? '7702233931');

    return RefreshIndicator(
      onRefresh: () async {
        if (!isGuest) await customerProvider.loadAllCustomerData(silent: true);
      },
      color: const Color(0xFF0D5C3A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title & Subtitle + Top-Right Milk Illustration
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'My Profile',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0C2340),
                          letterSpacing: -0.3,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Manage your account, deliveries and preferences.',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                ),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 52,
                    height: 52,
                    child: Image.asset(
                      'assets/images/cat_img_milk.png',
                      fit: BoxFit.cover,
                      errorBuilder: (c, e, s) => const SizedBox(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // User Identity Card matching Image 4
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2EBE5)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: const BoxDecoration(
                      color: Color(0xFFE2F1EA),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.person_outline_rounded,
                      color: Color(0xFF0D5C3A),
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'ID: $customerId',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280), fontWeight: FontWeight.w600),
                        ),
                        Text(
                          mobile,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2F1EA),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Text(
                      'Active',
                      style: TextStyle(
                        color: Color(0xFF0D5C3A),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 20),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // 1. SECTION: Account & Billing
            _buildProfileSectionGroup(
              headerIcon: Icons.credit_card_outlined,
              headerTitle: 'Account & Billing',
              items: [
                _buildProfileItemRow(
                  icon: Icons.person_outline_rounded,
                  title: 'Account Details',
                  subtitle: 'View and update your personal information',
                  onTap: () {
                    _showActionSnackbar('Account Details opened');
                  },
                ),
                _buildProfileItemRow(
                  icon: Icons.local_shipping_outlined,
                  title: 'Deliveries',
                  subtitle: 'Track your latest doorstep deliveries',
                  badgeText: '9 Drops',
                  badgeBg: const Color(0xFFE2F1EA),
                  badgeColor: const Color(0xFF0D5C3A),
                  onTap: () {
                    setState(() => _currentIndex = 3);
                  },
                ),
                _buildProfileItemRow(
                  icon: Icons.receipt_long_rounded,
                  title: 'Subscription History & Orders',
                  subtitle: 'View active, past, failed plans & retry Razorpay',
                  badgeText: 'History',
                  badgeBg: const Color(0xFFE2F1EA),
                  badgeColor: const Color(0xFF0D5C3A),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const SubscriptionHistoryScreen(),
                      ),
                    );
                  },
                ),
                _buildProfileItemRow(
                  icon: Icons.location_on_outlined,
                  title: 'Addresses',
                  subtitle: 'Manage your delivery addresses',
                  onTap: () {
                    _showActionSnackbar('Delivery addresses opened');
                  },
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 2. SECTION: Support & Help
            _buildProfileSectionGroup(
              headerIcon: Icons.headset_mic_outlined,
              headerTitle: 'Support & Help',
              items: [
                _buildProfileItemRow(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: 'Customer Care & Helplines',
                  subtitle: 'WhatsApp chat & 24/7 priority support',
                  onTap: _showContactSupportSheet,
                ),
                _buildProfileItemRow(
                  icon: Icons.help_outline_rounded,
                  title: 'FAQs',
                  subtitle: 'Find answers to common questions',
                  onTap: () {
                    _showActionSnackbar('FAQs & help center opened');
                  },
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 3. SECTION: App Settings
            _buildProfileSectionGroup(
              headerIcon: Icons.settings_outlined,
              headerTitle: 'App Settings',
              items: [
                _buildProfileItemRow(
                  icon: Icons.notifications_none_rounded,
                  title: 'Notifications',
                  subtitle: 'Manage alerts and reminders',
                  onTap: () {
                    _showActionSnackbar('Notification settings opened');
                  },
                ),
                _buildProfileItemRow(
                  icon: Icons.language_rounded,
                  title: 'Language',
                  subtitle: 'English (India)',
                  onTap: () {
                    _showActionSnackbar('Language set to English (India)');
                  },
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 4. SECTION: Account Actions
            _buildProfileSectionGroup(
              headerIcon: Icons.security_outlined,
              headerTitle: 'Account Actions',
              items: [
                _buildProfileItemRow(
                  icon: Icons.logout_rounded,
                  title: 'Log out',
                  subtitle: 'Sign out from your account',
                  isDestructive: true,
                  onTap: () async {
                    final navigator = Navigator.of(context);
                    await auth.logout();
                    if (!mounted) return;
                    navigator.pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                      (route) => false,
                    );
                  },
                ),
                _buildProfileItemRow(
                  icon: Icons.delete_outline_rounded,
                  title: 'Delete Account',
                  subtitle: 'Permanently delete account & records',
                  isDestructive: true,
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Delete Account?'),
                        content: const Text('Are you sure you want to permanently delete your account and records?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pop(ctx);
                              _showActionSnackbar('Account deletion request submitted');
                            },
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                            child: const Text('Delete'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileSectionGroup({
    required IconData headerIcon,
    required String headerTitle,
    required List<Widget> items,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2EBE5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(headerIcon, color: const Color(0xFF0D5C3A), size: 18),
                  const SizedBox(width: 8),
                  Text(
                    headerTitle,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0C2340),
                    ),
                  ),
                ],
              ),
              const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 18),
            ],
          ),
          const SizedBox(height: 12),
          Column(children: items),
        ],
      ),
    );
  }

  Widget _buildProfileItemRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    String? badgeText,
    Color? badgeBg,
    Color? badgeColor,
    bool isDestructive = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 9.0, horizontal: 4.0),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: isDestructive ? const Color(0xFFFEE2E2) : const Color(0xFFF3F7F4),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: isDestructive ? const Color(0xFFDC2626) : const Color(0xFF0D5C3A),
                size: 19,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: isDestructive ? const Color(0xFFDC2626) : const Color(0xFF0C2340),
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                  ),
                ],
              ),
            ),
            if (badgeText != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeBg ?? const Color(0xFFE2F1EA),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  badgeText,
                  style: TextStyle(
                    color: badgeColor ?? const Color(0xFF0D5C3A),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 6),
            ],
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 18),
          ],
        ),
      ),
    );
  }

  void _showActionSnackbar(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFF0D5C3A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
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
      {'index': 3, 'label': 'Deliveries', 'icon': Icons.local_shipping_outlined, 'activeIcon': Icons.local_shipping_rounded},
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
