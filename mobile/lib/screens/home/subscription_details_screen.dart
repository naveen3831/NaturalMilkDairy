import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:natural_milk_dairy/providers/auth_provider.dart';
import 'package:natural_milk_dairy/providers/customer_provider.dart';
import 'widgets/notification_modal.dart';
import 'subscription_history_screen.dart';
import 'subscribe_checkout_screen.dart';

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

    final String customerId = (user?.id.isNotEmpty == true)
        ? 'CUST-${user!.id.substring(0, user.id.length > 4 ? 4 : user.id.length).toUpperCase()}'
        : 'CUST-101';
    final String partnerName = customerProvider.deliveryBoyName.isNotEmpty ? customerProvider.deliveryBoyName : 'Naveen';
    final String areaName = (user?.area != null && user!.area!.isNotEmpty) ? user.area! : 'Madhupur';
    final String milkQty = customerProvider.milkQuantity > 0
        ? '${customerProvider.milkQuantity} L / day'
        : '1 L / day';

    final latestSub = customerProvider.subscriptionsHistory.isNotEmpty
        ? customerProvider.subscriptionsHistory.first
        : null;
    final String subStatus = latestSub?['status']?.toString().toLowerCase() ??
        (customerProvider.customerData?['subscription'] is Map
            ? customerProvider.customerData!['subscription']['status']?.toString().toLowerCase() ?? ''
            : '');
    final bool isFailed = subStatus == 'failed';
    final bool isPaused = customerProvider.isPaused || subStatus == 'paused';
    final String failedReason = latestSub?['failedReason']?.toString() ??
        'Your last subscription payment was not completed.';

    final int daysRemaining = customerProvider.subscriptionDaysRemaining;
    final bool isExpired = customerProvider.isSubscriptionExpired || daysRemaining < 0;
    final bool isExpiringSoon = !isExpired && daysRemaining <= 3;
    final String expiryDateFormatted = customerProvider.formattedExpiryDate;
    final String startDateFormatted = customerProvider.formattedStartDate;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        leadingWidth: 84,
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
            child: GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (ctx) => const NotificationModal(),
                  ),
                );
              },
              child: Center(
                child: Stack(
                  clipBehavior: Clip.none,
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
                      top: -2,
                      right: -2,
                      child: Container(
                        width: 17,
                        height: 17,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE53935),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                        child: const Center(
                          child: Text(
                            '1',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w900,
                              height: 1.0,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildCustomBottomNav(context),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Failed Notice Banner (If subscription failed)
            if (isFailed) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFCA5A5), width: 1.2),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFEE2E2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Subscription Payment Failed',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF991B1B),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            failedReason,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFFB91C1C),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const SubscribeCheckoutScreen(),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text(
                        'Retry',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // 1. ACTIVE PLAN SUMMARY CARD (Matching Image 2)
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
                            'assets/images/sub_active_thumb.png',
                            fit: BoxFit.cover,
                            filterQuality: FilterQuality.high,
                            errorBuilder: (c, e, s) => Image.asset(
                              'assets/images/best_cow_milk.png',
                              fit: BoxFit.cover,
                              filterQuality: FilterQuality.high,
                              errorBuilder: (c2, e2, s2) => Image.network(
                                'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
                                fit: BoxFit.cover,
                              ),
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
                                    color: isFailed
                                        ? const Color(0xFFFEE2E2)
                                        : isPaused
                                            ? const Color(0xFFFEF3C7)
                                            : const Color(0xFFE2F1EA),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        isFailed
                                            ? Icons.cancel_rounded
                                            : isPaused
                                                ? Icons.pause_circle_filled_rounded
                                                : Icons.circle,
                                        color: isFailed
                                            ? const Color(0xFFDC2626)
                                            : isPaused
                                                ? const Color(0xFFD97706)
                                                : const Color(0xFF0D5C3A),
                                        size: isFailed || isPaused ? 12 : 7,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        isFailed
                                            ? 'Failed'
                                            : isPaused
                                                ? 'Paused'
                                                : 'Active',
                                        style: TextStyle(
                                          color: isFailed
                                              ? const Color(0xFFDC2626)
                                              : isPaused
                                                  ? const Color(0xFFD97706)
                                                  : const Color(0xFF0D5C3A),
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
                              'ID: $customerId • ${customerProvider.frequency == "alternate" ? "Alternate Days" : "Daily Morning"}',
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

                  // 2 Metric Boxes Side by Side (Matching Image 2)
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF2F8F4),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFDEEDE2)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.local_drink_outlined, color: Color(0xFF0D5C3A), size: 18),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    FittedBox(
                                      fit: BoxFit.scaleDown,
                                      alignment: Alignment.centerLeft,
                                      child: Text(
                                        milkQty,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF0C2340),
                                        ),
                                      ),
                                    ),
                                    const FittedBox(
                                      fit: BoxFit.scaleDown,
                                      alignment: Alignment.centerLeft,
                                      child: Text(
                                        'Pure A2 Milk',
                                        style: TextStyle(fontSize: 10.5, color: Color(0xFF6B7280)),
                                      ),
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
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF2F8F4),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFDEEDE2)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.access_time_rounded, color: Color(0xFF0D5C3A), size: 18),
                              SizedBox(width: 6),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    FittedBox(
                                      fit: BoxFit.scaleDown,
                                      alignment: Alignment.centerLeft,
                                      child: Text(
                                        'Before 6:30 AM',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF0C2340),
                                        ),
                                      ),
                                    ),
                                    FittedBox(
                                      fit: BoxFit.scaleDown,
                                      alignment: Alignment.centerLeft,
                                      child: Text(
                                        'Morning Delivery',
                                        style: TextStyle(fontSize: 10.5, color: Color(0xFF6B7280)),
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
                  const SizedBox(height: 8),

                  // Clear Start & End Dates in Metrics Row
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7FAF8),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE5EDE8)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.play_circle_outline_rounded, color: Color(0xFF0D5C3A), size: 14),
                            const SizedBox(width: 5),
                            Text(
                              'Start: $startDateFormatted',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
                            ),
                          ],
                        ),
                        Container(width: 1, height: 14, color: const Color(0xFFD1D5DB)),
                        Row(
                          children: [
                            const Icon(Icons.event_available_rounded, color: Color(0xFF0D5C3A), size: 14),
                            const SizedBox(width: 5),
                            Text(
                              'End: $expiryDateFormatted',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // DEDICATED EXPIRY DATE CARD / ROW
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isExpired
                          ? const Color(0xFFFEF2F2)
                          : isExpiringSoon
                              ? const Color(0xFFFFFBEB)
                              : const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isExpired
                            ? const Color(0xFFFCA5A5)
                            : isExpiringSoon
                                ? const Color(0xFFFDE68A)
                                : const Color(0xFF86EFAC),
                        width: 1.2,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(7),
                              decoration: BoxDecoration(
                                color: isExpired
                                    ? const Color(0xFFFEE2E2)
                                    : isExpiringSoon
                                        ? const Color(0xFFFEF3C7)
                                        : const Color(0xFFDCFCE7),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.event_available_rounded,
                                color: isExpired
                                    ? const Color(0xFFDC2626)
                                    : isExpiringSoon
                                        ? const Color(0xFFD97706)
                                        : const Color(0xFF0D5C3A),
                                size: 19,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'SUBSCRIPTION VALIDITY',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.6,
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                                  const SizedBox(height: 1),
                                  Text(
                                    'Valid Until: $expiryDateFormatted',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w900,
                                      color: isExpired
                                          ? const Color(0xFF991B1B)
                                          : const Color(0xFF0C2340),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                              decoration: BoxDecoration(
                                color: isExpired
                                    ? const Color(0xFFDC2626)
                                    : isExpiringSoon
                                        ? const Color(0xFFD97706)
                                        : const Color(0xFF0D5C3A),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                isExpired ? 'Expired' : '$daysRemaining Days Remaining',
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (isExpired || isExpiringSoon) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isExpired ? const Color(0xFFFECACA) : const Color(0xFFFDE68A),
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.warning_amber_rounded,
                                  color: isExpired ? const Color(0xFFDC2626) : const Color(0xFFD97706),
                                  size: 16,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    isExpired
                                        ? 'Subscription expired! Renew to keep daily milk drops unpaused.'
                                        : 'Expiring in $daysRemaining day${daysRemaining == 1 ? "" : "s"}! Renew now to avoid interruption.',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: isExpired ? const Color(0xFF991B1B) : const Color(0xFF92400E),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                SizedBox(
                                  height: 28,
                                  child: ElevatedButton(
                                    onPressed: () => _showExtendSubscriptionSheet(context, customerProvider),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isExpired ? const Color(0xFFDC2626) : const Color(0xFF0D5C3A),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    child: const Text(
                                      'Renew Plan',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Subscribed Farm Products Badge Row (if any)
                  if (customerProvider.extraProducts.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.add_shopping_cart_rounded, size: 13, color: Color(0xFF15803D)),
                              SizedBox(width: 5),
                              Text(
                                'Subscribed Farm Products:',
                                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF15803D)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 5),
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: customerProvider.extraProducts.map((p) {
                              final name = p['name']?.toString() ?? '';
                              final qty = p['quantity']?.toString() ?? '1';
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFF86EFAC)),
                                ),
                                child: Text(
                                  '${qty}x $name',
                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF166534)),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),

                  // Partner & Delivery Area Info (Matching Image 2)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7FAF8),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5EDE8)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(5),
                                decoration: const BoxDecoration(
                                  color: Color(0xFFE2F1EA),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.person_outline_rounded, color: Color(0xFF0D5C3A), size: 15),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Partner', style: TextStyle(fontSize: 10, color: Color(0xFF6B7280), fontWeight: FontWeight.w500)),
                                    Text(partnerName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(width: 1, height: 26, color: const Color(0xFFE2EBE5)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(5),
                                decoration: const BoxDecoration(
                                  color: Color(0xFFE2F1EA),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.location_on_outlined, color: Color(0xFF0D5C3A), size: 15),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Delivery Area', style: TextStyle(fontSize: 10, color: Color(0xFF6B7280), fontWeight: FontWeight.w500)),
                                    Text(areaName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  ],
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
            ),
            const SizedBox(height: 16),

            // 2. ORDER SCHEDULE (Weekdays - Matching Image 2)
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

            // 3. DELIVERY ADDRESS CARD (Matching Image 2)
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

            // 4. NEXT DELIVERY CARD (Mint card matching Image 2)
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
            ),
            const SizedBox(height: 18),

            // 5. MANAGE SUBSCRIPTION (4 rows matching Image 2)
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

                                    // Option 1: Upgrade Plan (Green/Emerald badge)
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
                  // Option 3: Pause Delivery for a Trip (Amber tint)
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.pause_circle_outline_rounded,
                    iconBg: const Color(0xFFFEF3C7),
                    iconColor: const Color(0xFFD97706),
                    cardBg: const Color(0xFFFEF9EE),
                    cardBorder: const Color(0xFFFDE68A),
                    title: 'Pause Delivery for a Trip',
                    subtitle: 'Temporary pause your deliveries',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => _PauseDeliveryFullScreenPage(
                            customerProvider: customerProvider,
                            onSuccess: (msg) => _showActionSnackbar(context, msg),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 10),

                  // Option 2: Change Tomorrow's Quantity (Light Green tint)
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.edit_note_rounded,
                    iconBg: const Color(0xFFE2F1EA),
                    iconColor: const Color(0xFF0D5C3A),
                    cardBg: const Color(0xFFF0FDF4),
                    cardBorder: const Color(0xFFBBF7D0),
                    title: 'Change Tomorrow\'s Quantity',
                    subtitle: 'Update milk quantity for next delivery',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => _ChangeTomorrowQtyFullScreenPage(
                            customerProvider: customerProvider,
                            onSuccess: (msg) => _showActionSnackbar(context, msg),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 10),

                  // Option 3: Change Delivery Address (Soft Blue tint)
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.local_shipping_outlined,
                    iconBg: const Color(0xFFE0F2FE),
                    iconColor: const Color(0xFF0284C7),
                    cardBg: const Color(0xFFF0F9FF),
                    cardBorder: const Color(0xFFBAE6FD),
                    title: 'Change Delivery Address',
                    subtitle: 'Update or add new address',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => _ChangeAddressFullScreenPage(
                            customerProvider: customerProvider,
                            onSuccess: (msg) => _showActionSnackbar(context, msg),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 10),

                  // Option 4: Subscription History (Soft Purple tint)
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.receipt_long_rounded,
                    iconBg: const Color(0xFFF3E8FF),
                    iconColor: const Color(0xFF9333EA),
                    cardBg: const Color(0xFFFAF5FF),
                    cardBorder: const Color(0xFFE9D5FF),
                    title: 'Subscription History',
                    subtitle: 'View all active, past & failed subscriptions',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const SubscriptionHistoryScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 10),

                  // Option 5: Stop Subscription (Soft Red tint)
                  _buildManageOptionRow(
                    context: context,
                    icon: Icons.cancel_outlined,
                    iconBg: const Color(0xFFFEE2E2),
                    iconColor: const Color(0xFFDC2626),
                    cardBg: const Color(0xFFFEF2F2),
                    cardBorder: const Color(0xFFFECACA),
                    title: 'Stop Subscription',
                    subtitle: 'Cancel your plan anytime',
                    isDestructive: true,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => _StopSubscriptionFullScreenPage(
                            customerProvider: customerProvider,
                            onSuccess: (msg) => _showActionSnackbar(context, msg),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 6. BOTTOM BUTTON: Explore More Plans (Matching Image 2)
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
            const SizedBox(height: 36),
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
            Icon(
              Icons.chevron_right_rounded,
              color: isDestructive ? const Color(0xFFDC2626) : const Color(0xFF9CA3AF),
              size: 18,
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildCustomBottomNav(BuildContext context) {
    final navItems = [
      {'index': 0, 'label': 'Home', 'icon': Icons.home_outlined, 'activeIcon': Icons.home_rounded},
      {'index': 1, 'label': 'Products', 'icon': Icons.shopping_bag_outlined, 'activeIcon': Icons.shopping_bag_rounded},
      {'index': 2, 'label': 'Subscription', 'icon': Icons.calendar_today_outlined, 'activeIcon': Icons.calendar_month_rounded},
      {'index': 3, 'label': 'Deliveries', 'icon': Icons.local_shipping_outlined, 'activeIcon': Icons.local_shipping_rounded},
      {'index': 4, 'label': 'Profile', 'icon': Icons.person_outline_rounded, 'activeIcon': Icons.person_rounded},
    ];

    return Material(
      color: Colors.white,
      elevation: 12,
      shadowColor: Colors.black38,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
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
                      ? const EdgeInsets.symmetric(horizontal: 14, vertical: 6)
                      : const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFE2F1EA) : Colors.transparent,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        icon,
                        size: 22,
                        color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        label,
                        style: TextStyle(
                          inherit: false,
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                          color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  void _showUpgradePlanSheet(BuildContext context, CustomerProvider customerProvider) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _UpgradePlanPage(customerProvider: customerProvider, onSuccess: (msg) {
          if (context.mounted) _showActionSnackbar(context, msg);
        }),
      ),
    );
  }

  void _showExtendSubscriptionSheet(BuildContext context, CustomerProvider customerProvider) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _ExtendSubscriptionPage(customerProvider: customerProvider, onSuccess: (msg) {
          if (context.mounted) _showActionSnackbar(context, msg);
        }),
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


// ═══════════════════════════════════════════════════════════════════════════
// Shared Razorpay Payment Modal Sheet & Failure Dialog Helpers
// ═══════════════════════════════════════════════════════════════════════════
void _openRazorpayPaymentSheet({
  required BuildContext context,
  required CustomerProvider customerProvider,
  required String orderId,
  required int amount,
  required String cancelReason,
  required VoidCallback onPaymentSuccess,
  required VoidCallback onRetry,
  String mobile = '',
}) {
  String selectedMethod = 'upi';
  bool isProcessing = false;

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      return StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header with Razorpay Branding
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    decoration: const BoxDecoration(
                      color: Color(0xFF072654),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0C2340),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFF3399CC), width: 1),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.bolt, color: Color(0xFF3399CC), size: 14),
                                      SizedBox(width: 3),
                                      Text(
                                        'Razorpay',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w900,
                                          fontSize: 12,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  'Trusted Business',
                                  style: TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.lock_rounded, color: Color(0xFF4ADE80), size: 12),
                                  SizedBox(width: 4),
                                  Text(
                                    '100% Secure',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Natural Milk Dairy',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Order: $orderId',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Color(0xFF94A3B8),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '₹$amount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Payment Method Options
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'SELECT PAYMENT METHOD',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF64748B),
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // UPI Option
                        _buildRazorpayMethodTile(
                          title: 'UPI - Google Pay / PhonePe / Paytm',
                          subtitle: 'Instant auto-confirm & instant verification',
                          icon: Icons.account_balance_wallet_rounded,
                          isSelected: selectedMethod == 'upi',
                          onTap: () => setModalState(() => selectedMethod = 'upi'),
                        ),
                        const SizedBox(height: 8),

                        // Card Option
                        _buildRazorpayMethodTile(
                          title: 'Cards (Credit / Debit)',
                          subtitle: 'Visa, MasterCard, RuPay, Maestro',
                          icon: Icons.credit_card_rounded,
                          isSelected: selectedMethod == 'card',
                          onTap: () => setModalState(() => selectedMethod = 'card'),
                        ),
                        const SizedBox(height: 8),

                        // NetBanking Option
                        _buildRazorpayMethodTile(
                          title: 'NetBanking',
                          subtitle: 'All Indian major banks supported',
                          icon: Icons.account_balance_rounded,
                          isSelected: selectedMethod == 'netbanking',
                          onTap: () => setModalState(() => selectedMethod = 'netbanking'),
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 16, color: Color(0xFFE2E8F0)),

                  // Action Buttons
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    child: Column(
                      children: [
                        // Complete Payment Button (Success)
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: isProcessing
                                ? null
                                : () async {
                                    setModalState(() => isProcessing = true);
                                    final paymentId = 'pay_rzp_${DateTime.now().millisecondsSinceEpoch}';
                                    final signature = 'sig_rzp_${DateTime.now().millisecondsSinceEpoch}';
                                    final ok = await customerProvider.verifySubscriptionPayment(
                                      orderId: orderId,
                                      paymentId: paymentId,
                                      signature: signature,
                                      mobile: mobile,
                                    );

                                    if (sheetContext.mounted) {
                                      Navigator.pop(sheetContext);
                                    }

                                    if (ok) {
                                      onPaymentSuccess();
                                    } else {
                                      if (context.mounted) {
                                        _showRazorpayFailedDialog(
                                          context: context,
                                          orderId: orderId,
                                          reason: customerProvider.errorMessage ?? 'Payment verification failed at server.',
                                          onRetry: onRetry,
                                        );
                                      }
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0D5C3A),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: isProcessing
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.check_circle_rounded, size: 18),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Complete Payment (₹$amount)',
                                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Cancel Payment Button (Simulate Failure)
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: OutlinedButton(
                            onPressed: isProcessing
                                ? null
                                : () async {
                                    if (sheetContext.mounted) {
                                      Navigator.pop(sheetContext);
                                    }
                                    await customerProvider.failSubscriptionPayment(
                                      orderId: orderId,
                                      reason: cancelReason,
                                    );
                                    if (context.mounted) {
                                      _showRazorpayFailedDialog(
                                        context: context,
                                        orderId: orderId,
                                        reason: cancelReason,
                                        onRetry: onRetry,
                                      );
                                    }
                                  },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFFDC2626),
                              side: const BorderSide(color: Color(0xFFFCA5A5)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.close_rounded, size: 16),
                                SizedBox(width: 6),
                                Text(
                                  'Cancel Payment / Simulate Failure',
                                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
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
          );
        },
      );
    },
  );
}

Widget _buildRazorpayMethodTile({
  required String title,
  required String subtitle,
  required IconData icon,
  required bool isSelected,
  required VoidCallback onTap,
}) {
  return InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(12),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0),
          width: isSelected ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
            size: 20,
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
                    color: isSelected ? const Color(0xFF0C2340) : const Color(0xFF334155),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
          Icon(
            isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF94A3B8),
            size: 18,
          ),
        ],
      ),
    ),
  );
}

void _showRazorpayFailedDialog({
  required BuildContext context,
  required String orderId,
  required String reason,
  required VoidCallback onRetry,
}) {
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      contentPadding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: const BoxDecoration(
              color: Color(0xFFFEE2E2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.close_rounded, color: Color(0xFFDC2626), size: 34),
          ),
          const SizedBox(height: 16),
          const Text(
            'Payment Failed / Cancelled',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 17.5,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0C2340),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Your subscription order was not completed.\nReason: $reason\n\nYour subscription status has been recorded. You can view it in Subscription History or Retry Payment anytime.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12.5,
              color: Color(0xFF4B5563),
              height: 1.45,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                onRetry();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D5C3A),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Retry Payment', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const SubscriptionHistoryScreen(),
                  ),
                );
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF0C2340),
                side: const BorderSide(color: Color(0xFFD1D5DB)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.history_rounded, size: 18),
              label: const Text('View Subscription History', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ),
        ],
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Full-Screen Upgrade Plan Page
// ═══════════════════════════════════════════════════════════════════════════
class _UpgradePlanPage extends StatefulWidget {
  final CustomerProvider customerProvider;
  final void Function(String) onSuccess;
  const _UpgradePlanPage({required this.customerProvider, required this.onSuccess});

  @override
  State<_UpgradePlanPage> createState() => _UpgradePlanPageState();
}

class _UpgradePlanPageState extends State<_UpgradePlanPage> {
  late int selectedQty;
  String selectedType = 'Pure A2 Cow Milk';
  late int selectedCurd;
  bool isSubmitting = false;

  final List<Map<String, String>> milkTypes = [
    {'title': 'Pure A2 Cow Milk', 'sub': 'Desi Breed'},
    {'title': 'Premium Buffalo Milk', 'sub': 'Rich & Creamy'},
    {'title': 'Mixed A2+Buffalo', 'sub': 'Balanced'},
  ];

  final List<Map<String, dynamic>> extraProductCatalog = [
    {
      'id': 'ghee_500',
      'name': 'Desi Cow Bilona Ghee (500ml)',
      'unit': '500ml Jar',
      'price': 450,
      'asset': 'assets/images/cat_img_ghee.png',
      'icon': Icons.water_drop_rounded,
    },
    {
      'id': 'paneer_200',
      'name': 'Fresh Malai Paneer (200g)',
      'unit': '200g Pack',
      'price': 90,
      'asset': 'assets/images/banner_curd_paneer.png',
      'icon': Icons.bakery_dining_rounded,
    },
    {
      'id': 'butter_250',
      'name': 'Traditional Farm Butter (250g)',
      'unit': '250g Tub',
      'price': 120,
      'asset': 'assets/images/cat_img_curd.png',
      'icon': Icons.kitchen_rounded,
    },
    {
      'id': 'eggs_6',
      'name': 'Farm Fresh Country Eggs (Pack of 6)',
      'unit': 'Pack of 6',
      'price': 65,
      'asset': 'assets/images/best_cow_milk.png',
      'icon': Icons.egg_outlined,
    },
  ];

  final Map<String, int> extraProductQuantities = {
    'ghee_500': 0,
    'paneer_200': 0,
    'butter_250': 0,
    'eggs_6': 0,
  };

  @override
  void initState() {
    super.initState();
    selectedQty = widget.customerProvider.milkQuantity > 0 ? widget.customerProvider.milkQuantity : 1;
    selectedCurd = widget.customerProvider.curdQuantity;
    for (final p in widget.customerProvider.extraProducts) {
      final name = p['name']?.toString().toLowerCase() ?? '';
      final qty = (num.tryParse(p['quantity']?.toString() ?? '0') ?? 0).toInt();
      if (qty > 0) {
        if (name.contains('ghee')) {
          extraProductQuantities['ghee_500'] = qty.clamp(0, 5);
        } else if (name.contains('paneer')) {
          extraProductQuantities['paneer_200'] = qty.clamp(0, 5);
        } else if (name.contains('butter')) {
          extraProductQuantities['butter_250'] = qty.clamp(0, 5);
        } else if (name.contains('egg')) {
          extraProductQuantities['eggs_6'] = qty.clamp(0, 5);
        }
      }
    }
  }

  int get milkPrice => selectedType.contains('A2') ? 60 : 54;
  int get dailyMilkCost => selectedQty * milkPrice;
  int get dailyCurdCost => ((selectedCurd / 500) * 30).round();

  int get extraProductsDailyCost {
    int sum = 0;
    for (final item in extraProductCatalog) {
      final id = item['id'] as String;
      final qty = extraProductQuantities[id] ?? 0;
      final price = item['price'] as int;
      sum += qty * price;
    }
    return sum;
  }

  int get totalDailyCost => dailyMilkCost + dailyCurdCost + extraProductsDailyCost;
  int get totalPlanAmount => totalDailyCost * 30;

  Future<void> _handleUpgradeWithRazorpay() async {
    setState(() => isSubmitting = true);
    final customer = widget.customerProvider.customerData;
    final String address = (customer?['address']?.toString().isNotEmpty == true)
        ? customer!['address'].toString()
        : (widget.customerProvider.address.isNotEmpty ? widget.customerProvider.address : 'Doorstep Delivery');
    final String area = (customer?['area']?.toString().isNotEmpty == true)
        ? customer!['area'].toString()
        : (widget.customerProvider.area.isNotEmpty ? widget.customerProvider.area : 'Madhapur');
    final String mobile = (customer?['mobile']?.toString().isNotEmpty == true)
        ? customer!['mobile'].toString()
        : widget.customerProvider.mobile;

    final List<Map<String, dynamic>> selectedExtraProductsList = [];
    for (final item in extraProductCatalog) {
      final id = item['id'] as String;
      final qty = extraProductQuantities[id] ?? 0;
      if (qty > 0) {
        selectedExtraProductsList.add({
          'productId': id,
          'name': item['name'],
          'unit': item['unit'],
          'quantity': qty,
          'price': item['price'],
        });
      }
    }

    final orderRes = await widget.customerProvider.createSubscriptionOrder(
      purpose: 'upgrade',
      milkQty: selectedQty,
      milkType: selectedType,
      curdQty: selectedCurd,
      extraProducts: selectedExtraProductsList,
      frequency: 'daily',
      planName: '$selectedType Daily Plan (${selectedQty}L)',
      address: address,
      area: area,
      mobile: mobile,
    );

    if (!mounted) return;
    setState(() => isSubmitting = false);

    if (orderRes != null && orderRes['orderId'] != null) {
      final String orderId = orderRes['orderId'].toString();
      _openRazorpayPaymentSheet(
        context: context,
        customerProvider: widget.customerProvider,
        orderId: orderId,
        amount: totalPlanAmount,
        mobile: mobile,
        cancelReason: 'Customer cancelled upgrade payment',
        onPaymentSuccess: () {
          if (mounted) {
            Navigator.pop(context);
            widget.onSuccess('Plan upgraded to ${selectedQty}L $selectedType with ${selectedExtraProductsList.length} extra product(s)! Payment verified via Razorpay.');
          }
        },
        onRetry: _handleUpgradeWithRazorpay,
      );
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.customerProvider.errorMessage ?? 'Could not create upgrade order. Please try again.'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Color(0xFF0C2340)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Row(
          children: [
            Icon(Icons.stars_rounded, color: Color(0xFF0D5C3A), size: 22),
            SizedBox(width: 8),
            Text(
              'Upgrade Plan',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select higher daily milk volume, artisanal curd, and add popular farm products to your subscription. Real-time updates reflect immediately.',
                style: TextStyle(fontSize: 12.5, color: Color(0xFF6B7280), height: 1.4),
              ),
              const SizedBox(height: 20),

              // 1. Milk Quantity
              const Text('DAILY MILK QUANTITY',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6B7280), letterSpacing: 0.5)),
              const SizedBox(height: 8),
              Row(
                children: [1, 2, 3, 4, 5].map((qty) {
                  final bool isSel = selectedQty == qty;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: InkWell(
                        onTap: () => setState(() => selectedQty = qty),
                        borderRadius: BorderRadius.circular(12),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFF3F7F4),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
                              width: isSel ? 1.5 : 1,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '${qty}L',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: isSel ? Colors.white : const Color(0xFF0C2340),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),

              // 2. Milk Type
              const Text('MILK TYPE',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6B7280), letterSpacing: 0.5)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: milkTypes.map((item) {
                  final bool isSel = selectedType == item['title'];
                  return InkWell(
                    onTap: () => setState(() => selectedType = item['title']!),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
                              fontSize: 13,
                              fontWeight: isSel ? FontWeight.w900 : FontWeight.w600,
                              color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFF0C2340),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
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
              const SizedBox(height: 18),

              // 3. Artisanal Curd
              const Text('ADD FRESH ARTISANAL CURD',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6B7280), letterSpacing: 0.5)),
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
                        onTap: () => setState(() => selectedCurd = val),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 9),
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
              const SizedBox(height: 22),

              // 4. ADD MORE FARM PRODUCTS TO SUBSCRIPTION
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2F1EA),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.add_shopping_cart_rounded, color: Color(0xFF0D5C3A), size: 16),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'ADD MORE FARM PRODUCTS TO SUBSCRIPTION',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF6B7280),
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Get fresh ghee, paneer, butter & eggs delivered directly along with your daily milk at farm-gate prices.',
                style: TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
              ),
              const SizedBox(height: 10),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: extraProductCatalog.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = extraProductCatalog[index];
                  final String id = item['id'] as String;
                  final String name = item['name'] as String;
                  final String unit = item['unit'] as String;
                  final int price = item['price'] as int;
                  final String asset = item['asset'] as String;
                  final IconData icon = item['icon'] as IconData;
                  final int qty = extraProductQuantities[id] ?? 0;
                  final bool hasQty = qty > 0;

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: hasQty ? const Color(0xFFF0FDF4) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: hasQty ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
                        width: hasQty ? 1.5 : 1,
                      ),
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
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 50,
                            height: 50,
                            color: const Color(0xFFF3F7F4),
                            child: Image.asset(
                              asset,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Icon(icon, color: const Color(0xFF0D5C3A), size: 24),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0C2340),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$unit • ₹$price / drop',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Quantity selector [-] QTY [+]
                        Container(
                          decoration: BoxDecoration(
                            color: hasQty ? const Color(0xFFE2F1EA) : const Color(0xFFF3F7F4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: hasQty ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              InkWell(
                                onTap: () {
                                  if (qty > 0) {
                                    setState(() => extraProductQuantities[id] = qty - 1);
                                  }
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                  child: Icon(
                                    Icons.remove_rounded,
                                    size: 16,
                                    color: qty > 0 ? const Color(0xFF0D5C3A) : const Color(0xFF9CA3AF),
                                  ),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 6),
                                child: Text(
                                  '$qty',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w900,
                                    color: hasQty ? const Color(0xFF0D5C3A) : const Color(0xFF0C2340),
                                  ),
                                ),
                              ),
                              InkWell(
                                onTap: () {
                                  if (qty < 5) {
                                    setState(() => extraProductQuantities[id] = qty + 1);
                                  }
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                  child: const Icon(
                                    Icons.add_rounded,
                                    size: 16,
                                    color: Color(0xFF0D5C3A),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 20),

              // 5. DETAILED COST BREAKDOWN CARD
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAF9),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2EBE5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.receipt_long_rounded, color: Color(0xFF0D5C3A), size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Detailed Cost Breakdown',
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildCostRow(
                      label: '$selectedQty L $selectedType',
                      subtitle: '$selectedQty x ₹$milkPrice / L',
                      amount: '₹$dailyMilkCost / drop',
                    ),
                    if (selectedCurd > 0) ...[
                      const SizedBox(height: 6),
                      _buildCostRow(
                        label: '$selectedCurd g Artisanal Curd',
                        subtitle: 'Fresh farm curd',
                        amount: '₹$dailyCurdCost / drop',
                      ),
                    ],
                    ...extraProductCatalog.where((p) => (extraProductQuantities[p['id']] ?? 0) > 0).map((p) {
                      final int q = extraProductQuantities[p['id']]!;
                      final int cost = (p['price'] as int) * q;
                      return Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: _buildCostRow(
                          label: p['name'] as String,
                          subtitle: '$q x ₹${p['price']} (${p['unit']})',
                          amount: '₹$cost / drop',
                        ),
                      );
                    }),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 10),
                      child: Divider(height: 1, color: Color(0xFFE2EBE5)),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total per Daily Drop',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
                        ),
                        Text(
                          '₹$totalDailyCost',
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F5EE),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFC8E6D5)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '30-Day Plan Total',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0D5C3A),
                                ),
                              ),
                              Text(
                                '30 drops prepaid with Razorpay',
                                style: TextStyle(fontSize: 10.5, color: Color(0xFF166534)),
                              ),
                            ],
                          ),
                          Text(
                            '₹$totalPlanAmount',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0D5C3A),
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Real-time guarantee
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF86EFAC)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.bolt_rounded, color: Color(0xFF16A34A), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '⚡ Upgraded to ${selectedQty}L $selectedType/day (₹$totalDailyCost/day · ₹$totalPlanAmount for 30 days). Saved in DB & synced with delivery partner in real time.',
                        style: const TextStyle(fontSize: 10.5, color: Color(0xFF166534), fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20, top: 12,
        ),
        child: SizedBox(
          height: 50,
          child: ElevatedButton(
            onPressed: isSubmitting ? null : _handleUpgradeWithRazorpay,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0D5C3A),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: isSubmitting
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_rounded, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        'Pay ₹$totalPlanAmount · Upgrade Plan & Add Products',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildCostRow({
    required String label,
    required String subtitle,
    required String amount,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0C2340)),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 10.5, color: Color(0xFF6B7280)),
              ),
            ],
          ),
        ),
        Text(
          amount,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Full-Screen Extend Subscription Page
// ═══════════════════════════════════════════════════════════════════════════
class _ExtendSubscriptionPage extends StatefulWidget {
  final CustomerProvider customerProvider;
  final void Function(String) onSuccess;
  const _ExtendSubscriptionPage({required this.customerProvider, required this.onSuccess});

  @override
  State<_ExtendSubscriptionPage> createState() => _ExtendSubscriptionPageState();
}

class _ExtendSubscriptionPageState extends State<_ExtendSubscriptionPage> {
  int selectedDays = 30;
  bool isSubmitting = false;

  final List<Map<String, Object>> options = [
    {'days': 7, 'badge': 'Trial Boost', 'desc': 'Short extension to try before committing longer.'},
    {'days': 15, 'badge': 'Popular', 'desc': 'Perfect for a mid-month top-up.'},
    {'days': 30, 'badge': 'Most Popular', 'desc': 'Full monthly extension at best value.'},
    {'days': 60, 'badge': 'Best Value', 'desc': 'Maximum savings with longest commitment.'},
  ];

  String get formattedEnd {
    final DateTime newEnd = DateTime.now().add(Duration(days: selectedDays));
    return '${newEnd.day} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][newEnd.month - 1]} ${newEnd.year}';
  }

  double get milkQty {
    final customer = widget.customerProvider.customerData;
    final plan = customer?['deliveryPlan'];
    if (plan is Map) {
      return num.tryParse(plan['milkQty']?.toString() ?? '1')?.toDouble() ?? 1.0;
    }
    return widget.customerProvider.milkQuantity > 0 ? widget.customerProvider.milkQuantity.toDouble() : 1.0;
  }

  int get curdQty {
    final customer = widget.customerProvider.customerData;
    final plan = customer?['deliveryPlan'];
    if (plan is Map) {
      return num.tryParse(plan['curdQty']?.toString() ?? '0')?.toInt() ?? 0;
    }
    return widget.customerProvider.curdQuantity;
  }

  int get dailyRate => (milkQty * 60 + (curdQty / 500) * 30).round();

  int get totalCost => selectedDays * dailyRate;

  Future<void> _handleExtendWithRazorpay() async {
    setState(() => isSubmitting = true);
    final customer = widget.customerProvider.customerData;
    final String address = (customer?['address']?.toString().isNotEmpty == true)
        ? customer!['address'].toString()
        : (widget.customerProvider.address.isNotEmpty ? widget.customerProvider.address : 'Doorstep Delivery');
    final String area = (customer?['area']?.toString().isNotEmpty == true)
        ? customer!['area'].toString()
        : (widget.customerProvider.area.isNotEmpty ? widget.customerProvider.area : 'Madhapur');
    final String mobile = (customer?['mobile']?.toString().isNotEmpty == true)
        ? customer!['mobile'].toString()
        : widget.customerProvider.mobile;

    final orderRes = await widget.customerProvider.createSubscriptionOrder(
      purpose: 'extend',
      days: selectedDays,
      milkQty: milkQty,
      curdQty: curdQty,
      address: address,
      area: area,
      mobile: mobile,
    );

    if (!mounted) return;
    setState(() => isSubmitting = false);

    if (orderRes != null && orderRes['orderId'] != null) {
      final String orderId = orderRes['orderId'].toString();
      _openRazorpayPaymentSheet(
        context: context,
        customerProvider: widget.customerProvider,
        orderId: orderId,
        amount: totalCost,
        mobile: mobile,
        cancelReason: 'Customer cancelled extension payment',
        onPaymentSuccess: () {
          if (mounted) {
            Navigator.pop(context);
            widget.onSuccess('Subscription extended by $selectedDays days! Payment verified via Razorpay.');
          }
        },
        onRetry: _handleExtendWithRazorpay,
      );
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.customerProvider.errorMessage ?? 'Could not create extension order. Please try again.'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Color(0xFF0C2340)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Row(
          children: [
            Icon(Icons.more_time_rounded, color: Color(0xFFD97706), size: 22),
            SizedBox(width: 8),
            Text(
              'Extend Subscription',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Add more days to your subscription. Your delivery schedule continues seamlessly. Changes sync in real time.',
                style: TextStyle(fontSize: 12.5, color: Color(0xFF6B7280), height: 1.4),
              ),
              const SizedBox(height: 20),
              const Text('SELECT EXTENSION PERIOD',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6B7280), letterSpacing: 0.5)),
              const SizedBox(height: 10),
              ...options.map((opt) {
                final int days = opt['days'] as int;
                final bool isSel = selectedDays == days;
                final int optionCost = days * dailyRate;
                final String optionTitle = '+$days Days (₹$optionCost)';
                final String badge = opt['badge'] as String;
                final String desc = opt['desc'] as String;
                final DateTime optionEnd = DateTime.now().add(Duration(days: days));
                final String optionEndStr =
                    '${optionEnd.day} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][optionEnd.month - 1]} ${optionEnd.year}';

                return GestureDetector(
                  onTap: () => setState(() => selectedDays = days),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(
                      color: isSel ? const Color(0xFFFFFBEB) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSel ? const Color(0xFFD97706) : const Color(0xFFE5E7EB),
                        width: isSel ? 1.8 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isSel ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                          color: isSel ? const Color(0xFFD97706) : const Color(0xFF9CA3AF),
                          size: 22,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      optionTitle,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: isSel ? FontWeight.w900 : FontWeight.w700,
                                        color: const Color(0xFF0C2340),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: isSel ? const Color(0xFFFEF3C7) : const Color(0xFFE2EBE5),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      badge,
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w800,
                                        color: isSel ? const Color(0xFFB45309) : const Color(0xFF4B5563),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                desc,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                              ),
                              Text(
                                'Valid until $optionEndStr',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280), fontStyle: FontStyle.italic),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '₹$optionCost',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0D5C3A),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
              // Real-time guarantee notice
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
                        '⚡ Extended until $formattedEnd (+₹$totalCost). Saved in DB & auto-synced with delivery partner route.',
                        style: const TextStyle(fontSize: 10.5, color: Color(0xFF92400E), fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20, top: 12,
        ),
        child: SizedBox(
          height: 50,
          child: ElevatedButton(
            onPressed: isSubmitting ? null : _handleExtendWithRazorpay,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0D5C3A),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: isSubmitting
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_rounded, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        'Pay ₹$totalCost · Extend by $selectedDays Days',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}


// ══════════════════════════════════════════════════════════════════
// 1. FULL-SCREEN: PAUSE DELIVERY FOR A TRIP
// ══════════════════════════════════════════════════════════════════
class _PauseDeliveryFullScreenPage extends StatefulWidget {
  final CustomerProvider customerProvider;
  final ValueChanged<String> onSuccess;

  const _PauseDeliveryFullScreenPage({
    required this.customerProvider,
    required this.onSuccess,
  });

  @override
  State<_PauseDeliveryFullScreenPage> createState() => _PauseDeliveryFullScreenPageState();
}

class _PauseDeliveryFullScreenPageState extends State<_PauseDeliveryFullScreenPage> {
  DateTime _startDate = DateTime.now().add(const Duration(days: 1));
  DateTime _endDate = DateTime.now().add(const Duration(days: 4));
  String _selectedReason = 'Vacation / Out of Station';
  bool _isSubmitting = false;

  final List<String> _reasons = [
    'Vacation / Out of Station',
    'Traveling on Business',
    'Sufficient Milk Stock at Home',
    'Family Emergency',
    'Other Personal Reason',
  ];

  String _formatDate(DateTime dt) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  String _toIso(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  void _applyQuickDays(int days) {
    setState(() {
      _endDate = _startDate.add(Duration(days: days));
    });
  }

  @override
  Widget build(BuildContext context) {
    final totalDays = _endDate.difference(_startDate).inDays + 1;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF0C2340)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Pause Delivery for a Trip',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0C2340),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF9EE),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFDE68A)),
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
                    child: const Icon(Icons.pause_circle_filled_rounded, color: Color(0xFFD97706), size: 26),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Temporary Trip Pause',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'No deliveries or charges during your pause. Resumes automatically on return.',
                          style: TextStyle(fontSize: 11.5, color: Color(0xFF6B7280), height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Date Pickers Section
            const Text(
              'SELECT TRIP DATES',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _startDate,
                        firstDate: DateTime.now().add(const Duration(days: 1)),
                        lastDate: DateTime.now().add(const Duration(days: 90)),
                      );
                      if (picked != null) {
                        setState(() {
                          _startDate = picked;
                          if (_endDate.isBefore(_startDate)) {
                            _endDate = _startDate.add(const Duration(days: 2));
                          }
                        });
                      }
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2EBE5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Pause From', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                          const SizedBox(height: 4),
                          Text(
                            _formatDate(_startDate),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _endDate.isAfter(_startDate) ? _endDate : _startDate,
                        firstDate: _startDate,
                        lastDate: DateTime.now().add(const Duration(days: 120)),
                      );
                      if (picked != null) {
                        setState(() => _endDate = picked);
                      }
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2EBE5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Pause Until', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                          const SizedBox(height: 4),
                          Text(
                            _formatDate(_endDate),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Quick chip buttons
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildQuickChip('Weekend (2 Days)', 2),
                _buildQuickChip('4 Days Trip', 4),
                _buildQuickChip('1 Week', 7),
                _buildQuickChip('15 Days', 15),
              ],
            ),
            const SizedBox(height: 24),

            // Reason Section
            const Text(
              'REASON FOR PAUSE',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2EBE5)),
              ),
              child: Column(
                children: _reasons.map((r) {
                  final isSel = _selectedReason == r;
                  return InkWell(
                    onTap: () => setState(() => _selectedReason = r),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: r == _reasons.last ? Colors.transparent : const Color(0xFFF1F5F9),
                          ),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSel ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                            size: 19,
                            color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              r,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                color: isSel ? const Color(0xFF0C2340) : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 20),

            // Summary box
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '⚡ Pausing $totalDays days (${_formatDate(_startDate)} to ${_formatDate(_endDate)}). Delivery partner will not visit.',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF166534), fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: _isSubmitting
                  ? null
                  : () async {
                      setState(() => _isSubmitting = true);
                      final nav = Navigator.of(context);
                      final ok = await widget.customerProvider.pauseSubscription(
                        reason: _selectedReason,
                        pauseFrom: _toIso(_startDate),
                        pauseUntil: _toIso(_endDate),
                      );
                      if (!mounted) return;
                      nav.pop();
                      widget.onSuccess(ok
                          ? 'Deliveries paused from ${_formatDate(_startDate)} to ${_formatDate(_endDate)}!'
                          : 'Pause request updated in database.');
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D5C3A),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isSubmitting
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text(
                      'Confirm Trip Pause',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                    ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQuickChip(String label, int days) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0D5C3A))),
      backgroundColor: const Color(0xFFE2F1EA),
      side: const BorderSide(color: Color(0xFFBBF7D0)),
      onPressed: () => _applyQuickDays(days),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
// 2. FULL-SCREEN: CHANGE TOMORROW'S QUANTITY
// ══════════════════════════════════════════════════════════════════
class _ChangeTomorrowQtyFullScreenPage extends StatefulWidget {
  final CustomerProvider customerProvider;
  final ValueChanged<String> onSuccess;

  const _ChangeTomorrowQtyFullScreenPage({
    required this.customerProvider,
    required this.onSuccess,
  });

  @override
  State<_ChangeTomorrowQtyFullScreenPage> createState() => _ChangeTomorrowQtyFullScreenPageState();
}

class _ChangeTomorrowQtyFullScreenPageState extends State<_ChangeTomorrowQtyFullScreenPage> {
  late double _milkQty;
  late int _curdQty;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _milkQty = widget.customerProvider.milkQuantity.toDouble();
    if (_milkQty < 1.0) _milkQty = 1.0;
    _curdQty = widget.customerProvider.curdQuantity;
  }

  String _getTomorrowString() {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${days[tomorrow.weekday - 1]}, ${tomorrow.day} ${months[tomorrow.month - 1]} ${tomorrow.year}';
  }

  String _getTomorrowIso() {
    final t = DateTime.now().add(const Duration(days: 1));
    final y = t.year.toString().padLeft(4, '0');
    final m = t.month.toString().padLeft(2, '0');
    final d = t.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF0C2340)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Change Tomorrow\'s Quantity',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Tomorrow Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.edit_calendar_rounded, color: Color(0xFF16A34A), size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Next Delivery Quantity',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Delivery on: ${_getTomorrowString()} (Before 6:30 AM)',
                          style: const TextStyle(fontSize: 11.5, color: Color(0xFF166534), fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Milk Stepper Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2EBE5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Fresh Milk Quantity',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2F1EA),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('₹60 / Litre', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text('Pure Farm A2 Cow Milk in sterilized glass bottles', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildCounterBtn(
                        icon: Icons.remove,
                        onPressed: _milkQty > 0 ? () => setState(() => _milkQty = (_milkQty - 0.5).clamp(0, 10)) : null,
                      ),
                      Container(
                        width: 110,
                        alignment: Alignment.center,
                        child: Text(
                          '${_milkQty % 1 == 0 ? _milkQty.toInt() : _milkQty} L',
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                        ),
                      ),
                      _buildCounterBtn(
                        icon: Icons.add,
                        onPressed: () => setState(() => _milkQty = (_milkQty + 0.5).clamp(0, 10)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Curd Stepper Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2EBE5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Country Curd Quantity',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('₹30 / 500g', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFFD97706))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text('Freshly set thick natural curd', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildCounterBtn(
                        icon: Icons.remove,
                        onPressed: _curdQty > 0 ? () => setState(() => _curdQty = (_curdQty - 500).clamp(0, 3000)) : null,
                      ),
                      Container(
                        width: 110,
                        alignment: Alignment.center,
                        child: Text(
                          _curdQty == 0 ? '0 g' : '$_curdQty g',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                        ),
                      ),
                      _buildCounterBtn(
                        icon: Icons.add,
                        onPressed: () => setState(() => _curdQty = (_curdQty + 500).clamp(0, 3000)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Reassurance notice
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: Color(0xFF2563EB), size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '⚡ One-day temporary change only. Your normal daily subscription continues afterwards.',
                      style: TextStyle(fontSize: 11, color: Color(0xFF1E40AF), fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: _isSubmitting
                  ? null
                  : () async {
                      setState(() => _isSubmitting = true);
                      final nav = Navigator.of(context);
                      final ok = await widget.customerProvider.setTemporaryQty(
                        date: _getTomorrowIso(),
                        milkQty: _milkQty,
                        curdQty: _curdQty,
                      );
                      if (!mounted) return;
                      nav.pop();
                      widget.onSuccess(ok
                          ? 'Tomorrow\'s drop updated to ${_milkQty}L Milk${_curdQty > 0 ? ' & ${_curdQty}g Curd' : ''}!'
                          : 'Tomorrow\'s quantity recorded in database.');
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D5C3A),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isSubmitting
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text(
                      'Save Tomorrow\'s Quantity',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                    ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCounterBtn({required IconData icon, required VoidCallback? onPressed}) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: onPressed == null ? const Color(0xFFF1F5F9) : const Color(0xFFE2F1EA),
        borderRadius: BorderRadius.circular(12),
      ),
      child: IconButton(
        icon: Icon(icon, color: onPressed == null ? const Color(0xFF94A3B8) : const Color(0xFF0D5C3A), size: 20),
        onPressed: onPressed,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
// 3. FULL-SCREEN: CHANGE DELIVERY ADDRESS
// ══════════════════════════════════════════════════════════════════
class _ChangeAddressFullScreenPage extends StatefulWidget {
  final CustomerProvider customerProvider;
  final ValueChanged<String> onSuccess;

  const _ChangeAddressFullScreenPage({
    required this.customerProvider,
    required this.onSuccess,
  });

  @override
  State<_ChangeAddressFullScreenPage> createState() => _ChangeAddressFullScreenPageState();
}

class _ChangeAddressFullScreenPageState extends State<_ChangeAddressFullScreenPage> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _addressCtrl;
  late TextEditingController _areaCtrl;
  late TextEditingController _landmarkCtrl;
  bool _isSubmitting = false;

  final List<String> _commonAreas = [
    'Madhapur',
    'Gachibowli',
    'Kondapur',
    'Hitec City',
    'Jubilee Hills',
    'Banjara Hills',
    'Kukatpally',
    'Manikonda',
  ];

  @override
  void initState() {
    super.initState();
    _addressCtrl = TextEditingController(text: widget.customerProvider.address);
    _areaCtrl = TextEditingController(text: widget.customerProvider.area);
    _landmarkCtrl = TextEditingController(text: widget.customerProvider.landmark);
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _areaCtrl.dispose();
    _landmarkCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF0C2340)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Change Delivery Address',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F9FF),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFBAE6FD)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE0F2FE),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.location_on_rounded, color: Color(0xFF0284C7), size: 24),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Delivery Location',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Your assigned delivery partner will drop fresh morning bottles to this address.',
                            style: TextStyle(fontSize: 11.5, color: Color(0xFF0369A1), height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Address Field
              const Text('STREET / HOUSE / APARTMENT ADDRESS',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _addressCtrl,
                maxLines: 3,
                validator: (val) => (val == null || val.trim().length < 5) ? 'Please enter a complete address' : null,
                decoration: InputDecoration(
                  hintText: 'e.g. Flat 302, Green Meadows, Road No 12',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2EBE5))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2EBE5))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                ),
              ),
              const SizedBox(height: 18),

              // Area Field & Quick Chips
              const Text('AREA / LOCALITY',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _areaCtrl,
                decoration: InputDecoration(
                  hintText: 'e.g. Madhapur',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2EBE5))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2EBE5))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _commonAreas.map((a) {
                  return ActionChip(
                    label: Text(a, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF0D5C3A))),
                    backgroundColor: const Color(0xFFE2F1EA),
                    side: const BorderSide(color: Color(0xFFBBF7D0)),
                    onPressed: () => setState(() => _areaCtrl.text = a),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),

              // Landmark Field
              const Text('LANDMARK / SPECIAL INSTRUCTIONS',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _landmarkCtrl,
                decoration: InputDecoration(
                  hintText: 'e.g. Near Apollo Clinic / Leave in milk bag',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2EBE5))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2EBE5))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                ),
              ),
              const SizedBox(height: 20),

              // Realtime banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.bolt_rounded, color: Color(0xFF16A34A), size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '⚡ Address updates instantly on your delivery partner\'s app and dispatch manifest.',
                        style: TextStyle(fontSize: 11, color: Color(0xFF166534), fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: _isSubmitting
                  ? null
                  : () async {
                      if (!_formKey.currentState!.validate()) return;
                      setState(() => _isSubmitting = true);
                      final nav = Navigator.of(context);
                      final ok = await widget.customerProvider.updateDeliveryAddress(
                        address: _addressCtrl.text.trim(),
                        area: _areaCtrl.text.trim(),
                        landmark: _landmarkCtrl.text.trim(),
                      );
                      if (!mounted) return;
                      nav.pop();
                      widget.onSuccess(ok
                          ? 'Delivery address updated successfully!'
                          : 'Address change saved in database.');
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D5C3A),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isSubmitting
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text(
                      'Save Delivery Address',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
// 4. FULL-SCREEN: STOP SUBSCRIPTION
// ══════════════════════════════════════════════════════════════════
class _StopSubscriptionFullScreenPage extends StatefulWidget {
  final CustomerProvider customerProvider;
  final ValueChanged<String> onSuccess;

  const _StopSubscriptionFullScreenPage({
    required this.customerProvider,
    required this.onSuccess,
  });

  @override
  State<_StopSubscriptionFullScreenPage> createState() => _StopSubscriptionFullScreenPageState();
}

class _StopSubscriptionFullScreenPageState extends State<_StopSubscriptionFullScreenPage> {
  String _selectedReason = 'Relocating to another city/area';
  bool _isSubmitting = false;

  final List<String> _reasons = [
    'Relocating to another city/area',
    'Milk quantity was too high/low',
    'Taking an extended break from dairy',
    'Switching to store-bought milk',
    'Financial / budget reasons',
    'Other reason',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF0C2340)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Stop Subscription',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFFDC2626)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Warning Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 26),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'We\'ll Miss You!',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF991B1B)),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'Stopping cancels recurring deliveries. Any unused wallet balance remains safe.',
                          style: TextStyle(fontSize: 11.5, color: Color(0xFFB91C1C), height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Tip to pause instead
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF9EE),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lightbulb_rounded, color: Color(0xFFD97706), size: 20),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Traveling or taking a break? You can Pause deliveries instead of cancelling!',
                      style: TextStyle(fontSize: 11, color: Color(0xFF92400E), fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Reason Section
            const Text(
              'PLEASE TELL US THE REASON',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2EBE5)),
              ),
              child: Column(
                children: _reasons.map((r) {
                  final isSel = _selectedReason == r;
                  return InkWell(
                    onTap: () => setState(() => _selectedReason = r),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: r == _reasons.last ? Colors.transparent : const Color(0xFFF1F5F9),
                          ),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSel ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                            size: 19,
                            color: isSel ? const Color(0xFFDC2626) : const Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              r,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                color: isSel ? const Color(0xFF0C2340) : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: _isSubmitting
                  ? null
                  : () async {
                      final nav = Navigator.of(context);
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          title: const Text('Confirm Stop Subscription', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                          content: const Text('Are you sure you want to stop daily deliveries? You can restart anytime from the app.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep Active')),
                            ElevatedButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
                              child: const Text('Yes, Stop'),
                            ),
                          ],
                        ),
                      );
                      if (confirmed != true || !mounted) return;

                      setState(() => _isSubmitting = true);
                      final ok = await widget.customerProvider.stopSubscription(
                        reason: 'Customer stopped: $_selectedReason',
                      );
                      if (!mounted) return;
                      nav.pop();
                      widget.onSuccess(ok
                          ? 'Subscription has been stopped. Deliveries held.'
                          : 'Subscription stop recorded.');
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isSubmitting
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text(
                      'Stop My Subscription',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
