import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:natural_milk_dairy/providers/customer_provider.dart';
import '../../core/utils/ist_date_time.dart';
import '../../widgets/delivery_proof_dialog.dart';
import '../../widgets/report_download_sheet.dart';

class DeliveryHistoryScreen extends StatefulWidget {
  final List<Map<String, dynamic>>? initialDeliveries;
  final dynamic user;

  const DeliveryHistoryScreen({
    super.key,
    this.initialDeliveries,
    this.user,
  });

  @override
  State<DeliveryHistoryScreen> createState() => _DeliveryHistoryScreenState();
}

class _DeliveryHistoryScreenState extends State<DeliveryHistoryScreen> {
  String _searchQuery = '';
  String _selectedFilter = 'all'; // 'all', 'proof', 'month', 'addons'
  bool _isRefreshing = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _handleRefresh() async {
    setState(() => _isRefreshing = true);
    try {
      final customerProvider = context.read<CustomerProvider>();
      await customerProvider.loadAllCustomerData(silent: true);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isRefreshing = false);
    }
  }

  Map<String, String> _parseDateParts(String raw) {
    if (raw.isEmpty) {
      return {'day': 'Wed', 'dayNum': '28', 'monthYear': 'Oct 2026', 'full': 'Morning Drop'};
    }
    try {
      final dt = DateTime.parse(raw);
      final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      final fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final fullMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      final dayName = days[dt.weekday - 1];
      final fullDayName = fullDays[dt.weekday - 1];
      final monthName = months[dt.month - 1];
      final fullMonthName = fullMonths[dt.month - 1];
      return {
        'day': dayName,
        'fullDay': fullDayName,
        'dayNum': dt.day.toString().padLeft(2, '0'),
        'monthYear': '$monthName ${dt.year}',
        'full': '$fullDayName, ${dt.day} $fullMonthName ${dt.year}',
      };
    } catch (_) {
      return {'day': 'Drop', 'dayNum': '01', 'monthYear': raw, 'full': raw};
    }
  }

  String _formatDeliveryTime(String raw) {
    if (raw.isEmpty) return '6:15 AM';
    if (raw.contains('AM') || raw.contains('PM') || raw.contains('am') || raw.contains('pm')) {
      return raw;
    }
    if (raw.contains(':')) {
      final parts = raw.split(':');
      final hour = int.tryParse(parts[0]) ?? 6;
      final minute = parts.length > 1 ? parts[1].padLeft(2, '0') : '00';
      final period = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      return '$displayHour:$minute $period';
    }
    return raw;
  }

  void _openProofLightbox(Map<String, dynamic> delivery) {
    final proofImg = delivery['proofImage']?.toString();
    if (proofImg == null || proofImg.isEmpty) return;

    final dateInfo = _parseDateParts(delivery['date']?.toString() ?? '');
    final fullDate = dateInfo['full'] ?? delivery['date']?.toString() ?? 'Morning Drop';
    final timeStr = delivery['timeSlot']?.toString() ?? '6:15 AM';

    DeliveryProofHelper.showLightbox(
      context: context,
      proofStr: proofImg,
      customerName: widget.user?.name ?? widget.user?.fullName ?? 'Doorstep Customer',
      address: delivery['address'] ?? delivery['deliveryAddress'] ?? 'Registered Doorstep Address',
      lat: num.tryParse((delivery['customerLatitude'] ?? delivery['latitude'])?.toString() ?? ''),
      lng: num.tryParse((delivery['customerLongitude'] ?? delivery['longitude'])?.toString() ?? ''),
      timestamp: delivery['watermarkTimestamp'] ?? '$fullDate • $timeStr',
      partnerName: delivery['driver'] ?? 'Naveen Kumar',
    );
  }

  @override
  Widget build(BuildContext context) {
    final customerProvider = context.watch<CustomerProvider>();
    final serverDeliveries = customerProvider.deliveries;
    final nowIst = IstDateTime.toIst(DateTime.now());
    final currentMonthYear = '${nowIst.year}-${nowIst.month.toString().padLeft(2, '0')}';

    final sourceList = serverDeliveries.isNotEmpty
        ? serverDeliveries
        : (widget.initialDeliveries ?? <Map<String, dynamic>>[]);

    // Transform raw server items into standardized delivery map
    final List<Map<String, dynamic>> allHistoryList = sourceList.map((item) {
      final String rawDate = item['date']?.toString() ?? '';
      final bool isDelivered = item['status'] == 'delivered' || item['isDelivered'] == true;
      final dateParts = _parseDateParts(rawDate);
      final rawAddons = item['addons'] is List
          ? (item['addons'] as List)
          : (item['rawItem'] is Map && item['rawItem']['addons'] is List
              ? (item['rawItem']['addons'] as List)
              : const []);
      final addonsSummary = rawAddons.isNotEmpty
          ? rawAddons.map((a) => '${a['name']} ×${a['quantity']}').join(', ')
          : null;
      final addonsTot = item['addonsTotal'] ??
          (item['rawItem'] is Map ? item['rawItem']['addonsTotal'] : null) ??
          0;

      final milkAmount = item['milkQuantity'] ?? item['actualMilk'] ?? 1;
      final curdAmount = item['curdQuantity'] ?? item['actualCurd'] ?? 0;
      final totalAmt = item['amount'] ?? item['totalAmount'] ?? (60 * (num.tryParse(milkAmount.toString()) ?? 1));

      return {
        'id': item['id'] ?? item['_id'],
        'date': rawDate,
        'dateParts': dateParts,
        'day': dateParts['day'] ?? 'Wed',
        'fullDay': dateParts['fullDay'] ?? 'Wednesday',
        'dayNum': dateParts['dayNum'] ?? '28',
        'monthYear': dateParts['monthYear'] ?? 'Oct 2026',
        'fullDate': dateParts['full'] ?? rawDate,
        'timeSlot': isDelivered ? _formatDeliveryTime(item['time']?.toString() ?? '6:15 AM') : '5:00 AM - 6:30 AM',
        'milkQty': '$milkAmount L',
        'milkNumeric': num.tryParse(milkAmount.toString()) ?? 1,
        'curdQty': '$curdAmount g',
        'curdNumeric': num.tryParse(curdAmount.toString()) ?? 0,
        'addonsText': addonsSummary,
        'addonsList': rawAddons,
        'addonsTotal': addonsTot,
        'amount': totalAmt,
        'isDelivered': isDelivered,
        'paymentStatus': isDelivered ? (item['paymentStatus']?.toString() ?? 'Paid') : 'Advance',
        'proofImage': item['proofImage']?.toString(),
        'driver': item['deliveryBoyName']?.toString() ?? 'Naveen Kumar',
        'driverPhone': item['deliveryBoyPhone']?.toString() ?? '+91 98765 43210',
        'address': (item['deliveryAddress'] ?? item['address'] ?? customerProvider.address).toString(),
        'customerLatitude': item['customerLatitude'] ?? item['latitude'] ?? customerProvider.latitude,
        'customerLongitude': item['customerLongitude'] ?? item['longitude'] ?? customerProvider.longitude,
        'watermarkTimestamp': item['watermarkTimestamp']?.toString(),
      };
    }).toList()
      ..sort((a, b) => (b['date']?.toString() ?? '').compareTo(a['date']?.toString() ?? ''));

    // Filter to only delivered or past records for Delivery History
    final historyOnlyList = allHistoryList.where((d) => d['isDelivered'] == true || (d['date']?.toString() ?? '').isNotEmpty).toList();

    // Stats calculations
    num totalMilkDelivered = 0;
    int photoProofCount = 0;
    for (final d in historyOnlyList) {
      totalMilkDelivered += (d['milkNumeric'] as num? ?? 1);
      final proof = d['proofImage']?.toString() ?? '';
      if (proof.isNotEmpty) photoProofCount++;
    }

    // Apply Filter & Search
    final filteredDeliveries = historyOnlyList.where((d) {
      final dateStr = (d['date']?.toString() ?? '').toLowerCase();
      final fullDate = (d['fullDate']?.toString() ?? '').toLowerCase();
      final driver = (d['driver']?.toString() ?? '').toLowerCase();
      final addons = (d['addonsText']?.toString() ?? '').toLowerCase();
      final address = (d['address']?.toString() ?? '').toLowerCase();
      final query = _searchQuery.trim().toLowerCase();

      final matchesQuery = query.isEmpty ||
          dateStr.contains(query) ||
          fullDate.contains(query) ||
          driver.contains(query) ||
          addons.contains(query) ||
          address.contains(query) ||
          query.contains('milk') ||
          query.contains('curd');

      if (!matchesQuery) return false;

      if (_selectedFilter == 'proof') {
        final p = d['proofImage']?.toString() ?? '';
        return p.isNotEmpty;
      }
      if (_selectedFilter == 'month') {
        return dateStr.startsWith(currentMonthYear);
      }
      if (_selectedFilter == 'addons') {
        return (d['addonsText']?.toString() ?? '').isNotEmpty;
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2EBE5)),
            ),
            child: const Icon(Icons.arrow_back_rounded, size: 18, color: Color(0xFF0C2340)),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Flexible(
                  child: Text(
                    'Delivery History',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0C2340),
                      letterSpacing: -0.2,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Text(
                    '${historyOnlyList.length} Drops',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF15803D),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 1),
            const Text(
              'Verified doorstep drops, photo proofs & cold-chain timestamps',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Download Delivery Statement PDF',
            icon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFF0D5C3A), size: 18),
            ),
            onPressed: () => ReportDownloadSheet.show(
              context,
              role: 'customer',
              customerId: widget.user?.customerId ?? widget.user?.id ?? customerProvider.customerId,
              initialCustomers: customerProvider.customerData != null ? [customerProvider.customerData!] : null,
              initialDeliveries: customerProvider.deliveries,
            ),
          ),
          IconButton(
            tooltip: 'Refresh Data',
            icon: _isRefreshing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0D5C3A)),
                  )
                : const Icon(Icons.refresh_rounded, color: Color(0xFF0C2340), size: 20),
            onPressed: _isRefreshing ? null : _handleRefresh,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _handleRefresh,
        color: const Color(0xFF0D5C3A),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. STAT SUMMARY CARDS (Total Drops, Milk, Photos)
              Row(
                children: [
                  Expanded(
                    child: _buildSummaryCard(
                      label: 'Verified Drops',
                      value: historyOnlyList.length.toString(),
                      subtext: '100% On-time',
                      icon: Icons.check_circle_outline_rounded,
                      iconBg: const Color(0xFFDCFCE7),
                      iconColor: const Color(0xFF16A34A),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildSummaryCard(
                      label: 'Milk Delivered',
                      value: '${totalMilkDelivered.toStringAsFixed(totalMilkDelivered % 1 == 0 ? 0 : 1)} L',
                      subtext: '4°C Farm Pure',
                      icon: Icons.water_drop_outlined,
                      iconBg: const Color(0xFFE0F2FE),
                      iconColor: const Color(0xFF0284C7),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildSummaryCard(
                      label: 'Photo Proofs',
                      value: photoProofCount.toString(),
                      subtext: 'Camera verified',
                      icon: Icons.photo_camera_rounded,
                      iconBg: const Color(0xFFFEF3C7),
                      iconColor: const Color(0xFFD97706),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // 2. SEARCH INPUT BAR
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2EBE5)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchQuery = val),
                  style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A), fontWeight: FontWeight.w600),
                  decoration: InputDecoration(
                    hintText: 'Search by date, product, delivery boy, address...',
                    hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
                    prefixIcon: const Icon(Icons.search_rounded, size: 20, color: Color(0xFF64748B)),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18, color: Color(0xFF94A3B8)),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // 3. FILTER PILLS
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('proof', 'With Photo Proof ($photoProofCount)'),
                    const SizedBox(width: 8),
                    _buildFilterChip('month', 'This Month'),
                    const SizedBox(width: 8),
                    _buildFilterChip('addons', 'With Add-ons'),
                    const SizedBox(width: 8),
                    _buildFilterChip('all', 'All Drops (${historyOnlyList.length})'),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 4. SECTION HEADER & PDF SHORTCUT
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Recorded Drops (${filteredDeliveries.length})',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0C2340),
                      ),
                    ),
                  ),
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () => ReportDownloadSheet.show(
                      context,
                      role: 'customer',
                      customerId: widget.user?.customerId ?? widget.user?.id ?? customerProvider.customerId,
                      initialCustomers: customerProvider.customerData != null ? [customerProvider.customerData!] : null,
                      initialDeliveries: customerProvider.deliveries,
                    ),
                    icon: const Icon(Icons.file_download_outlined, size: 15, color: Color(0xFF0D5C3A)),
                    label: const Text(
                      'Download PDF',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // 5. DELIVERIES LIST WITH FULL DATA & IMAGES
              if (filteredDeliveries.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2EBE5)),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: const BoxDecoration(
                          color: Color(0xFFF1F5F9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.inventory_2_outlined, size: 36, color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'No deliveries found matching your search.',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF334155)),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Try clearing search filters or pull down to refresh history.',
                        style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filteredDeliveries.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 14),
                  itemBuilder: (ctx, idx) => _buildFullDeliveryCard(filteredDeliveries[idx]),
                ),

              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryCard({
    required String label,
    required String value,
    required String subtext,
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2EBE5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: iconColor, size: 16),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0C2340),
              height: 1.1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            subtext,
            style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedFilter == key;
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () => setState(() => _selectedFilter = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0D5C3A) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildFullDeliveryCard(Map<String, dynamic> delivery) {
    final proofImage = delivery['proofImage']?.toString();
    final hasProof = proofImage != null && proofImage.trim().isNotEmpty;
    final dayNum = delivery['dayNum'] ?? '28';
    final day = delivery['day'] ?? 'Wed';
    final monthYear = delivery['monthYear'] ?? 'Oct 2026';
    final fullDate = delivery['fullDate'] ?? 'Morning Drop';
    final timeSlot = delivery['timeSlot'] ?? '6:15 AM';
    final milkQty = delivery['milkQty'] ?? '1 L';
    final curdQty = delivery['curdQty'] ?? '0 g';
    final hasCurd = (delivery['curdNumeric'] as num? ?? 0) > 0;
    final addonsText = delivery['addonsText']?.toString();
    final totalAmount = delivery['amount'] ?? 60;
    final driverName = delivery['driver'] ?? 'Naveen Kumar';
    final address = delivery['address'] ?? 'Doorstep Address';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2EBE5), width: 1.1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── TOP HEADER: Date Badge, Time Slot & Status ──
          Container(
            padding: const EdgeInsets.all(14),
            decoration: const BoxDecoration(
              color: Color(0xFFFBFDFB),
              border: Border(bottom: BorderSide(color: Color(0xFFEDF2EE))),
            ),
            child: Row(
              children: [
                // Calendar Date Badge
                Container(
                  width: 48,
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2F1EA),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFCCE8DA)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        day.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0D5C3A),
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        dayNum,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0C2340),
                          height: 1.1,
                        ),
                      ),
                      Text(
                        monthYear.split(' ')[0],
                        style: const TextStyle(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF597361),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Date Title & Delivery Timestamp
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fullDate,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0C2340),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      Wrap(
                        spacing: 6,
                        runSpacing: 2,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.schedule_rounded, size: 12, color: Color(0xFF059669)),
                              const SizedBox(width: 3),
                              Text(
                                timeSlot,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF059669),
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE2F1EA),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              '4°C Cold-Chain',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0D5C3A),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Verified Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, size: 12, color: Color(0xFF15803D)),
                      SizedBox(width: 4),
                      Text(
                        'Verified',
                        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF15803D)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── MIDDLE: PROOF IMAGE (Prominent Showcase) ──
          if (hasProof) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => _openProofLightbox(delivery),
                child: Container(
                  height: 180,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFCEE7D9), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      // The Cloudinary / Base64 image
                      DeliveryProofHelper.buildImageFromSource(
                        proofImage,
                        fit: BoxFit.cover,
                      ),

                      // Gradient overlay for contrast
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.1),
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.72),
                              ],
                              stops: const [0.0, 0.5, 1.0],
                            ),
                          ),
                        ),
                      ),

                      // Top-right tap to zoom badge
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.65),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.zoom_in_rounded, size: 13, color: Colors.white),
                              SizedBox(width: 4),
                              Text(
                                'Tap to Zoom & Map',
                                style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Bottom photo proof details overlay
                      Positioned(
                        left: 10,
                        right: 10,
                        bottom: 8,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.camera_alt_rounded, size: 12, color: Colors.white),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          'Proof Photo • By $driverName',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 11,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    delivery['watermarkTimestamp'] ?? '$fullDate • $timeSlot',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.88),
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFF059669),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'Cloudinary CDN',
                                style: TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.w800),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ] else ...[
            // Subtle note if legacy entry without photo
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.verified_outlined, size: 15, color: Color(0xFF64748B)),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Doorstep drop confirmed & verified via automated cold-chain route check.',
                        style: TextStyle(fontSize: 10.5, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],

          // ── BOTTOM: DELIVERED PRODUCTS, ADDRESS & DRIVER DETAILS ──
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Products Breakdown Grid
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      // Milk Row
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE2F1EA),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Icon(Icons.water_drop_rounded, size: 14, color: Color(0xFF0D5C3A)),
                          ),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Farm Pure Cow Milk',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                            ),
                          ),
                          Text(
                            milkQty,
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF0D5C3A)),
                          ),
                        ],
                      ),

                      // Curd Row (if delivered)
                      if (hasCurd) ...[
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 4),
                          child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                        ),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Icon(Icons.eco_rounded, size: 14, color: Color(0xFFB45309)),
                            ),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'Clay Pot Fresh Curd',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                              ),
                            ),
                            Text(
                              curdQty,
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFFB45309)),
                            ),
                          ],
                        ),
                      ],

                      // Add-ons Row (if any)
                      if (addonsText != null && addonsText.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 4),
                          child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                        ),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE0E7FF),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Icon(Icons.add_shopping_cart_rounded, size: 14, color: Color(0xFF4338CA)),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Special Farm Add-ons',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                  ),
                                  Text(
                                    addonsText,
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '₹${delivery['addonsTotal'] ?? ''}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF4338CA)),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Delivery Partner & Address Info
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.person_pin_rounded, size: 14, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Delivery Partner: $driverName',
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Paid: ₹$totalAmount',
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),

                // Address Line
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        address,
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.25),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Card Bottom Action Buttons
                Row(
                  children: [
                    if (hasProof)
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF0D5C3A), width: 1.1),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () => _openProofLightbox(delivery),
                          icon: const Icon(Icons.photo_library_outlined, size: 15, color: Color(0xFF0D5C3A)),
                          label: const Text(
                            'Inspect Proof Photo',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: Color(0xFF0D5C3A), fontWeight: FontWeight.w800, fontSize: 11),
                          ),
                        ),
                      ),
                    if (hasProof) const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D5C3A),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => ReportDownloadSheet.show(
                          context,
                          role: 'customer',
                          customerId: widget.user?.customerId ?? widget.user?.id ?? delivery['id'],
                          initialDeliveries: [delivery],
                        ),
                        icon: const Icon(Icons.receipt_long_rounded, size: 15, color: Colors.white),
                        label: const Text(
                          'View Statement',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
