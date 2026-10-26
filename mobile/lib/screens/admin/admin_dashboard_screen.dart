import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../data/services/api_service.dart';
import '../../data/services/realtime_service.dart';
import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final ApiService _api = ApiService();
  final RealtimeService _realtime = RealtimeService();

  int _selectedTabIndex = 0; // 0: Overview, 1: Deliveries, 2: Partners, 3: Customers, 4: Profile
  bool _isLoading = false;
  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _deliveries = [];
  List<Map<String, dynamic>> _deliveryBoys = [];
  List<Map<String, dynamic>> _customers = [];
  String _deliveryFilter = 'all';
  String _customerSearch = '';
  StreamSubscription? _wsSub;

  @override
  void initState() {
    super.initState();
    _loadAllData();
    _initRealtime();
  }

  void _initRealtime() {
    _wsSub = _realtime.eventStream.listen((event) {
      _loadAllData(silent: true);
    });
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    super.dispose();
  }

  Future<void> _loadAllData({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);

    try {
      await Future.wait([
        _loadDashboardSummary(),
        _loadDeliveries(),
        _loadDeliveryBoys(),
        _loadCustomers(),
      ]);
    } catch (e) {
      debugPrint('Admin load error: $e');
    } finally {
      if (mounted && !silent) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadDashboardSummary() async {
    try {
      final res = await _api.get('/api/reports/dashboard');
      if (res['success'] == true && res['summary'] is Map) {
        if (mounted) setState(() => _summary = Map<String, dynamic>.from(res['summary']));
      }
    } catch (e) {
      debugPrint('Error loading dashboard summary: $e');
    }
  }

  Future<void> _loadDeliveries() async {
    try {
      final res = await _api.get('/api/deliveries?range=today');
      if (res['success'] == true && res['deliveries'] is List) {
        if (mounted) {
          setState(() {
            _deliveries = (res['deliveries'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading deliveries: $e');
    }
  }

  Future<void> _loadDeliveryBoys() async {
    try {
      final res = await _api.get('/api/delivery-boys');
      if (res['success'] == true && res['deliveryBoys'] is List) {
        if (mounted) {
          setState(() {
            _deliveryBoys = (res['deliveryBoys'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading delivery boys: $e');
    }
  }

  Future<void> _loadCustomers() async {
    try {
      final res = await _api.get('/api/customers');
      if (res['success'] == true && res['customers'] is List) {
        if (mounted) {
          setState(() {
            _customers = (res['customers'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading customers: $e');
    }
  }

  void _showProofPhotoDialog(String date, String? proofUrl, String? driverName) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog.fullscreen(
        child: Scaffold(
          backgroundColor: AppColors.milkWhite,
          appBar: AppBar(
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Delivery Proof Verification', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                Text(date, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ],
            ),
            actions: [
              IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
            ],
          ),
          body: Column(
            children: [
              Expanded(
                child: Container(
                  color: Colors.black,
                  padding: const EdgeInsets.all(16),
                  child: Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: (proofUrl != null && proofUrl.isNotEmpty)
                          ? Image.network(
                              proofUrl,
                              fit: BoxFit.contain,
                              loadingBuilder: (context, child, progress) => progress == null ? child : const Center(child: CircularProgressIndicator()),
                              errorBuilder: (context, error, stackTrace) => const Center(child: Icon(Icons.broken_image, size: 64)),
                            )
                          : const Center(child: Text('No photo proof uploaded', style: TextStyle(color: Colors.white))),
                    ),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  color: AppColors.milkWhite,
                  border: Border(top: BorderSide(color: AppColors.borderSubtle)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Fulfilled by Partner', style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w700)),
                        Text(driverName ?? 'Dairy Driver', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.dairyBlue)),
                      ],
                    ),
                    ElevatedButton.icon(
                      onPressed: () => Navigator.pop(ctx),
                      icon: const Icon(Icons.verified_rounded, size: 16),
                      label: const Text('Approved'),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRealtimeBadge() {
    return Consumer<RealtimeService>(
      builder: (_, realtime, _) {
        final isConnected = realtime.isConnected;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: isConnected ? const Color(0xFFE8F5E9) : const Color(0xFFFFF3E0),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isConnected ? const Color(0xFFA5D6A7) : const Color(0xFFFFCC80),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isConnected ? const Color(0xFF2E7D32) : const Color(0xFFEF6C00),
                ),
              ),
              const SizedBox(width: 4),
              Text(
                isConnected ? 'Live' : 'Syncing',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: isConnected ? const Color(0xFF2E7D32) : const Color(0xFFEF6C00),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              padding: const EdgeInsets.all(4),
              child: Image.asset('assets/images/logo.png', fit: BoxFit.contain, errorBuilder: (_, _, _) => const Icon(Icons.admin_panel_settings, size: 20, color: Color(0xFF059669))),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Admin Console', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                Text('Natural Milk Dairy', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
              ],
            ),
          ],
        ),
        actions: [
          Center(child: _buildRealtimeBadge()),
          const SizedBox(width: 12),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadAllData(),
        color: const Color(0xFF059669),
        child: _isLoading && _deliveries.isEmpty
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF059669)))
            : _buildCurrentTab(),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(0, Icons.dashboard_outlined, Icons.dashboard_rounded, 'Overview'),
          _buildNavItem(1, Icons.local_shipping_outlined, Icons.local_shipping_rounded, 'Deliveries', badge: _deliveries.length),
          _buildNavItem(2, Icons.sports_motorsports_outlined, Icons.sports_motorsports_rounded, 'Partners', badge: _deliveryBoys.length),
          _buildNavItem(3, Icons.people_outline_rounded, Icons.people_rounded, 'Customers', badge: _customers.length),
          _buildNavItem(4, Icons.settings_outlined, Icons.settings_rounded, 'Settings'),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label, {int? badge}) {
    final isSelected = _selectedTabIndex == index;
    final color = isSelected ? const Color(0xFF059669) : const Color(0xFF64748B);

    return InkWell(
      onTap: () => setState(() => _selectedTabIndex = index),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Icon(isSelected ? activeIcon : icon, color: color, size: 24),
              if (badge != null && badge > 0)
                Positioned(
                  top: -5,
                  right: -7,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(
                      color: const Color(0xFF059669),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Center(
                      child: Text(
                        badge > 99 ? '99+' : '$badge',
                        style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 3),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600, color: color)),
        ],
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_selectedTabIndex) {
      case 0:
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildExecutiveSummary(),
              const SizedBox(height: 18),
              const Text('Recent Operations Activity', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A))),
              const SizedBox(height: 10),
              _buildOperationsView(),
            ],
          ),
        );
      case 1:
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: _buildOperationsView(),
        );
      case 2:
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: _buildPartnersView(),
        );
      case 3:
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: _buildCustomersView(),
        );
      case 4:
        return _buildSettingsView();
      default:
        return _buildOperationsView();
    }
  }

  Widget _buildExecutiveSummary() {
    final completed = _deliveries.where((d) => d['status'] == 'delivered').length;
    final total = _deliveries.length;
    final progress = total > 0 ? (completed / total) : 0.0;
    final todayLitres = _summary['todayMilkLitres'] ?? 0;
    final todayCurd = _summary['todayCurdGrams'] ?? 0;
    final todaySales = _summary['todaySales'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text('TODAY ROUTE FULFILLMENT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF065F46))),
                ],
              ),
              Text('${(progress * 100).toInt()}% Done', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF059669))),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: const Color(0xFFF1F5F9),
              valueColor: const AlwaysStoppedAnimation(Color(0xFF059669)),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildSummaryMetric(
                  title: 'DELIVERED',
                  value: '$completed / $total',
                  sub: 'Doorstep drops',
                  color: const Color(0xFF059669),
                  bgColor: const Color(0xFFECFDF5),
                  borderColor: const Color(0xFFBBF7D0),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildSummaryMetric(
                  title: 'TODAY MILK',
                  value: '$todayLitres L',
                  sub: '$todayCurd g Curd',
                  color: const Color(0xFF0F172A),
                  bgColor: const Color(0xFFF8FAFC),
                  borderColor: const Color(0xFFE2E8F0),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildSummaryMetric(
                  title: 'COLLECTIONS',
                  value: '₹$todaySales',
                  sub: 'Cash & UPI',
                  color: const Color(0xFFB45309),
                  bgColor: const Color(0xFFFFFBEB),
                  borderColor: const Color(0xFFFDE68A),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryMetric({
    required String title,
    required String value,
    required String sub,
    required Color color,
    required Color bgColor,
    required Color borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.3)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(height: 2),
          Text(sub, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
        ],
      ),
    );
  }

  Widget _buildOperationsView() {
    List<Map<String, dynamic>> filtered = _deliveries;
    if (_deliveryFilter == 'delivered') {
      filtered = filtered.where((d) => d['status'] == 'delivered').toList();
    } else if (_deliveryFilter == 'pending') {
      filtered = filtered.where((d) => d['status'] == 'pending').toList();
    }

    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildFilterChip('all', 'All Drops (${_deliveries.length})'),
              const SizedBox(width: 8),
              _buildFilterChip('delivered', 'Delivered (${_deliveries.where((d) => d['status'] == 'delivered').length})'),
              const SizedBox(width: 8),
              _buildFilterChip('pending', 'Pending (${_deliveries.where((d) => d['status'] == 'pending').length})'),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (filtered.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
            child: const Center(child: Text('No drops match this filter')),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filtered.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (ctx, i) {
              final d = filtered[i];
              final isDelivered = d['status'] == 'delivered';
              final isPending = d['status'] == 'pending';
              final proofUrl = d['proofImage']?.toString();
              final driverName = d['deliveryBoyName']?.toString() ?? 'Unassigned';

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDelivered ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            d['customerName'] ?? 'Customer',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isDelivered ? const Color(0xFFECFDF5) : (isPending ? const Color(0xFFFFF8E1) : const Color(0xFFFEF2F2)),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            isDelivered ? '✓ DELIVERED' : (isPending ? 'PENDING' : 'MISSED'),
                            style: TextStyle(
                              color: isDelivered ? const Color(0xFF059669) : (isPending ? const Color(0xFFF57F17) : const Color(0xFFDC2626)),
                              fontWeight: FontWeight.w800,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      d['customerAddress'] ?? 'Madhapur Doorstep Drop',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${d['actualMilk'] ?? d['plannedMilk'] ?? 1}L Milk${(d['actualCurd'] ?? d['plannedCurd'] ?? 0) > 0 ? " + ${(d['actualCurd'] ?? d['plannedCurd'])}g Curd" : ""}',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF059669)),
                        ),
                        Text(
                          'Partner: $driverName',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                    if (proofUrl != null && proofUrl.isNotEmpty) ...[
                      const Divider(height: 20),
                      InkWell(
                        onTap: () => _showProofPhotoDialog(d['deliveryDate'] ?? 'Today', proofUrl, driverName),
                        child: const Row(
                          children: [
                            Icon(Icons.photo_camera_rounded, size: 14, color: Color(0xFF059669)),
                            SizedBox(width: 6),
                            Text('View Doorstep Photo Proof', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                            Spacer(),
                            Icon(Icons.chevron_right, size: 16, color: Color(0xFF059669)),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _deliveryFilter == key;
    return InkWell(
      onTap: () => setState(() => _deliveryFilter = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEDF5EF) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? const Color(0xFFCDDFD1) : const Color(0xFFE2E8F0)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? const Color(0xFF059669) : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildPartnersView() {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _deliveryBoys.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) {
        final b = _deliveryBoys[i];
        final name = b['name'] ?? 'Partner';
        final phone = b['mobile'] ?? 'N/A';
        final area = b['assignedArea'] ?? 'Madhapur';
        final vehicle = b['vehicleNumber'] ?? 'Two-Wheeler';
        final cash = b['todayCashCollected'] ?? 0;
        final upi = b['todayUpiCollected'] ?? 0;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
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
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(
                          color: Color(0xFFECFDF5),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.sports_motorsports_rounded, size: 18, color: Color(0xFF059669)),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A))),
                          Text(phone, style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                        ],
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('ON ROUTE', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w800, fontSize: 10)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Column(
                      children: [
                        const Text('ROUTE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                        Text(area, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF0F172A))),
                      ],
                    ),
                    Column(
                      children: [
                        const Text('VEHICLE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                        Text(vehicle, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF0F172A))),
                      ],
                    ),
                    Column(
                      children: [
                        const Text('CASH / UPI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                        Text('₹$cash / ₹$upi', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF059669))),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCustomersView() {
    final filtered = _customerSearch.isEmpty
        ? _customers
        : _customers.where((c) {
            final name = (c['name'] ?? '').toString().toLowerCase();
            final phone = (c['mobile'] ?? '').toString().toLowerCase();
            final q = _customerSearch.toLowerCase();
            return name.contains(q) || phone.contains(q);
          }).toList();

    return Column(
      children: [
        TextField(
          onChanged: (v) => setState(() => _customerSearch = v.trim()),
          decoration: InputDecoration(
            hintText: 'Search by customer name or phone...',
            prefixIcon: const Icon(Icons.search_rounded, size: 18),
            isDense: true,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          ),
        ),
        const SizedBox(height: 12),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: filtered.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (ctx, i) {
            final c = filtered[i];
            final name = c['name'] ?? 'Customer';
            final mobile = c['mobile'] ?? '';
            final status = (c['status'] ?? 'active').toString().toUpperCase();
            final isPaused = status == 'PAUSED';
            final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] : {};
            final milkQty = plan['milkQty'] ?? 1;
            final bal = c['currentBalance'] ?? 0;

            return Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: isPaused ? const Color(0xFFFFFBEB) : const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'C',
                        style: TextStyle(fontWeight: FontWeight.w900, color: isPaused ? const Color(0xFFB45309) : const Color(0xFF059669)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A))),
                        Text('$mobile • ${milkQty}L Daily', style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isPaused ? const Color(0xFFFFFBEB) : const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: isPaused ? const Color(0xFFB45309) : const Color(0xFF059669)),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text('Bal: ₹$bal', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: bal < 0 ? Colors.redAccent : const Color(0xFF059669))),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildSettingsView() {
    final auth = context.read<AuthProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFBBF7D0))),
                  child: const Center(child: Icon(Icons.admin_panel_settings, size: 28, color: Color(0xFF059669))),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(auth.user?.name ?? 'Admin Operations', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: Color(0xFF0F172A))),
                    const SizedBox(height: 2),
                    Text(auth.user?.email ?? 'admin@gmail.com', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    const SizedBox(height: 2),
                    const Text('Role: Operations Administrator', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
            child: Column(
              children: [
                _buildSettingsRow('Backend Host', _api.baseUrl),
                const Divider(height: 20),
                _buildSettingsRow('Realtime Stream', _realtime.isConnected ? 'WebSocket Online 🟢' : 'Reconnecting 🟡'),
                const Divider(height: 20),
                _buildSettingsRow('Total Fleet Drivers', '${_deliveryBoys.length} registered'),
                const Divider(height: 20),
                _buildSettingsRow('Total Customer Base', '${_customers.length} households'),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () async {
                await auth.logout();
                if (!mounted) return;
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (r) => false,
                );
              },
              icon: const Icon(Icons.logout_rounded, size: 18, color: Colors.white),
              label: const Text('Sign Out Admin Portal', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
        ),
      ],
    );
  }
}
