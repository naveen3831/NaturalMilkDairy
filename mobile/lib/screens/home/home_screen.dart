import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../providers/product_provider.dart';
import '../auth/login_screen.dart';
import 'widgets/product_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().loadProducts();
    });
  }

  void _showProofPhotoDialog(String date) {
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
                      child: Image.network(
                        'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
                        fit: BoxFit.contain,
                        errorBuilder: (c, e, s) => const Icon(Icons.broken_image, size: 64, color: AppColors.textMuted),
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
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.verified_rounded, size: 18, color: AppColors.badgeSuccessText),
                          SizedBox(width: 8),
                          Text(
                            'Verified Contactless Doorstep Drop',
                            style: TextStyle(
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

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final List<Widget> pages = [
      _buildHomeFeed(user),
      _buildProductsTab(),
      _buildSubscriptionTab(user),
      _buildDeliveriesTab(),
      _buildProfileTab(user, auth),
    ];

    return Scaffold(
      backgroundColor: AppColors.creamBg,
      body: pages[_currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.milkWhite,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 12,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: AppColors.milkWhite,
          selectedItemColor: AppColors.primaryGreen,
          unselectedItemColor: AppColors.textLight,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.storefront_outlined),
              activeIcon: Icon(Icons.storefront_rounded),
              label: 'Products',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.calendar_today_outlined),
              activeIcon: Icon(Icons.calendar_month_rounded),
              label: 'Subscription',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.local_shipping_outlined),
              activeIcon: Icon(Icons.local_shipping_rounded),
              label: 'Deliveries',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded),
              activeIcon: Icon(Icons.person_rounded),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }

  // TAB 1: Home Feed
  Widget _buildHomeFeed(dynamic user) {
    final productProvider = context.watch<ProductProvider>();

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () => productProvider.loadProducts(),
        color: AppColors.primaryGreen,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_on_rounded, size: 16, color: AppColors.primaryGreen),
                          const SizedBox(width: 4),
                          Text(
                            user?.area ?? 'Madhapur, Hyderabad',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.dairyBlue),
                          ),
                          const Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: AppColors.textMuted),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user != null ? 'Hello, ${user.name}' : 'Natural Milk Dairy',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.dairyBlue),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.milkWhite,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.borderSubtle),
                        ),
                        child: const Icon(Icons.notifications_none_rounded, size: 20, color: AppColors.dairyBlue),
                      ),
                      const SizedBox(width: 8),
                      Stack(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: AppColors.primaryGreen,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.shopping_bag_outlined, size: 20, color: Colors.white),
                          ),
                          if (productProvider.totalCartItems > 0)
                            Positioned(
                              right: 0,
                              top: 0,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: AppColors.butterGold,
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  '${productProvider.totalCartItems}',
                                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.black),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Tomorrow Morning Delivery Tracker Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primaryGreen, AppColors.primaryGreenDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryGreen.withValues(alpha: 0.3),
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
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.alarm_rounded, color: AppColors.butterGold, size: 14),
                              SizedBox(width: 5),
                              Text(
                                'Morning Slot · 5:00 AM – 6:30 AM',
                                style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.emeraldGreen,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Active',
                            style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Tomorrow Morning Delivery',
                      style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '1 Litre Pure Farm Milk + Earthen Curd',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.shield_outlined, color: AppColors.butterGold, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'Contactless doorstep drop photo proof attached',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 11.5, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),

              // Category Filter Chips
              const Text(
                'Farm Fresh Categories',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.dairyBlue),
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildCategoryChip('all', 'All Products', Icons.apps_rounded, productProvider),
                    _buildCategoryChip('milk', 'Pure Milk', Icons.water_drop_rounded, productProvider),
                    _buildCategoryChip('curd', 'Thick Curd & Paneer', Icons.rice_bowl_rounded, productProvider),
                    _buildCategoryChip('ghee', 'Vedic Bilona Ghee', Icons.local_fire_department_rounded, productProvider),
                  ],
                ),
              ),
              const SizedBox(height: 22),

              // Product Catalog Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Daily Farm Essentials',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.dairyBlue),
                  ),
                  TextButton(
                    onPressed: () => setState(() => _currentIndex = 1),
                    child: const Text('View All', style: TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Product Cards Grid
              if (productProvider.isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: productProvider.filteredProducts.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.65,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemBuilder: (ctx, idx) {
                    final product = productProvider.filteredProducts[idx];
                    return ProductCard(product: product);
                  },
                ),
              const SizedBox(height: 24),

              // Quality Promise Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.milkWhite,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Natural Milk Dairy Promise',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.dairyBlue),
                    ),
                    const SizedBox(height: 12),
                    _buildPromiseRow(Icons.science_outlined, 'Zero Hormones & Oxytocin', '100% natural organic fodder fed cattle'),
                    const SizedBox(height: 10),
                    _buildPromiseRow(Icons.ac_unit_rounded, 'Chilled to 4°C within 30 mins', 'Locks in vital vitamins, minerals & sweet aroma'),
                    const SizedBox(height: 10),
                    _buildPromiseRow(Icons.wine_bar_rounded, 'Sterilized Glass Bottle Packaging', 'Eco-friendly and free from toxic microplastics'),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String catId, String label, IconData icon, ProductProvider provider) {
    final bool isSelected = provider.selectedCategory == catId;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: InkWell(
        onTap: () => provider.selectCategory(catId),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryGreen : AppColors.milkWhite,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primaryGreen : AppColors.borderSubtle,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, size: 16, color: isSelected ? Colors.white : AppColors.primaryGreen),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : AppColors.textMain,
                  fontWeight: FontWeight.w700,
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPromiseRow(IconData icon, String title, String subtitle) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(color: AppColors.primaryGreenSoft, borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, size: 16, color: AppColors.primaryGreen),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.dairyBlue)),
              Text(subtitle, style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
            ],
          ),
        ),
      ],
    );
  }

  // TAB 2: Products Tab
  Widget _buildProductsTab() {
    final productProvider = context.watch<ProductProvider>();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(18.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Farm Catalog', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.dairyBlue)),
                const SizedBox(height: 4),
                const Text('Select your favorite farm items for daily subscription or on-demand drop', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
              ],
            ),
          ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              itemCount: productProvider.products.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.65,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemBuilder: (ctx, idx) => ProductCard(product: productProvider.products[idx]),
            ),
          ),
        ],
      ),
    );
  }

  // TAB 3: Subscription Tab
  Widget _buildSubscriptionTab(dynamic user) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Your Daily Plan', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.dairyBlue)),
            const SizedBox(height: 4),
            const Text('Automated morning drop guaranteed before 6:30 AM', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            const SizedBox(height: 20),

            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.milkWhite,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Plan Status', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: AppColors.badgeSuccessBg, borderRadius: BorderRadius.circular(6)),
                        child: const Text('ACTIVE', style: TextStyle(color: AppColors.badgeSuccessText, fontWeight: FontWeight.w800, fontSize: 11)),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text('Morning Cow Milk', style: TextStyle(color: AppColors.textMuted, fontSize: 13.5)),
                      Text('1 Litre / day', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.dairyBlue)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text('Thick Farm Curd', style: TextStyle(color: AppColors.textMuted, fontSize: 13.5)),
                      Text('500 Grams / day', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.dairyBlue)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Delivery Slot', style: TextStyle(color: AppColors.textMuted, fontSize: 13.5)),
                      Text(AppConstants.morningSlotTime, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.primaryGreen)),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subscription paused for tomorrow.')));
                          },
                          icon: const Icon(Icons.pause_circle_outline, size: 16),
                          label: const Text('Pause Drop', style: TextStyle(fontSize: 12.5)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subscription modification requested.')));
                          },
                          icon: const Icon(Icons.edit_calendar_outlined, size: 16),
                          label: const Text('Modify Liters', style: TextStyle(fontSize: 12.5)),
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
    );
  }

  // TAB 4: Deliveries History Tab
  Widget _buildDeliveriesTab() {
    final List<Map<String, dynamic>> deliveries = [
      {'date': 'Today, 23 Oct 2026', 'milk': '1 L', 'curd': '500 g', 'status': 'Delivered', 'payment': 'Paid', 'hasProof': true},
      {'date': 'Yesterday, 22 Oct 2026', 'milk': '1 L', 'curd': '500 g', 'status': 'Delivered', 'payment': 'Paid', 'hasProof': true},
      {'date': 'Wed, 21 Oct 2026', 'milk': '1 L', 'curd': '0 g', 'status': 'Delivered', 'payment': 'Paid', 'hasProof': true},
      {'date': 'Tue, 20 Oct 2026', 'milk': '2 L', 'curd': '1000 g', 'status': 'Delivered', 'payment': 'Paid', 'hasProof': true},
    ];

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(18.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Delivery Records', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.dairyBlue)),
                const SizedBox(height: 4),
                const Text('Verified doorstep drops with contactless photo proof', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              itemCount: deliveries.length,
              separatorBuilder: (ctx, i) => const SizedBox(height: 12),
              itemBuilder: (ctx, i) {
                final item = deliveries[i];
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.milkWhite,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryGreenSoft,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.primaryGreen),
                              ),
                              const SizedBox(width: 10),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item['date'], style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.dairyBlue)),
                                  const Text('Morning Drop · 5:45 AM', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                                ],
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: AppColors.badgeSuccessBg, borderRadius: BorderRadius.circular(6)),
                            child: const Text('✓ Delivered', style: TextStyle(color: AppColors.badgeSuccessText, fontWeight: FontWeight.w800, fontSize: 11)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.creamBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            Column(
                              children: [
                                const Text('MILK', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textLight)),
                                Text(item['milk'], style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primaryGreen)),
                              ],
                            ),
                            Column(
                              children: [
                                const Text('CURD', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textLight)),
                                Text(item['curd'], style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.dairyBlue)),
                              ],
                            ),
                            Column(
                              children: [
                                const Text('PAYMENT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textLight)),
                                Text(item['payment'], style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.emeraldGreen)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.shield_outlined, size: 14, color: AppColors.emeraldGreen),
                              SizedBox(width: 4),
                              Text('Doorstep proof attached', style: TextStyle(fontSize: 11, color: AppColors.emeraldGreen, fontWeight: FontWeight.w600)),
                            ],
                          ),
                          InkWell(
                            onTap: () => _showProofPhotoDialog(item['date']),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppColors.primaryGreenSoft,
                                border: Border.all(color: AppColors.primaryGreenLight),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.photo_camera_outlined, size: 13, color: AppColors.primaryGreen),
                                  SizedBox(width: 4),
                                  Text('View Photo', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primaryGreen)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // TAB 5: Profile Tab
  Widget _buildProfileTab(dynamic user, AuthProvider auth) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.milkWhite,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppColors.primaryGreenSoft,
                    child: Text(
                      (user?.name.isNotEmpty == true) ? user.name[0].toUpperCase() : 'U',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.primaryGreen),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.name ?? 'Customer Profile',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.dairyBlue),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.mobile ?? '+91 98765 43210',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primaryGreenSoft,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Area: ${user?.area ?? "Madhapur"}',
                      style: const TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Container(
              decoration: BoxDecoration(
                color: AppColors.milkWhite,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.location_on_outlined, color: AppColors.primaryGreen),
                    title: const Text('Delivery Address', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    subtitle: Text(user?.address ?? 'Add your doorstep drop address', style: const TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right, size: 20),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.support_agent_outlined, color: AppColors.primaryGreen),
                    title: const Text('Customer Care Hotline', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    subtitle: const Text(AppConstants.supportDisplayPhone, style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.phone_rounded, size: 18, color: AppColors.primaryGreen),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
                    title: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.redAccent)),
                    onTap: () async {
                      await auth.logout();
                      if (!mounted) return;
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                        (r) => false,
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
