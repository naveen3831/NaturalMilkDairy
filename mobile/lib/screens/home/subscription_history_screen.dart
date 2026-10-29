import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/customer_provider.dart';
import 'subscribe_checkout_screen.dart';

class SubscriptionHistoryScreen extends StatefulWidget {
  const SubscriptionHistoryScreen({super.key});

  @override
  State<SubscriptionHistoryScreen> createState() => _SubscriptionHistoryScreenState();
}

class _SubscriptionHistoryScreenState extends State<SubscriptionHistoryScreen> {
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CustomerProvider>().fetchSubscriptionHistory();
    });
  }

  Future<void> _handleRefresh() async {
    setState(() => _isRefreshing = true);
    try {
      await context.read<CustomerProvider>().fetchSubscriptionHistory();
    } finally {
      if (mounted) setState(() => _isRefreshing = false);
    }
  }

  String _formatDate(dynamic dateVal) {
    if (dateVal == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateVal.toString());
      final months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return dateVal.toString();
    }
  }

  double _parseAmount(dynamic amt) {
    if (amt == null) return 0.0;
    final numVal = num.tryParse(amt.toString()) ?? 0;
    // If stored in paise (>500), convert to Rupees
    if (numVal > 500) {
      return numVal / 100.0;
    }
    return numVal.toDouble();
  }

  @override
  Widget build(BuildContext context) {
    final customer = context.watch<CustomerProvider>();
    final history = customer.subscriptionsHistory;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF0C2340)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Subscription History',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0C2340),
                letterSpacing: -0.2,
              ),
            ),
            Text(
              '${history.length} record${history.length == 1 ? '' : 's'} · Real-time sync',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: _isRefreshing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0D5C3A)),
                  )
                : const Icon(Icons.refresh_rounded, color: Color(0xFF0D5C3A), size: 22),
            tooltip: 'Refresh',
            onPressed: _isRefreshing ? null : _handleRefresh,
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: RefreshIndicator(
        color: const Color(0xFF0D5C3A),
        onRefresh: _handleRefresh,
        child: customer.isLoading && history.isEmpty
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xFF0D5C3A)),
              )
            : history.isEmpty
                ? _buildEmptyState()
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                    itemCount: history.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 14),
                    itemBuilder: (context, index) {
                      final item = history[index];
                      return _buildSubscriptionCard(item);
                    },
                  ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2F1EA),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF0D5C3A).withValues(alpha: 0.15), width: 6),
                    ),
                    child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF0D5C3A), size: 38),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'No Subscriptions Yet',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0C2340),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'You don’t have any active, past, or pending subscription orders yet. Start your pure morning milk subscription today!',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.45,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const SubscribeCheckoutScreen(),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D5C3A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                    label: const Text(
                      'Start Pure Milk Plan',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSubscriptionCard(Map<String, dynamic> item) {
    final status = (item['status']?.toString() ?? 'pending').toLowerCase();
    final plan = item['plan'] is Map ? Map<String, dynamic>.from(item['plan'] as Map) : <String, dynamic>{};
    final milkQty = plan['milkQty'] != null ? plan['milkQty'].toString() : '1';
    final curdQty = plan['curdQty'] != null ? plan['curdQty'].toString() : '0';
    final freq = plan['frequency']?.toString() ?? 'daily';
    final freqLabel = freq == 'alternate' ? 'Alternate Days' : freq == 'selected' ? 'Custom Days' : 'Daily Morning';
    
    final startDate = _formatDate(item['startDate'] ?? item['createdAt']);
    final endDate = _formatDate(item['endDate']);
    final amount = _parseAmount(item['amount']);
    final orderId = item['providerOrderId']?.toString() ?? item['orderId']?.toString() ?? item['_id']?.toString() ?? '';
    final paymentId = item['providerPaymentId']?.toString() ?? '';
    final failedReason = item['failedReason']?.toString() ?? 'Payment was cancelled or could not be completed';
    final address = item['deliveryAddress']?.toString() ?? item['address']?.toString() ?? '';
    final area = item['area']?.toString() ?? '';

    // Status Badge Configuration
    Color statusColor;
    Color statusBg;
    IconData statusIcon;
    String statusLabel;

    switch (status) {
      case 'active':
        statusColor = const Color(0xFF0D5C3A);
        statusBg = const Color(0xFFE2F1EA);
        statusIcon = Icons.check_circle_rounded;
        statusLabel = 'Active';
        break;
      case 'failed':
        statusColor = const Color(0xFFDC2626);
        statusBg = const Color(0xFFFEE2E2);
        statusIcon = Icons.cancel_rounded;
        statusLabel = 'Failed';
        break;
      case 'paused':
        statusColor = const Color(0xFFD97706);
        statusBg = const Color(0xFFFEF3C7);
        statusIcon = Icons.pause_circle_rounded;
        statusLabel = 'Paused';
        break;
      case 'pending':
        statusColor = const Color(0xFF2563EB);
        statusBg = const Color(0xFFEFF6FF);
        statusIcon = Icons.hourglass_top_rounded;
        statusLabel = 'Pending Payment';
        break;
      default:
        statusColor = const Color(0xFF64748B);
        statusBg = const Color(0xFFF1F5F9);
        statusIcon = Icons.info_outline_rounded;
        statusLabel = status[0].toUpperCase() + status.substring(1);
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: status == 'failed' ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0),
          width: status == 'failed' ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Title + Status Badge
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${milkQty}L Pure A2 Cow Milk $freqLabel',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0C2340),
                          letterSpacing: -0.2,
                        ),
                      ),
                      if (curdQty != '0' && curdQty != '0.0') ...[
                        const SizedBox(height: 2),
                        Text(
                          '+ ${curdQty}g Traditional Claypot Curd',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF0D5C3A),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, color: statusColor, size: 13),
                      const SizedBox(width: 4),
                      Text(
                        statusLabel,
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),
            const Divider(color: Color(0xFFF1F5F9), height: 1),
            const SizedBox(height: 12),

            // Date & Delivery Schedule
            Row(
              children: [
                const Icon(Icons.calendar_month_outlined, size: 15, color: Color(0xFF64748B)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    status == 'failed'
                        ? 'Attempted: $startDate'
                        : '$startDate  →  $endDate',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF334155),
                    ),
                  ),
                ),
              ],
            ),

            if (address.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on_outlined, size: 15, color: Color(0xFF64748B)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      area.isNotEmpty ? '$address ($area)' : address,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF475569),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 6),
            // Amount & Order details
            Row(
              children: [
                const Icon(Icons.receipt_outlined, size: 15, color: Color(0xFF64748B)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    amount > 0 ? 'Total: ₹${amount.toStringAsFixed(0)} · Order: $orderId' : 'Order: $orderId',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF64748B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),

            if (paymentId.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.verified_outlined, size: 15, color: Color(0xFF0D5C3A)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Payment ID: $paymentId',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0D5C3A),
                      ),
                    ),
                  ),
                ],
              ),
            ],

            // Failed Notice & Retry Button
            if (status == 'failed') ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 17),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        failedReason,
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFB91C1C),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 42,
                child: ElevatedButton.icon(
                  onPressed: () {
                    final double qty = double.tryParse(milkQty) ?? 1.0;
                    final int curd = int.tryParse(curdQty) ?? 0;
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => SubscribeCheckoutScreen(
                          initialQty: qty,
                          initialCurd: curd,
                          initialFrequency: freq,
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.bolt_rounded, size: 18),
                  label: const Text(
                    '⚡ Retry Payment with Razorpay',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
