import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/utils/ist_date_time.dart';
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

      // If role is customer, fetch own profile and skip staff-only endpoints
      if (widget.role == 'customer') {
        try {
          final meRes = await _api.get('/api/customers/me');
          if (meRes['success'] == true && meRes['customer'] is Map) {
            fetched = [Map<String, dynamic>.from(meRes['customer'] as Map)];
          }
        } catch (_) {}
      } else {
        // Tier 1: Try /api/customers
        try {
          final res = await _api.get('/api/customers');
          if (res['success'] == true && res['customers'] is List && (res['customers'] as List).isNotEmpty) {
            fetched = (res['customers'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          }
        } catch (_) {}

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

  String _toIstDateKey(dynamic raw) {
    final s = (raw?.toString() ?? '').trim();
    if (s.isEmpty) return '';
    if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(s)) return s;
    final parsed = DateTime.tryParse(s);
    if (parsed != null) {
      final ist = IstDateTime.toIst(parsed);
      return '${ist.year}-${ist.month.toString().padLeft(2, '0')}-${ist.day.toString().padLeft(2, '0')}';
    }
    final m = RegExp(r'^(\d{4}-\d{2}-\d{2})').firstMatch(s);
    return m?.group(1) ?? '';
  }

  String _getPeriodLabel() {
    final nowIst = IstDateTime.toIst(DateTime.now());
    final todayStr = '${nowIst.year}-${nowIst.month.toString().padLeft(2, '0')}-${nowIst.day.toString().padLeft(2, '0')}';
    if (_selectedPeriod == 'weekly') {
      final past = nowIst.subtract(const Duration(days: 7));
      final pastStr = '${past.year}-${past.month.toString().padLeft(2, '0')}-${past.day.toString().padLeft(2, '0')}';
      return 'Weekly ($pastStr to $todayStr)';
    } else if (_selectedPeriod == 'monthly') {
      final past = nowIst.subtract(const Duration(days: 30));
      final pastStr = '${past.year}-${past.month.toString().padLeft(2, '0')}-${past.day.toString().padLeft(2, '0')}';
      return 'Monthly ($pastStr to $todayStr)';
    }
    return 'Entire History (All Time)';
  }

  num _parseLeadNum(dynamic value) {
    if (value is num) return value;
    final match = RegExp(r'-?\d+(?:\.\d+)?').firstMatch(value?.toString() ?? '');
    return match != null ? (num.tryParse(match.group(0)!) ?? 0) : 0;
  }

  ({List<Map<String, dynamic>> deliveries, List<Map<String, dynamic>> payments}) _extractLedgerRecords(
    Map<String, dynamic> ledgerRes,
  ) {
    final List<Map<String, dynamic>> deliveries = [];
    final List<Map<String, dynamic>> payments = [];

    if (ledgerRes['deliveries'] is List) {
      for (final item in ledgerRes['deliveries'] as List) {
        if (item is Map) deliveries.add(Map<String, dynamic>.from(item));
      }
    }
    if (ledgerRes['payments'] is List) {
      for (final item in ledgerRes['payments'] as List) {
        if (item is Map) payments.add(Map<String, dynamic>.from(item));
      }
    }

    if (ledgerRes['ledgerEntries'] is List) {
      for (final rawEntry in ledgerRes['ledgerEntries'] as List) {
        if (rawEntry is! Map) continue;
        final entry = Map<String, dynamic>.from(rawEntry);
        final rawItem = entry['rawItem'] is Map
            ? Map<String, dynamic>.from(entry['rawItem'] as Map)
            : <String, dynamic>{};

        if (entry['type'] == 'delivery') {
          deliveries.add({
            ...rawItem,
            'id': rawItem['id'] ?? rawItem['_id'] ?? entry['id'],
            'deliveryDate': rawItem['deliveryDate'] ?? rawItem['date'] ?? entry['date'] ?? '',
            'actualMilk': rawItem['actualMilk'] ?? _parseLeadNum(entry['milk']),
            'plannedMilk': rawItem['plannedMilk'] ?? _parseLeadNum(entry['milk']),
            'actualCurd': rawItem['actualCurd'] ?? _parseLeadNum(entry['curd']),
            'plannedCurd': rawItem['plannedCurd'] ?? _parseLeadNum(entry['curd']),
            'totalAmount': rawItem['totalAmount'] ?? entry['amount'] ?? 0,
            'status': rawItem['status'] ?? entry['status'] ?? 'delivered',
            'deliveryBoyName': rawItem['deliveryBoyName'] ?? entry['deliveryBoyName'] ?? 'Assigned Partner',
            'addons': rawItem['addons'] ?? entry['addons'] ?? const [],
            'addonsTotal': rawItem['addonsTotal'] ?? entry['addonsTotal'] ?? 0,
          });
        } else if (entry['type'] == 'payment') {
          payments.add({
            ...rawItem,
            'id': rawItem['id'] ?? rawItem['_id'] ?? entry['id'],
            'paymentDate': rawItem['paymentDate'] ?? rawItem['createdAt'] ?? entry['time'] ?? entry['date'] ?? '',
            'amount': rawItem['amount'] ?? entry['paidAmount'] ?? (_parseLeadNum(entry['amount']).abs()),
            'paymentMethod': rawItem['paymentMethod'] ?? entry['paymentMethod'] ?? 'CASH',
            'collectedBy': rawItem['collectedBy'] ?? entry['deliveryBoyName'] ?? 'Partner',
          });
        }
      }
    }

    return (deliveries: deliveries, payments: payments);
  }

  List<Map<String, dynamic>> _filterListByPeriod(
    List<Map<String, dynamic>> items,
    String Function(Map<String, dynamic>) getDate,
    String thresholdStr,
    String todayStr,
  ) {
    if (thresholdStr.isEmpty) return items;
    return items.where((item) {
      final dtKey = _toIstDateKey(getDate(item));
      if (dtKey.isEmpty) return true;
      return dtKey.compareTo(thresholdStr) >= 0 && dtKey.compareTo(todayStr) <= 0;
    }).toList();
  }

  Future<_CompiledReportData> _compileReportData() async {
    final nowIst = IstDateTime.toIst(DateTime.now());
    final todayStr = '${nowIst.year}-${nowIst.month.toString().padLeft(2, '0')}-${nowIst.day.toString().padLeft(2, '0')}';
    String thresholdStr = '';
    if (_selectedPeriod == 'weekly') {
      final past = nowIst.subtract(const Duration(days: 7));
      thresholdStr = '${past.year}-${past.month.toString().padLeft(2, '0')}-${past.day.toString().padLeft(2, '0')}';
    } else if (_selectedPeriod == 'monthly') {
      final past = nowIst.subtract(const Duration(days: 30));
      thresholdStr = '${past.year}-${past.month.toString().padLeft(2, '0')}-${past.day.toString().padLeft(2, '0')}';
    }

    List<Map<String, dynamic>> allDeliveries = [];
    List<Map<String, dynamic>> allPayments = [];

    // Customers should fetch their own /ledger endpoint rather than staff-only routes
    if (widget.role != 'customer') {
      final results = await Future.wait([
        _api.get('/api/deliveries?range=all'),
        _api.get('/api/payments'),
      ]);
      final deliveriesRes = results[0];
      final paymentsRes = results[1];

      if (deliveriesRes['success'] == true && deliveriesRes['deliveries'] is List) {
        allDeliveries = (deliveriesRes['deliveries'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
      if (paymentsRes['success'] == true && paymentsRes['payments'] is List) {
        allPayments = (paymentsRes['payments'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
    }

    if (allDeliveries.isEmpty && widget.initialDeliveries != null && widget.initialDeliveries!.isNotEmpty) {
      allDeliveries = widget.initialDeliveries!.map((e) => Map<String, dynamic>.from(e)).toList();
    }

    final periodLabel = _getPeriodLabel();

    if (_reportScope == 'all') {
      var custList = List<Map<String, dynamic>>.from(_customers);
      if (custList.isEmpty) {
        final cRes = await _api.get('/api/customers');
        if (cRes['customers'] is List) {
          custList = (cRes['customers'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }

      final filteredDel = _filterListByPeriod(
        allDeliveries,
        (d) => d['deliveryDate']?.toString() ?? d['date']?.toString() ?? '',
        thresholdStr,
        todayStr,
      );
      final filteredPay = _filterListByPeriod(
        allPayments,
        (p) => (p['paymentDate'] ?? p['createdAt'] ?? '').toString(),
        thresholdStr,
        todayStr,
      );

      final html = HtmlReportService.generateAllCustomersHtml(
        customers: custList,
        deliveries: filteredDel,
        payments: filteredPay,
        periodLabel: periodLabel,
      );

      return _CompiledReportData(
        isAllCustomers: true,
        periodLabel: periodLabel,
        periodKey: _selectedPeriod,
        jobName: 'All_Customers_Report_$_selectedPeriod',
        html: html,
        customers: custList,
        deliveries: filteredDel,
        payments: filteredPay,
      );
    }

    // Single customer statement
    Map<String, dynamic>? targetCustomer = _selectedCustomer;
    if (targetCustomer == null) {
      if (widget.customerId != null && _customers.isNotEmpty) {
        targetCustomer = _customers.firstWhere(
          (c) =>
              c['id'] == widget.customerId ||
              c['_id'] == widget.customerId ||
              c['customerId'] == widget.customerId,
          orElse: () => _customers.first,
        );
      } else if (_customers.isNotEmpty) {
        targetCustomer = _customers.first;
      } else if (widget.role == 'customer' || widget.customerId != null) {
        final lookup = (widget.customerId != null && widget.customerId!.isNotEmpty)
            ? widget.customerId!
            : 'me';
        final meRes = await _api.get('/api/customers/$lookup');
        if (meRes['customer'] is Map) {
          targetCustomer = Map<String, dynamic>.from(meRes['customer'] as Map);
        }
      }
    }

    if (targetCustomer == null && widget.role != 'customer') {
      throw 'Please select a customer to generate report.';
    }

    Map<String, dynamic> activeCustomer = targetCustomer ?? {
      'name': 'Customer',
      'customerId': widget.customerId ?? '',
      'mobile': '',
      'area': 'Hyderabad',
      'currentBalance': 0,
    };

    final targetLookupId = activeCustomer['id']?.toString() ??
        activeCustomer['_id']?.toString() ??
        activeCustomer['customerId']?.toString() ??
        (widget.role == 'customer' ? 'me' : '');

    List<Map<String, dynamic>> custDeliveries = [];
    List<Map<String, dynamic>> custPayments = [];

    if (targetLookupId.isNotEmpty) {
      try {
        final ledgerRes = await _api.get('/api/customers/$targetLookupId/ledger');
        if (ledgerRes['success'] == true) {
          if (ledgerRes['customer'] is Map) {
            activeCustomer = Map<String, dynamic>.from(ledgerRes['customer'] as Map);
          }
          final extracted = _extractLedgerRecords(ledgerRes);
          custDeliveries = extracted.deliveries;
          custPayments = extracted.payments;
        }
      } catch (_) {}
    }

    // Fallback if ledger returned empty
    if (custDeliveries.isEmpty && allDeliveries.isNotEmpty) {
      if (widget.role == 'customer') {
        custDeliveries = allDeliveries;
      } else {
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

    custDeliveries = _filterListByPeriod(
      custDeliveries,
      (d) => d['deliveryDate']?.toString() ?? d['date']?.toString() ?? '',
      thresholdStr,
      todayStr,
    );
    custPayments = _filterListByPeriod(
      custPayments,
      (p) => (p['paymentDate'] ?? p['createdAt'] ?? '').toString(),
      thresholdStr,
      todayStr,
    );

    final html = HtmlReportService.generateSingleCustomerHtml(
      customer: activeCustomer,
      deliveries: custDeliveries,
      payments: custPayments,
      periodLabel: periodLabel,
    );

    final safeName = (activeCustomer['name']?.toString() ?? 'Customer').replaceAll(RegExp(r'\s+'), '_');
    final resolvedCustId = activeCustomer['customerId']?.toString().isNotEmpty == true
        ? activeCustomer['customerId'].toString()
        : (activeCustomer['id']?.toString() ?? activeCustomer['_id']?.toString());

    return _CompiledReportData(
      isAllCustomers: false,
      periodLabel: periodLabel,
      periodKey: _selectedPeriod,
      jobName: 'Statement_${safeName}_$_selectedPeriod',
      html: html,
      activeCustomer: activeCustomer,
      resolvedCustomerId: resolvedCustId,
      deliveries: custDeliveries,
      payments: custPayments,
    );
  }

  Future<void> _handleViewReportPreview() async {
    setState(() => _isGenerating = true);
    try {
      final compiled = await _compileReportData();
      if (!mounted) return;
      final nav = Navigator.of(context);
      final messenger = ScaffoldMessenger.of(context);
      nav.pop();
      await nav.push(
        MaterialPageRoute(
          builder: (_) => _ReportPreviewScreen(
            data: compiled,
            onPrintPdf: () async {
              final ok = await LauncherService.printHtml(compiled.html, jobName: compiled.jobName);
              if (!ok) {
                final url = _api.getReportPdfUrl(
                  role: compiled.isAllCustomers ? 'admin' : 'customer',
                  period: compiled.periodKey,
                  customerId: compiled.resolvedCustomerId,
                );
                await LauncherService.openUrl(url);
              } else {
                messenger.showSnackBar(
                  SnackBar(
                    content: Text('${compiled.jobName} ready — select "Save as PDF" to download.'),
                    backgroundColor: const Color(0xFF0D5C3A),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            onOpenServerPdf: () async {
              final url = _api.getReportPdfUrl(
                role: compiled.isAllCustomers ? 'admin' : 'customer',
                period: compiled.periodKey,
                customerId: compiled.resolvedCustomerId,
              );
              await LauncherService.openUrl(url);
            },
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading report: $e'),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  Future<void> _handleGenerateReport({bool isDirectDownload = true}) async {
    setState(() => _isGenerating = true);

    try {
      final compiled = await _compileReportData();
      if (!mounted) return;

      if (!isDirectDownload) {
        final url = _api.getReportPdfUrl(
          role: compiled.isAllCustomers ? 'admin' : 'customer',
          period: compiled.periodKey,
          customerId: compiled.resolvedCustomerId,
        );
        await LauncherService.openUrl(url);
        if (!mounted) return;
        Navigator.pop(context);
        return;
      }

      final printed = await LauncherService.printHtml(compiled.html, jobName: compiled.jobName);
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
                    '${compiled.jobName} generated. Select "Save as PDF" to download.',
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
      } else {
        final url = _api.getReportPdfUrl(
          role: compiled.isAllCustomers ? 'admin' : 'customer',
          period: compiled.periodKey,
          customerId: compiled.resolvedCustomerId,
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
                onPressed: _isGenerating ? null : _handleViewReportPreview,
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
                            'Loading Report...',
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
                          const Icon(Icons.visibility_rounded, color: Colors.white, size: 19),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              _reportScope == 'all'
                                  ? 'View All Customers Report'
                                  : (_selectedCustomer != null
                                      ? 'View Report for ${_selectedCustomer!['name']}'
                                      : 'View Statement Report'),
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
            const SizedBox(height: 10),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isGenerating ? null : () => _handleGenerateReport(isDirectDownload: true),
                    icon: const Icon(Icons.print_rounded, size: 16, color: Color(0xFF0D5C3A)),
                    label: const Text(
                      'Save / Print PDF',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0D5C3A),
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: const Color(0xFFF0FDF4),
                      side: const BorderSide(color: Color(0xFFA7F3D0)),
                      padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isGenerating ? null : () => _handleGenerateReport(isDirectDownload: false),
                    icon: const Icon(Icons.download_rounded, size: 16, color: Color(0xFF334155)),
                    label: const Text(
                      'Download PDF',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF334155),
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CompiledReportData {
  final bool isAllCustomers;
  final String periodLabel;
  final String periodKey;
  final String jobName;
  final String html;
  final Map<String, dynamic>? activeCustomer;
  final String? resolvedCustomerId;
  final List<Map<String, dynamic>> customers;
  final List<Map<String, dynamic>> deliveries;
  final List<Map<String, dynamic>> payments;

  const _CompiledReportData({
    required this.isAllCustomers,
    required this.periodLabel,
    required this.periodKey,
    required this.jobName,
    required this.html,
    this.activeCustomer,
    this.resolvedCustomerId,
    this.customers = const [],
    this.deliveries = const [],
    this.payments = const [],
  });
}

class _ReportPreviewScreen extends StatelessWidget {
  final _CompiledReportData data;
  final Future<void> Function() onPrintPdf;
  final Future<void> Function() onOpenServerPdf;

  const _ReportPreviewScreen({
    required this.data,
    required this.onPrintPdf,
    required this.onOpenServerPdf,
  });

  String _formatDate(dynamic raw) {
    final s = (raw?.toString() ?? '').trim();
    if (s.isEmpty || s == '-') return '-';
    try {
      return DateFormat('dd MMM yyyy (EEE)').format(DateTime.parse(s).toLocal());
    } catch (_) {
      return s;
    }
  }

  num _numVal(dynamic raw) {
    if (raw is num) return raw;
    return num.tryParse(raw?.toString() ?? '0') ?? 0;
  }

  Widget _buildKpiCard(String label, String value, String sub, Color accent, Color bg, Color border) {
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w800,
              color: Color(0xFF64748B),
              letterSpacing: 0.4,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: accent),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w900,
          color: Color(0xFF0F172A),
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final completed = data.deliveries.where((d) => d['status'] == 'delivered').toList();
    final totalMilk = completed.fold<num>(0, (s, d) => s + _numVal(d['actualMilk'] ?? d['plannedMilk']));
    final totalCurd = completed.fold<num>(0, (s, d) => s + _numVal(d['actualCurd'] ?? d['plannedCurd']));
    final totalBilled = completed.fold<num>(0, (s, d) => s + _numVal(d['totalAmount']));
    final totalPaid = data.payments.fold<num>(0, (s, p) => s + _numVal(p['amount']));

    final sortedDeliveries = List<Map<String, dynamic>>.from(data.deliveries)
      ..sort((a, b) => (b['deliveryDate'] ?? b['date'] ?? '').toString().compareTo((a['deliveryDate'] ?? a['date'] ?? '').toString()));
    final sortedPayments = List<Map<String, dynamic>>.from(data.payments)
      ..sort((a, b) => (b['paymentDate'] ?? b['createdAt'] ?? '').toString().compareTo((a['paymentDate'] ?? a['createdAt'] ?? '').toString()));

    final cust = data.activeCustomer ?? const <String, dynamic>{};
    final custName = cust['name']?.toString() ?? 'Customer';
    final custCode = cust['customerId']?.toString() ?? cust['id']?.toString() ?? '';
    final custPhone = cust['mobile']?.toString() ?? '';
    final custAddr = [cust['address'], cust['area']].where((v) => v != null && v.toString().trim().isNotEmpty).join(', ');
    final balance = _numVal(cust['currentBalance']);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D5C3A),
        foregroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              data.isAllCustomers ? 'All Customers Statement' : 'Delivery & Billing Statement',
              style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800),
            ),
            Text(
              data.periodLabel,
              style: const TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Print / Save PDF',
            icon: const Icon(Icons.print_rounded),
            onPressed: onPrintPdf,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          // Branded Header Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'NATURAL MILK DAIRY',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0D5C3A)),
                ),
                const SizedBox(height: 2),
                Text(
                  data.isAllCustomers
                      ? 'Consolidated All-Customers Report (${data.customers.length} Accounts)'
                      : 'Account: $custName${custCode.isNotEmpty ? ' ($custCode)' : ''}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF065F46)),
                ),
                const SizedBox(height: 2),
                Text(
                  'Period: ${data.periodLabel}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF047857)),
                ),
              ],
            ),
          ),

          if (!data.isAllCustomers) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(custName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        if (custAddr.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(custAddr, style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                          ),
                        if (custPhone.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text('+91 $custPhone', style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('LEDGER BALANCE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF64748B))),
                      const SizedBox(height: 2),
                      Text(
                        balance > 0
                            ? 'Due ${HtmlReportService.formatCurrency(balance)}'
                            : (balance < 0 ? 'Adv ${HtmlReportService.formatCurrency(balance.abs())}' : 'Cleared'),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: balance > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),

          // 2x2 KPI Grid
          Row(
            children: [
              Expanded(
                child: _buildKpiCard(
                  'DELIVERIES',
                  '${completed.length} Drops',
                  '${totalMilk.toStringAsFixed(1)} L Milk • ${(totalCurd / 1000).toStringAsFixed(1)} kg Curd',
                  const Color(0xFF0D5C3A),
                  const Color(0xFFF0FDF4),
                  const Color(0xFFBBF7D0),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildKpiCard(
                  'PERIOD BILLED',
                  HtmlReportService.formatCurrency(totalBilled),
                  '${sortedDeliveries.length} records in range',
                  const Color(0xFF0D5C3A),
                  const Color(0xFFF0FDF4),
                  const Color(0xFFBBF7D0),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildKpiCard(
                  'PAYMENTS RECORDED',
                  HtmlReportService.formatCurrency(totalPaid),
                  '${sortedPayments.length} transactions',
                  const Color(0xFF0369A1),
                  const Color(0xFFF0F9FF),
                  const Color(0xFFBAE6FD),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildKpiCard(
                  data.isAllCustomers ? 'CUSTOMERS' : 'NET BALANCE',
                  data.isAllCustomers
                      ? '${data.customers.length} Total'
                      : HtmlReportService.formatCurrency(balance),
                  data.isAllCustomers
                      ? 'Consolidated accounts'
                      : (balance > 0 ? 'Payment due' : (balance < 0 ? 'Prepaid advance' : 'Settled')),
                  const Color(0xFF0F172A),
                  Colors.white,
                  const Color(0xFFE2E8F0),
                ),
              ),
            ],
          ),

          if (data.isAllCustomers) ...[
            _buildSectionTitle('CUSTOMERS SUMMARY (${data.customers.length})'),
            if (data.customers.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('No customer accounts available.', style: TextStyle(color: Color(0xFF64748B))),
              )
            else
              ...data.customers.map((c) {
                final cName = c['name']?.toString() ?? 'Customer';
                final cArea = c['area']?.toString() ?? '';
                final cBal = _numVal(c['currentBalance']);
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(11),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(11),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(cName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                            if (cArea.isNotEmpty)
                              Text(cArea, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      Text(
                        cBal > 0
                            ? 'Due ${HtmlReportService.formatCurrency(cBal)}'
                            : (cBal < 0 ? 'Adv ${HtmlReportService.formatCurrency(cBal.abs())}' : 'Cleared'),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: cBal > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
                        ),
                      ),
                    ],
                  ),
                );
              }),
          ] else ...[
            _buildSectionTitle('DAY-BY-DAY DELIVERY HISTORY (${sortedDeliveries.length})'),
            if (sortedDeliveries.isEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                alignment: Alignment.center,
                child: const Text('No delivery records found for this period.', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
              )
            else
              ...sortedDeliveries.map((d) {
                final dateStr = _formatDate(d['deliveryDate'] ?? d['date']);
                final milk = _numVal(d['actualMilk'] ?? d['plannedMilk']);
                final curd = _numVal(d['actualCurd'] ?? d['plannedCurd']);
                final rate = _numVal(d['milkPrice'] ?? 60);
                final amt = d['totalAmount'] != null ? _numVal(d['totalAmount']) : (milk * rate);
                final partner = d['deliveryBoyName']?.toString() ?? 'Assigned Partner';
                final status = d['status']?.toString() ?? 'pending';
                final isDone = status == 'delivered';
                final isMissed = status == 'not_delivered';
                final badgeColor = isDone
                    ? const Color(0xFF059669)
                    : (isMissed ? const Color(0xFFDC2626) : const Color(0xFFD97706));
                final badgeBg = isDone
                    ? const Color(0xFFDCFCE7)
                    : (isMissed ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7));
                final statusText = isDone ? 'Delivered' : (isMissed ? 'Missed' : 'Pending');

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(dateStr, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                            const SizedBox(height: 3),
                            Text(
                              '${milk.toStringAsFixed(1)} L Milk${curd > 0 ? ' • ${curd.toStringAsFixed(0)} g Curd' : ''} • By $partner',
                              style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            HtmlReportService.formatCurrency(amt),
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: badgeBg,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              statusText,
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: badgeColor),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
          ],

          _buildSectionTitle('PAYMENTS & ADJUSTMENTS (${sortedPayments.length})'),
          if (sortedPayments.isEmpty)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              alignment: Alignment.center,
              child: const Text('No payment entries recorded in this period.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            )
          else
            ...sortedPayments.map((p) {
              final amt = _numVal(p['amount']);
              final mode = (p['paymentMethod']?.toString() ?? 'CASH').toUpperCase();
              final by = p['collectedBy']?.toString() ?? 'Partner';
              final dt = _formatDate(p['paymentDate'] ?? p['createdAt']);
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(11),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(dt, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                          Text('$mode • Collected by $by', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                    Text(
                      HtmlReportService.formatCurrency(amt),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
          ),
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onPrintPdf,
                  icon: const Icon(Icons.print_rounded, size: 17, color: Colors.white),
                  label: const Text('Save / Print PDF', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0D5C3A),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onOpenServerPdf,
                  icon: const Icon(Icons.download_rounded, size: 17, color: Color(0xFF0D5C3A)),
                  label: const Text('Download PDF', style: TextStyle(color: Color(0xFF0D5C3A), fontWeight: FontWeight.w800, fontSize: 13)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF0D5C3A)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
