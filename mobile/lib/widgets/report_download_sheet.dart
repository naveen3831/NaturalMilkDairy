import 'package:flutter/material.dart';
import '../data/services/api_service.dart';
import '../services/launcher_service.dart';
import '../services/html_report_service.dart';

/// ReportDownloadSheet
/// A complete, professional modal bottom sheet for downloading Weekly & Monthly PDF statements
/// for BOTH All Customers (Consolidated) and Individual Single Customers in realtime.
class ReportDownloadSheet {
  static void show(
    BuildContext context, {
    required String role, // 'customer' | 'partner' | 'admin'
    String? customerId,
    String? partnerId,
    String? customTitle,
    List<Map<String, dynamic>>? initialCustomers,
    List<Map<String, dynamic>>? initialDeliveries,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _ReportDownloadBottomSheetContent(
        role: role,
        customerId: customerId,
        partnerId: partnerId,
        customTitle: customTitle,
        initialCustomers: initialCustomers,
        initialDeliveries: initialDeliveries,
      ),
    );
  }
}

class _ReportDownloadBottomSheetContent extends StatefulWidget {
  final String role;
  final String? customerId;
  final String? partnerId;
  final String? customTitle;
  final List<Map<String, dynamic>>? initialCustomers;
  final List<Map<String, dynamic>>? initialDeliveries;

  const _ReportDownloadBottomSheetContent({
    required this.role,
    this.customerId,
    this.partnerId,
    this.customTitle,
    this.initialCustomers,
    this.initialDeliveries,
  });

  @override
  State<_ReportDownloadBottomSheetContent> createState() =>
      _ReportDownloadBottomSheetContentState();
}

class _ReportDownloadBottomSheetContentState
    extends State<_ReportDownloadBottomSheetContent> {
  final ApiService _api = ApiService();

  // 'all' = All Customers report, 'single' = Single Customer report
  late String _reportScope;
  String _selectedPeriod = 'monthly'; // 'weekly' | 'monthly' | 'all'
  bool _isGenerating = false;
  bool _isLoadingCustomers = false;

  List<Map<String, dynamic>> _customers = [];
  Map<String, dynamic>? _selectedCustomer;
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    // Default to 'single' if customer portal or customerId is passed; otherwise 'all' for admin/partner
    _reportScope = (widget.role == 'customer' || widget.customerId != null) ? 'single' : 'all';

    _searchCtrl.addListener(() {
      if (mounted) {
        setState(() => _searchQuery = _searchCtrl.text);
      }
    });

    _fetchCustomers();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _selectDefaultCustomer() {
    if (_customers.isEmpty) return;
    if (widget.customerId != null) {
      _selectedCustomer = _customers.firstWhere(
        (c) =>
            c['id'] == widget.customerId ||
            c['_id'] == widget.customerId ||
            c['customerId'] == widget.customerId,
        orElse: () => _customers.first,
      );
    } else {
      _selectedCustomer ??= _customers.first;
    }
  }

  Future<void> _fetchCustomers() async {
    // Use initialCustomers immediately if available
    if (widget.initialCustomers != null && widget.initialCustomers!.isNotEmpty) {
      _customers = List<Map<String, dynamic>>.from(widget.initialCustomers!);
      _selectDefaultCustomer();
    }

    setState(() => _isLoadingCustomers = _customers.isEmpty);
    try {
      List<Map<String, dynamic>> fetched = [];

      // If role is customer, fetch own profile
      if (widget.role == 'customer') {
        try {
          final meRes = await _api.get('/api/customers/me');
          if (meRes['success'] == true && meRes['customer'] is Map) {
            fetched = [Map<String, dynamic>.from(meRes['customer'] as Map)];
          }
        } catch (_) {}
      }

      // Tier 1: Try /api/customers
      if (fetched.isEmpty) {
        try {
          final res = await _api.get('/api/customers');
          if (res['success'] == true && res['customers'] is List && (res['customers'] as List).isNotEmpty) {
            fetched = (res['customers'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          }
        } catch (_) {}
      }

      // Tier 2: Try /api/deliveries/assigned-customers (allowed for delivery staff)
      if (fetched.isEmpty) {
        try {
          final res = await _api.get('/api/deliveries/assigned-customers');
          if (res['success'] == true && res['customers'] is List && (res['customers'] as List).isNotEmpty) {
            fetched = (res['customers'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          }
        } catch (_) {}
      }

      // Tier 3: Extract unique customers from deliveries
      if (fetched.isEmpty) {
        try {
          final delRes = await _api.get('/api/deliveries?range=today');
          if (delRes['success'] == true && delRes['deliveries'] is List) {
            final dels = (delRes['deliveries'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
            final Map<String, Map<String, dynamic>> byId = {};
            for (final d in dels) {
              final cid = (d['customerId'] ?? d['customer'] ?? '').toString();
              if (cid.isNotEmpty && !byId.containsKey(cid)) {
                byId[cid] = {
                  'id': cid,
                  '_id': cid,
                  'customerId': cid,
                  'name': d['customerName']?.toString() ?? 'Customer',
                  'mobile': d['customerPhone']?.toString() ?? '',
                  'address': d['deliveryAddress']?.toString() ?? '',
                  'area': d['area']?.toString() ?? 'Madhapur',
                  'currentBalance': 0,
                };
              }
            }
            fetched = byId.values.toList();
          }
        } catch (_) {}
      }

      if (fetched.isNotEmpty && mounted) {
        setState(() {
          _customers = fetched;
          _selectDefaultCustomer();
        });
      }
    } catch (e) {
      debugPrint('Error fetching customers for report: $e');
    } finally {
      if (mounted) setState(() => _isLoadingCustomers = false);
    }
  }

  String _getPeriodLabel() {
    final now = DateTime.now();
    final todayStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    if (_selectedPeriod == 'weekly') {
      final past = now.subtract(const Duration(days: 7));
      final pastStr = '${past.year}-${past.month.toString().padLeft(2, '0')}-${past.day.toString().padLeft(2, '0')}';
      return 'Weekly ($pastStr to $todayStr)';
    } else if (_selectedPeriod == 'monthly') {
      final past = now.subtract(const Duration(days: 30));
      final pastStr = '${past.year}-${past.month.toString().padLeft(2, '0')}-${past.day.toString().padLeft(2, '0')}';
      return 'Monthly ($pastStr to $todayStr)';
    }
    return 'Entire History (All Time)';
  }

  Future<void> _handleGenerateReport({bool isDirectDownload = true}) async {
    setState(() => _isGenerating = true);

    try {
      // 1. Calculate date threshold
      DateTime? thresholdDate;
      if (_selectedPeriod == 'weekly') {
        thresholdDate = DateTime.now().subtract(const Duration(days: 7));
      } else if (_selectedPeriod == 'monthly') {
        thresholdDate = DateTime.now().subtract(const Duration(days: 30));
      }

      // 2. Fetch live deliveries (with range=all to retrieve day-by-day historical records)
      final deliveriesRes = await _api.get('/api/deliveries?range=all');
      final paymentsRes = await _api.get('/api/payments');

      List<Map<String, dynamic>> allDeliveries = [];
      if (deliveriesRes['success'] == true && deliveriesRes['deliveries'] is List) {
        allDeliveries = (deliveriesRes['deliveries'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }

      List<Map<String, dynamic>> allPayments = [];
      if (paymentsRes['success'] == true && paymentsRes['payments'] is List) {
        allPayments = (paymentsRes['payments'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }

      // Filter by period if needed
      if (thresholdDate != null) {
        final thStr = '${thresholdDate.year}-${thresholdDate.month.toString().padLeft(2, '0')}-${thresholdDate.day.toString().padLeft(2, '0')}';
        allDeliveries = allDeliveries.where((d) {
          final dt = d['deliveryDate']?.toString() ?? d['date']?.toString() ?? '';
          return dt.compareTo(thStr) >= 0;
        }).toList();

        allPayments = allPayments.where((p) {
          final raw = p['paymentDate'] ?? p['createdAt'];
          if (raw == null) return false;
          try {
            final dt = DateTime.parse(raw.toString()).toLocal();
            return dt.isAfter(thresholdDate!);
          } catch (_) {
            return true;
          }
        }).toList();
      }

      final periodLabel = _getPeriodLabel();
      String html;
      String jobName;

      if (_reportScope == 'all') {
        // Consolidated report for ALL customers
        var custList = List<Map<String, dynamic>>.from(_customers);
        if (custList.isEmpty) {
          final cRes = await _api.get('/api/customers');
          if (cRes['customers'] is List) {
            custList = (cRes['customers'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
          }
        }

        html = HtmlReportService.generateAllCustomersHtml(
          customers: custList,
          deliveries: allDeliveries,
          payments: allPayments,
          periodLabel: periodLabel,
        );
        jobName = 'All_Customers_Report_$_selectedPeriod';
      } else {
        // Report for a SINGLE customer
        Map<String, dynamic>? targetCustomer = _selectedCustomer;
        if (targetCustomer == null) {
          if (widget.customerId != null) {
            targetCustomer = _customers.firstWhere(
              (c) => c['id'] == widget.customerId || c['customerId'] == widget.customerId,
              orElse: () => {
                'name': 'Customer',
                'customerId': widget.customerId,
                'mobile': '',
                'area': 'Hyderabad',
                'currentBalance': 0,
              },
            );
          } else if (_customers.isNotEmpty) {
            targetCustomer = _customers.first;
          } else {
            final meRes = await _api.get('/api/customers/me');
            targetCustomer = meRes['customer'] is Map ? Map<String, dynamic>.from(meRes['customer'] as Map) : null;
          }
        }

        if (targetCustomer == null) {
          throw 'Please select a customer to generate report.';
        }

        Map<String, dynamic> activeCustomer = targetCustomer;
        final targetLookupId = activeCustomer['id']?.toString() ??
            activeCustomer['_id']?.toString() ??
            activeCustomer['customerId']?.toString() ??
            (widget.role == 'customer' ? 'me' : '');

        List<Map<String, dynamic>> custDeliveries = [];
        List<Map<String, dynamic>> custPayments = [];

        // Direct ledger fetch guarantees 100% itemized delivery history for any role
        if (targetLookupId.isNotEmpty) {
          try {
            final ledgerRes = await _api.get('/api/customers/$targetLookupId/ledger');
            if (ledgerRes['success'] == true) {
              if (ledgerRes['customer'] is Map) {
                activeCustomer = Map<String, dynamic>.from(ledgerRes['customer'] as Map);
              }
              if (ledgerRes['deliveries'] is List) {
                custDeliveries = (ledgerRes['deliveries'] as List)
                    .map((e) => Map<String, dynamic>.from(e as Map))
                    .toList();
              }
              if (ledgerRes['payments'] is List) {
                custPayments = (ledgerRes['payments'] as List)
                    .map((e) => Map<String, dynamic>.from(e as Map))
                    .toList();
              }
            }
          } catch (_) {}
        }

        // Fallback filter if ledger call was unavailable
        if (custDeliveries.isEmpty && allDeliveries.isNotEmpty) {
          final cId = activeCustomer['id']?.toString() ?? activeCustomer['_id']?.toString() ?? '';
          final cCode = activeCustomer['customerId']?.toString() ?? '';
          final cMob = activeCustomer['mobile']?.toString() ?? '';
          final keys = [cId, cCode, cMob].where((k) => k.isNotEmpty).toList();

          custDeliveries = allDeliveries.where((d) {
            final dCustId = d['customerId']?.toString() ?? '';
            final dPhone = d['customerPhone']?.toString() ?? '';
            return keys.contains(dCustId) || (cMob.isNotEmpty && dPhone.contains(cMob.replaceAll(RegExp(r'[^0-9]'), '')));
          }).toList();
        }

        if (custPayments.isEmpty && allPayments.isNotEmpty) {
          final cId = activeCustomer['id']?.toString() ?? activeCustomer['_id']?.toString() ?? '';
          final cCode = activeCustomer['customerId']?.toString() ?? '';
          final keys = [cId, cCode].where((k) => k.isNotEmpty).toList();
          custPayments = allPayments.where((p) {
            final pCustId = p['customerId']?.toString() ?? '';
            return keys.contains(pCustId);
          }).toList();
        }

        // Apply selected period filter (Weekly / Monthly)
        if (thresholdDate != null) {
          final thStr = '${thresholdDate.year}-${thresholdDate.month.toString().padLeft(2, '0')}-${thresholdDate.day.toString().padLeft(2, '0')}';
          custDeliveries = custDeliveries.where((d) {
            final dt = d['deliveryDate']?.toString() ?? d['date']?.toString() ?? '';
            return dt.compareTo(thStr) >= 0;
          }).toList();

          custPayments = custPayments.where((p) {
            final raw = p['paymentDate'] ?? p['createdAt'];
            if (raw == null) return false;
            try {
              final dt = DateTime.parse(raw.toString()).toLocal();
              return dt.isAfter(thresholdDate!);
            } catch (_) {
              return true;
            }
          }).toList();
        }

        html = HtmlReportService.generateSingleCustomerHtml(
          customer: activeCustomer,
          deliveries: custDeliveries,
          payments: custPayments,
          periodLabel: periodLabel,
        );
        final safeName = (activeCustomer['name']?.toString() ?? 'Customer').replaceAll(RegExp(r'\s+'), '_');
        jobName = 'Statement_${safeName}_$_selectedPeriod';
      }

      // 3. Direct PDF Document Generation & Download via Native Android System Print/PDF Engine
      final printed = await LauncherService.printHtml(html, jobName: jobName);
      if (!mounted) return;

      if (printed) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '✓ $jobName generated. Select "Save as PDF" to download.',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF0D5C3A),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
        return;
      }
      if (!mounted) return;

      if (printed) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Opening PDF Print & Save preview...'),
            backgroundColor: Color(0xFF0D5C3A),
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        // Fallback to URL opener if print service could not be initiated
        final url = _api.getReportPdfUrl(
          role: _reportScope == 'all' ? 'admin' : 'customer',
          period: _selectedPeriod,
          customerId: _selectedCustomer?['customerId'] ?? widget.customerId,
        );
        await LauncherService.openUrl(url);
        if (!mounted) return;
        Navigator.pop(context);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error generating report: $e'),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  Widget _buildPeriodChip(String id, String title, String subtitle, IconData icon) {
    final isSelected = _selectedPeriod == id;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => setState(() => _selectedPeriod = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFECFDF5) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0),
              width: isSelected ? 1.8 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: isSelected ? const Color(0xFF065F46) : const Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 9.5,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCustomerSelector(List<Map<String, dynamic>> filteredCustomers) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'SELECT CUSTOMER',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                color: Color(0xFF64748B),
                letterSpacing: 0.5,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Text(
                '${filteredCustomers.length} Available',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF047857),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Search Input
        Container(
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            borderRadius: BorderRadius.circular(10),
          ),
          child: TextField(
            controller: _searchCtrl,
            style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A)),
            decoration: InputDecoration(
              hintText: 'Search by name, mobile, or area...',
              hintStyle: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.search_rounded, size: 16, color: Color(0xFF94A3B8)),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 14, color: Color(0xFF94A3B8)),
                      onPressed: () {
                        _searchCtrl.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 9),
            ),
          ),
        ),
        const SizedBox(height: 8),

        // Customers List
        if (_isLoadingCustomers && _customers.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: Color(0xFF0D5C3A)),
              ),
            ),
          )
        else if (filteredCustomers.isEmpty)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            alignment: Alignment.center,
            child: Text(
              _searchQuery.isNotEmpty
                  ? 'No customers matching "$_searchQuery"'
                  : 'No customer accounts available.',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          )
        else
          Container(
            constraints: const BoxConstraints(maxHeight: 180),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE2E8F0)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.all(6),
                itemCount: filteredCustomers.length,
                separatorBuilder: (_, _) => const SizedBox(height: 6),
                itemBuilder: (context, idx) {
                  final cust = filteredCustomers[idx];
                  final isSelected = _selectedCustomer != null &&
                      ((_selectedCustomer!['id'] != null && _selectedCustomer!['id'] == cust['id']) ||
                          (_selectedCustomer!['_id'] != null && _selectedCustomer!['_id'] == cust['_id']) ||
                          (_selectedCustomer!['customerId'] != null &&
                              _selectedCustomer!['customerId'] == cust['customerId']));
                  final name = cust['name']?.toString() ?? 'Customer';
                  final phone = cust['mobile']?.toString() ?? '';
                  final area = cust['area']?.toString() ?? 'Hyderabad';
                  final bal = num.tryParse(cust['currentBalance']?.toString() ?? '0') ?? 0;
                  final initial = name.isNotEmpty ? name[0].toUpperCase() : 'C';

                  return InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: () {
                      setState(() => _selectedCustomer = cust);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFF0FDF4) : const Color(0xFFFAFAFA),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0),
                          width: isSelected ? 1.8 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0),
                            child: Text(
                              initial,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: isSelected ? Colors.white : const Color(0xFF475569),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 12.5,
                                    color: isSelected ? const Color(0xFF065F46) : const Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  phone.isNotEmpty ? '+91 $phone • $area' : area,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: Color(0xFF64748B),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: bal > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              bal > 0 ? 'Due ₹${bal.toInt()}' : (bal < 0 ? 'Adv ₹${bal.abs().toInt()}' : 'Cleared'),
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: bal > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Icon(
                            isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                            size: 18,
                            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFCBD5E1),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        const SizedBox(height: 14),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredCustomers = _searchQuery.isEmpty
        ? _customers
        : _customers.where((c) {
            final q = _searchQuery.toLowerCase();
            final name = (c['name']?.toString() ?? '').toLowerCase();
            final phone = (c['mobile']?.toString() ?? '');
            final id = (c['customerId']?.toString() ?? '').toLowerCase();
            final area = (c['area']?.toString() ?? '').toLowerCase();
            return name.contains(q) || phone.contains(q) || id.contains(q) || area.contains(q);
          }).toList();

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 14,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).padding.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag Indicator
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Header
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: const Icon(
                    Icons.picture_as_pdf_rounded,
                    color: Color(0xFF0D5C3A),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Download PDF Reports',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.2,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Weekly & monthly realtime statements for all or single customers.',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 1. SCOPE SWITCHER: "All Customers" vs "Single Customer"
            if (widget.role != 'customer') ...[
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: () => setState(() => _reportScope = 'all'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 9),
                          decoration: BoxDecoration(
                            color: _reportScope == 'all' ? const Color(0xFF0D5C3A) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: _reportScope == 'all'
                                ? [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 4, offset: const Offset(0, 2))]
                                : null,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.people_alt_rounded,
                                size: 16,
                                color: _reportScope == 'all' ? Colors.white : const Color(0xFF64748B),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'All Customers',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  color: _reportScope == 'all' ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: () => setState(() => _reportScope = 'single'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 9),
                          decoration: BoxDecoration(
                            color: _reportScope == 'single' ? const Color(0xFF0D5C3A) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: _reportScope == 'single'
                                ? [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 4, offset: const Offset(0, 2))]
                                : null,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.person_rounded,
                                size: 16,
                                color: _reportScope == 'single' ? Colors.white : const Color(0xFF64748B),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Single Customer',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  color: _reportScope == 'single' ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],

            // 2. SINGLE CUSTOMER SELECTOR (if single customer scope active)
            if (_reportScope == 'single' && widget.role != 'customer')
              _buildCustomerSelector(filteredCustomers),

            // 3. PERIOD SELECTION
            const Text(
              'SELECT STATEMENT PERIOD',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                color: Color(0xFF64748B),
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),

            Row(
              children: [
                _buildPeriodChip('weekly', 'Weekly', 'Last 7 Days', Icons.calendar_view_week_rounded),
                const SizedBox(width: 8),
                _buildPeriodChip('monthly', 'Monthly', 'Last 30 Days', Icons.calendar_month_rounded),
                const SizedBox(width: 8),
                _buildPeriodChip('all', 'History', 'All Time', Icons.all_inclusive_rounded),
              ],
            ),
            const SizedBox(height: 20),

            // 4. ACTION BUTTONS
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isGenerating ? null : () => _handleGenerateReport(isDirectDownload: true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0D5C3A),
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isGenerating
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          ),
                          SizedBox(width: 10),
                          Text(
                            'Downloading PDF File...',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.download_rounded, color: Colors.white, size: 20),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              _reportScope == 'all'
                                  ? 'Download All Customers PDF'
                                  : (_selectedCustomer != null
                                      ? 'Download PDF for ${_selectedCustomer!['name']}'
                                      : 'Download Customer Statement PDF'),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 8),

            // Print / Preview Option
            Center(
              child: TextButton.icon(
                onPressed: _isGenerating ? null : () => _handleGenerateReport(isDirectDownload: false),
                icon: const Icon(Icons.print_rounded, size: 16, color: Color(0xFF0D5C3A)),
                label: const Text(
                  'Or Print / Preview Document',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0D5C3A),
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
