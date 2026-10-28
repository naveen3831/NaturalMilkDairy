const fs = require('fs');

let homeContent = fs.readFileSync('mobile/lib/screens/home/home_screen.dart', 'utf8');

const startIndex = homeContent.indexOf('  // TAB 2: SUBSCRIPTION TAB');
const endIndex = homeContent.indexOf('  // TAB 3: DELIVERIES TAB');

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end index:", { startIndex, endIndex });
  process.exit(1);
}

const newSubscriptionTabCode = `  // TAB 2: SUBSCRIPTION TAB (Matching Image 2 - Subscription Overview Screen)
  Widget _buildSubscriptionTab(dynamic user) {
    final customerProvider = context.watch<CustomerProvider>();
    final productProvider = context.watch<ProductProvider>();
    final isGuest = user == null || user.isGuest == true;

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
                    aspectRatio: 266 / 146,
                    child: Image.asset(
                      'assets/images/sub_hero_banner.png',
                      fit: BoxFit.cover,
                      errorBuilder: (c, e, s) => Image.asset(
                        'assets/images/hero_banner_card.png',
                        fit: BoxFit.cover,
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
                  Expanded(child: _buildSubFeatureBadge(Icons.eco_rounded, '100%\\nPure & Natural')),
                  Container(width: 1, height: 28, color: const Color(0xFFE5EDE7)),
                  Expanded(child: _buildSubFeatureBadge(Icons.ac_unit_rounded, 'Chilled\\nto 4°C')),
                  Container(width: 1, height: 28, color: const Color(0xFFE5EDE7)),
                  Expanded(child: _buildSubFeatureBadge(Icons.local_shipping_outlined, 'Doorstep\\nDelivery')),
                  Container(width: 1, height: 28, color: const Color(0xFFE5EDE7)),
                  Expanded(child: _buildSubFeatureBadge(Icons.calendar_month_outlined, 'Flexible\\nPlans')),
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
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const SubscriptionDetailsScreen(),
                      ),
                    );
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
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const SubscriptionDetailsScreen(),
                  ),
                );
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
                              errorBuilder: (c, e, s) => Image.asset(
                                'assets/images/best_cow_milk.png',
                                fit: BoxFit.cover,
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
                                      color: const Color(0xFFE2F1EA),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.circle, color: Color(0xFF0D5C3A), size: 6),
                                        SizedBox(width: 4),
                                        Text(
                                          'Active',
                                          style: TextStyle(
                                            color: Color(0xFF0D5C3A),
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
                                'ID: \${user?.customerId ?? "CUST-101"} \\u2022 Daily Morning',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: Color(0xFF6B7280),
                                  fontWeight: FontWeight.w600,
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
                            child: const Row(
                              children: [
                                Icon(Icons.local_drink_outlined, size: 13, color: Color(0xFF0D5C3A)),
                                SizedBox(width: 3),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: Text(
                                          '1 L / day',
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
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
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const SubscriptionDetailsScreen(),
                                  ),
                                );
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
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const SubscriptionDetailsScreen(),
                                  ),
                                );
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

`;

const updatedHome = homeContent.slice(0, startIndex) + newSubscriptionTabCode + homeContent.slice(endIndex);
fs.writeFileSync('mobile/lib/screens/home/home_screen.dart', updatedHome, 'utf8');
console.log("Successfully updated home_screen.dart!");
