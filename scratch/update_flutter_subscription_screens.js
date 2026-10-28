const fs = require('fs');
const path = require('path');

// 1. UPDATE home_screen.dart
const homeScreenPath = path.resolve('mobile/lib/screens/home/home_screen.dart');
let homeContent = fs.readFileSync(homeScreenPath, 'utf8');

// Replace Hero Card Right Image
const oldHeroImg = `                  Positioned(
                    right: -10,
                    bottom: -10,
                    child: SizedBox(
                      width: 140,
                      height: 160,
                      child: Image.asset(
                        'assets/images/cat_img_milk.png',
                        fit: BoxFit.contain,
                        errorBuilder: (c, e, s) => Image.network(
                          'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                  ),`;

const newHeroImg = `                  Positioned(
                    right: 4,
                    bottom: 0,
                    child: SizedBox(
                      width: 125,
                      height: 135,
                      child: Image.asset(
                        'assets/images/sub_hero_milk.png',
                        fit: BoxFit.contain,
                        errorBuilder: (c, e, s) => Image.asset(
                          'assets/images/cat_img_milk.png',
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                  ),`;

// Replace 4 feature badges
const oldFeatureBadges = `            // 2. 4 FEATURE BADGES (Row of 4 cards)
            Row(
              children: [
                Expanded(child: _buildSubFeatureBadge(Icons.eco_rounded, '100% Pure & Natural')),
                const SizedBox(width: 8),
                Expanded(child: _buildSubFeatureBadge(Icons.ac_unit_rounded, 'Chilled to 4°C')),
                const SizedBox(width: 8),
                Expanded(child: _buildSubFeatureBadge(Icons.local_shipping_outlined, 'Doorstep Delivery')),
                const SizedBox(width: 8),
                Expanded(child: _buildSubFeatureBadge(Icons.calendar_month_outlined, 'Flexible Plans')),
              ],
            ),`;

const newFeatureBadges = `            // 2. 4 FEATURE BADGES (Single card with 4 columns matching Image 1)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
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
            ),`;

// Replace Active Subscription Thumbnail and Specs Box
const oldActiveCardInner = `                        // Thumbnail
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 60,
                            height: 64,
                            color: const Color(0xFFF3F7F4),
                            child: Image.asset(
                              'assets/images/cat_img_milk.png',
                              fit: BoxFit.cover,
                              errorBuilder: (c, e, s) => Image.network(
                                'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80',
                                fit: BoxFit.cover,
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
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 10,
                                runSpacing: 4,
                                children: [
                                  _buildSubMiniInfo(Icons.water_drop_outlined, '1 L / day Pure A2 Milk'),
                                  _buildSubMiniInfo(Icons.access_time_rounded, 'Before 6:30 AM Morning Delivery'),
                                  _buildSubMiniInfo(Icons.location_on_outlined, 'Madhupur Delivery Area'),
                                ],
                              ),
                            ],
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
                                side: const BorderSide(color: Color(0xFFD4E2D8)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: EdgeInsets.zero,
                              ),
                              child: const Text(
                                'View Details',
                                style: TextStyle(
                                  color: Color(0xFF0C2340),
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
                    ),`;

const newActiveCardInner = `                        // Thumbnail
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 56,
                            height: 56,
                            color: const Color(0xFFF3F7F4),
                            child: Image.asset(
                              'assets/images/sub_active_thumb.png',
                              fit: BoxFit.cover,
                              errorBuilder: (c, e, s) => Image.asset(
                                'assets/images/cat_img_milk.png',
                                fit: BoxFit.cover,
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

                    // 3 Spec Boxes in a Row matching Image 1
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F8F4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFDEEDE2)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.local_drink_outlined, size: 14, color: Color(0xFF0D5C3A)),
                                SizedBox(width: 4),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '1 L / day',
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        'Pure A2 Milk',
                                        style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F8F4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFDEEDE2)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF0D5C3A)),
                                SizedBox(width: 4),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Before 6:30 AM',
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        'Morning Delivery',
                                        style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F8F4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFDEEDE2)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF0D5C3A)),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        user?.area ?? 'Madhupur',
                                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const Text(
                                        'Delivery Area',
                                        style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
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

                    // Two Buttons matching Image 1: View Details & Manage Plan
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
                    ),`;

const normalize = s => s.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');

let normHome = normalize(homeContent);
let normOldHero = normalize(oldHeroImg);
let normNewHero = normalize(newHeroImg);

if (normHome.includes(normOldHero)) {
  normHome = normHome.replace(normOldHero, normNewHero);
  console.log('Replaced Hero image in home_screen.dart');
} else {
  console.log('Hero image pattern not found in home_screen.dart');
}

let normOldFeat = normalize(oldFeatureBadges);
let normNewFeat = normalize(newFeatureBadges);

if (normHome.includes(normOldFeat)) {
  normHome = normHome.replace(normOldFeat, normNewFeat);
  console.log('Replaced Feature Badges in home_screen.dart');
} else {
  console.log('Feature Badges pattern not found in home_screen.dart');
}

let normOldActive = normalize(oldActiveCardInner);
let normNewActive = normalize(newActiveCardInner);

if (normHome.includes(normOldActive)) {
  normHome = normHome.replace(normOldActive, normNewActive);
  console.log('Replaced Active Card Inner in home_screen.dart');
} else {
  console.log('Active Card Inner pattern not found in home_screen.dart');
}

fs.writeFileSync(homeScreenPath, normHome, 'utf8');
console.log('home_screen.dart written successfully!');
