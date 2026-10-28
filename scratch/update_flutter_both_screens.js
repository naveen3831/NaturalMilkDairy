const fs = require('fs');
const path = require('path');

// ==========================================
// 1. UPDATE home_screen.dart
// ==========================================
const homeScreenPath = path.resolve('mobile/lib/screens/home/home_screen.dart');
let homeLines = fs.readFileSync(homeScreenPath, 'utf8').split('\n');

// 1.1 Hero image (around line 1735)
for (let i = 1720; i < 1760; i++) {
  if (homeLines[i] && homeLines[i].includes('assets/images/cat_img_milk.png') && homeLines[i-5] && homeLines[i-5].includes('Positioned(')) {
    // Replace the Positioned widget
    let startPos = -1;
    for (let j = i; j >= i - 10; j--) {
      if (homeLines[j].includes('Positioned(')) {
        startPos = j;
        break;
      }
    }
    let endPos = -1;
    for (let j = i; j <= i + 15; j++) {
      if (homeLines[j].includes('),') && homeLines[j+1] && homeLines[j+1].includes('],')) {
        endPos = j;
        break;
      }
    }
    if (startPos !== -1 && endPos !== -1) {
      const replacement = [
        '                  Positioned(',
        '                    right: 4,',
        '                    bottom: 0,',
        '                    child: SizedBox(',
        '                      width: 125,',
        '                      height: 135,',
        '                      child: Image.asset(',
        "                        'assets/images/sub_hero_milk.png',",
        '                        fit: BoxFit.contain,',
        '                        errorBuilder: (c, e, s) => Image.asset(',
        "                          'assets/images/cat_img_milk.png',",
        '                          fit: BoxFit.contain,',
        '                        ),',
        '                      ),',
        '                    ),',
        '                  ),'
      ];
      homeLines.splice(startPos, endPos - startPos + 1, ...replacement);
      console.log('Updated Hero banner image in home_screen.dart');
      break;
    }
  }
}

// 1.2 Feature Badges row (single container with 4 columns matching Image 1)
for (let i = 1740; i < 1790; i++) {
  if (homeLines[i] && homeLines[i].includes('// 2. 4 FEATURE BADGES')) {
    let startPos = i;
    let endPos = -1;
    for (let j = i; j < i + 25; j++) {
      if (homeLines[j].includes('const SizedBox(height: 20),')) {
        endPos = j - 1;
        break;
      }
    }
    if (endPos !== -1) {
      const replacement = [
        '            // 2. 4 FEATURE BADGES (Single card with 4 columns matching Image 1)',
        '            Container(',
        '              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),',
        '              decoration: BoxDecoration(',
        '                color: Colors.white,',
        '                borderRadius: BorderRadius.circular(16),',
        '                border: Border.all(color: const Color(0xFFE2EBE5)),',
        '                boxShadow: [',
        '                  BoxShadow(',
        '                    color: Colors.black.withValues(alpha: 0.02),',
        '                    blurRadius: 8,',
        '                    offset: const Offset(0, 2),',
        '                  ),',
        '                ],',
        '              ),',
        '              child: Row(',
        '                children: [',
        "                  Expanded(child: _buildSubFeatureBadge(Icons.eco_rounded, '100%\\nPure & Natural')),",
        '                  Container(width: 1, height: 28, color: const Color(0xFFE5EDE7)),',
        "                  Expanded(child: _buildSubFeatureBadge(Icons.ac_unit_rounded, 'Chilled\\nto 4°C')),",
        '                  Container(width: 1, height: 28, color: const Color(0xFFE5EDE7)),',
        "                  Expanded(child: _buildSubFeatureBadge(Icons.local_shipping_outlined, 'Doorstep\\nDelivery')),",
        '                  Container(width: 1, height: 28, color: const Color(0xFFE5EDE7)),',
        "                  Expanded(child: _buildSubFeatureBadge(Icons.calendar_month_outlined, 'Flexible\\nPlans')),",
        '                ],',
        '              ),',
        '            ),'
      ];
      homeLines.splice(startPos, endPos - startPos + 1, ...replacement);
      console.log('Updated 4 Feature Badges row in home_screen.dart');
      break;
    }
  }
}

// 1.3 Active Card Thumbnail (assets/images/sub_active_thumb.png)
for (let i = 1800; i < 1880; i++) {
  if (homeLines[i] && homeLines[i].includes('// Thumbnail') && homeLines[i+8] && homeLines[i+8].includes('cat_img_milk.png')) {
    let thumbLine = i + 8;
    homeLines[thumbLine] = "                              'assets/images/sub_active_thumb.png',";
    console.log('Updated Active Subscription thumbnail in home_screen.dart');
    break;
  }
}

// 1.4 Active Subscription Specs & Buttons (3 boxes + 2 buttons)
for (let i = 1880; i < 1980; i++) {
  if (homeLines[i] && homeLines[i].includes('Wrap(') && homeLines[i+2] && homeLines[i+2].includes('1 L / day Pure A2 Milk')) {
    let startPos = -1;
    for (let j = i; j >= i - 5; j--) {
      if (homeLines[j].includes('const SizedBox(height: 8)')) {
        startPos = j;
        break;
      }
    }
    let endPos = -1;
    for (let j = i; j < i + 80; j++) {
      if (homeLines[j].includes('// 4. MORE SUBSCRIPTION PLANS')) {
        endPos = j - 3;
        break;
      }
    }
    if (startPos !== -1 && endPos !== -1) {
      const replacement = [
        '                              const SizedBox(height: 12),',
        '                              // 3 Spec Boxes in a Row matching Image 1',
        '                              Row(',
        '                                children: [',
        '                                  Expanded(',
        '                                    child: Container(',
        '                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 6),',
        '                                      decoration: BoxDecoration(',
        '                                        color: const Color(0xFFF2F8F4),',
        '                                        borderRadius: BorderRadius.circular(10),',
        '                                        border: Border.all(color: const Color(0xFFDEEDE2)),',
        '                                      ),',
        '                                      child: const Row(',
        '                                        children: [',
        '                                          Icon(Icons.local_drink_outlined, size: 14, color: Color(0xFF0D5C3A)),',
        '                                          SizedBox(width: 4),',
        '                                          Expanded(',
        '                                            child: Column(',
        '                                              crossAxisAlignment: CrossAxisAlignment.start,',
        '                                              children: [',
        '                                                Text(',
        "                                                  '1 L / day',",
        '                                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),',
        '                                                  maxLines: 1,',
        '                                                  overflow: TextOverflow.ellipsis,',
        '                                                ),',
        '                                                Text(',
        "                                                  'Pure A2 Milk',",
        '                                                  style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),',
        '                                                  maxLines: 1,',
        '                                                  overflow: TextOverflow.ellipsis,',
        '                                                ),',
        '                                              ],',
        '                                            ),',
        '                                          ),',
        '                                        ],',
        '                                      ),',
        '                                    ),',
        '                                  ),',
        '                                  const SizedBox(width: 5),',
        '                                  Expanded(',
        '                                    child: Container(',
        '                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 6),',
        '                                      decoration: BoxDecoration(',
        '                                        color: const Color(0xFFF2F8F4),',
        '                                        borderRadius: BorderRadius.circular(10),',
        '                                        border: Border.all(color: const Color(0xFFDEEDE2)),',
        '                                      ),',
        '                                      child: const Row(',
        '                                        children: [',
        '                                          Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF0D5C3A)),',
        '                                          SizedBox(width: 4),',
        '                                          Expanded(',
        '                                            child: Column(',
        '                                              crossAxisAlignment: CrossAxisAlignment.start,',
        '                                              children: [',
        '                                                Text(',
        "                                                  'Before 6:30 AM',",
        '                                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),',
        '                                                  maxLines: 1,',
        '                                                  overflow: TextOverflow.ellipsis,',
        '                                                ),',
        '                                                Text(',
        "                                                  'Morning Delivery',",
        '                                                  style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),',
        '                                                  maxLines: 1,',
        '                                                  overflow: TextOverflow.ellipsis,',
        '                                                ),',
        '                                              ],',
        '                                            ),',
        '                                          ),',
        '                                        ],',
        '                                      ),',
        '                                    ),',
        '                                  ),',
        '                                  const SizedBox(width: 5),',
        '                                  Expanded(',
        '                                    child: Container(',
        '                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 6),',
        '                                      decoration: BoxDecoration(',
        '                                        color: const Color(0xFFF2F8F4),',
        '                                        borderRadius: BorderRadius.circular(10),',
        '                                        border: Border.all(color: const Color(0xFFDEEDE2)),',
        '                                      ),',
        '                                      child: Row(',
        '                                        children: [',
        '                                          const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF0D5C3A)),',
        '                                          const SizedBox(width: 4),',
        '                                          Expanded(',
        '                                            child: Column(',
        '                                              crossAxisAlignment: CrossAxisAlignment.start,',
        '                                              children: [',
        '                                                Text(',
        "                                                  user?.area ?? 'Madhupur',",
        '                                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),',
        '                                                  maxLines: 1,',
        '                                                  overflow: TextOverflow.ellipsis,',
        '                                                ),',
        '                                                const Text(',
        "                                                  'Delivery Area',",
        '                                                  style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),',
        '                                                  maxLines: 1,',
        '                                                  overflow: TextOverflow.ellipsis,',
        '                                                ),',
        '                                              ],',
        '                                            ),',
        '                                          ),',
        '                                        ],',
        '                                      ),',
        '                                    ),',
        '                                  ),',
        '                                ],',
        '                              ),',
        '                            ],',
        '                          ),',
        '                        ),',
        '                      ],',
        '                    ),',
        '                    const SizedBox(height: 14),',
        '                    // Two Buttons matching Image 1: View Details & Manage Plan',
        '                    Row(',
        '                      children: [',
        '                        Expanded(',
        '                          child: SizedBox(',
        '                            height: 38,',
        '                            child: OutlinedButton(',
        '                              onPressed: () {',
        '                                Navigator.push(',
        '                                  context,',
        '                                  MaterialPageRoute(',
        '                                    builder: (_) => const SubscriptionDetailsScreen(),',
        '                                  ),',
        '                                );',
        '                              },',
        '                              style: OutlinedButton.styleFrom(',
        '                                side: const BorderSide(color: Color(0xFF0D5C3A), width: 1.2),',
        '                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),',
        '                                padding: EdgeInsets.zero,',
        '                              ),',
        '                              child: const Text(',
        "                                'View Details',",
        '                                style: TextStyle(',
        '                                  color: Color(0xFF0D5C3A),',
        '                                  fontSize: 12.5,',
        '                                  fontWeight: FontWeight.w700,',
        '                                ),',
        '                              ),',
        '                            ),',
        '                          ),',
        '                        ),',
        '                        const SizedBox(width: 10),',
        '                        Expanded(',
        '                          child: SizedBox(',
        '                            height: 38,',
        '                            child: ElevatedButton(',
        '                              onPressed: () {',
        '                                Navigator.push(',
        '                                  context,',
        '                                  MaterialPageRoute(',
        '                                    builder: (_) => const SubscriptionDetailsScreen(),',
        '                                  ),',
        '                                );',
        '                              },',
        '                              style: ElevatedButton.styleFrom(',
        '                                backgroundColor: const Color(0xFF0D5C3A),',
        '                                elevation: 0,',
        '                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),',
        '                                padding: EdgeInsets.zero,',
        '                              ),',
        '                              child: const Text(',
        "                                'Manage Plan',",
        '                                style: TextStyle(',
        '                                  color: Colors.white,',
        '                                  fontSize: 12.5,',
        '                                  fontWeight: FontWeight.w800,',
        '                                ),',
        '                              ),',
        '                            ),',
        '                          ),',
        '                        ),',
        '                      ],',
        '                    ),',
        '                  ],',
        '                ),',
        '              ),',
        '            ),',
        '            const SizedBox(height: 22),'
      ];
      homeLines.splice(startPos, endPos - startPos + 1, ...replacement);
      console.log('Updated Active Subscription Specs & Buttons in home_screen.dart');
      break;
    }
  }
}

fs.writeFileSync(homeScreenPath, homeLines.join('\n'), 'utf8');
console.log('Successfully updated home_screen.dart!');

// ==========================================
// 2. UPDATE subscription_details_screen.dart
// ==========================================
const subDetailsPath = path.resolve('mobile/lib/screens/home/subscription_details_screen.dart');
let subContent = fs.readFileSync(subDetailsPath, 'utf8');

// Replace AppBar leading with Back pill
const oldAppBarLeading = `        leading: Padding(
          padding: const EdgeInsets.only(left: 14.0),
          child: Center(
            child: InkWell(
              onTap: () => Navigator.pop(context),
              borderRadius: BorderRadius.circular(30),
              child: Container(
                width: 38,
                height: 38,
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
        ),`;

const newAppBarLeading = `        leadingWidth: 84,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12.0),
          child: Center(
            child: InkWell(
              onTap: () => Navigator.pop(context),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2EBE5), width: 1.1),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.arrow_back_rounded, color: Color(0xFF0C2340), size: 15),
                    SizedBox(width: 4),
                    Text(
                      'Back',
                      style: TextStyle(
                        color: Color(0xFF0C2340),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),`;

// Replace Next Delivery Card with Mint background
const oldNextDelivery = `            // 4. NEXT DELIVERY CARD
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2EBE5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.local_shipping_outlined, color: Color(0xFF0D5C3A), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Next Delivery',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0C2340),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F7F4),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.calendar_today_rounded, color: Color(0xFF0D5C3A), size: 20),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Tomorrow, 28 Oct 2026',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                            ),
                            Text(
                              'Before 6:30 AM',
                              style: TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 20),
                    ],
                  ),
                ],
              ),
            ),`;

const newNextDelivery = `            // 4. NEXT DELIVERY CARD (Mint card matching Image 2)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5EE),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFC8E6D5), width: 1.1),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.local_shipping_outlined, color: Color(0xFF0D5C3A), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Next Delivery',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0C2340),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(9),
                        decoration: const BoxDecoration(
                          color: Color(0xFFD4EDE0),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.calendar_today_rounded, color: Color(0xFF0D5C3A), size: 18),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Tomorrow, 28 Oct 2026',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                            ),
                            Text(
                              'Before 6:30 AM',
                              style: TextStyle(fontSize: 11.5, color: Color(0xFF4B5563)),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Color(0xFF0D5C3A), size: 20),
                    ],
                  ),
                ],
              ),
            ),`;

const normalize = s => s.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
let normSub = normalize(subContent);

if (normSub.includes(normalize(oldAppBarLeading))) {
  normSub = normSub.replace(normalize(oldAppBarLeading), normalize(newAppBarLeading));
  console.log('Updated AppBar leading in subscription_details_screen.dart');
} else {
  console.log('AppBar leading pattern not found');
}

if (normSub.includes(normalize(oldNextDelivery))) {
  normSub = normSub.replace(normalize(oldNextDelivery), normalize(newNextDelivery));
  console.log('Updated Next Delivery card in subscription_details_screen.dart');
} else {
  console.log('Next Delivery pattern not found');
}

// Update _buildManageOptionRow to accept cardBg and cardBorder
const oldMethod = `  Widget _buildManageOptionRow({
    required BuildContext context,
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: const Color(0xFFFAFBFB),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFF0F3F1)),
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
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 12.5,
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
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 18),
          ],
        ),
      ),
    );
  }`;

const newMethod = `  Widget _buildManageOptionRow({
    required BuildContext context,
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color cardBg = const Color(0xFFFAFBFB),
    Color cardBorder = const Color(0xFFF0F3F1),
    bool isDestructive = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: cardBorder, width: 1.1),
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
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 12.5,
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
            Icon(Icons.chevron_right_rounded, color: isDestructive ? const Color(0xFFDC2626) : const Color(0xFF9CA3AF), size: 18),
          ],
        ),
      ),
    );
  }`;

if (normSub.includes(normalize(oldMethod))) {
  normSub = normSub.replace(normalize(oldMethod), normalize(newMethod));
  console.log('Updated _buildManageOptionRow implementation');
} else {
  console.log('_buildManageOptionRow pattern not found');
}

// Update the 4 callers of _buildManageOptionRow to pass cardBg and cardBorder
normSub = normSub.replace(
  `                    title: 'Pause Delivery for a Trip',`,
  `                    cardBg: const Color(0xFFFEF9EE),\n                    cardBorder: const Color(0xFFFDE68A),\n                    title: 'Pause Delivery for a Trip',`
);

normSub = normSub.replace(
  `                    title: 'Change Tomorrow\\'s Quantity',`,
  `                    cardBg: const Color(0xFFF0FDF4),\n                    cardBorder: const Color(0xFFBBF7D0),\n                    title: 'Change Tomorrow\\'s Quantity',`
);

normSub = normSub.replace(
  `                    title: 'Change Delivery Address',`,
  `                    cardBg: const Color(0xFFF0F9FF),\n                    cardBorder: const Color(0xFFBAE6FD),\n                    title: 'Change Delivery Address',`
);

normSub = normSub.replace(
  `                    title: 'Stop Subscription',`,
  `                    cardBg: const Color(0xFFFEF2F2),\n                    cardBorder: const Color(0xFFFECACA),\n                    title: 'Stop Subscription',`
);

fs.writeFileSync(subDetailsPath, normSub, 'utf8');
console.log('Successfully updated subscription_details_screen.dart!');
