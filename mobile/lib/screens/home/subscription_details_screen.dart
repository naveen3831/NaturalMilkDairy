import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/customer_provider.dart';

class SubscriptionDetailsScreen extends StatefulWidget {
  final dynamic subscription;

  const SubscriptionDetailsScreen({
    super.key,
    this.subscription,
  });

  @override
  State<SubscriptionDetailsScreen> createState() => _SubscriptionDetailsScreenState();
}

class _SubscriptionDetailsScreenState extends State<SubscriptionDetailsScreen> {
  int _selectedDayIndex = 0;
  final List<String> _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final customerProvider = context.watch<CustomerProvider>();

    final String planName = widget.subscription != null && widget.subscription['planName'] != null
        ? widget.subscription['planName'].toString()
        : 'Daily Farm Pure Milk Plan';

    final String customerId = (user?.id.isNotEmpty == true) ? 'CUST-${user!.id.substring(0, user.id.length > 4 ? 4 : user.id.length).toUpperCase()}' : 'CUST-101';
    final String partnerName = customerProvider.deliveryBoyName.isNotEmpty ? customerProvider.deliveryBoyName : 'Naveen';
    final String areaName = (user?.area != null && user!.area!.isNotEmpty) ? user.area! : 'Madhupur';
    final String milkQty = customerProvider.milkQuantity > 0
        ? '${customerProvider.milkQuantity} L / day'
        : '1 L / day';

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAF9),
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
        ),
        title: const Text(
          'Subscription Details',
          style: TextStyle(
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
              child: Stack(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F7F4),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                    ),
                    child: const Icon(
                      Icons.notifications_none_rounded,
                      color: Color(0xFF0D5C3A),
                      size: 20,
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE53935),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. ACTIVE PLAN SUMMARY CARD (Matching Image 2 Right Screen)
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
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Milk bottle thumbnail
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          width: 68,
                          height: 72,
                          color: const Color(0xFFF4F9F6),
                          child: Image.asset(
                            'assets/images/product-cow-milk.jpg',
                            fit: BoxFit.cover,
                            errorBuilder: (c, e, s) => Image.network(
                              'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    planName,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF0C2340),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE2F1EA),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.circle, color: Color(0xFF0D5C3A), size: 7),
                                      SizedBox(width: 4),
                                      Text(
                                        'Active',
                                        style: TextStyle(
                                          color: Color(0xFF0D5C3A),
                                          fontSize: 10.5,
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
                              'ID: $customerId • Daily Morning',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF6B7280),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // 2 Metric Boxes Side by Side
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF7FAF8),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE5EDE8)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.water_drop_outlined, color: Color(0xFF0D5C3A), size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      milkQty,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF0C2340),
                                      ),
                                    ),
                                    const Text(
                                      'Pure A2 Milk',
                                      style: TextStyle(fontSize: 10.5, color: Color(0xFF6B7280)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF7FAF8),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE5EDE8)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.access_time_rounded, color: Color(0xFF0D5C3A), size: 18),
                              SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Before 6:30 AM',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF0C2340),
                                      ),
                                    ),
                                    Text(
                                      'Morning Delivery',
                                      style: TextStyle(fontSize: 10.5, color: Color(0xFF6B7280)),
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
                  const SizedBox(height: 12),

                  // Partner & Delivery Area Info
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAFBFB),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.people_outline_rounded, color: Color(0xFF6B7280), size: 16),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Partner $partnerName',
                            style: const TextStyle(fontSize: 11.5, color: Color(0xFF4B5563), fontWeight: FontWeight.w600),
                          ),
                        ),
                        const Icon(Icons.location_on_outlined, color: Color(0xFF6B7280), size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'Delivery Area $areaName',
                          style: const TextStyle(fontSize: 11.5, color: Color(0xFF4B5563), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 2. ORDER SCHEDULE (Weekdays)
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.calendar_month_outlined, color: Color(0xFF0D5C3A), size: 18),
                          SizedBox(width: 8),
                          Text(
                            'Order Schedule',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0C2340),
                            ),
                          ),
                        ],
                      ),
                      InkWell(
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Custom daily delivery schedule updated!'),
                              backgroundColor: Color(0xFF0D5C3A),
                              duration: Duration(seconds: 2),
                            ),
                          );
                        },
                        child: const Text(
                          'Change →',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0D5C3A),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(_weekdays.length, (index) {
                      final bool isSelected = _selectedDayIndex == index;
                      return InkWell(
                        onTap: () => setState(() => _selectedDayIndex = index),
                        borderRadius: BorderRadius.circular(12),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          width: 40,
                          height: 38,
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFF3F7F4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            _weekdays[index],
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              color: isSelected ? Colors.white : const Color(0xFF4B5563),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 3. DELIVERY ADDRESS CARD
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
                      Icon(Icons.location_on_rounded, color: Color(0xFF0D5C3A), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Delivery Address',
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
                        child: const Icon(Icons.home_outlined, color: Color(0xFF0D5C3A), size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Home',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                            ),
                            Text(
                              user?.address ?? 'Madhupur, Hyderabad, Telangana - 500081',
                              style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 20),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 4. NEXT DELIVERY CARD
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
            ),
            const SizedBox(height: 18),

            // 5. MANAGE SUBSCRIPTION (4 rows matching Image 2 Right Screen)
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
                      Icon(Icons.settings_outlined, color: Color(0xFF0D5C3A), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Manage Subscription',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0C2340),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Option 1: Pause Delivery for a Trip
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.pause_circle_outline_rounded,
                    iconBg: const Color(0xFFFEF3C7),
                    iconColor: const Color(0xFFD97706),
                    title: 'Pause Delivery for a Trip',
                    subtitle: 'Temporary pause your deliveries',
                    onTap: () {
                      _showActionSnackbar(context, 'Trip Pause requested! Our team will hold drops for your trip dates.');
                    },
                  ),
                  const SizedBox(height: 10),

                  // Option 2: Change Tomorrow's Quantity
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.edit_note_rounded,
                    iconBg: const Color(0xFFE2F1EA),
                    iconColor: const Color(0xFF0D5C3A),
                    title: 'Change Tomorrow\'s Quantity',
                    subtitle: 'Update milk quantity for next delivery',
                    onTap: () {
                      _showActionSnackbar(context, 'Next delivery quantity updated to +1 Litre!');
                    },
                  ),
                  const SizedBox(height: 10),

                  // Option 3: Change Delivery Address
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.local_shipping_outlined,
                    iconBg: const Color(0xFFE0F2FE),
                    iconColor: const Color(0xFF0284C7),
                    title: 'Change Delivery Address',
                    subtitle: 'Update or add new address',
                    onTap: () {
                      _showActionSnackbar(context, 'Address management opened');
                    },
                  ),
                  const SizedBox(height: 10),

                  // Option 4: Stop Subscription
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.cancel_outlined,
                    iconBg: const Color(0xFFFEE2E2),
                    iconColor: const Color(0xFFDC2626),
                    title: 'Stop Subscription',
                    subtitle: 'Cancel your plan anytime',
                    isDestructive: true,
                    onTap: () {
                      _showActionSnackbar(context, 'Subscription pause/stop request sent');
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 6. BOTTOM BUTTON: Explore More Plans
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.grid_view_rounded, size: 19, color: Colors.white),
                label: const Text(
                  'Explore More Plans',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0D5C3A),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildManageOptionRow({
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
  }

  void _showActionSnackbar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFF0D5C3A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
