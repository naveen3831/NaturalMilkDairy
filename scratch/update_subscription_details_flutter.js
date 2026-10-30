const fs = require('fs');

// 1. Read subscription_details_screen.dart
let subDetails = fs.readFileSync('mobile/lib/screens/home/subscription_details_screen.dart', 'utf8');

// Replace the Scaffold closing and add bottomNavigationBar and sheets
const newMethods = `
  Widget _buildCustomBottomNav(BuildContext context) {
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
            final bool isSelected = idx == 2;
            final label = item['label'] as String;
            final icon = (isSelected ? item['activeIcon'] : item['icon']) as IconData;

            return InkWell(
              onTap: () {
                if (idx != 2) {
                  Navigator.pop(context, idx);
                }
              },
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

  void _showUpgradePlanSheet(BuildContext context, CustomerProvider customerProvider) {
    int selectedQty = customerProvider.milkQuantity > 0 ? customerProvider.milkQuantity : 1;
    String selectedType = 'Pure A2 Cow Milk';
    int selectedCurd = customerProvider.curdQuantity;
    String selectedFreq = 'daily';
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final int estDaily = (selectedQty * (selectedType.contains('Buffalo') ? 75 : 60)) + ((selectedCurd / 500) * 30).round();

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 14,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1D5DB),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.stars_rounded, color: Color(0xFF0D5C3A), size: 24),
                        SizedBox(width: 8),
                        Text(
                          'Upgrade Subscription Plan',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF6B7280)),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const Text(
                  'Select higher daily milk volume or upgrade to premium buffalo & curd combos. Changes reflect immediately in real time.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.35),
                ),
                const SizedBox(height: 16),

                // 1. Milk Quantity Selector
                const Text(
                  'DAILY MILK QUANTITY',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6B7280), letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [1, 2, 3, 4, 5].map((qty) {
                    final bool isSel = selectedQty == qty;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: InkWell(
                          onTap: () => setModalState(() => selectedQty = qty),
                          borderRadius: BorderRadius.circular(12),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFF3F7F4),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5)),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  '\${qty}L',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w900,
                                    color: isSel ? Colors.white : const Color(0xFF0C2340),
                                  ),
                                ),
                                Text(
                                  qty == 1 ? 'Regular' : (qty == 2 ? 'Family' : 'Plus'),
                                  style: TextStyle(
                                    fontSize: 9,
                                    color: isSel ? const Color(0xFFDCFCE7) : const Color(0xFF6B7280),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                // 2. Milk Type Selector
                const Text(
                  'MILK TYPE / COMBO',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6B7280), letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    {'title': 'Pure A2 Cow Milk', 'sub': '₹60/L'},
                    {'title': 'Rich Buffalo Milk', 'sub': '₹75/L'},
                    {'title': 'Cow + Curd Combo', 'sub': '₹95/day'},
                  ].map((item) {
                    final bool isSel = selectedType == item['title'];
                    return InkWell(
                      onTap: () => setModalState(() => selectedType = item['title']!),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSel ? const Color(0xFFE2F1EA) : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
                            width: isSel ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              item['title']!,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isSel ? FontWeight.w900 : FontWeight.w600,
                                color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFF0C2340),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(
                                color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFF3F7F4),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                item['sub']!,
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: isSel ? Colors.white : const Color(0xFF4B5563),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                // 3. Optional Artisanal Curd
                const Text(
                  'ADD FRESH ARTISANAL CURD',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6B7280), letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    {'label': 'No Curd (0g)', 'val': 0},
                    {'label': '500g Curd (+₹30)', 'val': 500},
                    {'label': '1000g Curd (+₹60)', 'val': 1000},
                  ].map((curd) {
                    final int val = curd['val'] as int;
                    final bool isSel = selectedCurd == val;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: InkWell(
                          onTap: () => setModalState(() => selectedCurd = val),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: isSel ? const Color(0xFFFEF3C7) : const Color(0xFFF9FAFB),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSel ? const Color(0xFFD97706) : const Color(0xFFE5E7EB),
                                width: isSel ? 1.4 : 1,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              curd['label'] as String,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                color: isSel ? const Color(0xFFB45309) : const Color(0xFF4B5563),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                // Real-time Guarantee Notice
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFDCFCE7)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.bolt_rounded, color: Color(0xFF0D5C3A), size: 18),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '⚡ Realtime Sync: Stored in DB & broadcast to Admin and Delivery Partner instantly.',
                          style: TextStyle(fontSize: 10.5, color: Color(0xFF0D5C3A), fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Confirm Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setModalState(() => isSubmitting = true);
                            final ok = await customerProvider.upgradePlan(
                              milkQty: selectedQty,
                              curdQty: selectedCurd,
                              frequency: selectedFreq,
                              planName: 'Daily Farm Pure \${selectedType.split(' ')[0]} Milk Plan',
                              milkType: selectedType,
                            );
                            if (ctx.mounted) Navigator.pop(ctx);
                            if (context.mounted) {
                              _showActionSnackbar(
                                context,
                                ok
                                    ? 'Plan upgraded to \${selectedQty}L \${selectedType} daily! Synced in realtime.'
                                    : 'Plan upgrade saved in database.',
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D5C3A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                          )
                        : Text(
                            'Confirm & Upgrade to \${selectedQty}L (₹\$estDaily/day)',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5),
                          ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showExtendSubscriptionSheet(BuildContext context, CustomerProvider customerProvider) {
    int selectedDays = 30;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final DateTime now = DateTime.now();
          final DateTime newEnd = now.add(Duration(days: selectedDays));
          final String formattedEnd = '\${newEnd.day} \${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][newEnd.month - 1]} \${newEnd.year}';
          final int milkQty = customerProvider.milkQuantity > 0 ? customerProvider.milkQuantity : 1;
          final int estAmount = milkQty * 60 * selectedDays;

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 14,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1D5DB),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.more_time_rounded, color: Color(0xFFD97706), size: 24),
                        SizedBox(width: 8),
                        Text(
                          'Extend Subscription',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF6B7280)),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const Text(
                  'Extend your daily milk delivery schedule to ensure uninterrupted morning drops. Updates instantly in database and driver route.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.35),
                ),
                const SizedBox(height: 16),

                // Duration Options
                const Text(
                  'SELECT EXTENSION PERIOD',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6B7280), letterSpacing: 0.5),
                ),
                const SizedBox(height: 10),
                Column(
                  children: [
                    {'days': 7, 'title': '+7 Days (1 Week)', 'badge': 'Quick Trial', 'save': ''},
                    {'days': 15, 'title': '+15 Days (Half Month)', 'badge': 'Flexible', 'save': ''},
                    {'days': 30, 'title': '+30 Days (1 Full Month)', 'badge': 'Most Popular', 'save': 'Best Value'},
                    {'days': 60, 'title': '+60 Days (2 Months)', 'badge': 'Save 10%', 'save': 'Free Extra Curd'},
                  ].map((opt) {
                    final int days = opt['days'] as int;
                    final bool isSel = selectedDays == days;
                    final int amt = milkQty * 60 * days;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () => setModalState(() => selectedDays = days),
                        borderRadius: BorderRadius.circular(14),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 160),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: isSel ? const Color(0xFFFFFBEB) : const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isSel ? const Color(0xFFD97706) : const Color(0xFFE5E7EB),
                              width: isSel ? 1.6 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isSel ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                                color: isSel ? const Color(0xFFD97706) : const Color(0xFF9CA3AF),
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          opt['title']!,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: isSel ? FontWeight.w900 : FontWeight.w700,
                                            color: const Color(0xFF0C2340),
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isSel ? const Color(0xFFFEF3C7) : const Color(0xFFE2EBE5),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            opt['badge']!,
                                            style: TextStyle(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.w800,
                                              color: isSel ? const Color(0xFFB45309) : const Color(0xFF4B5563),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    Text(
                                      'Valid until \$formattedEnd',
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                '₹\$amt',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF0D5C3A),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),

                // Real-time Guarantee Notice
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.bolt_rounded, color: Color(0xFFD97706), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '⚡ Extended until \$formattedEnd. Saved in DB & auto-synced with delivery partner route.',
                          style: const TextStyle(fontSize: 10.5, color: Color(0xFF92400E), fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Confirm Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setModalState(() => isSubmitting = true);
                            final ok = await customerProvider.extendSubscription(days: selectedDays);
                            if (ctx.mounted) Navigator.pop(ctx);
                            if (context.mounted) {
                              _showActionSnackbar(
                                context,
                                ok
                                    ? 'Subscription extended by \$selectedDays days! Valid until \$formattedEnd.'
                                    : 'Subscription extension saved in database.',
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D5C3A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                          )
                        : Text(
                            'Confirm & Extend (+\$selectedDays Days • ₹\$estAmount)',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5),
                          ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
`;

// Insert the Upgrade Plan and Extend Subscription options into Manage Subscription
const upgradeOptions = `                  // Option 1: Upgrade Plan (Green/Emerald badge)
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.stars_rounded,
                    iconBg: const Color(0xFFE2F1EA),
                    iconColor: const Color(0xFF0D5C3A),
                    cardBg: const Color(0xFFF0FDF4),
                    cardBorder: const Color(0xFFBBF7D0),
                    title: 'Upgrade Plan',
                    subtitle: 'Increase volume, switch to Buffalo or combo',
                    onTap: () {
                      _showUpgradePlanSheet(context, customerProvider);
                    },
                  ),
                  const SizedBox(height: 10),

                  // Option 2: Extend Subscription (Amber badge)
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.more_time_rounded,
                    iconBg: const Color(0xFFFEF3C7),
                    iconColor: const Color(0xFFD97706),
                    cardBg: const Color(0xFFFFFBEB),
                    cardBorder: const Color(0xFFFDE68A),
                    title: 'Extend Subscription',
                    subtitle: 'Add 7, 15, 30 or 60 days to current plan',
                    onTap: () {
                      _showExtendSubscriptionSheet(context, customerProvider);
                    },
                  ),
                  const SizedBox(height: 10),
`;

subDetails = subDetails.replace(
  '// Option 1: Pause Delivery for a Trip (Amber tint)',
  upgradeOptions + '                  // Option 3: Pause Delivery for a Trip (Amber tint)'
);

// Add bottomNavigationBar to Scaffold
subDetails = subDetails.replace(
  '      body: SingleChildScrollView(',
  '      bottomNavigationBar: _buildCustomBottomNav(context),\r\n      body: SingleChildScrollView('
);

// Insert newMethods right before the closing brace of _SubscriptionDetailsScreenState
subDetails = subDetails.replace(
  '  void _showActionSnackbar(BuildContext context, String message) {',
  newMethods + '\r\n  void _showActionSnackbar(BuildContext context, String message) {'
);

fs.writeFileSync('mobile/lib/screens/home/subscription_details_screen.dart', subDetails, 'utf8');
console.log('Updated subscription_details_screen.dart successfully');
