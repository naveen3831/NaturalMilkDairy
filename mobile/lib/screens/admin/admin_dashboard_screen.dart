import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../data/services/api_service.dart';
import '../../data/services/realtime_service.dart';
import '../../providers/auth_provider.dart';
import '../../services/launcher_service.dart';
import '../auth/login_screen.dart';
import '../../widgets/report_download_sheet.dart';
import '../../widgets/delivery_proof_dialog.dart';
import '../../core/utils/ist_date_time.dart';
import '../home/widgets/notification_modal.dart';
import '../../data/services/fcm_service.dart';

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
  List<Map<String, dynamic>> _auditLogs = [];
  String _deliveryFilter = 'all';
  String _customerSearch = '';
  String _reportPeriod = 'today'; // 'today', 'weekly', 'monthly', 'all', 'custom'
  DateTime _customStartDate = IstDateTime.toIst(DateTime.now()).subtract(const Duration(days: 7));
  DateTime _customEndDate = IstDateTime.toIst(DateTime.now());
  StreamSubscription? _wsSub;
  Timer? _adminWsDebounce;
  bool _isAdminDataSyncing = false;

  int _unreadNotificationsCount = 0;

  @override
  void initState() {
    super.initState();
    _loadAllData();
    _initRealtime();
    _fetchUnreadNotificationsCount();
    FcmService().syncToken();
  }

  Future<void> _fetchUnreadNotificationsCount() async {
    try {
      final res = await _api.get('/api/notifications');
      if (res['success'] == true && res['notifications'] is List && mounted) {
        final list = res['notifications'] as List;
        final unread = list.where((n) => n is Map && n['isRead'] != true).length;
        setState(() {
          _unreadNotificationsCount = unread;
        });
      }
    } catch (e) {
      debugPrint('Error fetching unread notifs count: $e');
    }
  }

  void _openNotificationsSheet() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => NotificationModal(
          isAdmin: true,
          onViewProof: (date, proofUrl, driverName) {
            _showProofPhotoDialog(date, proofUrl, driverName);
          },
          onOpenDeliveries: () {
            setState(() => _selectedTabIndex = 1);
          },
          onNotificationChanged: () {
            _fetchUnreadNotificationsCount();
          },
        ),
      ),
    );
    _fetchUnreadNotificationsCount();
  }

  void _initRealtime() {
    _wsSub = _realtime.eventStream.listen((event) {
      final type = event['type']?.toString();
      if ((type == 'DRIVER_DUTY_UPDATED' || type == 'DELIVERY_BOY_UPDATED') && event['payload'] is Map) {
        final payload = event['payload'] as Map;
        final pId = payload['id']?.toString() ?? payload['boyId']?.toString() ?? payload['targetId']?.toString();
        final pMob = _cleanPhone(payload['mobile']?.toString());
        final pName = (payload['name']?.toString() ?? payload['boyName']?.toString() ?? '').trim().toLowerCase();
        final isOnline = payload['isOnline'] == true;

        if (mounted) {
          setState(() {
            for (var b in _deliveryBoys) {
              final bId = b['id']?.toString() ?? b['_id']?.toString();
              final bMob = _cleanPhone(b['mobile']?.toString());
              final bName = (b['name']?.toString() ?? '').trim().toLowerCase();
              final matches = (pId != null && bId != null && pId == bId) ||
                  (pMob.isNotEmpty && bMob.isNotEmpty && pMob == bMob) ||
                  (pName.isNotEmpty && bName.isNotEmpty && pName == bName);
              if (matches) {
                if (payload['isOnline'] is bool) b['isOnline'] = isOnline;
                if (payload['lastOnlineAt'] != null) b['lastOnlineAt'] = payload['lastOnlineAt'];
                if (payload['lastOfflineAt'] != null) b['lastOfflineAt'] = payload['lastOfflineAt'];
                if (payload['dutyLogs'] != null) b['dutyLogs'] = payload['dutyLogs'];
              }
            }
          });
        }
      }
      if ((type == 'CUSTOMER_UPDATED' || type == 'DELIVERY_UPDATED') && event['payload'] is Map) {
        if (mounted) {
          final payload = event['payload'] as Map;
          final custId = (payload['customerId'] ?? payload['_id'] ?? payload['id'])?.toString();
          final newMobile = (payload['mobile'] ?? payload['customerPhone'])?.toString();
          final oldMobile = payload['oldMobile']?.toString();
          final newName = (payload['name'] ?? payload['customerName'])?.toString();
          final newAddr = (payload['address'] ?? payload['customerAddress'])?.toString();
          final newArea = (payload['area'] ?? payload['assignedArea'])?.toString();

          setState(() {
            for (var c in _customers) {
              final cId = (c['_id'] ?? c['id'] ?? c['customerId'])?.toString();
              final cPhone = (c['mobile'] ?? c['phone'])?.toString();
              final matchesCust = (custId != null && cId == custId) ||
                  (oldMobile != null && _cleanPhone(cPhone) == _cleanPhone(oldMobile));
              if (matchesCust) {
                if (newMobile != null && newMobile.isNotEmpty) c['mobile'] = newMobile;
                if (newName != null && newName.isNotEmpty) c['name'] = newName;
                if (newAddr != null && newAddr.isNotEmpty) c['address'] = newAddr;
                if (newArea != null && newArea.isNotEmpty) c['area'] = newArea;
              }
            }
            for (var d in _deliveries) {
              final dCustId = (d['customerId'] ?? d['customer']?['_id'] ?? d['customer']?['id'])?.toString();
              final dPhone = (d['customerPhone'] ?? d['mobile'] ?? d['phone'])?.toString();
              final matchesDel = (custId != null && dCustId == custId) ||
                  (oldMobile != null && _cleanPhone(dPhone) == _cleanPhone(oldMobile));
              if (matchesDel) {
                if (newMobile != null && newMobile.isNotEmpty) {
                  d['customerPhone'] = newMobile;
                  d['mobile'] = newMobile;
                  if (d['customer'] is Map) d['customer']['mobile'] = newMobile;
                }
                if (newName != null && newName.isNotEmpty) {
                  d['customerName'] = newName;
                  d['name'] = newName;
                  if (d['customer'] is Map) d['customer']['name'] = newName;
                }
                if (newAddr != null && newAddr.isNotEmpty) {
                  d['customerAddress'] = newAddr;
                  d['address'] = newAddr;
                }
              }
            }
          });
        }
        _adminWsDebounce?.cancel();
        _adminWsDebounce = Timer(const Duration(milliseconds: 600), () {
          _loadAllData(silent: true);
        });
      }
      if (type == 'NOTIFICATION_CREATED' ||
          type == 'NOTIFICATION_UPDATED' ||
          type == 'NOTIFICATION_DELETED' ||
          type == 'NOTIFICATIONS_CLEARED') {
        _fetchUnreadNotificationsCount();
      }
      _adminWsDebounce?.cancel();
      _adminWsDebounce = Timer(const Duration(milliseconds: 2500), () {
        _loadAllData(silent: true);
      });
    });
  }

  String _cleanPhone(String? p) {
    if (p == null) return '';
    final d = p.replaceAll(RegExp(r'[^0-9]'), '');
    return d.length > 10 ? d.substring(d.length - 10) : d;
  }

  @override
  void dispose() {
    _adminWsDebounce?.cancel();
    _wsSub?.cancel();
    super.dispose();
  }

  Future<void> _loadAllData({bool silent = false}) async {
    if (_isAdminDataSyncing) return;
    _isAdminDataSyncing = true;
    if (!silent) setState(() => _isLoading = true);

    try {
      await Future.wait([
        _loadDashboardSummary(null, null, null, false),
        _loadDeliveries(null, null, null, false),
        _loadDeliveryBoys(notify: false),
        _loadCustomers(notify: false),
        _loadAuditLogs(notify: false),
      ]);
    } catch (e) {
      debugPrint('Admin load error: $e');
    } finally {
      _isAdminDataSyncing = false;
      if (mounted) {
        setState(() {
          if (!silent) _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadDashboardSummary([String? period, DateTime? fromDate, DateTime? toDate, bool notify = true]) async {
    try {
      final p = period ?? _reportPeriod;
      String url = '/api/reports/dashboard?period=$p';
      if (p == 'custom') {
        final f = fromDate ?? _customStartDate;
        final t = toDate ?? _customEndDate;
        final fStr = '${f.year}-${f.month.toString().padLeft(2, '0')}-${f.day.toString().padLeft(2, '0')}';
        final tStr = '${t.year}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')}';
        url += '&startDate=$fStr&endDate=$tStr';
      }
      final res = await _api.get(url);
      if (res['success'] == true && res['summary'] is Map) {
        final data = Map<String, dynamic>.from(res['summary']);
        if (mounted) {
          if (notify) {
            setState(() => _summary = data);
          } else {
            _summary = data;
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading dashboard summary: $e');
    }
  }

  Future<void> _loadDeliveries([String? range, DateTime? fromDate, DateTime? toDate, bool notify = true]) async {
    try {
      final r = range ?? (_reportPeriod == 'custom' ? 'custom' : _reportPeriod);
      String url = '/api/deliveries?range=$r';
      if (r == 'custom') {
        final f = fromDate ?? _customStartDate;
        final t = toDate ?? _customEndDate;
        final fStr = '${f.year}-${f.month.toString().padLeft(2, '0')}-${f.day.toString().padLeft(2, '0')}';
        final tStr = '${t.year}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')}';
        url += '&startDate=$fStr&endDate=$tStr';
      }
      final res = await _api.get(url);
      if (res['success'] == true && res['deliveries'] is List) {
        final list = (res['deliveries'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        if (mounted) {
          if (notify) {
            setState(() => _deliveries = list);
          } else {
            _deliveries = list;
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading deliveries: $e');
    }
  }

  Future<void> _loadDeliveryBoys({bool notify = true}) async {
    try {
      final res = await _api.get('/api/delivery-boys');
      if (res['success'] == true && res['deliveryBoys'] is List) {
        final list = (res['deliveryBoys'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        if (mounted) {
          if (notify) {
            setState(() => _deliveryBoys = list);
          } else {
            _deliveryBoys = list;
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading delivery boys: $e');
    }
  }

  Future<void> _loadCustomers({bool notify = true}) async {
    try {
      final res = await _api.get('/api/customers');
      if (res['success'] == true && res['customers'] is List) {
        final list = (res['customers'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        if (mounted) {
          if (notify) {
            setState(() => _customers = list);
          } else {
            _customers = list;
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading customers: $e');
    }
  }

  Future<void> _loadAuditLogs({bool notify = true}) async {
    try {
      final res = await _api.get('/api/reports/audit-logs');
      if (res['success'] == true && res['logs'] is List) {
        final list = (res['logs'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        if (mounted) {
          if (notify) {
            setState(() => _auditLogs = list);
          } else {
            _auditLogs = list;
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading audit logs: $e');
    }
  }

  void _showProofPhotoDialog(
    String date,
    String? proofUrl,
    String? driverName, {
    String? customerName,
    String? address,
    String? time,
    num? lat,
    num? lng,
  }) {
    if (proofUrl == null || proofUrl.isEmpty) return;
    DeliveryProofHelper.showLightbox(
      context: context,
      proofStr: proofUrl,
      customerName: customerName ?? 'Customer',
      address: address ?? 'Doorstep Delivery Location',
      lat: lat,
      lng: lng,
      timestamp: time ?? date,
      partnerName: driverName,
    );
  }

  List<Map<String, dynamic>> _findAssignedCustomersForPartner(Map<String, dynamic> b) {
    final partnerId = b['id'] ?? b['_id'] ?? b['boyId'];
    final partnerName = (b['name'] ?? '').toString().toLowerCase().trim();
    final partnerArea = (b['assignedArea'] ?? '').toString().toLowerCase().trim();

    return _customers.where((c) {
      final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] : {};
      final assignedBoyId = plan['deliveryBoyId']?.toString() ?? c['deliveryBoyId']?.toString();
      final assignedBoyName = (plan['deliveryBoyName'] ?? c['deliveryBoyName'] ?? '').toString().toLowerCase().trim();
      final custArea = (c['area'] ?? '').toString().toLowerCase().trim();

      return (partnerId != null && assignedBoyId != null && assignedBoyId == partnerId.toString()) ||
             (partnerName.isNotEmpty && assignedBoyName.isNotEmpty && assignedBoyName == partnerName) ||
             (partnerArea.isNotEmpty && custArea.isNotEmpty && custArea == partnerArea);
    }).toList();
  }

  void _showDeliveryAndUserDetails(Map<String, dynamic> d) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AdminDeliveryDetailFullScreen(
          delivery: d,
          customers: _customers,
          deliveryBoys: _deliveryBoys,
          onSelectCustomer: (customerName) {
            setState(() {
              _selectedTabIndex = 3;
              _customerSearch = customerName;
            });
          },
          onShowProof: (proofUrl, date, driver, custName, addr, lat, lng) {
            _showProofPhotoDialog(
              date,
              proofUrl,
              driver,
              customerName: custName,
              address: addr,
              time: date,
              lat: lat,
              lng: lng,
            );
          },
        ),
      ),
    );
  }

  void _showPartnerAndAssignedUsers(Map<String, dynamic> b) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AdminPartnerDetailsFullScreen(
          partner: b,
          deliveries: _deliveries,
          customers: _customers,
          deliveryBoys: _deliveryBoys,
          onToggleDuty: () => _togglePartnerDuty(b),
          onOpenDutyLogs: () => _showPartnerDutyLogsSheet(b),
          onShowDeliveryDetails: (deliv) => _showDeliveryAndUserDetails(deliv),
          onSelectCustomer: (custName) {
            setState(() {
              _selectedTabIndex = 3;
              _customerSearch = custName;
            });
          },
        ),
      ),
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
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _selectedTabIndex == 4 ? 'Admin Profile' : 'Admin Console',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                Text(
                  _selectedTabIndex == 4 ? 'Super Admin Details' : 'Natural Milk Dairy',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF059669)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFF0D5C3A), size: 22),
            tooltip: 'Download PDF Report',
            onPressed: () => ReportDownloadSheet.show(
              context,
              role: 'admin',
              initialPeriod: _reportPeriod == 'today' ? 'weekly' : _reportPeriod,
              initialCustomers: _customers,
              initialDeliveries: _deliveries,
            ),
          ),
          Center(
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: const Icon(Icons.notifications_outlined, color: Color(0xFF0D5C3A), size: 20),
                    tooltip: 'Notifications',
                    onPressed: _openNotificationsSheet,
                  ),
                ),
                if (_unreadNotificationsCount > 0)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE11D48),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white, width: 1.5),
                      ),
                      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                      child: Text(
                        _unreadNotificationsCount > 99 ? '99+' : '$_unreadNotificationsCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          height: 1,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
          ),
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
          _buildNavItem(4, Icons.person_outline_rounded, Icons.person_rounded, 'Profile'),
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
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildWelcomeBanner(),
              const SizedBox(height: 12),
              _buildReportPeriodSelector(),
              if (_reportPeriod == 'custom') ...[
                const SizedBox(height: 16),
                _buildOperationsView(),
              ] else ...[
                const SizedBox(height: 14),
                _buildExecutiveSummary(),
                const SizedBox(height: 16),
                _buildKpiMetricsGrid(),
                const SizedBox(height: 16),
                _buildQuickActionHub(),
                const SizedBox(height: 18),
                _buildPartnerPerformanceSection(),
                const SizedBox(height: 18),
                const Text('Recent Operations Activity', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A))),
                const SizedBox(height: 10),
                _buildOperationsView(),
                const SizedBox(height: 20),
                _buildRecentAuditLogSection(),
              ],
              const SizedBox(height: 14),
            ],
          ),
        );
      case 1:
        return _buildOperationsView(isTab: true);
      case 2:
        return _buildPartnersView();
      case 3:
        return _buildCustomersView();
      case 4:
        return _buildProfileView();
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
    final todayCash = _summary['todayCashCollected'] ??
        _deliveryBoys.fold<num>(0, (s, b) => s + (num.tryParse((b['todayCashCollected'] ?? '0').toString()) ?? 0));
    final todayUpi = _summary['todayUpiCollected'] ??
        _deliveryBoys.fold<num>(0, (s, b) => s + (num.tryParse((b['todayUpiCollected'] ?? '0').toString()) ?? 0));
    final collections = _summary['paymentsCollected'] ?? (todayCash + todayUpi > 0 ? todayCash + todayUpi : todaySales);

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
                  onTap: () => setState(() {
                    _selectedTabIndex = 1;
                    _deliveryFilter = 'delivered';
                  }),
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
                  onTap: () => setState(() {
                    _selectedTabIndex = 1;
                    _deliveryFilter = 'all';
                  }),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildSummaryMetric(
                  title: 'COLLECTIONS',
                  value: '₹$collections',
                  sub: 'Cash ₹$todayCash • UPI ₹$todayUpi',
                  color: const Color(0xFFB45309),
                  bgColor: const Color(0xFFFFFBEB),
                  borderColor: const Color(0xFFFDE68A),
                  onTap: () => _openCollectionsScreen(),
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
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
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
      ),
    );
  }

  Widget _buildReportPeriodSelector() {
    final periods = [
      {'id': 'today', 'label': 'Today'},
      {'id': 'weekly', 'label': 'Weekly (7 Days)'},
      {'id': 'monthly', 'label': 'Monthly (30 Days)'},
      {'id': 'all', 'label': 'All Time'},
      {'id': 'custom', 'label': 'Custom (From - To)'},
    ];

    String formatReadable(DateTime d) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${d.day} ${months[d.month - 1]} ${d.year}';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: periods.map((p) {
              final isSelected = _reportPeriod == p['id'];
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    setState(() => _reportPeriod = p['id']!);
                    _loadDashboardSummary(p['id']!);
                    _loadDeliveries(p['id']!);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF0D5C3A) : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0),
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: const Color(0xFF0D5C3A).withValues(alpha: 0.2),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              )
                            ]
                          : null,
                    ),
                    child: Text(
                      p['label']!,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: isSelected ? Colors.white : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        if (_reportPeriod == 'custom') ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF0D5C3A).withValues(alpha: 0.3)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _customStartDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() => _customStartDate = picked);
                        _loadDashboardSummary('custom', picked, _customEndDate);
                        _loadDeliveries('custom', picked, _customEndDate);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('From Date', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(Icons.calendar_today, size: 12, color: Color(0xFF0D5C3A)),
                              const SizedBox(width: 4),
                              Text(formatReadable(_customStartDate), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.arrow_forward, size: 16, color: Color(0xFF94A3B8)),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _customEndDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() => _customEndDate = picked);
                        _loadDashboardSummary('custom', _customStartDate, picked);
                        _loadDeliveries('custom', _customStartDate, picked);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('To Date', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(Icons.event, size: 12, color: Color(0xFF0D5C3A)),
                              const SizedBox(width: 4),
                              Text(formatReadable(_customEndDate), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildWelcomeBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD1FAE5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    const Text(
                      'LIVE OPERATIONS',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF065F46),
                        letterSpacing: 0.4,
                      ),
                    ),
                  ],
                ),
              ),
              const Text(
                'Morning routes active',
                style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Welcome back, Dairy Admin 👋',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'Daily overview of farm milk subscriptions, delivery fulfillment, and customer accounts.',
            style: TextStyle(fontSize: 11.5, color: Color(0xFF475569), height: 1.35),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiMetricsGrid() {
    final totalCust = _summary['totalCustomers'] ?? _customers.length;
    final activeCust = _summary['activeCustomers'] ?? _customers.where((c) => c['status'] == 'active').length;
    final totalDeliv = _summary['deliveriesCount'] ?? _deliveries.length;
    final completedDeliv = _summary['completed'] ?? _deliveries.where((d) => d['status'] == 'delivered').length;
    final pendingDeliv = _summary['pending'] ?? _deliveries.where((d) => d['status'] == 'pending').length;
    final missedDeliv = _summary['notDelivered'] ?? _deliveries.where((d) => d['status'] == 'not_delivered').length;
    final todaySales = _summary['todaySales'] ?? 0;
    final milkLitres = _summary['todayMilkLitres'] ?? '0.0';
    final curdKg = _summary['todayCurdKg'] ?? '0.00';
    final creditAdded = _summary['creditAdded'] ?? 0;
    final collections = _summary['paymentsCollected'] ?? todaySales;
    final todayCashSummary = _summary['todayCashCollected'] ??
        _deliveryBoys.fold<num>(0, (s, b) => s + (num.tryParse((b['todayCashCollected'] ?? '0').toString()) ?? 0));
    final todayUpiSummary = _summary['todayUpiCollected'] ??
        _deliveryBoys.fold<num>(0, (s, b) => s + (num.tryParse((b['todayUpiCollected'] ?? '0').toString()) ?? 0));
    final outstanding = _summary['totalOutstanding'] ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Operational & Financial KPIs',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildKpiCard(
                title: 'CUSTOMERS',
                value: '$totalCust',
                subtitle: '$activeCust Active Plans',
                icon: Icons.people_alt_rounded,
                iconColor: const Color(0xFF059669),
                iconBg: const Color(0xFFECFDF5),
                onTap: () => setState(() => _selectedTabIndex = 3),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildKpiCard(
                title: "TODAY'S DROPS",
                value: '$totalDeliv',
                subtitle: missedDeliv > 0
                    ? '$completedDeliv Done • $pendingDeliv Pend • $missedDeliv Miss'
                    : '$completedDeliv Done • $pendingDeliv Pend',
                icon: Icons.local_shipping_rounded,
                iconColor: const Color(0xFF2563EB),
                iconBg: const Color(0xFFEFF6FF),
                onTap: () => setState(() {
                  _selectedTabIndex = 1;
                  _deliveryFilter = 'all';
                }),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildKpiCard(
                title: "TODAY'S SALES",
                value: '₹$todaySales',
                subtitle: '🥛 $milkLitres L • 🥣 $curdKg Kg',
                icon: Icons.currency_rupee_rounded,
                iconColor: const Color(0xFFB45309),
                iconBg: const Color(0xFFFEF3C7),
                onTap: () => setState(() {
                  _selectedTabIndex = 1;
                  _deliveryFilter = 'delivered';
                }),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildKpiCard(
                title: 'CREDIT ADDED',
                value: '₹$creditAdded',
                subtitle: 'Billed to customer ledgers',
                icon: Icons.credit_card_rounded,
                iconColor: const Color(0xFF7E22CE),
                iconBg: const Color(0xFFF3E8FF),
                onTap: () => _openCreditAddedScreen(),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildKpiCard(
                title: 'COLLECTIONS',
                value: '₹$collections',
                subtitle: 'Cash ₹$todayCashSummary • UPI ₹$todayUpiSummary',
                icon: Icons.account_balance_wallet_rounded,
                iconColor: const Color(0xFF0F766E),
                iconBg: const Color(0xFFCCFBF1),
                onTap: () => _openCollectionsScreen(),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildKpiCard(
                title: 'OUTSTANDING',
                value: '₹$outstanding',
                subtitle: 'Pending Credit Due',
                icon: Icons.warning_amber_rounded,
                iconColor: const Color(0xFFDC2626),
                iconBg: const Color(0xFFFEF2F2),
                borderColor: const Color(0xFFFCA5A5),
                textColor: const Color(0xFFDC2626),
                onTap: () => _openOutstandingScreen(),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    Color? borderColor,
    Color? textColor,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor ?? const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.015),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.3,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(7)),
                  child: Icon(icon, size: 14, color: iconColor),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: 16.5,
                fontWeight: FontWeight.w900,
                color: textColor ?? const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 3),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: textColor != null ? textColor.withValues(alpha: 0.8) : const Color(0xFF64748B),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionHub() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions Hub',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildQuickActionPill('+ Add Customer', Icons.person_add_rounded, const Color(0xFF059669), const Color(0xFFECFDF5), () => _openAddCustomerModal()),
              const SizedBox(width: 8),
              _buildQuickActionPill(
                'Download Reports',
                Icons.picture_as_pdf_rounded,
                const Color(0xFF0D5C3A),
                const Color(0xFFECFDF5),
                () => ReportDownloadSheet.show(
                  context,
                  role: 'admin',
                  initialPeriod: _reportPeriod == 'today' ? 'weekly' : _reportPeriod,
                  initialCustomers: _customers,
                  initialDeliveries: _deliveries,
                ),
              ),
              const SizedBox(width: 8),
              _buildQuickActionPill('Deliveries', Icons.local_shipping_rounded, const Color(0xFF2563EB), const Color(0xFFEFF6FF), () => setState(() => _selectedTabIndex = 1)),
              const SizedBox(width: 8),
              _buildQuickActionPill('Partners', Icons.sports_motorsports_rounded, const Color(0xFF059669), const Color(0xFFECFDF5), () => setState(() => _selectedTabIndex = 2)),
              const SizedBox(width: 8),
              _buildQuickActionPill('Customers', Icons.people_rounded, const Color(0xFF7E22CE), const Color(0xFFF3E8FF), () => setState(() => _selectedTabIndex = 3)),
              const SizedBox(width: 8),
              _buildQuickActionPill('Contact & Links', Icons.share_rounded, const Color(0xFFD97706), const Color(0xFFFEF3C7), () => _openContactSettingsFullScreen()),
              const SizedBox(width: 8),
              _buildQuickActionPill('Profile', Icons.person_rounded, const Color(0xFF0F766E), const Color(0xFFCCFBF1), () => setState(() => _selectedTabIndex = 4)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionPill(String label, IconData icon, Color color, Color bg, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
              child: Icon(icon, size: 14, color: color),
            ),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
          ],
        ),
      ),
    );
  }

  Widget _buildPartnerPerformanceSection() {
    if (_deliveryBoys.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Partner Route Performance',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
                ),
                Text(
                  'Live driver fulfillment and cash reconciliation',
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
            InkWell(
              onTap: () => setState(() => _selectedTabIndex = 2),
              child: const Row(
                children: [
                  Text('Manage', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                  Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF059669)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _deliveryBoys.length > 3 ? 3 : _deliveryBoys.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (ctx, i) {
            final boy = _deliveryBoys[i];
            final name = boy['name'] ?? 'Partner';
            final area = boy['assignedArea'] ?? 'Madhapur';
            final vehicle = boy['vehicleNumber'] ?? 'Bike Route';
            final bool isOnline = boy['isOnline'] == true;

            final boyId = boy['id']?.toString() ?? boy['_id']?.toString();
            final boyName = boy['name']?.toString() ?? '';

            final completed = boy['todayStats']?['completed'] ??
                _deliveries.where((d) => (d['deliveryBoyId']?.toString() == boyId || d['deliveryBoyName'] == boyName) && d['status'] == 'delivered').length;
            final pending = boy['todayStats']?['pending'] ??
                _deliveries.where((d) => (d['deliveryBoyId']?.toString() == boyId || d['deliveryBoyName'] == boyName) && d['status'] == 'pending').length;
            final missed = boy['todayStats']?['notDelivered'] ??
                _deliveries.where((d) => (d['deliveryBoyId']?.toString() == boyId || d['deliveryBoyName'] == boyName) && d['status'] == 'not_delivered').length;

            final cash = boy['todayCashCollected'] ?? 0;
            final upi = boy['todayUpiCollected'] ?? 0;

            return InkWell(
              onTap: () => setState(() => _selectedTabIndex = 2),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.015),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A))),
                              const SizedBox(height: 1),
                              Text('Route: $area • $vehicle', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: isOnline ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            isOnline ? 'Online' : 'Offline',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: isOnline ? const Color(0xFF059669) : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildMiniStat('DONE', '$completed', const Color(0xFF059669)),
                          _buildMiniStat('PENDING', '$pending', const Color(0xFFD97706)),
                          _buildMiniStat('MISSED', '$missed', const Color(0xFFDC2626)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Cash: ₹$cash', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                        Text('UPI: ₹$upi', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildMiniStat(String label, String val, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
        const SizedBox(height: 1),
        Text(val, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: color)),
      ],
    );
  }

  Widget _buildRecentAuditLogSection() {
    if (_auditLogs.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recent Operational Log',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
            ),
            Text(
              'Immutable system record of customer deliveries and cash transactions',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _auditLogs.length > 4 ? 4 : _auditLogs.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (ctx, i) {
            final log = _auditLogs[i];
            final cat = log['category']?.toString().toUpperCase() ?? 'SYS';
            final act = log['action']?.toString() ?? 'Activity';
            final details = log['details']?.toString() ?? '';
            final actor = log['actor']?.toString() ?? 'System';

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      cat,
                      style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$act: $details', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)), maxLines: 2, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 2),
                        Text('by $actor', style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildOperationsView({bool isTab = false}) {
    List<Map<String, dynamic>> filtered = _deliveries;
    if (_deliveryFilter == 'delivered') {
      filtered = filtered.where((d) => d['status'] == 'delivered').toList();
    } else if (_deliveryFilter == 'pending') {
      filtered = filtered.where((d) => d['status'] == 'pending').toList();
    }

    final filterWidget = SingleChildScrollView(
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
    );

    Widget buildCard(Map<String, dynamic> d) {
              final isDelivered = d['status'] == 'delivered';
              final isPending = d['status'] == 'pending';
              final proofUrl = d['proofImage']?.toString();
              final driverName = d['deliveryBoyName']?.toString() ?? 'Unassigned';

              return InkWell(
                onTap: () => _showDeliveryAndUserDetails(d),
                borderRadius: BorderRadius.circular(16),
                child: Container(
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
                      if ((num.tryParse((d['customerLatitude'] ?? d['latitude'])?.toString() ?? '') != null) &&
                          (num.tryParse((d['customerLongitude'] ?? d['longitude'])?.toString() ?? '') != null)) ...[
                        const SizedBox(height: 3),
                        InkWell(
                          onTap: () {
                            final dLat = num.tryParse((d['customerLatitude'] ?? d['latitude'])?.toString() ?? '');
                            final dLng = num.tryParse((d['customerLongitude'] ?? d['longitude'])?.toString() ?? '');
                            LauncherService.openMap(lat: dLat, lng: dLng, address: d['customerAddress']?.toString() ?? '');
                          },
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.pin_drop_rounded, size: 12, color: Color(0xFF2563EB)),
                              const SizedBox(width: 3),
                              Text(
                                'GPS: ${num.tryParse((d['customerLatitude'] ?? d['latitude'])?.toString() ?? '')!.toStringAsFixed(3)}, ${num.tryParse((d['customerLongitude'] ?? d['longitude'])?.toString() ?? '')!.toStringAsFixed(3)}',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${d['actualMilk'] ?? d['plannedMilk'] ?? 1}L Milk${(num.tryParse((d['actualCurd'] ?? d['plannedCurd'] ?? 0).toString()) ?? 0) > 0 ? " + ${(d['actualCurd'] ?? d['plannedCurd'])}g Curd" : ""}',
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
                          onTap: () => _showProofPhotoDialog(
                            d['deliveryDate'] ?? 'Today',
                            proofUrl,
                            driverName,
                            customerName: d['customerName']?.toString(),
                            address: (d['customerAddress'] ?? d['deliveryAddress'] ?? d['area'])?.toString(),
                            time: d['deliveredAt']?.toString() ?? d['deliveryDate']?.toString(),
                            lat: num.tryParse((d['customerLatitude'] ?? d['latitude'])?.toString() ?? ''),
                            lng: num.tryParse((d['customerLongitude'] ?? d['longitude'])?.toString() ?? ''),
                          ),
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
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Tap card to view user & delivery details',
                            style: TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                          ),
                          Row(
                            children: const [
                              Text('Details', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                              SizedBox(width: 2),
                              Icon(Icons.chevron_right_rounded, size: 15, color: Color(0xFF059669)),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
    }

    if (isTab) {
      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: filterWidget,
          ),
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: const Text('No drops match this filter'),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (ctx, i) => buildCard(filtered[i]),
                  ),
          ),
        ],
      );
    }

    final displayed = filtered.take(6).toList();
    return Column(
      children: [
        filterWidget,
        const SizedBox(height: 14),
        if (displayed.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
            child: const Center(child: Text('No drops match this filter')),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: displayed.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (ctx, i) => buildCard(displayed[i]),
          ),
        if (filtered.length > 6) ...[
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => setState(() => _selectedTabIndex = 1),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF059669),
                side: const BorderSide(color: Color(0xFF059669)),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text('View All ${filtered.length} Deliveries →', style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
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

  String _formatDutyTime(dynamic dateVal) {
    if (dateVal == null || dateVal.toString().isEmpty) return '—';
    try {
      final dt = DateTime.parse(dateVal.toString()).toLocal();
      final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final minute = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      final day = dt.day.toString().padLeft(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final month = months[dt.month - 1];
      return '$day $month, $hour:$minute $period';
    } catch (_) {
      return dateVal.toString();
    }
  }

  Future<void> _togglePartnerDuty(Map<String, dynamic> b, [bool? targetState]) async {
    final boyId = b['id'] ?? b['_id']?.toString() ?? '';
    final name = b['name'] ?? 'Partner';
    final currentState = b['isOnline'] == true;
    final nextState = targetState ?? !currentState;
    HapticFeedback.lightImpact();

    setState(() {
      final idx = _deliveryBoys.indexWhere((item) => (item['id'] ?? item['_id']) == boyId);
      if (idx != -1) {
        _deliveryBoys[idx]['isOnline'] = nextState;
      }
    });

    try {
      await _api.post('/api/delivery-boys/$boyId/duty-status', {
        'isOnline': nextState,
        'boyId': boyId,
        'mobile': b['mobile'],
        'name': name,
        'area': b['assignedArea'],
      });
      _loadDeliveryBoys();
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(nextState ? '🟢 $name is now ONLINE (On Duty)' : '⏸ $name is now OFFLINE (Break)'),
            backgroundColor: nextState ? const Color(0xFF059669) : const Color(0xFF475569),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      debugPrint('Error toggling duty: $e');
      _loadDeliveryBoys();
    }
  }

  void _showPartnerDutyLogsSheet(Map<String, dynamic> b) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AdminPartnerDutyLogsFullScreen(
          partner: b,
          onToggleDuty: () => _togglePartnerDuty(b),
        ),
      ),
    );
  }

  Widget _buildPartnersView() {
    if (_deliveryBoys.isEmpty) {
      return Center(
        child: Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
          child: const Text('No delivery partners assigned', style: TextStyle(color: Color(0xFF64748B))),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const AlwaysScrollableScrollPhysics(),
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
        final bool isOnline = b['isOnline'] == true;
        final lastOnline = b['lastOnlineAt'];
        final lastOffline = b['lastOfflineAt'];

        final assignedCustCount = _findAssignedCustomersForPartner(b).length;

        return InkWell(
          onTap: () => _showPartnerAndAssignedUsers(b),
          borderRadius: BorderRadius.circular(16),
          child: Container(
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
                    InkWell(
                      onTap: () => _togglePartnerDuty(b),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: isOnline ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: isOnline ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: isOnline ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              isOnline ? 'ONLINE (ON DUTY)' : 'OFFLINE (BREAK)',
                              style: TextStyle(
                                color: isOnline ? const Color(0xFF059669) : const Color(0xFF64748B),
                                fontWeight: FontWeight.w800,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Live timing status indicator (tap to view detailed shift logs)
                InkWell(
                  onTap: () => _showPartnerDutyLogsSheet(b),
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(
                      children: [
                        Icon(Icons.schedule_rounded, size: 13, color: isOnline ? const Color(0xFF059669) : const Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Text(
                          isOnline && lastOnline != null
                              ? 'Online since ${_formatDutyTime(lastOnline)}'
                              : !isOnline && lastOffline != null
                                  ? 'Offline since ${_formatDutyTime(lastOffline)}'
                                  : 'Active Partner Shift',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isOnline ? const Color(0xFF059669) : const Color(0xFF64748B)),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.arrow_forward_ios_rounded, size: 9, color: Color(0xFF94A3B8)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
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
                const SizedBox(height: 12),
                // Assigned Users / Customers Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _showPartnerAndAssignedUsers(b),
                    icon: const Icon(Icons.people_alt_rounded, size: 15, color: Colors.white),
                    label: Text(
                      'View Assigned Customers ($assignedCustCount) & Details',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                // Duty Logs Button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showPartnerDutyLogsSheet(b),
                    icon: const Icon(Icons.history_rounded, size: 15, color: Color(0xFF059669)),
                    label: const Text('View Duty Timings & Shift Logs', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF065F46))),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFBBF7D0)),
                      backgroundColor: const Color(0xFFF0FDF4),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
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
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  onChanged: (v) => setState(() => _customerSearch = v.trim()),
                  decoration: InputDecoration(
                    hintText: 'Search customer name or phone...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 18),
                    isDense: true,
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: () => _openAddCustomerModal(),
                icon: const Icon(Icons.person_add_rounded, size: 16, color: Colors.white),
                label: const Text('Add', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Colors.white)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Container(
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
                    child: const Text('No customers found', style: TextStyle(color: Color(0xFF64748B))),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  physics: const AlwaysScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
            final c = filtered[i];
            final name = c['name'] ?? 'Customer';
            final mobile = c['mobile'] ?? '';
            final status = (c['status'] ?? 'active').toString().toUpperCase();
            final isPaused = status == 'PAUSED';
            final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] : (c['subscription'] is Map ? c['subscription'] : {});
            final milkQty = plan['milkQty'] ?? plan['quantity'] ?? (c['subscription'] is Map && c['subscription']['plan'] is Map ? c['subscription']['plan']['milkQty'] : null) ?? 1;
            final bal = c['currentBalance'] ?? 0;

            return InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => _showAdminCustomerCollectedSheet(c),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    Row(
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
                              Text('$mobile • ${milkQty}L Daily${(c['area'] ?? '').toString().isNotEmpty ? ' • ${c['area']}' : ''}', style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                              if (num.tryParse(c['latitude']?.toString() ?? '') != null && num.tryParse(c['longitude']?.toString() ?? '') != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: InkWell(
                                    onTap: () {
                                      final lat = num.tryParse(c['latitude'].toString());
                                      final lng = num.tryParse(c['longitude'].toString());
                                      LauncherService.openMap(lat: lat, lng: lng, address: c['address']?.toString() ?? '');
                                    },
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.pin_drop_rounded, size: 11, color: Color(0xFF2563EB)),
                                        const SizedBox(width: 3),
                                        Text(
                                          'GPS: ${num.tryParse(c['latitude'].toString())!.toStringAsFixed(3)}, ${num.tryParse(c['longitude'].toString())!.toStringAsFixed(3)}',
                                          style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
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
                    const SizedBox(height: 10),
                    const Divider(height: 1, color: Color(0xFFF1F5F9)),
                    const SizedBox(height: 8),
                    // Action Buttons Row (Edit, Pay, Pause/Resume, Delete)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        _buildCustomerQuickAction(
                          label: 'Edit',
                          icon: Icons.edit_rounded,
                          color: const Color(0xFF2563EB),
                          bgColor: const Color(0xFFEFF6FF),
                          onTap: () => _openEditCustomerModal(c),
                        ),
                        const SizedBox(width: 6),
                        _buildCustomerQuickAction(
                          label: 'Pay',
                          icon: Icons.payments_outlined,
                          color: const Color(0xFF059669),
                          bgColor: const Color(0xFFECFDF5),
                          onTap: () => _showRecordPaymentModal(context, c),
                        ),
                        const SizedBox(width: 6),
                        _buildCustomerQuickAction(
                          label: isPaused ? 'Resume' : 'Pause',
                          icon: isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                          color: isPaused ? const Color(0xFF059669) : const Color(0xFFD97706),
                          bgColor: isPaused ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                          onTap: () => _toggleCustomerPauseResume(c),
                        ),
                        const SizedBox(width: 6),
                        _buildCustomerQuickAction(
                          label: 'Delete',
                          icon: Icons.delete_outline_rounded,
                          color: const Color(0xFFDC2626),
                          bgColor: const Color(0xFFFEF2F2),
                          onTap: () => _confirmDeleteCustomer(c),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        ),
      ],
    );
  }

  Widget _buildCustomerQuickAction({
    required String label,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 10.5, color: color),
            const SizedBox(width: 3),
            Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color)),
          ],
        ),
      ),
    );
  }

  void _showAdminCustomerCollectedSheet(Map<String, dynamic> c) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AdminCustomerDetailsFullScreen(
          customer: c,
          deliveries: _deliveries,
          deliveryBoys: _deliveryBoys,
          api: _api,
          onShowDeliveryDetails: (deliv) => _showDeliveryAndUserDetails(deliv),
          onRecordPayment: (cust) => _showRecordPaymentModal(context, cust),
          onEditCustomer: (cust) => _openEditCustomerModal(cust),
          onDeleteCustomer: (cust) => _confirmDeleteCustomer(cust),
          onTogglePause: (cust) => _toggleCustomerPauseResume(cust),
          onAssignPartner: (cust, boyId, boyName) => _assignPartner(cust, boyId, boyName),
        ),
      ),
    );
  }

  void _showRecordPaymentModal(BuildContext context, Map<String, dynamic> customer) {
    final name = customer['name'] ?? 'Customer';
    final custId = customer['id'] ?? customer['_id'] ?? customer['customerId'];
    final currentBal = num.tryParse(customer['currentBalance']?.toString() ?? '0') ?? 0;
    final amountController = TextEditingController(text: currentBal > 0 ? '$currentBal' : '100');
    String paymentMethod = 'cash';
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bCtx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Record Payment: $name', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                const SizedBox(height: 4),
                Text('Pending Balance Due: ₹$currentBal', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFDC2626))),
                const SizedBox(height: 16),
                const Text('Payment Amount (₹)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.currency_rupee_rounded, size: 18),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 14),
                const Text('Payment Method', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                Row(
                  children: [
                    ChoiceChip(
                      label: const Text('Cash'),
                      selected: paymentMethod == 'cash',
                      onSelected: (val) => setModalState(() => paymentMethod = 'cash'),
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: const Text('UPI / Online'),
                      selected: paymentMethod == 'upi',
                      onSelected: (val) => setModalState(() => paymentMethod = 'upi'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            final amt = num.tryParse(amountController.text.trim());
                            if (amt == null || amt <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid amount')));
                              return;
                            }
                            setModalState(() => isSubmitting = true);
                            try {
                              final res = await _api.post('/api/payments', {
                                'customerId': custId.toString(),
                                'amount': amt,
                                'paymentMethod': paymentMethod,
                                'notes': 'Collected via Admin Console Mobile App',
                              });
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (res['success'] == true) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Payment of ₹$amt recorded successfully!'), backgroundColor: const Color(0xFF059669)),
                                  );
                                }
                                _loadAllData(silent: true);
                              } else {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(res['message']?.toString() ?? 'Error recording payment'), backgroundColor: const Color(0xFFDC2626)),
                                  );
                                }
                              }
                            } catch (e) {
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Confirm Payment', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildProfileView() {
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    final adminName = (user?.name != null && user!.name.trim().isNotEmpty) ? user.name.trim() : 'Dairy Owner';
    final adminEmail = (user?.email != null && user!.email!.trim().isNotEmpty) ? user.email!.trim() : 'admin@naturalmilkdairy.com';
    final adminMobile = (user?.mobile != null && user!.mobile.trim().isNotEmpty) ? user.mobile.trim() : '7702233931';
    final rawId = user?.id ?? '';
    final cleanId = rawId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
    final adminId = cleanId.isNotEmpty
        ? 'NMD-ADM-${cleanId.length > 4 ? cleanId.substring(cleanId.length - 4).toUpperCase() : cleanId.toUpperCase()}'
        : 'NMD-ADM-ROOT';
    final initial = adminName.isNotEmpty ? adminName[0].toUpperCase() : 'A';

    final totalDeliveries = _deliveries.length;
    final totalPartners = _deliveryBoys.length;
    final onlinePartners = _deliveryBoys.where((b) => b['isOnline'] == true).length;
    final totalCustomers = _customers.length;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Admin User Identity Card (Matching Web AdminLayout User Profile Footer)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Avatar with Initials
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF059669), Color(0xFF047857)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF059669).withValues(alpha: 0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      initial,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 24,
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
                        children: [
                          Flexible(
                            child: Text(
                              adminName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFA7F3D0)),
                            ),
                            child: const Text(
                              'Super Admin',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF059669),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'ID: $adminId',
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$adminEmail · $adminMobile',
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: Color(0xFF64748B),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // 3. Operational Snapshot (Web Dashboard Metric Cards in Mobile Grid)
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              'Live Operations Summary',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: Color(0xFF64748B),
                letterSpacing: 0.3,
              ),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: _buildMetricMiniCard(
                  title: 'Today Deliveries',
                  value: '$totalDeliveries Drops',
                  icon: Icons.local_shipping_outlined,
                  color: const Color(0xFF059669),
                  bg: const Color(0xFFECFDF5),
                  onTap: () => _openAdminSubScreen(
                    title: 'Today Deliveries Dispatch',
                    subtitle: '$totalDeliveries Doorstep Drops',
                    builder: () => _buildOperationsView(isTab: true),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildMetricMiniCard(
                  title: 'Active Fleet',
                  value: '$onlinePartners / $totalPartners Online',
                  icon: Icons.sports_motorsports_outlined,
                  color: const Color(0xFF2563EB),
                  bg: const Color(0xFFEFF6FF),
                  onTap: () => _openAdminSubScreen(
                    title: 'Fleet & Driver Attendance',
                    subtitle: '$onlinePartners of $totalPartners Online',
                    builder: () => _buildPartnersView(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _buildMetricMiniCard(
                  title: 'Customer Base',
                  value: '$totalCustomers Accounts',
                  icon: Icons.people_outline_rounded,
                  color: const Color(0xFF7C3AED),
                  bg: const Color(0xFFF5F3FF),
                  onTap: () => _openAdminSubScreen(
                    title: 'Customer Directory & Accounts',
                    subtitle: '$totalCustomers Accounts',
                    builder: () => _buildCustomersView(),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildMetricMiniCard(
                  title: 'Financial Ledger',
                  value: 'View Audit →',
                  icon: Icons.analytics_outlined,
                  color: const Color(0xFFD97706),
                  bg: const Color(0xFFFEF3C7),
                  onTap: () => _openFinancialLedgerScreen(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // 4. SECTION: Management Shortcuts
          _buildProfileSectionContainer(
            icon: Icons.tune_rounded,
            title: 'Management Shortcuts',
            children: [
              _buildNavigationRow(
                icon: Icons.local_shipping_outlined,
                title: 'Today Deliveries Dispatch',
                subtitle: 'Track $totalDeliveries doorstep drops & statuses',
                onTap: () => _openAdminSubScreen(
                  title: 'Today Deliveries Dispatch',
                  subtitle: 'Track $totalDeliveries doorstep drops & statuses',
                  builder: () => _buildOperationsView(isTab: true),
                ),
              ),
              _buildDivider(),
              _buildNavigationRow(
                icon: Icons.sports_motorsports_outlined,
                title: 'Fleet & Driver Attendance',
                subtitle: '$onlinePartners of $totalPartners drivers active on duty',
                onTap: () => _openAdminSubScreen(
                  title: 'Fleet & Driver Attendance',
                  subtitle: '$onlinePartners of $totalPartners drivers active on duty',
                  builder: () => _buildPartnersView(),
                ),
              ),
              _buildDivider(),
              _buildNavigationRow(
                icon: Icons.people_outline_rounded,
                title: 'Customer Directory & Accounts',
                subtitle: 'Manage $totalCustomers households & subscriptions',
                onTap: () => _openAdminSubScreen(
                  title: 'Customer Directory & Accounts',
                  subtitle: 'Manage $totalCustomers households & subscriptions',
                  builder: () => _buildCustomersView(),
                ),
              ),
              _buildDivider(),
              _buildNavigationRow(
                icon: Icons.analytics_outlined,
                title: 'Financial & Ledger Performance',
                subtitle: 'Tap to view live sales, cash/UPI audit & customer ledgers',
                onTap: () => _openFinancialLedgerScreen(),
              ),
              _buildDivider(),
              _buildNavigationRow(
                icon: Icons.receipt_long_rounded,
                title: 'Payments & History',
                subtitle: 'Audit driver cash handovers, customer payments & live history',
                onTap: () => _openPaymentsHistoryScreen(),
              ),
              _buildDivider(),
              _buildNavigationRow(
                icon: Icons.share_rounded,
                title: 'Contact Details & Social Media',
                subtitle: 'Manage helplines, WhatsApp & official channels',
                onTap: () => _openContactSettingsFullScreen(),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // 8. Sign Out Admin Portal
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _showSignOutDialog(auth),
              icon: const Icon(Icons.logout_rounded, size: 19, color: Colors.white),
              label: const Text(
                'Sign Out Admin Console',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14.5,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'Natural Milk Dairy · Admin Portal v1.0.0 (Production)',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF94A3B8),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  void _openAdminSubScreen({
    required String title,
    String? subtitle,
    required Widget Function() builder,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _AdminSubScreenWrapper(
          title: title,
          subtitle: subtitle,
          builder: (_) => builder(),
          onRefresh: () async {
            await _loadAllData();
            if (mounted) setState(() {});
          },
        ),
      ),
    );
  }

  void _openFinancialLedgerScreen() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _AdminFinancialLedgerFullScreen(
          api: _api,
          initialSummary: _summary,
          customers: _customers,
          deliveries: _deliveries,
          deliveryBoys: _deliveryBoys,
          onReload: () => _loadAllData(silent: true),
          onRecordPayment: (cust) => _showRecordPaymentModal(context, cust),
          onSelectCustomer: (custName) {
            setState(() {
              _selectedTabIndex = 3;
              _customerSearch = custName;
            });
          },
        ),
      ),
    );
  }

  void _openPaymentsHistoryScreen() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _AdminPaymentsHistoryFullScreen(
          api: _api,
          deliveryBoys: _deliveryBoys,
          customers: _customers,
          deliveries: _deliveries,
          onReload: () => _loadAllData(silent: true),
          onRecordPayment: (cust) => _showRecordPaymentModal(context, cust),
        ),
      ),
    );
  }


  Widget _buildMetricMiniCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required Color bg,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.015),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileSectionContainer({
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(icon, size: 17, color: const Color(0xFF059669)),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  Widget _buildNavigationRow({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 2),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Icon(icon, size: 17, color: const Color(0xFF059669)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: Color(0xFF94A3B8),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return const Divider(height: 16, thickness: 1, color: Color(0xFFF1F5F9));
  }

  void _showSignOutDialog(AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: Color(0xFFDC2626), size: 24),
            SizedBox(width: 10),
            Text('Sign Out Admin Console', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ],
        ),
        content: const Text(
          'Are you sure you want to sign out from the Natural Milk Dairy Admin Console?',
          style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await auth.logout();
              if (!mounted) return;
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (r) => false,
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            child: const Text('Sign Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  void _openCreditAddedScreen() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => _CreditAddedScreen(
          summary: _summary,
          deliveries: _deliveries,
          customers: _customers,
          onSelectCustomer: (customerName) {
            Navigator.pop(ctx);
            setState(() {
              _selectedTabIndex = 3;
              _customerSearch = customerName;
            });
          },
        ),
      ),
    );
  }

  void _openCollectionsScreen() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => _CollectionsScreen(
          summary: _summary,
          deliveries: _deliveries,
          deliveryBoys: _deliveryBoys,
          onSelectDeliveries: () {
            Navigator.pop(ctx);
            setState(() {
              _selectedTabIndex = 1;
              _deliveryFilter = 'delivered';
            });
          },
        ),
      ),
    );
  }

  void _openOutstandingScreen() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => _OutstandingScreen(
          summary: _summary,
          customers: _customers,
          api: _api,
          onReload: () => _loadAllData(silent: true),
          onSelectCustomer: (customerName) {
            Navigator.pop(ctx);
            setState(() {
              _selectedTabIndex = 3;
              _customerSearch = customerName;
            });
          },
        ),
      ),
    );
  }

  void _openContactSettingsFullScreen() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _ContactSettingsFullScreenPage(
          api: _api,
          onSaved: () => _loadAllData(silent: true),
        ),
      ),
    );
  }

  Future<void> _assignPartner(Map<String, dynamic> customer, String boyId, String boyName) async {
    final custId = (customer['id'] ?? customer['_id'] ?? customer['customerId'] ?? '').toString();
    final name = customer['name'] ?? 'Customer';

    try {
      final res = await _api.put('/api/customers/$custId/assign-partner', {
        'deliveryBoyId': boyId,
        'deliveryBoyName': boyName,
        'actor': 'Admin',
      });
      if (res['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Assigned partner "${boyName.isNotEmpty ? boyName : 'None'}" to $name.'),
              backgroundColor: const Color(0xFF059669),
              duration: const Duration(seconds: 3),
            ),
          );
          _loadCustomers();
          _loadDeliveries();
          _loadDashboardSummary();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res['message']?.toString() ?? 'Failed to assign partner.'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _openEditCustomerModal(Map<String, dynamic> customer) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _EditCustomerBottomSheet(
        api: _api,
        customer: customer,
        deliveryBoys: _deliveryBoys,
        onUpdated: () {
          _loadCustomers();
          _loadDashboardSummary();
        },
      ),
    );
  }

  void _confirmDeleteCustomer(Map<String, dynamic> customer) {
    final name = customer['name'] ?? 'Customer';
    final custId = (customer['id'] ?? customer['_id'] ?? customer['customerId'] ?? '').toString();

    showDialog(
      context: context,
      builder: (dCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 24),
            SizedBox(width: 8),
            Text('Delete Customer', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete "$name" ($custId)?\n\nThis will remove their profile, assigned deliveries, and active subscription. This action cannot be undone.',
          style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dCtx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
          ),
          ElevatedButton.icon(
            onPressed: () async {
              Navigator.pop(dCtx);
              try {
                final res = await _api.delete('/api/customers/$custId');
                if (res['success'] == true) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Customer "$name" deleted successfully.'),
                        backgroundColor: const Color(0xFFDC2626),
                      ),
                    );
                    _loadCustomers();
                    _loadDashboardSummary();
                  }
                } else {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(res['message']?.toString() ?? 'Failed to delete customer.'),
                        backgroundColor: Colors.redAccent,
                      ),
                    );
                  }
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error: ${e.toString()}'),
                      backgroundColor: Colors.redAccent,
                    ),
                  );
                }
              }
            },
            icon: const Icon(Icons.delete_forever_rounded, size: 16, color: Colors.white),
            label: const Text('Confirm Delete', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleCustomerPauseResume(Map<String, dynamic> customer) async {
    final custId = (customer['id'] ?? customer['_id'] ?? customer['customerId'] ?? '').toString();
    final name = customer['name'] ?? 'Customer';
    final isPaused = (customer['status'] ?? '').toString().toLowerCase() == 'paused';

    try {
      final endpoint = isPaused ? '/api/customers/$custId/resume' : '/api/customers/$custId/pause';
      final res = await _api.post(endpoint, {'actor': 'Admin'});
      if (res['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(isPaused ? 'Subscription resumed for "$name".' : 'Subscription paused for "$name".'),
              backgroundColor: isPaused ? const Color(0xFF059669) : const Color(0xFFD97706),
            ),
          );
          _loadCustomers();
          _loadDashboardSummary();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res['message']?.toString() ?? 'Action failed.'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _openAddCustomerModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddCustomerBottomSheet(
        api: _api,
        deliveryBoys: _deliveryBoys,
        onCreated: () {
          _loadCustomers();
          _loadDashboardSummary();
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD NEW CUSTOMER BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────
class _AddCustomerBottomSheet extends StatefulWidget {
  final ApiService api;
  final List<Map<String, dynamic>> deliveryBoys;
  final VoidCallback onCreated;

  const _AddCustomerBottomSheet({
    required this.api,
    required this.deliveryBoys,
    required this.onCreated,
  });

  @override
  State<_AddCustomerBottomSheet> createState() => _AddCustomerBottomSheetState();
}

class _AddCustomerBottomSheetState extends State<_AddCustomerBottomSheet> {
  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _whatsappController = TextEditingController();
  final _addressController = TextEditingController();
  final _googleMapsUrlController = TextEditingController();
  final _landmarkController = TextEditingController();
  final _areaController = TextEditingController(text: 'Madhapur');
  final _milkQtyController = TextEditingController(text: '1.0');
  final _curdQtyController = TextEditingController(text: '0');
  final _notesController = TextEditingController();

  double? _latitude;
  double? _longitude;

  String _frequency = 'daily';
  String _paymentType = 'credit';
  String? _selectedDeliveryBoyId;
  bool _isSubmitting = false;
  String? _errorMessage;

  void _onMapsUrlChanged(String val) {
    final str = val.trim();
    if (str.isEmpty) {
      setState(() {
        _latitude = null;
        _longitude = null;
      });
      return;
    }

    // 1. Raw lat, lng e.g. 17.4483, 78.3915
    final rawRegex = RegExp(r'^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$');
    final rawMatch = rawRegex.firstMatch(str);
    if (rawMatch != null) {
      final lat = double.tryParse(rawMatch.group(1)!);
      final lng = double.tryParse(rawMatch.group(2)!);
      if (lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setState(() {
          _latitude = lat;
          _longitude = lng;
        });
        return;
      }
    }

    // 2. Google maps @lat,lng
    final atRegex = RegExp(r'@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)');
    final atMatch = atRegex.firstMatch(str);
    if (atMatch != null) {
      final lat = double.tryParse(atMatch.group(1)!);
      final lng = double.tryParse(atMatch.group(2)!);
      if (lat != null && lng != null) {
        setState(() {
          _latitude = lat;
          _longitude = lng;
        });
        return;
      }
    }

    // 3. Query params: q=lat,lng or query=lat,lng or ll=lat,lng
    final queryRegex = RegExp(r'[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)');
    final queryMatch = queryRegex.firstMatch(str);
    if (queryMatch != null) {
      final lat = double.tryParse(queryMatch.group(1)!);
      final lng = double.tryParse(queryMatch.group(2)!);
      if (lat != null && lng != null) {
        setState(() {
          _latitude = lat;
          _longitude = lng;
        });
        return;
      }
    }

    // 4. Place or dir paths
    final placeRegex = RegExp(r'\/(?:place|dir|search)\/(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)');
    final placeMatch = placeRegex.firstMatch(str);
    if (placeMatch != null) {
      final lat = double.tryParse(placeMatch.group(1)!);
      final lng = double.tryParse(placeMatch.group(2)!);
      if (lat != null && lng != null) {
        setState(() {
          _latitude = lat;
          _longitude = lng;
        });
        return;
      }
    }
  }

  @override
  void initState() {
    super.initState();
    if (widget.deliveryBoys.isNotEmpty) {
      final first = widget.deliveryBoys.first;
      _selectedDeliveryBoyId = first['id']?.toString() ?? first['_id']?.toString();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _whatsappController.dispose();
    _addressController.dispose();
    _googleMapsUrlController.dispose();
    _landmarkController.dispose();
    _areaController.dispose();
    _milkQtyController.dispose();
    _curdQtyController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    final mobile = _mobileController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final address = _addressController.text.trim();

    setState(() => _errorMessage = null);

    if (name.length < 2) {
      setState(() => _errorMessage = 'Please enter customer name (at least 2 characters).');
      return;
    }
    if (!RegExp(r'^(?:\+?91[- ]?)?[6-9]\d{9}$').hasMatch(mobile)) {
      setState(() => _errorMessage = 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (address.length < 4) {
      setState(() => _errorMessage = 'Please enter a complete delivery address.');
      return;
    }
    if (password.isEmpty && email.isEmpty) {
      setState(() => _errorMessage = 'Provide an email or set a portal password for customer login.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final payload = {
        'name': name,
        'mobile': mobile,
        'email': email,
        'password': password.isNotEmpty ? password : null,
        'whatsapp': _whatsappController.text.trim().isNotEmpty ? _whatsappController.text.trim() : mobile,
        'address': address,
        'area': _areaController.text.trim().isNotEmpty ? _areaController.text.trim() : 'Madhapur',
        'landmark': _landmarkController.text.trim(),
        'googleMapsUrl': _googleMapsUrlController.text.trim(),
        if (_latitude != null) 'latitude': _latitude,
        if (_longitude != null) 'longitude': _longitude,
        'status': 'active',
        'milkQty': double.tryParse(_milkQtyController.text.trim()) ?? 1.0,
        'milkUnit': 'L',
        'curdQty': int.tryParse(_curdQtyController.text.trim()) ?? 0,
        'curdUnit': 'g',
        'frequency': _frequency,
        'deliveryBoyId': _selectedDeliveryBoyId,
        'paymentType': _paymentType,
        'paymentCycle': 'monthly',
        'notes': _notesController.text.trim(),
        'actor': 'Admin',
      };

      final res = await widget.api.post('/api/customers', payload);
      if (!mounted) return;
      setState(() => _isSubmitting = false);

      if (res['success'] == true) {
        widget.onCreated();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Customer "$name" created successfully!'),
            backgroundColor: const Color(0xFF059669),
            duration: const Duration(seconds: 3),
          ),
        );
      } else {
        setState(() => _errorMessage = res['message']?.toString() ?? 'Failed to add customer. Please try again.');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = 'Error: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 14,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.person_add_rounded, color: Color(0xFF059669), size: 20),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Add New Customer',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        'Create profile & set delivery quota',
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
              ),
            ],
          ),

          if (_errorMessage != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626), fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Scrollable Form Body
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionHeader('Personal Details'),
                  const SizedBox(height: 8),
                  _buildTextField(_nameController, 'Customer Name *', 'e.g. Ramesh Kulkarni', Icons.person_outline_rounded),
                  const SizedBox(height: 10),
                  _buildTextField(_mobileController, 'Mobile Number *', '10-digit mobile number', Icons.phone_outlined, keyboardType: TextInputType.phone),
                  const SizedBox(height: 10),
                  _buildTextField(_emailController, 'Customer Email (For Login)', 'e.g. customer@gmail.com', Icons.email_outlined, keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 10),
                  _buildTextField(_passwordController, 'Portal Password (Optional)', 'Leave blank for auto-generated', Icons.lock_outline_rounded),
                  const SizedBox(height: 10),
                  _buildTextField(_whatsappController, 'WhatsApp Number', 'Defaults to mobile', Icons.chat_bubble_outline_rounded, keyboardType: TextInputType.phone),
                  const SizedBox(height: 10),
                  _buildTextField(_areaController, 'Service Area / Location *', 'e.g. Madhapur, Hitec City', Icons.location_on_outlined),
                  const SizedBox(height: 10),
                  _buildTextField(_landmarkController, 'Landmark', 'e.g. Near Metro Station', Icons.flag_outlined),
                  const SizedBox(height: 10),
                  _buildTextField(_addressController, 'Delivery Address *', 'Flat / Wing, Society Name, Street', Icons.home_outlined, maxLines: 2),
                  const SizedBox(height: 10),
                  _buildTextField(
                    _googleMapsUrlController,
                    'Google Maps Location / Link (Optional)',
                    'Paste maps link (e.g. maps.app.goo.gl/... or 17.4483, 78.3915)',
                    Icons.map_outlined,
                    onChanged: _onMapsUrlChanged,
                  ),
                  if (_latitude != null && _longitude != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF86EFAC)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 14),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              '✓ Live GPS Detected: ${_latitude!.toStringAsFixed(4)}, ${_longitude!.toStringAsFixed(4)} (Real-Time)',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF065F46)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),
                  _buildSectionHeader('Morning Subscription Plan'),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(_milkQtyController, 'Milk Qty (L)', '1.0', Icons.water_drop_outlined, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildTextField(_curdQtyController, 'Curd Qty (g)', '0', Icons.egg_outlined, keyboardType: TextInputType.number),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Delivery Frequency dropdown
                  const Text('Delivery Frequency', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(10),
                      color: const Color(0xFFF8FAFC),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _frequency,
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(value: 'daily', child: Text('Daily (Every Day)', style: TextStyle(fontSize: 13))),
                          DropdownMenuItem(value: 'alternate', child: Text('Alternate Days', style: TextStyle(fontSize: 13))),
                          DropdownMenuItem(value: 'selected', child: Text('Selected Days', style: TextStyle(fontSize: 13))),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _frequency = v);
                        },
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Assigned Delivery Partner dropdown
                  const Text('Assigned Delivery Partner', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(10),
                      color: const Color(0xFFF8FAFC),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedDeliveryBoyId,
                        isExpanded: true,
                        hint: const Text('Unassigned Partner', style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8))),
                        items: [
                          const DropdownMenuItem<String>(
                            value: null,
                            child: Text('Unassigned Partner', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                          ),
                          ...widget.deliveryBoys.map((b) {
                            final id = b['id']?.toString() ?? b['_id']?.toString() ?? '';
                            final bName = b['name']?.toString() ?? 'Partner';
                            final bArea = b['assignedArea']?.toString() ?? '';
                            return DropdownMenuItem<String>(
                              value: id,
                              child: Text(
                                bArea.isNotEmpty ? '$bName ($bArea)' : bName,
                                style: const TextStyle(fontSize: 13),
                              ),
                            );
                          }),
                        ],
                        onChanged: (v) => setState(() => _selectedDeliveryBoyId = v),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),
                  _buildSectionHeader('Billing & Ledger Settings'),
                  const SizedBox(height: 8),

                  // Billing Type dropdown
                  const Text('Billing Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(10),
                      color: const Color(0xFFF8FAFC),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _paymentType,
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(value: 'credit', child: Text('Monthly Credit Account', style: TextStyle(fontSize: 13))),
                          DropdownMenuItem(value: 'prepaid', child: Text('Prepaid Advance', style: TextStyle(fontSize: 13))),
                          DropdownMenuItem(value: 'cod', child: Text('Daily Cash on Delivery', style: TextStyle(fontSize: 13))),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _paymentType = v);
                        },
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),
                  _buildTextField(_notesController, 'Delivery Instructions / Notes', 'e.g. Ring bell once / leave on shelf', Icons.note_alt_outlined),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),

          // Actions Row
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isSubmitting ? null : () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Save & Create Customer', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label,
    String hint,
    IconData icon, {
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
            prefixIcon: Icon(icon, size: 18, color: const Color(0xFF64748B)),
            isDense: true,
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5)),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT CUSTOMER BOTTOM SHEET (REDESIGNED TOUCH-OPTIMIZED EXECUTIVE SHEET)
// ─────────────────────────────────────────────────────────────────────────────
class _EditCustomerBottomSheet extends StatefulWidget {
  final ApiService api;
  final Map<String, dynamic> customer;
  final List<Map<String, dynamic>> deliveryBoys;
  final VoidCallback onUpdated;

  const _EditCustomerBottomSheet({
    required this.api,
    required this.customer,
    required this.deliveryBoys,
    required this.onUpdated,
  });

  @override
  State<_EditCustomerBottomSheet> createState() => _EditCustomerBottomSheetState();
}

class _EditCustomerBottomSheetState extends State<_EditCustomerBottomSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _mobileController;
  late final TextEditingController _emailController;
  late final TextEditingController _whatsappController;
  late final TextEditingController _addressController;
  late final TextEditingController _googleMapsUrlController;
  late final TextEditingController _landmarkController;
  late final TextEditingController _areaController;
  late final TextEditingController _milkQtyController;
  late final TextEditingController _curdQtyController;
  late final TextEditingController _notesController;

  double? _latitude;
  double? _longitude;

  String _status = 'active';
  String _frequency = 'daily';
  String? _selectedDeliveryBoyId;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final c = widget.customer;
    final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] : (c['subscription'] is Map ? c['subscription'] : {});

    _nameController = TextEditingController(text: (c['name'] ?? '').toString());
    _mobileController = TextEditingController(text: (c['mobile'] ?? '').toString());
    _emailController = TextEditingController(text: (c['email'] ?? '').toString());
    _whatsappController = TextEditingController(text: (c['whatsapp'] ?? c['mobile'] ?? '').toString());
    _addressController = TextEditingController(text: (c['address'] ?? '').toString());
    _googleMapsUrlController = TextEditingController(text: (c['googleMapsUrl'] ?? '').toString());
    _landmarkController = TextEditingController(text: (c['landmark'] ?? '').toString());
    _areaController = TextEditingController(text: (c['area'] ?? 'Madhapur').toString());

    final rawMilk = plan['milkQty'] ?? plan['milkQuantity'] ?? 1.0;
    _milkQtyController = TextEditingController(text: rawMilk.toString());

    final rawCurd = plan['curdQty'] ?? plan['curdQuantity'] ?? 0;
    _curdQtyController = TextEditingController(text: rawCurd.toString());

    _notesController = TextEditingController(text: (c['notes'] ?? '').toString());

    _latitude = double.tryParse((c['latitude'] ?? '').toString());
    _longitude = double.tryParse((c['longitude'] ?? '').toString());

    final rawStat = (c['status'] ?? 'active').toString().toLowerCase();
    _status = (rawStat == 'paused' || rawStat == 'inactive') ? rawStat : 'active';

    final rawFreq = (plan['frequency'] ?? 'daily').toString().toLowerCase();
    _frequency = (rawFreq == 'alternate' || rawFreq == 'weekdays') ? rawFreq : 'daily';

    _selectedDeliveryBoyId = c['deliveryBoyId']?.toString();
    if (_selectedDeliveryBoyId == null && widget.deliveryBoys.isNotEmpty) {
      final first = widget.deliveryBoys.first;
      _selectedDeliveryBoyId = first['id']?.toString() ?? first['_id']?.toString();
    }
  }

  void _onMapsUrlChanged(String val) {
    final str = val.trim();
    if (str.isEmpty) {
      setState(() {
        _latitude = null;
        _longitude = null;
      });
      return;
    }

    final rawRegex = RegExp(r'^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$');
    final rawMatch = rawRegex.firstMatch(str);
    if (rawMatch != null) {
      final lat = double.tryParse(rawMatch.group(1)!);
      final lng = double.tryParse(rawMatch.group(2)!);
      if (lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setState(() {
          _latitude = lat;
          _longitude = lng;
        });
        return;
      }
    }

    final atRegex = RegExp(r'@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)');
    final atMatch = atRegex.firstMatch(str);
    if (atMatch != null) {
      final lat = double.tryParse(atMatch.group(1)!);
      final lng = double.tryParse(atMatch.group(2)!);
      if (lat != null && lng != null) {
        setState(() {
          _latitude = lat;
          _longitude = lng;
        });
        return;
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _emailController.dispose();
    _whatsappController.dispose();
    _addressController.dispose();
    _googleMapsUrlController.dispose();
    _landmarkController.dispose();
    _areaController.dispose();
    _milkQtyController.dispose();
    _curdQtyController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    final mobile = _mobileController.text.trim();
    final address = _addressController.text.trim();

    setState(() => _errorMessage = null);

    if (name.length < 2) {
      setState(() => _errorMessage = 'Please enter customer name (at least 2 characters).');
      return;
    }
    if (!RegExp(r'^(?:\+?91[- ]?)?[6-9]\d{9}$').hasMatch(mobile)) {
      setState(() => _errorMessage = 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (address.length < 4) {
      setState(() => _errorMessage = 'Please enter a complete delivery address.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final custId = (widget.customer['id'] ?? widget.customer['_id'] ?? widget.customer['customerId'] ?? '').toString();

      final payload = {
        'name': name,
        'mobile': mobile,
        'email': _emailController.text.trim(),
        'whatsapp': _whatsappController.text.trim().isNotEmpty ? _whatsappController.text.trim() : mobile,
        'address': address,
        'area': _areaController.text.trim().isNotEmpty ? _areaController.text.trim() : 'Madhapur',
        'landmark': _landmarkController.text.trim(),
        'googleMapsUrl': _googleMapsUrlController.text.trim(),
        if (_latitude != null) 'latitude': _latitude,
        if (_longitude != null) 'longitude': _longitude,
        'status': _status,
        'milkQty': double.tryParse(_milkQtyController.text.trim()) ?? 1.0,
        'curdQty': int.tryParse(_curdQtyController.text.trim()) ?? 0,
        'frequency': _frequency,
        'deliveryBoyId': _selectedDeliveryBoyId,
        'notes': _notesController.text.trim(),
        'actor': 'Admin',
      };

      final res = await widget.api.put('/api/customers/$custId', payload);
      if (!mounted) return;
      setState(() => _isSubmitting = false);

      if (res['success'] == true) {
        widget.onUpdated();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Customer "$name" updated successfully!'),
            backgroundColor: const Color(0xFF059669),
            duration: const Duration(seconds: 3),
          ),
        );
      } else {
        setState(() => _errorMessage = res['message']?.toString() ?? 'Failed to update customer. Please try again.');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = 'Error: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final custId = (widget.customer['customerId'] ?? widget.customer['id'] ?? widget.customer['_id'] ?? '').toString();

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 18,
        right: 18,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: const Icon(Icons.edit_note_rounded, color: Color(0xFF2563EB), size: 22),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Edit Customer',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                            child: Text(custId, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF475569))),
                          ),
                        ],
                      ),
                      const Text(
                        'Update personal details, delivery quotas & route',
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),

          // Error banner
          if (_errorMessage != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, size: 16, color: Color(0xFFDC2626)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626), fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Form fields
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(top: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionHeader('PERSONAL & CONTACT DETAILS', Icons.person_rounded),
                  const SizedBox(height: 10),
                  _buildTextField(_nameController, 'Customer Name *', 'e.g. Ramesh Kumar', Icons.person_outline_rounded),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(_mobileController, 'Mobile *', '10-digit number', Icons.phone_outlined, keyboardType: TextInputType.phone),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildTextField(_whatsappController, 'WhatsApp', 'Optional number', Icons.chat_bubble_outline_rounded, keyboardType: TextInputType.phone),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(_emailController, 'Email (For Credentials)', 'customer@example.com', Icons.email_outlined, keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 16),

                  _buildSectionHeader('ACCOUNT STATUS', Icons.toggle_on_rounded),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildChoiceChip('Active', 'active', Icons.check_circle_rounded, const Color(0xFF059669), const Color(0xFFECFDF5)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildChoiceChip('Paused', 'paused', Icons.pause_circle_rounded, const Color(0xFFD97706), const Color(0xFFFFFBEB)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildChoiceChip('Inactive', 'inactive', Icons.cancel_rounded, const Color(0xFF64748B), const Color(0xFFF1F5F9)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  _buildSectionHeader('DELIVERY LOCATION', Icons.location_on_rounded),
                  const SizedBox(height: 10),
                  _buildTextField(_addressController, 'Delivery Address *', 'Flat / House No, Street, Building', Icons.home_outlined, maxLines: 2),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(_areaController, 'Route / Area', 'Madhapur', Icons.location_city_outlined),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildTextField(_landmarkController, 'Landmark', 'Near Metro / Bank', Icons.flag_outlined),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    _googleMapsUrlController,
                    'Google Maps Location / Pin Link',
                    'Paste URL or 17.4483, 78.3915',
                    Icons.pin_drop_outlined,
                    onChanged: _onMapsUrlChanged,
                  ),
                  if (_latitude != null && _longitude != null) ...[
                    const SizedBox(height: 4),
                    Padding(
                      padding: const EdgeInsets.only(left: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, size: 13, color: Color(0xFF059669)),
                          const SizedBox(width: 4),
                          Text(
                            'GPS Detected: ${_latitude!.toStringAsFixed(4)}, ${_longitude!.toStringAsFixed(4)}',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),

                  _buildSectionHeader('DAILY MILK SUBSCRIPTION PLAN', Icons.local_drink_rounded),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(_milkQtyController, 'Farm Milk (L)', '1.0', Icons.water_drop_outlined, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildTextField(_curdQtyController, 'Curd Packs (Pk)', '0', Icons.inventory_2_outlined, keyboardType: TextInputType.number),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text('Delivery Frequency', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _buildFrequencyChip('daily', 'Daily'),
                      const SizedBox(width: 6),
                      _buildFrequencyChip('alternate', 'Alternate'),
                      const SizedBox(width: 6),
                      _buildFrequencyChip('weekdays', 'Weekdays'),
                    ],
                  ),
                  const SizedBox(height: 14),

                  _buildSectionHeader('ASSIGNED DELIVERY PARTNER', Icons.two_wheeler_rounded),
                  const SizedBox(height: 8),
                  if (widget.deliveryBoys.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: const Text('No delivery partners available.', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                    )
                  else
                    DropdownButtonFormField<String>(
                      initialValue: widget.deliveryBoys.any((b) => (b['id']?.toString() ?? b['_id']?.toString()) == _selectedDeliveryBoyId)
                          ? _selectedDeliveryBoyId
                          : null,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.two_wheeler_rounded, size: 18, color: Color(0xFF64748B)),
                        isDense: true,
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      ),
                      hint: const Text('Unassigned Partner', style: TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8))),
                      items: [
                        const DropdownMenuItem<String>(
                          value: null,
                          child: Text('Unassigned Partner', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        ),
                        ...widget.deliveryBoys.map((b) {
                          final id = (b['id'] ?? b['_id'] ?? '').toString();
                          final name = (b['name'] ?? 'Partner').toString();
                          final area = (b['assignedArea'] ?? 'Route').toString();
                          return DropdownMenuItem<String>(
                            value: id,
                            child: Text('$name ($area)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          );
                        }),
                      ],
                      onChanged: (v) => setState(() => _selectedDeliveryBoyId = v),
                    ),
                  const SizedBox(height: 14),

                  _buildTextField(_notesController, 'Delivery Instructions / Notes', 'e.g. Ring bell once / leave on door shelf', Icons.notes_rounded),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),

          // Sticky bottom action buttons
          Container(
            padding: const EdgeInsets.only(top: 10),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    child: _isSubmitting
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Save & Update Customer', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: const Color(0xFF059669)),
        const SizedBox(width: 5),
        Text(
          title,
          style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), letterSpacing: 0.5),
        ),
      ],
    );
  }

  Widget _buildChoiceChip(String label, String value, IconData icon, Color color, Color bgColor) {
    final isSelected = _status == value;
    return InkWell(
      onTap: () => setState(() => _status = value),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? bgColor : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? color : const Color(0xFFE2E8F0)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 13, color: isSelected ? color : const Color(0xFF94A3B8)),
            const SizedBox(width: 4),
            Text(label, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: isSelected ? color : const Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }

  Widget _buildFrequencyChip(String value, String label) {
    final isSelected = _frequency == value;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _frequency = value),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFECFDF5) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? const Color(0xFF059669) : const Color(0xFFE2E8F0)),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: isSelected ? const Color(0xFF059669) : const Color(0xFF64748B)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label,
    String hint,
    IconData icon, {
    TextInputType? keyboardType,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          onChanged: onChanged,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
            prefixIcon: Icon(icon, size: 17, color: const Color(0xFF64748B)),
            isDense: true,
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5)),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT DETAILS & SOCIAL MEDIA SETTINGS FULL SCREEN PAGE
// ─────────────────────────────────────────────────────────────────────────────
class _ContactSettingsFullScreenPage extends StatefulWidget {
  final ApiService api;
  final VoidCallback onSaved;

  const _ContactSettingsFullScreenPage({
    required this.api,
    required this.onSaved,
  });

  @override
  State<_ContactSettingsFullScreenPage> createState() => _ContactSettingsFullScreenPageState();
}

class _ContactSettingsFullScreenPageState extends State<_ContactSettingsFullScreenPage> {
  final _phoneController = TextEditingController();
  final _whatsappController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _hoursController = TextEditingController();
  final _fbController = TextEditingController();
  final _twController = TextEditingController();
  final _liController = TextEditingController();
  final _igController = TextEditingController();
  final _ytController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;
  bool _isEditing = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _whatsappController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _hoursController.dispose();
    _fbController.dispose();
    _twController.dispose();
    _liController.dispose();
    _igController.dispose();
    _ytController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final data = await widget.api.getContactInfo();
      if (data != null && mounted) {
        _phoneController.text = data['phone']?.toString() ?? '+91 98765 43210';
        _whatsappController.text = data['whatsapp']?.toString() ?? '+91 98765 43210';
        _emailController.text = data['email']?.toString() ?? 'care@naturalmilkdairy.com';
        _addressController.text = data['address']?.toString() ?? 'Natural Milk Dairy, Unit 12/B, Knowledge Park Rd, Near WEH, Andheri West, Mumbai, Maharashtra 400053';
        _hoursController.text = data['workingHours']?.toString() ?? '5:00 AM – 9:00 PM Daily (365 Days)';

        final socials = data['socialLinks'] as Map<String, dynamic>? ?? {};
        _fbController.text = socials['facebook']?.toString() ?? 'https://facebook.com';
        _twController.text = socials['twitter']?.toString() ?? 'https://twitter.com';
        _liController.text = socials['linkedin']?.toString() ?? 'https://linkedin.com';
        _igController.text = socials['instagram']?.toString() ?? 'https://instagram.com';
        _ytController.text = socials['youtube']?.toString() ?? 'https://youtube.com';
      }
    } catch (e) {
      debugPrint('Error loading contact info: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveData() async {
    setState(() => _isSaving = true);
    try {
      final payload = {
        'phone': _phoneController.text.trim(),
        'whatsapp': _whatsappController.text.trim(),
        'email': _emailController.text.trim(),
        'address': _addressController.text.trim(),
        'workingHours': _hoursController.text.trim(),
        'socialLinks': {
          'facebook': _fbController.text.trim(),
          'twitter': _twController.text.trim(),
          'linkedin': _liController.text.trim(),
          'instagram': _igController.text.trim(),
          'youtube': _ytController.text.trim(),
        },
      };

      final res = await widget.api.updateContactInfo(payload);
      if (mounted) {
        setState(() => _isSaving = false);
        if (res['success'] == true) {
          widget.onSaved();
          setState(() => _isEditing = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Contact details & social media links updated successfully!'),
              backgroundColor: Color(0xFF059669),
              duration: Duration(seconds: 3),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res['message']?.toString() ?? 'Failed to update contact info'),
              backgroundColor: const Color(0xFFDC2626),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving contact info: $e'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    }
  }

  Future<void> _resetData() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reset Defaults?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: const Text('Reset contact details and social links back to standard company defaults?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            child: const Text('Reset', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final res = await widget.api.resetContactInfo();
      if (res['success'] == true) {
        await _loadData();
        widget.onSaved();
        setState(() => _isEditing = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Contact details reset to standard defaults.'),
              backgroundColor: Color(0xFF059669),
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Reset error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _isEditing ? 'Edit Contact & Social Media' : 'Contact Details & Social Media',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
            ),
            Text(
              _isEditing ? 'Make updates then tap Save Changes' : 'Live business helplines, WhatsApp & official channels',
              style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
            ),
          ],
        ),
        actions: [
          if (!_isEditing)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: TextButton.icon(
                onPressed: () => setState(() => _isEditing = true),
                icon: const Icon(Icons.edit_rounded, size: 15, color: Color(0xFF059669)),
                label: const Text('Edit', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w800, fontSize: 13)),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
              onPressed: () {
                _loadData();
                setState(() => _isEditing = false);
              },
            ),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: Color(0xFFE2E8F0)),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF059669)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: _isEditing ? _buildEditForm() : _buildViewDetails(),
            ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 12,
          bottom: 12 + MediaQuery.of(context).viewInsets.bottom,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        ),
        child: SafeArea(
          child: _isEditing
              ? Row(
                  children: [
                    OutlinedButton(
                      onPressed: (_isLoading || _isSaving)
                          ? null
                          : () {
                              _loadData();
                              setState(() => _isEditing = false);
                            },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF64748B),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: (_isLoading || _isSaving) ? null : _resetData,
                      icon: const Icon(Icons.refresh_rounded, size: 15),
                      label: const Text('Reset', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFB45309),
                        side: const BorderSide(color: Color(0xFFFDE68A)),
                        backgroundColor: const Color(0xFFFFFBEB),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: (_isLoading || _isSaving) ? null : _saveData,
                        icon: _isSaving
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.check_circle_outline_rounded, size: 18, color: Colors.white),
                        label: Text(
                          _isSaving ? 'Saving...' : 'Save Changes',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Colors.white),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ],
                )
              : SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => setState(() => _isEditing = true),
                    icon: const Icon(Icons.edit_rounded, size: 18, color: Colors.white),
                    label: const Text(
                      'Edit Contact Details & Links',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ),
        ),
      ),
    );
  }

  // 1. VIEW DETAILS READ-ONLY MODE
  Widget _buildViewDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Helpline & Support Section
        _buildSectionHeader('Support & Helplines', Icons.phone_rounded, const Color(0xFF059669)),
        const SizedBox(height: 10),
        _buildDetailCard(
          icon: Icons.phone_rounded,
          iconBg: const Color(0xFFECFDF5),
          iconColor: const Color(0xFF059669),
          title: 'Phone Helpline',
          value: _phoneController.text.isNotEmpty ? _phoneController.text : '+91 98765 43210',
          subtitle: 'Direct customer incoming support calls',
        ),
        const SizedBox(height: 10),
        _buildDetailCard(
          icon: Icons.chat_bubble_rounded,
          iconBg: const Color(0xFFF0FDF4),
          iconColor: const Color(0xFF15803D),
          title: 'WhatsApp Operations Desk',
          value: _whatsappController.text.isNotEmpty ? _whatsappController.text : '+91 98765 43210',
          subtitle: 'Real-time customer WhatsApp communication',
        ),
        const SizedBox(height: 10),
        _buildDetailCard(
          icon: Icons.mail_rounded,
          iconBg: const Color(0xFFEFF6FF),
          iconColor: const Color(0xFF2563EB),
          title: 'Official Support Email',
          value: _emailController.text.isNotEmpty ? _emailController.text : 'care@naturalmilkdairy.com',
          subtitle: 'Billing questions, inquiries & corporate contracts',
        ),
        const SizedBox(height: 10),
        _buildDetailCard(
          icon: Icons.access_time_rounded,
          iconBg: const Color(0xFFFEF3C7),
          iconColor: const Color(0xFFD97706),
          title: 'Helpline Active Hours',
          value: _hoursController.text.isNotEmpty ? _hoursController.text : '5:00 AM – 9:00 PM Daily (365 Days)',
          subtitle: 'Morning delivery fulfillment active before 6:30 AM',
        ),
        const SizedBox(height: 22),

        // Physical Office & Dispatch Address
        _buildSectionHeader('Office & Farm Dispatch Address', Icons.location_on_rounded, const Color(0xFFD97706)),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.pin_drop_rounded, size: 16, color: Color(0xFFD97706)),
                  const SizedBox(width: 6),
                  const Text('Registered Physical Address', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _addressController.text.isNotEmpty ? _addressController.text : 'Natural Milk Dairy, Unit 12/B, Knowledge Park Rd, Near WEH, Andheri West, Mumbai, Maharashtra 400053',
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A), height: 1.45),
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),

        // Official Social Media Channels
        _buildSectionHeader('Social Media Links', Icons.public_rounded, const Color(0xFF2563EB)),
        const SizedBox(height: 10),
        _buildSocialViewItem('Facebook', _fbController.text, Icons.facebook, const Color(0xFF1877F2)),
        const SizedBox(height: 8),
        _buildSocialViewItem('X (formerly Twitter)', _twController.text, Icons.tag_rounded, const Color(0xFF0F172A)),
        const SizedBox(height: 8),
        _buildSocialViewItem('LinkedIn', _liController.text, Icons.business_rounded, const Color(0xFF0A66C2)),
        const SizedBox(height: 8),
        _buildSocialViewItem('Instagram', _igController.text, Icons.camera_alt_rounded, const Color(0xFFE1306C)),
        const SizedBox(height: 8),
        _buildSocialViewItem('YouTube', _ytController.text, Icons.play_circle_fill_rounded, const Color(0xFFEF4444)),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildDetailCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String value,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                Text(subtitle, style: const TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSocialViewItem(String network, String url, IconData icon, Color color) {
    final cleanUrl = url.trim();
    final hasUrl = cleanUrl.isNotEmpty;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(network, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color)),
                Text(
                  hasUrl ? cleanUrl : 'Not configured',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (hasUrl)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(6)),
              child: const Text('Linked', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
            ),
        ],
      ),
    );
  }

  // 2. EDIT FORM MODE
  Widget _buildEditForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('Support & Helplines', Icons.phone_rounded, const Color(0xFF059669)),
        const SizedBox(height: 12),
        _buildTextField('Phone / Helpline Number', _phoneController, Icons.phone_outlined),
        const SizedBox(height: 12),
        _buildTextField('WhatsApp Helpline', _whatsappController, Icons.chat_bubble_outline_rounded),
        const SizedBox(height: 12),
        _buildTextField('Support Email', _emailController, Icons.mail_outline_rounded),
        const SizedBox(height: 12),
        _buildTextField('Working Hours', _hoursController, Icons.access_time_rounded),
        const SizedBox(height: 22),

        _buildSectionHeader('Office & Farm Address', Icons.location_on_rounded, const Color(0xFFD97706)),
        const SizedBox(height: 12),
        _buildTextField('Complete Address', _addressController, Icons.map_outlined, maxLines: 3),
        const SizedBox(height: 22),

        _buildSectionHeader('Social Media Links', Icons.public_rounded, const Color(0xFF2563EB)),
        const SizedBox(height: 12),
        _buildTextField('Facebook URL', _fbController, Icons.link_rounded),
        const SizedBox(height: 12),
        _buildTextField('Twitter / X URL', _twController, Icons.link_rounded),
        const SizedBox(height: 12),
        _buildTextField('LinkedIn URL', _liController, Icons.link_rounded),
        const SizedBox(height: 12),
        _buildTextField('Instagram URL', _igController, Icons.link_rounded),
        const SizedBox(height: 12),
        _buildTextField('YouTube URL', _ytController, Icons.link_rounded),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A)),
        ),
      ],
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, IconData icon, {int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF475569)),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: const Color(0xFF94A3B8), size: 18),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5)),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREDIT ADDED SCREEN
// ─────────────────────────────────────────────────────────────────────────────
class _CreditAddedScreen extends StatefulWidget {
  final Map<String, dynamic> summary;
  final List<Map<String, dynamic>> deliveries;
  final List<Map<String, dynamic>> customers;
  final Function(String customerName) onSelectCustomer;

  const _CreditAddedScreen({
    required this.summary,
    required this.deliveries,
    required this.customers,
    required this.onSelectCustomer,
  });

  @override
  State<_CreditAddedScreen> createState() => _CreditAddedScreenState();
}

class _CreditAddedScreenState extends State<_CreditAddedScreen> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final creditAdded = widget.summary['creditAdded'] ?? 0;
    final creditDrops = widget.deliveries
        .where((d) => d['paymentMethod'] == 'credit' || d['status'] == 'delivered')
        .toList();

    final filtered = _searchQuery.isEmpty
        ? creditDrops
        : creditDrops.where((d) {
            final name = (d['customerName'] ?? '').toString().toLowerCase();
            final partner = (d['deliveryBoyName'] ?? '').toString().toLowerCase();
            final address = (d['doorstepId'] ?? d['address'] ?? '').toString().toLowerCase();
            final q = _searchQuery.toLowerCase();
            return name.contains(q) || partner.contains(q) || address.contains(q);
          }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Credit Added & Ledgers',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Text(
              'Billed to Customer Accounts',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF7E22CE)),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFAF5FF), Colors.white],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE9D5FF)),
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
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3E8FF),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.credit_card_rounded, size: 12, color: Color(0xFF7E22CE)),
                            SizedBox(width: 4),
                            Text(
                              'CUSTOMER LEDGER BILLING',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF7E22CE),
                                letterSpacing: 0.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '${filtered.length} Drops',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF7E22CE)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '₹$creditAdded',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF7E22CE),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Total amount charged directly to customer credit ledgers for daily doorstep subscriptions.',
                    style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.35),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              onChanged: (v) => setState(() => _searchQuery = v.trim()),
              decoration: InputDecoration(
                hintText: 'Search customer, route or doorstep...',
                hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF64748B)),
                isDense: true,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF7E22CE), width: 1.5)),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Ledger Billed Deliveries',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),
            if (filtered.isEmpty)
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Center(
                  child: Column(
                    children: [
                      Icon(Icons.receipt_long_rounded, size: 36, color: Color(0xFF94A3B8)),
                      SizedBox(height: 8),
                      Text(
                        'No credit billed drops found',
                        style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Deliveries marked as credit will appear here with customer ledgers.',
                        style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filtered.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (ctx, i) {
                  final d = filtered[i];
                  final custName = d['customerName'] ?? 'Customer';
                  final partnerName = d['deliveryBoyName'] ?? 'naveen';
                  final amount = d['totalAmount'] ?? 0;
                  final address = d['doorstepId'] ?? d['address'] ?? '';
                  final milk = d['actualMilk'] ?? d['plannedMilk'] ?? 1;

                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(custName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A))),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF3E8FF),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text('CREDIT BILLED', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF7E22CE))),
                            ),
                          ],
                        ),
                        if (address.toString().isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(address.toString(), style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                        ],
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('${milk}L Pure Farm Milk', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                            Text('₹$amount', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF7E22CE))),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Partner: $partnerName', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                            InkWell(
                              onTap: () => widget.onSelectCustomer(custName.toString()),
                              child: const Text('View Customer →', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF7E22CE))),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COLLECTIONS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
class _CollectionsScreen extends StatefulWidget {
  final Map<String, dynamic> summary;
  final List<Map<String, dynamic>> deliveries;
  final List<Map<String, dynamic>> deliveryBoys;
  final VoidCallback onSelectDeliveries;

  const _CollectionsScreen({
    required this.summary,
    required this.deliveries,
    required this.deliveryBoys,
    required this.onSelectDeliveries,
  });

  @override
  State<_CollectionsScreen> createState() => _CollectionsScreenState();
}

class _CollectionsScreenState extends State<_CollectionsScreen> {
  double _deliveryCashFor(Map<String, dynamic> d) {
    if (d['status'] != 'delivered') return 0.0;
    final m = (d['paymentMethod'] ?? '').toString().toLowerCase();
    final am = (d['addonPaymentMethod'] ?? '').toString().toLowerCase();
    if (m == 'cash') return (num.tryParse((d['paymentAmount'] ?? d['totalAmount'] ?? '0').toString()) ?? 0).toDouble();
    if (am == 'cash') return (num.tryParse((d['addonPaidAmount'] ?? d['paymentAmount'] ?? '0').toString()) ?? 0).toDouble();
    return 0.0;
  }

  double _deliveryUpiFor(Map<String, dynamic> d) {
    if (d['status'] != 'delivered') return 0.0;
    final m = (d['paymentMethod'] ?? '').toString().toLowerCase();
    final am = (d['addonPaymentMethod'] ?? '').toString().toLowerCase();
    if (m == 'upi') return (num.tryParse((d['paymentAmount'] ?? d['totalAmount'] ?? '0').toString()) ?? 0).toDouble();
    if (am == 'upi') return (num.tryParse((d['addonPaidAmount'] ?? d['paymentAmount'] ?? '0').toString()) ?? 0).toDouble();
    return 0.0;
  }

  @override
  Widget build(BuildContext context) {
    final summaryPay = (num.tryParse((widget.summary['paymentsCollected'] ?? '0').toString()) ?? 0).toDouble();
    final delCash = widget.deliveries.fold<double>(0.0, (s, d) => s + _deliveryCashFor(d));
    final delUpi = widget.deliveries.fold<double>(0.0, (s, d) => s + _deliveryUpiFor(d));
    final boysCash = widget.deliveryBoys.fold<double>(0.0, (s, b) => s + (num.tryParse((b['todayCashCollected'] ?? '0').toString()) ?? 0).toDouble());
    final boysUpi = widget.deliveryBoys.fold<double>(0.0, (s, b) => s + (num.tryParse((b['todayUpiCollected'] ?? '0').toString()) ?? 0).toDouble());
    final sumCash = (num.tryParse((widget.summary['todayCashCollected'] ?? '0').toString()) ?? 0).toDouble();
    final sumUpi = (num.tryParse((widget.summary['todayUpiCollected'] ?? '0').toString()) ?? 0).toDouble();

    final totalCash = [sumCash, delCash, boysCash].reduce((a, b) => a > b ? a : b);
    final totalUpi = [sumUpi, delUpi, boysUpi].reduce((a, b) => a > b ? a : b);
    final addonsCash = widget.deliveries.fold<double>(0.0, (s, d) =>
        s + ((d['status'] == 'delivered' && (d['addonPaymentMethod'] ?? '').toString().toLowerCase() == 'cash')
            ? (num.tryParse((d['addonPaidAmount'] ?? '0').toString()) ?? 0).toDouble()
            : 0.0));
    final addonsUpi = widget.deliveries.fold<double>(0.0, (s, d) =>
        s + ((d['status'] == 'delivered' && (d['addonPaymentMethod'] ?? '').toString().toLowerCase() == 'upi')
            ? (num.tryParse((d['addonPaidAmount'] ?? '0').toString()) ?? 0).toDouble()
            : 0.0));
    final collections = summaryPay > (totalCash + totalUpi) ? summaryPay : (totalCash + totalUpi);
    final todayLitres = widget.summary['todayMilkLitres'] ?? '0.0';

    final paidDrops = widget.deliveries.where((d) =>
        d['status'] == 'delivered' && (_deliveryCashFor(d) > 0 || _deliveryUpiFor(d) > 0 || (num.tryParse((d['addonsTotal'] ?? '0').toString()) ?? 0) > 0)).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Today's Collections",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Text(
              'Cash & UPI Handover',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0F766E)),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFF0FDFA), Colors.white],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF99F6E4)),
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
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFCCFBF1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.account_balance_wallet_rounded, size: 12, color: Color(0xFF0F766E)),
                            SizedBox(width: 4),
                            Text(
                              'CASH & UPI RECEIVED',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F766E),
                                letterSpacing: 0.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Text(
                        'Morning Routes',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0F766E)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '₹${collections.toInt()}',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F766E),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('CASH COLLECTED', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF065F46))),
                              Text('₹${totalCash.toInt()}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                              if (addonsCash > 0)
                                Text('+₹${addonsCash.toInt()} Add-ons', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF92400E))),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('UPI COLLECTED', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF1E40AF))),
                              Text('₹${totalUpi.toInt()}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF2563EB))),
                              if (addonsUpi > 0)
                                Text('+₹${addonsUpi.toInt()} Add-ons', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8))),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Total collections received from doorstep & subscription customers for ${todayLitres}L milk fulfilled today.',
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.35),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Partner Route Performance',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),
            if (widget.deliveryBoys.isEmpty)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Center(
                  child: Text('No delivery partners found', style: TextStyle(color: Color(0xFF64748B))),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: widget.deliveryBoys.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (ctx, i) {
                  final b = widget.deliveryBoys[i];
                  final name = b['name'] ?? 'Partner';
                  final area = b['assignedArea'] ?? 'Madhapur';
                  final partnerId = b['id'] ?? b['_id'];
                  final partnerDrops = widget.deliveries.where((d) =>
                    d['deliveryBoyId'] == partnerId ||
                    (d['deliveryBoyName'] ?? '').toString().toLowerCase() == name.toString().toLowerCase()
                  ).toList();
                  final completed = partnerDrops.where((d) => d['status'] == 'delivered').length;
                  final dropCash = partnerDrops.fold<double>(0.0, (s, d) => s + _deliveryCashFor(d));
                  final dropUpi = partnerDrops.fold<double>(0.0, (s, d) => s + _deliveryUpiFor(d));
                  final pCash = (num.tryParse((b['todayCashCollected'] ?? '0').toString()) ?? 0).toDouble();
                  final pUpi = (num.tryParse((b['todayUpiCollected'] ?? '0').toString()) ?? 0).toDouble();
                  final effCash = pCash > dropCash ? pCash : dropCash;
                  final effUpi = pUpi > dropUpi ? pUpi : dropUpi;
                  final collectedSum = effCash + effUpi;

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
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFFCCFBF1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Center(
                            child: Icon(Icons.sports_motorsports_rounded, color: Color(0xFF0F766E), size: 22),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name.toString(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A))),
                              Text('Route: $area • $completed/${partnerDrops.length} Drops', style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                              const SizedBox(height: 2),
                              Text('Cash: ₹${effCash.toInt()} • UPI: ₹${effUpi.toInt()}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('₹${collectedSum.toInt()}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F766E))),
                            const Text('Collected', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Delivered Drops & Add-ons Paid',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
                ),
                InkWell(
                  onTap: widget.onSelectDeliveries,
                  child: const Text('View All Drops →', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                ),
              ],
            ),
            if (paidDrops.isNotEmpty) ...[
              const SizedBox(height: 10),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: paidDrops.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (ctx, i) {
                  final d = paidDrops[i];
                  final cashAmt = _deliveryCashFor(d);
                  final upiAmt = _deliveryUpiFor(d);
                  final paidAmt = cashAmt + upiAmt;
                  final addonsList = d['addons'] is List ? (d['addons'] as List) : const [];
                  final addonsTotal = (num.tryParse((d['addonsTotal'] ?? '0').toString()) ?? 0).toDouble();
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${d['customerName'] ?? 'Customer'} • ${d['deliveryBoyName'] ?? 'Partner'}',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF0F172A)),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              paidAmt > 0 ? '₹${paidAmt.toInt()} (${cashAmt > 0 ? 'CASH' : 'UPI'})' : 'Credit Add-on',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 12.5,
                                color: cashAmt > 0 ? const Color(0xFF059669) : (upiAmt > 0 ? const Color(0xFF2563EB) : const Color(0xFF92400E)),
                              ),
                            ),
                          ],
                        ),
                        if (addonsList.isNotEmpty || addonsTotal > 0) ...[
                          const SizedBox(height: 4),
                          Text(
                            '+ Add-ons: ${addonsList.map((a) => a is Map ? '${a["name"] ?? "Item"} ×${a["quantity"] ?? 1}' : a.toString()).join(', ')} (₹${addonsTotal.toInt()})',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF92400E)),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. OUTSTANDING SCREEN
// ─────────────────────────────────────────────────────────────────────────────
class _OutstandingScreen extends StatefulWidget {
  final Map<String, dynamic> summary;
  final List<Map<String, dynamic>> customers;
  final ApiService api;
  final VoidCallback onReload;
  final Function(String customerName) onSelectCustomer;

  const _OutstandingScreen({
    required this.summary,
    required this.customers,
    required this.api,
    required this.onReload,
    required this.onSelectCustomer,
  });

  @override
  State<_OutstandingScreen> createState() => _OutstandingScreenState();
}

class _OutstandingScreenState extends State<_OutstandingScreen> {
  String _searchQuery = '';

  void _showRecordPaymentModal(BuildContext context, Map<String, dynamic> customer) {
    final name = customer['name'] ?? 'Customer';
    final custId = customer['id'] ?? customer['_id'] ?? customer['customerId'];
    final currentBal = num.tryParse(customer['currentBalance']?.toString() ?? '0') ?? 0;
    final amountController = TextEditingController(text: currentBal > 0 ? '$currentBal' : '100');
    String paymentMethod = 'cash';
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bCtx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Record Payment: $name', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                const SizedBox(height: 4),
                Text('Pending Balance Due: ₹$currentBal', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFDC2626))),
                const SizedBox(height: 16),
                const Text('Payment Amount (₹)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.currency_rupee_rounded, size: 18),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 14),
                const Text('Payment Method', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                Row(
                  children: [
                    ChoiceChip(
                      label: const Text('Cash'),
                      selected: paymentMethod == 'cash',
                      onSelected: (val) => setModalState(() => paymentMethod = 'cash'),
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: const Text('UPI / Online'),
                      selected: paymentMethod == 'upi',
                      onSelected: (val) => setModalState(() => paymentMethod = 'upi'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            final amt = num.tryParse(amountController.text.trim());
                            if (amt == null || amt <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid amount')));
                              return;
                            }
                            setModalState(() => isSubmitting = true);
                            try {
                              final res = await widget.api.post('/api/payments', {
                                'customerId': custId.toString(),
                                'amount': amt,
                                'paymentMethod': paymentMethod,
                                'notes': 'Collected via Admin Console Mobile App',
                              });
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (res['success'] == true) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Payment of ₹$amt recorded successfully!'), backgroundColor: const Color(0xFF059669)),
                                  );
                                }
                                widget.onReload();
                              } else {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(res['message']?.toString() ?? 'Error recording payment'), backgroundColor: const Color(0xFFDC2626)),
                                  );
                                }
                              }
                            } catch (e) {
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Confirm Payment', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalOutstanding = widget.summary['totalOutstanding'] ?? 0;
    final dueCustomers = widget.customers.where((c) {
      final bal = num.tryParse(c['currentBalance']?.toString() ?? '0') ?? 0;
      return bal > 0;
    }).toList();

    dueCustomers.sort((a, b) {
      final balA = num.tryParse(a['currentBalance']?.toString() ?? '0') ?? 0;
      final balB = num.tryParse(b['currentBalance']?.toString() ?? '0') ?? 0;
      return balB.compareTo(balA);
    });

    final filtered = _searchQuery.isEmpty
        ? dueCustomers
        : dueCustomers.where((c) {
            final name = (c['name'] ?? '').toString().toLowerCase();
            final phone = (c['mobile'] ?? '').toString().toLowerCase();
            final area = (c['area'] ?? c['address'] ?? '').toString().toLowerCase();
            final q = _searchQuery.toLowerCase();
            return name.contains(q) || phone.contains(q) || area.contains(q);
          }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Outstanding Credit Due',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Text(
              'Customer Credit Ledgers',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFDC2626)),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFEF2F2), Colors.white],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFCA5A5)),
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
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.warning_amber_rounded, size: 12, color: Color(0xFFDC2626)),
                            SizedBox(width: 4),
                            Text(
                              'PENDING CREDIT DUE',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFFDC2626),
                                letterSpacing: 0.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '${dueCustomers.length} Customers Due',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFFDC2626)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '₹$totalOutstanding',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFFDC2626),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Cumulative unpaid balances across customer milk subscriptions requiring collection.',
                    style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.35),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              onChanged: (v) => setState(() => _searchQuery = v.trim()),
              decoration: InputDecoration(
                hintText: 'Search customer name, phone, or route...',
                hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF64748B)),
                isDense: true,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDC2626), width: 1.5)),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Customers with Pending Balances',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),
            if (filtered.isEmpty)
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Center(
                  child: Column(
                    children: [
                      Icon(Icons.check_circle_outline_rounded, size: 36, color: Color(0xFF10B981)),
                      SizedBox(height: 8),
                      Text(
                        'No pending dues found!',
                        style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'All customer balances are fully settled.',
                        style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filtered.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (ctx, i) {
                  final c = filtered[i];
                  final name = c['name'] ?? 'Customer';
                  final mobile = (c['mobile'] ?? '').toString();
                  final area = (c['area'] ?? c['address'] ?? '').toString();
                  final bal = num.tryParse(c['currentBalance']?.toString() ?? '0') ?? 0;
                  final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] : {};
                  final milkQty = plan['milkQty'] ?? 1;

                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(name.toString(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A))),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFFCA5A5)),
                              ),
                              child: Text(
                                '₹$bal DUE',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFFDC2626)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text('$mobile • ${milkQty}L Daily${area.isNotEmpty ? ' • $area' : ''}', style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            if (mobile.isNotEmpty) ...[
                              InkWell(
                                onTap: () => LauncherService.openDialer(mobile),
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFBFDBFE)),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.phone_rounded, size: 13, color: Color(0xFF2563EB)),
                                      SizedBox(width: 4),
                                      Text('Call', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            InkWell(
                              onTap: () => _showRecordPaymentModal(context, c),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFA7F3D0)),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.payment_rounded, size: 13, color: Color(0xFF059669)),
                                    SizedBox(width: 4),
                                    Text('Record Payment', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                                  ],
                                ),
                              ),
                            ),
                            const Spacer(),
                            InkWell(
                              onTap: () => widget.onSelectCustomer(name.toString()),
                              child: const Text('Ledger →', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFDC2626))),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// FULL SCREEN 1: ADMIN DELIVERY DROP DETAILS
// ─────────────────────────────────────────────────────────────────────────────
class AdminDeliveryDetailFullScreen extends StatelessWidget {
  final Map<String, dynamic> delivery;
  final List<Map<String, dynamic>> customers;
  final List<Map<String, dynamic>> deliveryBoys;
  final Function(String customerName)? onSelectCustomer;
  final Function(String proofUrl, String date, String driver, String custName, String addr, num? lat, num? lng)? onShowProof;

  const AdminDeliveryDetailFullScreen({
    super.key,
    required this.delivery,
    required this.customers,
    required this.deliveryBoys,
    this.onSelectCustomer,
    this.onShowProof,
  });

  Map<String, dynamic>? _findCustomer() {
    final custId = delivery['customerId'] ?? delivery['id'];
    final custName = (delivery['customerName'] ?? '').toString().toLowerCase().trim();
    for (final c in customers) {
      final cId = c['id'] ?? c['_id'] ?? c['customerId'];
      if (custId != null && cId != null && cId.toString() == custId.toString()) {
        return c;
      }
      if (custName.isNotEmpty && (c['name'] ?? '').toString().toLowerCase().trim() == custName) {
        return c;
      }
    }
    return null;
  }

  Map<String, dynamic>? _findDeliveryBoy() {
    final boyId = delivery['deliveryBoyId'];
    final boyName = (delivery['deliveryBoyName'] ?? '').toString().toLowerCase().trim();
    for (final b in deliveryBoys) {
      final bId = b['id'] ?? b['_id'] ?? b['boyId'];
      if (boyId != null && bId != null && bId.toString() == boyId.toString()) {
        return b;
      }
      if (boyName.isNotEmpty && (b['name'] ?? '').toString().toLowerCase().trim() == boyName) {
        return b;
      }
    }
    return null;
  }

  Widget _buildRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          Flexible(
            child: Text(
              value,
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: valueColor ?? const Color(0xFF0F172A)),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final custName = delivery['customerName']?.toString() ?? 'Customer';
    final custAddress = delivery['customerAddress']?.toString() ?? delivery['address']?.toString() ?? 'Doorstep Drop';
    final dLat = num.tryParse((delivery['customerLatitude'] ?? delivery['latitude'])?.toString() ?? '');
    final dLng = num.tryParse((delivery['customerLongitude'] ?? delivery['longitude'])?.toString() ?? '');
    final isDelivered = delivery['status'] == 'delivered';
    final isPending = delivery['status'] == 'pending';
    final proofUrl = delivery['proofImage']?.toString();
    final driverName = delivery['deliveryBoyName']?.toString() ?? 'Unassigned';
    final actualMilk = delivery['actualMilk'] ?? delivery['plannedMilk'] ?? 1;
    final actualCurd = num.tryParse((delivery['actualCurd'] ?? delivery['plannedCurd'] ?? 0).toString()) ?? 0;
    final totalAmount = delivery['totalAmount'] ?? 0;
    final paymentMethod = (delivery['paymentMethod'] ?? 'credit').toString().toUpperCase();
    final deliveryDate = delivery['deliveryDate']?.toString() ?? 'Today';

    final c = _findCustomer() ?? {};
    final phone = (c['mobile'] ?? delivery['customerPhone'] ?? delivery['phone'] ?? '').toString();
    final bal = num.tryParse((c['currentBalance'] ?? '0').toString()) ?? 0;
    final status = (c['status'] ?? 'active').toString().toUpperCase();
    final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] as Map : {};
    final milkQty = plan['milkQty'] ?? actualMilk;
    final deliveryDays = plan['deliveryDays'] ?? 'Everyday';
    final area = c['area'] ?? delivery['area'] ?? '';

    final b = _findDeliveryBoy();
    final driverPhone = b?['mobile']?.toString() ?? '';

    final addonsList = delivery['addons'] is List ? (delivery['addons'] as List) : const [];
    final addonsTotal = num.tryParse((delivery['addonsTotal'] ?? '0').toString()) ?? 0;
    final addonPaid = num.tryParse((delivery['addonPaidAmount'] ?? '0').toString()) ?? 0;
    final addonMethod = (delivery['addonPaymentMethod'] ?? 'credit').toString().toUpperCase();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Delivery Drop Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            Text('Admin Full Operations View', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDelivered ? const Color(0xFFECFDF5) : (isPending ? const Color(0xFFFFF8E1) : const Color(0xFFFEF2F2)),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: isDelivered ? const Color(0xFF86EFAC) : (isPending ? const Color(0xFFFFD54F) : const Color(0xFFFCA5A5))),
                ),
                child: Text(
                  isDelivered ? '✓ DELIVERED' : (isPending ? 'PENDING' : 'NOT DELIVERED'),
                  style: TextStyle(
                    color: isDelivered ? const Color(0xFF059669) : (isPending ? const Color(0xFFF57F17) : const Color(0xFFDC2626)),
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Customer Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFECFDF5), Colors.white],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: Color(0xFF059669),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        custName.isNotEmpty ? custName[0].toUpperCase() : 'C',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(custName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                        const SizedBox(height: 2),
                        Text('Date: $deliveryDate • $deliveryDays', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Section 1: Customer Profile Details
            Container(
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
                      const Row(
                        children: [
                          Icon(Icons.person_pin_rounded, size: 18, color: Color(0xFF059669)),
                          SizedBox(width: 6),
                          Text('Customer Profile Details', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: status == 'ACTIVE' ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: status == 'ACTIVE' ? const Color(0xFF059669) : const Color(0xFFB45309))),
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  _buildRow('Full Name', custName),
                  if (phone.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Phone Number', style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                          Row(
                            children: [
                              Text(phone, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                              const SizedBox(width: 8),
                              InkWell(
                                onTap: () => LauncherService.openDialer(phone),
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFFBFDBFE))),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.phone_rounded, size: 11, color: Color(0xFF2563EB)),
                                      SizedBox(width: 3),
                                      Text('Call', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                  _buildRow('Doorstep Address', custAddress),
                  if (area.toString().isNotEmpty) _buildRow('Delivery Route / Area', area.toString()),
                  if (dLat != null && dLng != null) ...[
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: () => LauncherService.openMap(lat: dLat, lng: dLng, address: custAddress),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFBFDBFE))),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.navigation_rounded, size: 14, color: Color(0xFF2563EB)),
                            const SizedBox(width: 6),
                            Text('Navigate to GPS (${dLat.toStringAsFixed(3)}, ${dLng.toStringAsFixed(3)})', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                          ],
                        ),
                      ),
                    ),
                  ],
                  _buildRow('Account Balance', '₹$bal', valueColor: bal > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669)),
                  _buildRow('Subscription Plan', '${milkQty}L Daily Milk • $deliveryDays'),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Section 2: Delivery & Fulfillment Details
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.local_shipping_rounded, size: 18, color: Color(0xFF2563EB)),
                      SizedBox(width: 6),
                      Text('Delivery & Fulfillment Details', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    ],
                  ),
                  const Divider(height: 20),
                  _buildRow('Planned Products', '${actualMilk}L Pure Farm Milk${actualCurd > 0 ? " + ${actualCurd}g Curd" : ""}'),
                  if (addonsList.isNotEmpty) ...[
                    _buildRow('Doorstep Add-ons', addonsList.map((a) => '${a['name']} ×${a['quantity']}').join(', ')),
                    _buildRow(
                      'Add-ons Amount',
                      '₹$addonsTotal${addonPaid > 0 ? " (Paid ₹$addonPaid $addonMethod)" : " ($addonMethod)"}',
                    ),
                  ],
                  _buildRow('Billed Amount', '₹$totalAmount ($paymentMethod)'),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Assigned Partner', style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        Row(
                          children: [
                            Text(driverName, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                            if (driverPhone.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              InkWell(
                                onTap: () => LauncherService.openDialer(driverPhone),
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFFA7F3D0))),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.phone_rounded, size: 10, color: Color(0xFF059669)),
                                      SizedBox(width: 2),
                                      Text('Call', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (delivery['updatedAt'] != null)
                    _buildRow('Last Updated', delivery['updatedAt'].toString().contains('T') ? delivery['updatedAt'].toString().split('T').first : delivery['updatedAt'].toString()),
                  if (proofUrl != null && proofUrl.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    const Text('Doorstep Delivery Photo Proof', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () {
                        if (onShowProof != null) {
                          onShowProof!(
                            proofUrl,
                            deliveryDate,
                            driverName,
                            custName,
                            custAddress,
                            dLat,
                            dLng,
                          );
                        }
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: DeliveryProofHelper.buildImageFromSource(
                          proofUrl,
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Jump to Customer Directory Ledger
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  if (onSelectCustomer != null) {
                    onSelectCustomer!(custName);
                  }
                },
                icon: const Icon(Icons.person_search_rounded, size: 18),
                label: const Text('View Full Customer Ledger in Directory', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SCREEN 2: ADMIN PARTNER DETAILS & ASSIGNED CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────
class AdminPartnerDetailsFullScreen extends StatefulWidget {
  final Map<String, dynamic> partner;
  final List<Map<String, dynamic>> deliveries;
  final List<Map<String, dynamic>> customers;
  final List<Map<String, dynamic>> deliveryBoys;
  final VoidCallback onToggleDuty;
  final VoidCallback onOpenDutyLogs;
  final Function(Map<String, dynamic> delivery) onShowDeliveryDetails;
  final Function(String customerName) onSelectCustomer;

  const AdminPartnerDetailsFullScreen({
    super.key,
    required this.partner,
    required this.deliveries,
    required this.customers,
    required this.deliveryBoys,
    required this.onToggleDuty,
    required this.onOpenDutyLogs,
    required this.onShowDeliveryDetails,
    required this.onSelectCustomer,
  });

  @override
  State<AdminPartnerDetailsFullScreen> createState() => _AdminPartnerDetailsFullScreenState();
}

class _AdminPartnerDetailsFullScreenState extends State<AdminPartnerDetailsFullScreen> {
  String _searchQuery = '';

  List<Map<String, dynamic>> _findAssignedCustomers() {
    final b = widget.partner;
    final partnerId = b['id'] ?? b['_id'] ?? b['boyId'];
    final partnerName = (b['name'] ?? '').toString().toLowerCase().trim();
    final partnerArea = (b['assignedArea'] ?? '').toString().toLowerCase().trim();

    return widget.customers.where((c) {
      final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] : {};
      final assignedBoyId = plan['deliveryBoyId']?.toString() ?? c['deliveryBoyId']?.toString();
      final assignedBoyName = (plan['deliveryBoyName'] ?? c['deliveryBoyName'] ?? '').toString().toLowerCase().trim();
      final custArea = (c['area'] ?? '').toString().toLowerCase().trim();

      return (partnerId != null && assignedBoyId != null && assignedBoyId == partnerId.toString()) ||
          (partnerName.isNotEmpty && assignedBoyName.isNotEmpty && assignedBoyName == partnerName) ||
          (partnerArea.isNotEmpty && custArea.isNotEmpty && custArea == partnerArea);
    }).toList();
  }

  Map<String, dynamic>? _findDeliveryForCustomer(Map<String, dynamic> c) {
    final cId = c['id'] ?? c['_id'] ?? c['customerId'];
    final cName = (c['name'] ?? '').toString().toLowerCase().trim();

    for (final d in widget.deliveries) {
      final dCustId = d['customerId'];
      final dCustName = (d['customerName'] ?? '').toString().toLowerCase().trim();

      if (cId != null && dCustId != null && cId.toString() == dCustId.toString()) {
        return d;
      }
      if (cName.isNotEmpty && dCustName.isNotEmpty && cName == dCustName) {
        return d;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.partner;
    final name = b['name'] ?? 'Partner';
    final phone = b['mobile'] ?? 'N/A';
    final area = b['assignedArea'] ?? 'Madhapur';
    final vehicle = b['vehicleNumber'] ?? 'Two-Wheeler';
    final cash = b['todayCashCollected'] ?? 0;
    final upi = b['todayUpiCollected'] ?? 0;
    final bool isOnline = b['isOnline'] == true;
    final partnerId = b['id'] ?? b['_id'] ?? b['boyId'];

    final assignedCustomers = _findAssignedCustomers();
    final completedDrops = widget.deliveries.where((d) =>
      (d['deliveryBoyId']?.toString() == partnerId?.toString() ||
       (d['deliveryBoyName'] ?? '').toString().toLowerCase() == name.toString().toLowerCase()) &&
      d['status'] == 'delivered'
    ).length;

    final filteredCustomers = _searchQuery.isEmpty
        ? assignedCustomers
        : assignedCustomers.where((c) {
            final cName = (c['name'] ?? '').toString().toLowerCase();
            final cAddr = (c['address'] ?? '').toString().toLowerCase();
            final q = _searchQuery.toLowerCase();
            return cName.contains(q) || cAddr.contains(q);
          }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name.toString(), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            Text('Route: $area • $vehicle', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: isOnline ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isOnline ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1)),
                ),
                child: Text(
                  isOnline ? '🟢 ONLINE' : '⏸ OFFLINE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: isOnline ? const Color(0xFF059669) : const Color(0xFF64748B),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Metrics Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: const BoxDecoration(
                              color: Color(0xFFECFDF5),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.sports_motorsports_rounded, size: 24, color: Color(0xFF059669)),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name.toString(), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                              Text('Mobile: $phone', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                            ],
                          ),
                        ],
                      ),
                      if (phone != 'N/A')
                        InkWell(
                          onTap: () => LauncherService.openDialer(phone.toString()),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.phone_rounded, size: 13, color: Color(0xFF2563EB)),
                                SizedBox(width: 4),
                                Text('Call Partner', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _metricCol('ASSIGNED', '${assignedCustomers.length}', const Color(0xFF0F172A)),
                      Container(width: 1, height: 28, color: const Color(0xFFE2E8F0)),
                      _metricCol('DELIVERED', '$completedDrops', const Color(0xFF059669)),
                      Container(width: 1, height: 28, color: const Color(0xFFE2E8F0)),
                      _metricCol('COLLECTED', '₹${cash + upi}', const Color(0xFF2563EB)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Shift status & Timeline Actions
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: widget.onToggleDuty,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: isOnline ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isOnline ? const Color(0xFFFECACA) : const Color(0xFFA7F3D0)),
                      ),
                      child: Center(
                        child: Text(
                          isOnline ? 'Set Partner Offline' : 'Set Partner Online',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: isOnline ? const Color(0xFFDC2626) : const Color(0xFF059669),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: InkWell(
                    onTap: widget.onOpenDutyLogs,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: const Center(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.history_rounded, size: 15, color: Color(0xFF2563EB)),
                            SizedBox(width: 5),
                            Text(
                              'Shift Timeline',
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Assigned Route Header & Search
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Assigned Customers & Drops (${assignedCustomers.length})',
                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              onChanged: (v) => setState(() => _searchQuery = v.trim()),
              decoration: InputDecoration(
                hintText: 'Search customer name or address...',
                hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF64748B)),
                isDense: true,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5)),
              ),
            ),
            const SizedBox(height: 12),

            if (filteredCustomers.isEmpty)
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: const Center(
                  child: Text('No assigned customers match this search.', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredCustomers.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (ctx, i) {
                  final c = filteredCustomers[i];
                  final cName = c['name'] ?? 'Customer';
                  final cAddress = c['address'] ?? 'Madhapur';
                  final cPhone = (c['mobile'] ?? '').toString();
                  final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] : {};
                  final milkQty = plan['milkQty'] ?? 1;
                  final cBal = num.tryParse((c['currentBalance'] ?? '0').toString()) ?? 0;
                  final custDeliv = _findDeliveryForCustomer(c);
                  final isCustDelivered = custDeliv != null && custDeliv['status'] == 'delivered';

                  return InkWell(
                    onTap: () {
                      if (custDeliv != null) {
                        widget.onShowDeliveryDetails(custDeliv);
                      } else {
                        widget.onSelectCustomer(cName.toString());
                      }
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isCustDelivered ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(cName.toString(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A))),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isCustDelivered ? const Color(0xFFECFDF5) : const Color(0xFFFFF8E1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  isCustDelivered ? '✓ DELIVERED' : 'PENDING',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                    color: isCustDelivered ? const Color(0xFF059669) : const Color(0xFFF57F17),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(cAddress.toString(), style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('${milkQty}L Milk • Bal: ₹$cBal', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: cBal > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669))),
                              Row(
                                children: [
                                  if (cPhone.isNotEmpty) ...[
                                    InkWell(
                                      onTap: () => LauncherService.openDialer(cPhone),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                        decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFFBFDBFE))),
                                        child: const Row(
                                          children: [
                                            Icon(Icons.phone_rounded, size: 10, color: Color(0xFF2563EB)),
                                            SizedBox(width: 3),
                                            Text('Call', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                                          ],
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  const Text('View Details →', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _metricCol(String title, String value, Color color) {
    return Column(
      children: [
        Text(title, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: color)),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SCREEN 3: ADMIN PARTNER SHIFT DUTY LOGS
// ─────────────────────────────────────────────────────────────────────────────
class AdminPartnerDutyLogsFullScreen extends StatelessWidget {
  final Map<String, dynamic> partner;
  final VoidCallback onToggleDuty;

  const AdminPartnerDutyLogsFullScreen({
    super.key,
    required this.partner,
    required this.onToggleDuty,
  });

  String _formatTime(dynamic dateVal) {
    if (dateVal == null || dateVal.toString().isEmpty) return '—';
    try {
      final dt = DateTime.parse(dateVal.toString()).toLocal();
      final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final minute = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      final day = dt.day.toString().padLeft(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final month = months[dt.month - 1];
      return '$day $month, $hour:$minute $period';
    } catch (_) {
      return dateVal.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = partner['name'] ?? 'Partner';
    final area = partner['assignedArea'] ?? 'Madhapur';
    final bool isOnline = partner['isOnline'] == true;
    final lastOnline = partner['lastOnlineAt'];
    final lastOffline = partner['lastOfflineAt'];
    final List logs = (partner['dutyLogs'] is List) ? (partner['dutyLogs'] as List) : [];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$name Shift History', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            Text('Route: $area', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Center(
              child: InkWell(
                onTap: () {
                  onToggleDuty();
                  Navigator.pop(context);
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: isOnline ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isOnline ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1)),
                  ),
                  child: Text(
                    isOnline ? '🟢 ONLINE (Tap)' : '⏸ OFFLINE (Tap)',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: isOnline ? const Color(0xFF059669) : const Color(0xFF64748B),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('LAST ONLINE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                        const SizedBox(height: 3),
                        Text(
                          _formatTime(lastOnline),
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                        ),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 32, color: const Color(0xFFE2E8F0)),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('LAST OFFLINE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                        const SizedBox(height: 3),
                        Text(
                          _formatTime(lastOffline),
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'DUTY TRANSITION TIMELINE',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF475569), letterSpacing: 0.5),
            ),
            const SizedBox(height: 10),
            if (logs.isEmpty)
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: Center(
                  child: Text('No shift transitions logged yet for $name.', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: logs.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, idx) {
                  final item = Map<String, dynamic>.from(logs[logs.length - 1 - idx] as Map);
                  final status = (item['status'] ?? 'online').toString();
                  final isLogOnline = status == 'online';
                  final time = item['timestamp'];
                  final logArea = item['area'] ?? area;

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isLogOnline ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            isLogOnline ? '🟢 ONLINE' : '⏸ OFFLINE',
                            style: TextStyle(
                              color: isLogOnline ? const Color(0xFF059669) : const Color(0xFF64748B),
                              fontWeight: FontWeight.w800,
                              fontSize: 10,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _formatTime(time),
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                'Territory: $logArea',
                                style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
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
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SCREEN 4: ADMIN CUSTOMER DETAILS & FINANCIAL LEDGER
// ─────────────────────────────────────────────────────────────────────────────
class AdminCustomerDetailsFullScreen extends StatelessWidget {
  final Map<String, dynamic> customer;
  final List<Map<String, dynamic>> deliveries;
  final List<Map<String, dynamic>> deliveryBoys;
  final ApiService api;
  final Function(Map<String, dynamic> delivery) onShowDeliveryDetails;
  final Function(Map<String, dynamic> customer) onRecordPayment;
  final Function(Map<String, dynamic> customer)? onEditCustomer;
  final Function(Map<String, dynamic> customer)? onDeleteCustomer;
  final Function(Map<String, dynamic> customer)? onTogglePause;
  final Function(Map<String, dynamic> customer, String boyId, String boyName)? onAssignPartner;

  const AdminCustomerDetailsFullScreen({
    super.key,
    required this.customer,
    required this.deliveries,
    this.deliveryBoys = const [],
    required this.api,
    required this.onShowDeliveryDetails,
    required this.onRecordPayment,
    this.onEditCustomer,
    this.onDeleteCustomer,
    this.onTogglePause,
    this.onAssignPartner,
  });

  Map<String, dynamic>? _findDelivery() {
    final cId = customer['id'] ?? customer['_id'] ?? customer['customerId'];
    final cName = (customer['name'] ?? '').toString().toLowerCase().trim();

    for (final d in deliveries) {
      final dCustId = d['customerId'];
      final dCustName = (d['customerName'] ?? '').toString().toLowerCase().trim();

      if (cId != null && dCustId != null && cId.toString() == dCustId.toString()) {
        return d;
      }
      if (cName.isNotEmpty && dCustName.isNotEmpty && cName == dCustName) {
        return d;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final name = (customer['name'] ?? 'Customer').toString();
    final mobile = (customer['mobile'] ?? '').toString();
    final area = (customer['area'] ?? '').toString();
    final address = (customer['address'] ?? '').toString();
    final custId = (customer['customerId'] ?? customer['_id'] ?? customer['id'] ?? '').toString();
    final bal = num.tryParse((customer['currentBalance'] ?? '0').toString()) ?? 0;

    final deliv = _findDelivery();
    final dm = (deliv?['paymentMethod'] ?? '').toString().toLowerCase();
    final dam = (deliv?['addonPaymentMethod'] ?? '').toString().toLowerCase();
    final todayCash = (deliv != null && deliv['status'] == 'delivered')
        ? (dm == 'cash'
            ? (num.tryParse((deliv['paymentAmount'] ?? deliv['totalAmount'] ?? '0').toString()) ?? 0)
            : (dam == 'cash' ? (num.tryParse((deliv['addonPaidAmount'] ?? deliv['paymentAmount'] ?? '0').toString()) ?? 0) : 0))
        : 0;
    final todayUpi = (deliv != null && deliv['status'] == 'delivered')
        ? (dm == 'upi'
            ? (num.tryParse((deliv['paymentAmount'] ?? deliv['totalAmount'] ?? '0').toString()) ?? 0)
            : (dam == 'upi' ? (num.tryParse((deliv['addonPaidAmount'] ?? deliv['paymentAmount'] ?? '0').toString()) ?? 0) : 0))
        : 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            Text('$custId${area.isNotEmpty ? ' • $area' : ''}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
          ],
        ),
        actions: [
          if (mobile.isNotEmpty) ...[
            IconButton(
              icon: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF16A34A)),
              tooltip: 'WhatsApp',
              onPressed: () => LauncherService.openWhatsApp(mobile),
            ),
            IconButton(
              icon: const Icon(Icons.phone_outlined, color: Color(0xFF2563EB)),
              tooltip: 'Call Customer',
              onPressed: () => LauncherService.openDialer(mobile),
            ),
          ],
          if (onEditCustomer != null)
            IconButton(
              icon: const Icon(Icons.edit_outlined, color: Color(0xFF2563EB)),
              tooltip: 'Edit Customer',
              onPressed: () {
                Navigator.pop(context);
                onEditCustomer!(customer);
              },
            ),
          if (onDeleteCustomer != null)
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFDC2626)),
              tooltip: 'Delete Customer',
              onPressed: () {
                Navigator.pop(context);
                onDeleteCustomer!(customer);
              },
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: FutureBuilder<Map<String, dynamic>>(
          future: custId.isNotEmpty ? api.get('/api/customers/$custId/ledger') : Future.value({}),
          builder: (fCtx, snap) {
            final ledgerData = snap.data ?? {};
            final sumMap = ledgerData['summary'] is Map ? ledgerData['summary'] as Map : {};
            final totalPaidAllTime = num.tryParse((sumMap['totalPaid'] ?? '0').toString()) ?? 0;
            final isPaused = (customer['status'] ?? '').toString().toLowerCase() == 'paused';
            final isInactive = (customer['status'] ?? '').toString().toLowerCase() == 'inactive';
            final statusStr = (customer['status'] ?? 'active').toString().toUpperCase();
            final plan = customer['deliveryPlan'] is Map ? customer['deliveryPlan'] as Map : (customer['subscription'] is Map ? customer['subscription'] as Map : {});
            final milkQty = plan['milkQty'] ?? plan['milkQuantity'] ?? 1.0;
            final curdQty = plan['curdQty'] ?? plan['curdQuantity'] ?? 0;
            final freq = (plan['frequency'] ?? 'Daily').toString();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Profile Hero Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: isPaused ? const Color(0xFFFFFBEB) : isInactive ? const Color(0xFFF1F5F9) : const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: isPaused ? const Color(0xFFFDE68A) : isInactive ? const Color(0xFFCBD5E1) : const Color(0xFFA7F3D0)),
                                ),
                                child: Center(
                                  child: Text(
                                    name.isNotEmpty ? name[0].toUpperCase() : 'C',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 18,
                                      color: isPaused ? const Color(0xFFB45309) : isInactive ? const Color(0xFF64748B) : const Color(0xFF059669),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A))),
                                  const SizedBox(height: 2),
                                  Text(custId, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                                ],
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isPaused ? const Color(0xFFFFFBEB) : isInactive ? const Color(0xFFF1F5F9) : const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: isPaused ? const Color(0xFFFDE68A) : isInactive ? const Color(0xFFCBD5E1) : const Color(0xFFA7F3D0)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: isPaused ? const Color(0xFFD97706) : isInactive ? const Color(0xFF94A3B8) : const Color(0xFF10B981),
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  statusStr,
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                    color: isPaused ? const Color(0xFFB45309) : isInactive ? const Color(0xFF64748B) : const Color(0xFF059669),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (mobile.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            InkWell(
                              onTap: () => LauncherService.openDialer(mobile),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFBFDBFE)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.phone_rounded, size: 12, color: Color(0xFF2563EB)),
                                    const SizedBox(width: 4),
                                    Text(mobile, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () => LauncherService.openWhatsApp(mobile),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF0FDF4),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFBBF7D0)),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.chat_bubble_outline_rounded, size: 12, color: Color(0xFF16A34A)),
                                    SizedBox(width: 4),
                                    Text('WhatsApp', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF16A34A))),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (address.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFF1F5F9)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.location_on_rounded, size: 15, color: Color(0xFF059669)),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(address, style: const TextStyle(fontSize: 11.5, color: Color(0xFF334155), height: 1.3)),
                                    if (num.tryParse(customer['latitude']?.toString() ?? '') != null && num.tryParse(customer['longitude']?.toString() ?? '') != null) ...[
                                      const SizedBox(height: 4),
                                      InkWell(
                                        onTap: () {
                                          final lat = num.tryParse(customer['latitude'].toString());
                                          final lng = num.tryParse(customer['longitude'].toString());
                                          LauncherService.openMap(lat: lat, lng: lng, address: address);
                                        },
                                        child: Text(
                                          'GPS: ${num.tryParse(customer['latitude'].toString())!.toStringAsFixed(3)}, ${num.tryParse(customer['longitude'].toString())!.toStringAsFixed(3)} → Open Map',
                                          style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // 2. Financial Balance Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: bal > 0 ? const Color(0xFFFEF2F2) : bal < 0 ? const Color(0xFFEFF6FF) : const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: bal > 0 ? const Color(0xFFFECACA) : bal < 0 ? const Color(0xFFBFDBFE) : const Color(0xFFBBF7D0)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'CURRENT LEDGER BALANCE',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: bal > 0 ? const Color(0xFF991B1B) : bal < 0 ? const Color(0xFF1E40AF) : const Color(0xFF166534),
                                    letterSpacing: 0.5,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '₹${bal.abs()}${bal > 0 ? ' (Due)' : bal < 0 ? ' (Adv)' : ' (Settled)'}',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w900,
                                    color: bal > 0 ? const Color(0xFFDC2626) : bal < 0 ? const Color(0xFF2563EB) : const Color(0xFF059669),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: () => onRecordPayment(customer),
                            icon: const Icon(Icons.payment_rounded, size: 14),
                            label: const Text('Record Pay', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF059669),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              elevation: 0,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Divider(height: 1, color: bal > 0 ? const Color(0xFFFED7D7) : bal < 0 ? const Color(0xFFDBEAFE) : const Color(0xFFDCFCE7)),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              'Total Collected: ₹$totalPaidAllTime',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Today Collected: ₹${todayCash + todayUpi}',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // 3. Subscription Plan & Delivery Partner Card
                Container(
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
                          const Expanded(
                            child: Row(
                              children: [
                                Icon(Icons.local_drink_rounded, size: 16, color: Color(0xFF059669)),
                                SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'SUBSCRIPTION PLAN',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), letterSpacing: 0.5),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (onTogglePause != null) ...[
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () {
                                Navigator.pop(context);
                                onTogglePause!(customer);
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isPaused ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: isPaused ? const Color(0xFFA7F3D0) : const Color(0xFFFDE68A)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded, size: 12, color: isPaused ? const Color(0xFF059669) : const Color(0xFFD97706)),
                                    const SizedBox(width: 3),
                                    Text(
                                      isPaused ? 'Resume Drop' : 'Pause Drop',
                                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: isPaused ? const Color(0xFF059669) : const Color(0xFFD97706)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                              child: Column(
                                children: [
                                  const Text('FARM MILK', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                                  const SizedBox(height: 2),
                                  Text('${milkQty}L', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                              child: Column(
                                children: [
                                  const Text('CURD PACKS', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                                  const SizedBox(height: 2),
                                  Text('$curdQty Pk', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                              child: Column(
                                children: [
                                  const Text('SCHEDULE', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                                  const SizedBox(height: 2),
                                  Text(freq, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Assigned Partner with 1-Tap Partner Assignment Action
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.two_wheeler_rounded, size: 18, color: Color(0xFF2563EB)),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Text(
                                    'ASSIGNED PARTNER',
                                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    customer['deliveryBoyName']?.toString() ?? 'Unassigned',
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            if (onAssignPartner != null) ...[
                              const SizedBox(width: 8),
                              ElevatedButton.icon(
                                onPressed: () => _showAssignPartnerSheet(context),
                                icon: const Icon(Icons.swap_horiz_rounded, size: 14),
                                label: const Text('Assign', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2563EB),
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // 4. Quick Actions Toolbar (Edit, Delete)
                Row(
                  children: [
                    if (onEditCustomer != null)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            onEditCustomer!(customer);
                          },
                          icon: const Icon(Icons.edit_rounded, size: 14),
                          label: const Text('Edit Details', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF2563EB),
                            side: const BorderSide(color: Color(0xFF93C5FD)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    if (onEditCustomer != null && onDeleteCustomer != null)
                      const SizedBox(width: 10),
                    if (onDeleteCustomer != null)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            onDeleteCustomer!(customer);
                          },
                          icon: const Icon(Icons.delete_outline_rounded, size: 14),
                          label: const Text('Delete', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFDC2626),
                            side: const BorderSide(color: Color(0xFFFCA5A5)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),

                // 5. Today Delivery Card
                if (deliv != null) ...[
                  const Text('TODAY DOORSTEP DROP', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF475569), letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  Container(
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
                            Text(
                              '${deliv['actualMilk'] ?? deliv['plannedMilk'] ?? 1}L Farm Milk',
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF059669)),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: deliv['status'] == 'delivered' ? const Color(0xFFECFDF5) : const Color(0xFFFFF8E1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                (deliv['status'] ?? 'pending').toString().toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: deliv['status'] == 'delivered' ? const Color(0xFF059669) : const Color(0xFFF57F17),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text('Assigned Partner: ${deliv['deliveryBoyName'] ?? 'Unassigned'}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () {
                              Navigator.pop(context);
                              onShowDeliveryDetails(deliv);
                            },
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFF059669)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 11),
                            ),
                            child: const Text('View Today Delivery Full Details →', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w800, fontSize: 12.5)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 20),
              ],
            );
          },
        ),
      ),
    );
  }

  void _showAssignPartnerSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      backgroundColor: Colors.white,
      builder: (bCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(width: 36, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2))),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Assign Delivery Partner', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                  IconButton(
                    onPressed: () => Navigator.pop(bCtx),
                    icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF64748B)),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text('Select a delivery partner for ${(customer['name'] ?? 'Customer').toString()}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 14),
              if (deliveryBoys.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(child: Text('No delivery partners available.', style: TextStyle(color: Color(0xFF94A3B8)))),
                )
              else
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: deliveryBoys.length + 1,
                    separatorBuilder: (_, _) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                    itemBuilder: (lCtx, idx) {
                      if (idx == 0) {
                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          leading: Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(10)),
                            child: const Icon(Icons.person_off_rounded, size: 18, color: Color(0xFF64748B)),
                          ),
                          title: const Text('Unassigned', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                          subtitle: const Text('Remove current partner assignment', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                          onTap: () {
                            Navigator.pop(bCtx);
                            Navigator.pop(context);
                            onAssignPartner?.call(customer, '', 'Unassigned');
                          },
                        );
                      }
                      final boy = deliveryBoys[idx - 1];
                      final bId = (boy['id'] ?? boy['_id'] ?? '').toString();
                      final bName = (boy['name'] ?? 'Partner').toString();
                      final bArea = (boy['assignedArea'] ?? 'Route').toString();
                      final currentId = (customer['deliveryBoyId'] ?? customer['deliveryPlan']?['deliveryBoyId'] ?? '').toString();
                      final isSelected = currentId.isNotEmpty && currentId == bId;

                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        leading: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFFECFDF5) : const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(Icons.two_wheeler_rounded, size: 18, color: isSelected ? const Color(0xFF059669) : const Color(0xFF2563EB)),
                        ),
                        title: Text(bName, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: isSelected ? const Color(0xFF059669) : const Color(0xFF0F172A))),
                        subtitle: Text('Route: $bArea', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        trailing: isSelected
                            ? const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 20)
                            : const Icon(Icons.chevron_right_rounded, color: Color(0xFFCBD5E1), size: 20),
                        onTap: () {
                          Navigator.pop(bCtx);
                          Navigator.pop(context);
                          onAssignPartner?.call(customer, bId, bName);
                        },
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// ADMIN SUB-SCREEN WRAPPER WITH REALTIME REFRESH AND APPBAR
// ============================================================================
class _AdminSubScreenWrapper extends StatefulWidget {
  final String title;
  final String? subtitle;
  final Widget Function(BuildContext context) builder;
  final Future<void> Function() onRefresh;

  const _AdminSubScreenWrapper({
    required this.title,
    this.subtitle,
    required this.builder,
    required this.onRefresh,
  });

  @override
  State<_AdminSubScreenWrapper> createState() => _AdminSubScreenWrapperState();
}

class _AdminSubScreenWrapperState extends State<_AdminSubScreenWrapper> {
  bool _isRefreshing = false;

  Future<void> _handleRefresh() async {
    if (_isRefreshing) return;
    setState(() => _isRefreshing = true);
    try {
      await widget.onRefresh();
    } finally {
      if (mounted) setState(() => _isRefreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.title,
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            if (widget.subtitle != null && widget.subtitle!.isNotEmpty)
              Text(
                widget.subtitle!,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
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
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF059669)),
                  )
                : const Icon(Icons.refresh_rounded, color: Color(0xFF059669)),
            tooltip: 'Refresh Realtime Data',
            onPressed: () async {
              await _handleRefresh();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('✓ Realtime data refreshed successfully'),
                    backgroundColor: Color(0xFF059669),
                    duration: Duration(seconds: 1),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFF059669),
        onRefresh: _handleRefresh,
        child: widget.builder(context),
      ),
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE FINANCIAL & LEDGER PERFORMANCE FULL SCREEN
// ─────────────────────────────────────────────────────────────────────────────
class _AdminFinancialLedgerFullScreen extends StatefulWidget {
  final ApiService api;
  final Map<String, dynamic> initialSummary;
  final List<Map<String, dynamic>> customers;
  final List<Map<String, dynamic>> deliveries;
  final List<Map<String, dynamic>> deliveryBoys;
  final VoidCallback onReload;
  final void Function(Map<String, dynamic> customer) onRecordPayment;
  final void Function(String customerName) onSelectCustomer;

  const _AdminFinancialLedgerFullScreen({
    required this.api,
    required this.initialSummary,
    required this.customers,
    required this.deliveries,
    required this.deliveryBoys,
    required this.onReload,
    required this.onRecordPayment,
    required this.onSelectCustomer,
  });

  @override
  State<_AdminFinancialLedgerFullScreen> createState() => _AdminFinancialLedgerFullScreenState();
}

class _AdminFinancialLedgerFullScreenState extends State<_AdminFinancialLedgerFullScreen> {
  late Map<String, dynamic> _summary;
  String _period = 'today'; // 'today', 'weekly', 'monthly', 'all'
  bool _isLoadingPeriod = false;
  String _searchQuery = '';
  String _debtFilter = 'all'; // 'all', 'high', 'moderate', 'advance'
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _summary = Map<String, dynamic>.from(widget.initialSummary);
  }

  @override
  void didUpdateWidget(covariant _AdminFinancialLedgerFullScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialSummary != oldWidget.initialSummary && _period == 'today') {
      _summary = Map<String, dynamic>.from(widget.initialSummary);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPeriodData(String period) async {
    setState(() {
      _period = period;
      _isLoadingPeriod = true;
    });

    try {
      final res = await widget.api.get('/api/reports/dashboard?period=$period');
      if (res['success'] == true && res['summary'] is Map) {
        if (mounted) {
          setState(() {
            _summary = Map<String, dynamic>.from(res['summary']);
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading period summary: $e');
    } finally {
      if (mounted) setState(() => _isLoadingPeriod = false);
    }
  }

  Future<void> _handleRefresh() async {
    widget.onReload();
    await _loadPeriodData(_period);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ Realtime financial & ledger data refreshed'),
          backgroundColor: Color(0xFF059669),
          duration: Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final todaySales = num.tryParse((_summary['todaySales'] ?? _summary['sales'] ?? 0).toString()) ?? 0;
    final todayCash = num.tryParse((_summary['todayCashCollected'] ?? _summary['todayCash'] ?? 0).toString()) ?? 0;
    final todayUpi = num.tryParse((_summary['todayUpiCollected'] ?? _summary['todayUpi'] ?? 0).toString()) ?? 0;
    final todayAddonsCash = num.tryParse((_summary['todayAddonsCash'] ?? 0).toString()) ?? 0;
    final todayAddonsUpi = num.tryParse((_summary['todayAddonsUpi'] ?? 0).toString()) ?? 0;
    final totalCollections = todayCash + todayUpi;
    final collectionEfficiency = todaySales > 0 ? ((totalCollections / todaySales) * 100).clamp(0, 100).toStringAsFixed(1) : '100.0';

    final totalOutstanding = num.tryParse((_summary['totalOutstanding'] ?? _summary['totalCredit'] ?? 0).toString()) ?? 0;
    final totalAdvance = num.tryParse((_summary['totalAdvance'] ?? 0).toString()) ?? 0;
    final netMarketBalance = totalOutstanding - totalAdvance;

    final todayMilkLitres = (_summary['todayMilkLitres'] ?? '0.0').toString();
    final todayCurdKg = (_summary['todayCurdKg'] ?? ((num.tryParse((_summary['todayCurdGrams'] ?? 0).toString()) ?? 0) / 1000).toStringAsFixed(2)).toString();

    final totalDeliveries = widget.deliveries.length;
    final deliveredCount = widget.deliveries.where((d) => d['status'] == 'delivered').length;
    final pendingCount = widget.deliveries.where((d) => d['status'] == 'pending').length;
    final notDeliveredCount = widget.deliveries.where((d) => d['status'] == 'not_delivered').length;
    final deliverySuccessRate = totalDeliveries > 0 ? ((deliveredCount / totalDeliveries) * 100).toStringAsFixed(1) : '0';

    // 1. Driver cash & collections calculation
    final List<Map<String, dynamic>> driverStats = widget.deliveryBoys.map((b) {
      final bId = (b['id'] ?? b['_id'] ?? b['boyId'] ?? '').toString();
      final bName = (b['name'] ?? '').toString().toLowerCase().trim();

      final dList = widget.deliveries.where((d) {
        final dBoyId = (d['deliveryBoyId'] ?? '').toString();
        final dBoyName = (d['deliveryBoyName'] ?? '').toString().toLowerCase().trim();
        if (bId.isNotEmpty && dBoyId.isNotEmpty) {
          return dBoyId == bId;
        }
        return bName.isNotEmpty && dBoyName == bName;
      }).toList();

      num cash = 0;
      num upi = 0;
      for (final d in dList) {
        final pMethod = (d['paymentMethod'] ?? '').toString().toLowerCase();
        final pAmt = num.tryParse((d['paymentAmount'] ?? d['totalAmount'] ?? 0).toString()) ?? 0;
        if (pMethod == 'cash') {
          cash += pAmt;
        } else if (pMethod == 'upi') {
          upi += pAmt;
        }

        final addonMethod = (d['addonPaymentMethod'] ?? '').toString().toLowerCase();
        final addonAmt = num.tryParse((d['addonPaidAmount'] ?? 0).toString()) ?? 0;
        if (addonMethod == 'cash') {
          cash += addonAmt;
        } else if (addonMethod == 'upi') {
          upi += addonAmt;
        }
      }

      final delivered = dList.where((d) => d['status'] == 'delivered').length;
      final total = dList.length;

      return {
        'partner': b,
        'name': b['name'] ?? 'Driver',
        'phone': b['phone'] ?? b['mobile'] ?? '',
        'area': b['assignedArea'] ?? b['area'] ?? 'General Route',
        'cash': cash,
        'upi': upi,
        'total': cash + upi,
        'delivered': delivered,
        'totalDrops': total,
      };
    }).toList();

    driverStats.sort((a, b) => (b['cash'] as num).compareTo(a['cash'] as num));
    final num totalCashInHandDrivers = driverStats.fold<num>(0, (sum, d) => sum + (d['cash'] as num));

    // 2. Debtor customers calculation
    final allDueCustomers = widget.customers.where((c) {
      final bal = num.tryParse(c['currentBalance']?.toString() ?? '0') ?? 0;
      return bal > 0;
    }).toList();

    allDueCustomers.sort((a, b) {
      final balA = num.tryParse(a['currentBalance']?.toString() ?? '0') ?? 0;
      final balB = num.tryParse(b['currentBalance']?.toString() ?? '0') ?? 0;
      return balB.compareTo(balA);
    });

    final highDueCustomers = allDueCustomers.where((c) {
      final bal = num.tryParse(c['currentBalance']?.toString() ?? '0') ?? 0;
      return bal >= 500;
    }).toList();

    final moderateDueCustomers = allDueCustomers.where((c) {
      final bal = num.tryParse(c['currentBalance']?.toString() ?? '0') ?? 0;
      return bal < 500;
    }).toList();

    final advanceCustomers = widget.customers.where((c) {
      final bal = num.tryParse(c['currentBalance']?.toString() ?? '0') ?? 0;
      return bal < 0;
    }).toList();

    List<Map<String, dynamic>> displayedCustomers;
    if (_debtFilter == 'high') {
      displayedCustomers = highDueCustomers;
    } else if (_debtFilter == 'moderate') {
      displayedCustomers = moderateDueCustomers;
    } else if (_debtFilter == 'advance') {
      displayedCustomers = advanceCustomers;
    } else {
      displayedCustomers = allDueCustomers;
    }

    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      displayedCustomers = displayedCustomers.where((c) {
        final name = (c['name'] ?? '').toString().toLowerCase();
        final phone = (c['mobile'] ?? '').toString().toLowerCase();
        final area = (c['area'] ?? c['address'] ?? '').toString().toLowerCase();
        final cid = (c['customerId'] ?? '').toString().toLowerCase();
        return name.contains(q) || phone.contains(q) || area.contains(q) || cid.contains(q);
      }).toList();
    }

    final content = SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── A. TIMEFRAME FILTER BAR ───────────────────────────────────────
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildPeriodChip('today', '⚡ Today (Live)', const Color(0xFF059669)),
                const SizedBox(width: 8),
                _buildPeriodChip('weekly', '📅 This Week', const Color(0xFF2563EB)),
                const SizedBox(width: 8),
                _buildPeriodChip('monthly', '📆 This Month', const Color(0xFF7C3AED)),
                const SizedBox(width: 8),
                _buildPeriodChip('all', '🌐 All-Time', const Color(0xFFD97706)),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── B. REVENUE HERO CARD ──────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF064E3B), Color(0xFF047857)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF059669).withValues(alpha: 0.28),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'TOTAL GROSS SALES (${_period.toUpperCase()})',
                        style: const TextStyle(
                          color: Color(0xFFA7F3D0),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.bolt_rounded, size: 12, color: Color(0xFFFDE047)),
                          SizedBox(width: 3),
                          Text('Realtime Audit', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  '₹$todaySales',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Cash Collections', style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 11, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text('₹$todayCash', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                              ],
                            ),
                          ),
                          Container(width: 1, height: 28, color: Colors.white.withValues(alpha: 0.2)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('UPI & Digital', style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 11, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text('₹$todayUpi', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (todayAddonsCash + todayAddonsUpi > 0) ...[
                        const SizedBox(height: 8),
                        Divider(height: 1, color: Colors.white.withValues(alpha: 0.2)),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Add-on Products Sales', style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 10.5, fontWeight: FontWeight.w600)),
                            Text('₹${todayAddonsCash + todayAddonsUpi}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Total Realized Collections: ₹$totalCollections',
                      style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700),
                    ),
                    Text(
                      '$collectionEfficiency% Realized',
                      style: const TextStyle(color: Color(0xFFFDE047), fontSize: 11.5, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── C. MARKET RECEIVABLES & CREDIT OVERVIEW ───────────────────────
          _buildSectionHeader('Market Receivables & Ledger Dues', Icons.account_balance_wallet_rounded, const Color(0xFFDC2626)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: totalOutstanding > 0 ? const Color(0xFFFEF2F2) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: totalOutstanding > 0 ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(8)),
                            child: const Icon(Icons.credit_card_off_rounded, size: 16, color: Color(0xFFDC2626)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: totalOutstanding > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              totalOutstanding > 0 ? 'Due' : 'Clear',
                              style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        '₹$totalOutstanding',
                        style: TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w900,
                          color: totalOutstanding > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text('Total Market Dues', style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
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
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8)),
                            child: const Icon(Icons.savings_outlined, size: 16, color: Color(0xFF2563EB)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(8)),
                            child: const Text('Advance', style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        '₹$totalAdvance',
                        style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: Color(0xFF2563EB)),
                      ),
                      const SizedBox(height: 2),
                      const Text('Customer Wallets', style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.balance_rounded, size: 16, color: Color(0xFF0F172A)),
                    SizedBox(width: 8),
                    Text('Net Market Position', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  ],
                ),
                Text(
                  '₹$netMarketBalance ${netMarketBalance >= 0 ? 'Receivable' : 'Surplus Advance'}',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900,
                    color: netMarketBalance > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // ── D. DRIVER CASH-IN-HAND RECONCILIATION ─────────────────────────
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: _buildSectionHeader(
                  'Driver Cash-in-Hand Settlement',
                  Icons.sports_motorsports_rounded,
                  const Color(0xFF059669),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Text(
                  'Total Cash: ₹$totalCashInHandDrivers',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Live doorstep cash collected by delivery partners awaiting deposit at dairy',
            style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 10),

          if (driverStats.isEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Text('No delivery partners registered in fleet', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12.5)),
              ),
            )
          else
            ...driverStats.map((d) {
              final cash = d['cash'] as num;
              final upi = d['upi'] as num;
              final phone = (d['phone'] ?? '').toString();

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: cash > 0 ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 2)),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: cash > 0 ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(Icons.two_wheeler_rounded, size: 20, color: cash > 0 ? const Color(0xFF059669) : const Color(0xFF64748B)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                d['name'].toString(),
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                '${d['area']} • ${d['delivered']}/${d['totalDrops']} drops',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        if (phone.isNotEmpty)
                          InkWell(
                            onTap: () => LauncherService.openDialer(phone),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.all(7),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.call_rounded, size: 16, color: Color(0xFF2563EB)),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: cash > 0 ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cash > 0 ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Text('Cash in Hand: ', style: TextStyle(fontSize: 11.5, color: Color(0xFF475569), fontWeight: FontWeight.w600)),
                              Text(
                                '₹$cash',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: cash > 0 ? const Color(0xFF059669) : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              const Text('UPI: ', style: TextStyle(fontSize: 11.5, color: Color(0xFF475569), fontWeight: FontWeight.w600)),
                              Text('₹$upi', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          const SizedBox(height: 16),

          // ── E. VOLUME DISPATCH & FULFILLMENT BREAKDOWN ─────────────────────
          _buildSectionHeader('Product Dispatch & Fulfillment', Icons.local_drink_rounded, const Color(0xFF2563EB)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8)),
                            child: const Icon(Icons.water_drop_outlined, size: 16, color: Color(0xFF2563EB)),
                          ),
                          const SizedBox(width: 8),
                          const Text('Milk Volume', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text('$todayMilkLitres L', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      const SizedBox(height: 2),
                      const Text('Dispatched volume', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
                            child: const Icon(Icons.inventory_2_outlined, size: 16, color: Color(0xFFD97706)),
                          ),
                          const SizedBox(width: 8),
                          const Text('Curd Supply', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text('$todayCurdKg kg', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      const SizedBox(height: 2),
                      const Text('Pots & packs', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.all(14),
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
                    const Text('Drops Fulfillment Rate', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    Text('$deliverySuccessRate% Complete', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: totalDeliveries > 0 ? (deliveredCount / totalDeliveries) : 0,
                    minHeight: 8,
                    backgroundColor: const Color(0xFFE2E8F0),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF059669)),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStatusPill('Delivered', deliveredCount, const Color(0xFF059669), const Color(0xFFECFDF5)),
                    _buildStatusPill('Pending', pendingCount, const Color(0xFFD97706), const Color(0xFFFEF3C7)),
                    _buildStatusPill('Not Delivered', notDeliveredCount, const Color(0xFFDC2626), const Color(0xFFFEF2F2)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── F. INTERACTIVE CUSTOMER OUTSTANDING LEDGER ────────────────────
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: _buildSectionHeader(
                  'Customer Credit Ledgers',
                  Icons.people_outline_rounded,
                  const Color(0xFF7C3AED),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3E8FF),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${displayedCustomers.length} Accounts',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Search Field
          TextField(
            controller: _searchController,
            onChanged: (val) => setState(() => _searchQuery = val),
            decoration: InputDecoration(
              hintText: 'Search customer, phone or area...',
              hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.search_rounded, size: 19, color: Color(0xFF94A3B8)),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF059669))),
            ),
          ),
          const SizedBox(height: 10),

          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildDebtFilterChip('all', 'All Dues (${allDueCustomers.length})'),
                const SizedBox(width: 6),
                _buildDebtFilterChip('high', 'High (≥₹500) (${highDueCustomers.length})'),
                const SizedBox(width: 6),
                _buildDebtFilterChip('moderate', 'Small (<₹500) (${moderateDueCustomers.length})'),
                const SizedBox(width: 6),
                _buildDebtFilterChip('advance', 'Advance (${advanceCustomers.length})'),
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (displayedCustomers.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Center(
                child: Column(
                  children: [
                    const Icon(Icons.check_circle_outline_rounded, size: 36, color: Color(0xFF059669)),
                    const SizedBox(height: 8),
                    Text(
                      _searchQuery.isNotEmpty ? 'No customer accounts matching "$_searchQuery"' : 'All accounts settled! No dues in this filter.',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else
            ...displayedCustomers.map((c) {
              final bal = num.tryParse(c['currentBalance']?.toString() ?? '0') ?? 0;
              final name = (c['name'] ?? 'Customer').toString();
              final phone = (c['mobile'] ?? '').toString();
              final area = (c['area'] ?? c['address'] ?? 'Dairy Zone').toString();

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: bal > 0 ? const Color(0xFFFECACA) : const Color(0xFFBFDBFE)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 2)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 17,
                          backgroundColor: bal > 0 ? const Color(0xFFFEE2E2) : const Color(0xFFEFF6FF),
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'C',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: bal > 0 ? const Color(0xFFDC2626) : const Color(0xFF2563EB),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                '$phone • $area',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: bal > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: bal > 0 ? const Color(0xFFFECACA) : const Color(0xFFBFDBFE)),
                          ),
                          child: Text(
                            bal > 0 ? '₹${bal.abs()} Due' : '₹${bal.abs()} Adv',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w900,
                              color: bal > 0 ? const Color(0xFFDC2626) : const Color(0xFF2563EB),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => widget.onRecordPayment(c),
                            icon: const Icon(Icons.payment_rounded, size: 14),
                            label: const Text('Record Pay', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF059669),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              elevation: 0,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (phone.isNotEmpty) ...[
                          InkWell(
                            onTap: () => LauncherService.openDialer(phone),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.all(7),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFBFDBFE)),
                              ),
                              child: const Icon(Icons.call_rounded, size: 16, color: Color(0xFF2563EB)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () => LauncherService.openWhatsApp(phone),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.all(7),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: const Icon(Icons.chat_rounded, size: 16, color: Color(0xFF059669)),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        OutlinedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            widget.onSelectCustomer(name);
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: const Text('Ledger', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
          const SizedBox(height: 24),
        ],
      ),
    );


    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Financial & Ledger Performance',
              style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Text(
              'Live Sales, Driver Cash & Customer Debts',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF059669)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: _isLoadingPeriod
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF059669)))
                : const Icon(Icons.refresh_rounded, color: Color(0xFF059669)),
            tooltip: 'Refresh Ledger',
            onPressed: _isLoadingPeriod ? null : _handleRefresh,
          ),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFF059669),
        onRefresh: _handleRefresh,
        child: content,
      ),
    );
  }

  Widget _buildPeriodChip(String periodKey, String label, Color accentColor) {
    final isSelected = _period == periodKey;
    return InkWell(
      onTap: () => _loadPeriodData(periodKey),
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? accentColor : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? accentColor : const Color(0xFFE2E8F0)),
          boxShadow: isSelected
              ? [BoxShadow(color: accentColor.withValues(alpha: 0.25), blurRadius: 6, offset: const Offset(0, 2))]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildDebtFilterChip(String filterKey, String label) {
    final isSelected = _debtFilter == filterKey;
    return InkWell(
      onTap: () => setState(() => _debtFilter = filterKey),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 7),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildStatusPill(String label, int count, Color color, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$count', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }
}

// ============================================================================
// ADMIN PAYMENTS & TRANSACTION HISTORY FULL SCREEN
// Live Audit of Driver Shift Cash Handovers, Customer Receipts & Online Payments
// ============================================================================
class _AdminPaymentsHistoryFullScreen extends StatefulWidget {
  final ApiService api;
  final List<Map<String, dynamic>> deliveryBoys;
  final List<Map<String, dynamic>> customers;
  final List<Map<String, dynamic>> deliveries;
  final VoidCallback onReload;
  final void Function(Map<String, dynamic> customer) onRecordPayment;

  const _AdminPaymentsHistoryFullScreen({
    required this.api,
    required this.deliveryBoys,
    required this.customers,
    required this.deliveries,
    required this.onReload,
    required this.onRecordPayment,
  });

  @override
  State<_AdminPaymentsHistoryFullScreen> createState() => _AdminPaymentsHistoryFullScreenState();
}

class _AdminPaymentsHistoryFullScreenState extends State<_AdminPaymentsHistoryFullScreen> {
  String _activeTab = 'history'; // 'history' | 'partners' | 'customers'
  String _paymentMethodFilter = 'all'; // 'all' | 'cash' | 'upi'
  String _searchQuery = '';
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _payments = [];
  List<Map<String, dynamic>> _handovers = [];
  List<Map<String, dynamic>> _deliveryBoys = [];
  List<Map<String, dynamic>> _customers = [];

  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _deliveryBoys = List<Map<String, dynamic>>.from(widget.deliveryBoys);
    _customers = List<Map<String, dynamic>>.from(widget.customers);
    _loadOverviewData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadOverviewData({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final dynamic res = await widget.api.get('/payments/admin-overview');
      if (res is Map && res['success'] == true) {
        if (!mounted) return;
        setState(() {
          _payments = (res['payments'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
          _handovers = (res['handovers'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
          if (res['deliveryBoys'] is List) {
            _deliveryBoys = (res['deliveryBoys'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
          }
          if (res['customers'] is List) {
            _customers = (res['customers'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
          }
          _isLoading = false;
        });
        return;
      }
    } catch (_) {}

    try {
      final dynamic pRes = await widget.api.get('/payments');
      final dynamic hRes = await widget.api.get('/payments/handovers');

      if (!mounted) return;
      setState(() {
        _payments = pRes is List ? pRes.map((e) => Map<String, dynamic>.from(e as Map)).toList() : [];
        _handovers = hRes is List ? hRes.map((e) => Map<String, dynamic>.from(e as Map)).toList() : [];
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to fetch payment records: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _acceptHandover(Map<String, dynamic> handover) async {
    final id = handover['_id'] ?? handover['id'];
    try {
      await widget.api.put('/payments/handovers/$id/status', {'status': 'accepted'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Accepted ₹${handover['amount']} cash handover from ${handover['deliveryBoyName']}!'),
            backgroundColor: const Color(0xFF0D5C3A),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _loadOverviewData(silent: true);
        widget.onReload();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error accepting handover: $e'),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _rejectHandover(Map<String, dynamic> handover) async {
    final id = handover['_id'] ?? handover['id'];
    final reasonController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Reject Cash Handover', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFDC2626), fontSize: 17)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Rejecting handover of ₹${handover['amount']} from driver ${handover['deliveryBoyName']}. Please specify the reason:', style: const TextStyle(fontSize: 13, color: Color(0xFF475569))),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: InputDecoration(
                hintText: 'e.g. Discrepancy at counter, incomplete amount',
                hintStyle: const TextStyle(fontSize: 12.5),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white, elevation: 0),
            child: const Text('Confirm Reject', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await widget.api.put('/payments/handovers/$id/status', {
          'status': 'rejected',
          'rejectionReason': reasonController.text.trim().isNotEmpty ? reasonController.text.trim() : 'Rejected by admin at counter',
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Handover of ₹${handover['amount']} marked rejected.'),
              backgroundColor: const Color(0xFFEA580C),
              behavior: SnackBarBehavior.floating,
            ),
          );
          _loadOverviewData(silent: true);
          widget.onReload();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error rejecting: $e'), backgroundColor: const Color(0xFFDC2626)),
          );
        }
      }
    }
  }

  // Combined chronological history
  List<Map<String, dynamic>> _getFilteredHistory() {
    final List<Map<String, dynamic>> items = [];

    // Add Payments
    for (final p in _payments) {
      final method = (p['paymentMethod'] ?? 'cash').toString().toLowerCase();
      if (_paymentMethodFilter != 'all' && method != _paymentMethodFilter) continue;

      final custName = (p['customerName'] ?? p['customerId'] ?? 'Customer').toString();
      final notes = (p['notes'] ?? '').toString();
      final ref = (p['referenceNumber'] ?? p['providerPaymentId'] ?? '').toString();

      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        if (!custName.toLowerCase().contains(q) &&
            !notes.toLowerCase().contains(q) &&
            !ref.toLowerCase().contains(q)) {
          continue;
        }
      }

      items.add({
        'type': 'customer_payment',
        'id': p['_id'] ?? p['id'],
        'title': custName,
        'subtitle': 'Customer Payment • ${p['paymentType'] ?? 'subscription'}',
        'amount': num.tryParse(p['amount']?.toString() ?? '0') ?? 0,
        'date': p['createdAt'] ?? p['date'] ?? p['paymentDate'],
        'method': method,
        'status': 'verified',
        'ref': ref,
        'collectedBy': p['collectedBy'] ?? 'Admin Counter',
      });
    }

    // Add Handovers
    for (final h in _handovers) {
      final status = (h['status'] ?? 'pending').toString().toLowerCase();
      final driverName = (h['deliveryBoyName'] ?? 'Delivery Partner').toString();
      final area = (h['assignedArea'] ?? '').toString();
      final notes = (h['notes'] ?? '').toString();

      if (_paymentMethodFilter != 'all' && _paymentMethodFilter != 'cash') continue;

      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        if (!driverName.toLowerCase().contains(q) &&
            !area.toLowerCase().contains(q) &&
            !notes.toLowerCase().contains(q)) {
          continue;
        }
      }

      items.add({
        'type': 'shift_handover',
        'id': h['_id'] ?? h['id'],
        'title': driverName,
        'subtitle': 'Shift Cash Handover • $area',
        'amount': num.tryParse(h['amount']?.toString() ?? '0') ?? 0,
        'date': h['createdAt'] ?? h['date'],
        'method': 'cash',
        'status': status,
        'ref': h['notes'] ?? '',
        'raw': h,
      });
    }

    // Sort descending by date
    items.sort((a, b) {
      final da = DateTime.tryParse(a['date']?.toString() ?? '') ?? DateTime(1970);
      final db = DateTime.tryParse(b['date']?.toString() ?? '') ?? DateTime(1970);
      return db.compareTo(da);
    });

    return items;
  }

  // Filtered Delivery Partners
  List<Map<String, dynamic>> _getFilteredPartners() {
    return _deliveryBoys.where((b) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final name = (b['name'] ?? '').toString().toLowerCase();
      final mobile = (b['mobile'] ?? '').toString().toLowerCase();
      final area = (b['assignedArea'] ?? '').toString().toLowerCase();
      return name.contains(q) || mobile.contains(q) || area.contains(q);
    }).toList();
  }

  // Filtered Customers
  List<Map<String, dynamic>> _getFilteredCustomers() {
    return _customers.where((c) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final name = (c['name'] ?? '').toString().toLowerCase();
      final mobile = (c['mobile'] ?? '').toString().toLowerCase();
      final area = (c['area'] ?? '').toString().toLowerCase();
      final id = (c['customerId'] ?? '').toString().toLowerCase();
      return name.contains(q) || mobile.contains(q) || area.contains(q) || id.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final double totalPaymentsAmount = _payments.fold<double>(
      0.0,
      (sum, p) => sum + (num.tryParse(p['amount']?.toString() ?? '0')?.toDouble() ?? 0.0),
    );

    final double totalPartnerCash = _deliveryBoys.fold<double>(
      0.0,
      (sum, b) => sum + (num.tryParse(b['todayCashCollected']?.toString() ?? '0')?.toDouble() ?? 0.0),
    );

    final double totalVerifiedHandover = _handovers
        .where((h) => h['status']?.toString().toLowerCase() == 'accepted')
        .fold<double>(
          0.0,
          (sum, h) => sum + (num.tryParse(h['amount']?.toString() ?? '0')?.toDouble() ?? 0.0),
        );

    final double pendingHandoverAmount = _handovers
        .where((h) => h['status']?.toString().toLowerCase() == 'pending')
        .fold<double>(
          0.0,
          (sum, h) => sum + (num.tryParse(h['amount']?.toString() ?? '0')?.toDouble() ?? 0.0),
        );

    final int pendingHandoverCount = _handovers.where((h) => h['status']?.toString().toLowerCase() == 'pending').length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // ── Top Header ──
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  InkWell(
                    onTap: () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2EBE5), width: 1.2),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.arrow_back_rounded, color: Color(0xFF0C2340), size: 16),
                          SizedBox(width: 4),
                          Text('Back', style: TextStyle(color: Color(0xFF0C2340), fontWeight: FontWeight.w800, fontSize: 12.5)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Payments & History',
                          style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: -0.2),
                        ),
                        Text(
                          'Live audit & shift settlements',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => _loadOverviewData(),
                    icon: const Icon(Icons.refresh_rounded, color: Color(0xFF0D5C3A), size: 22),
                    tooltip: 'Refresh',
                  ),
                ],
              ),
            ),

            // ── Main Content Area ──
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: Color(0xFF0D5C3A)),
                    )
                  : RefreshIndicator(
                      color: const Color(0xFF0D5C3A),
                      onRefresh: () => _loadOverviewData(silent: true),
                      child: ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        children: [
                          if (_error != null)
                            Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEE2E2),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFFCA5A5)),
                              ),
                              child: Text(
                                _error!,
                                style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12),
                              ),
                            ),

                          // 1. KPI Metric Cards
                          SizedBox(
                            height: 98,
                            child: ListView(
                              scrollDirection: Axis.horizontal,
                              children: [
                                _buildMetricCard(
                                  title: 'CUSTOMER PAYMENTS',
                                  value: '₹${totalPaymentsAmount.toInt()}',
                                  subtitle: '${_payments.length} ledger receipts',
                                  icon: Icons.wallet_rounded,
                                  color: const Color(0xFF2563EB),
                                  bg: const Color(0xFFEFF6FF),
                                ),
                                const SizedBox(width: 10),
                                _buildMetricCard(
                                  title: 'DRIVER CASH IN HAND',
                                  value: '₹${totalPartnerCash.toInt()}',
                                  subtitle: '${_deliveryBoys.where((b) => (num.tryParse(b['todayCashCollected']?.toString() ?? '0') ?? 0) > 0).length} drivers holding cash',
                                  icon: Icons.two_wheeler_rounded,
                                  color: const Color(0xFF0D5C3A),
                                  bg: const Color(0xFFE2F1EA),
                                ),
                                const SizedBox(width: 10),
                                _buildMetricCard(
                                  title: 'PENDING HANDOVERS',
                                  value: '₹${pendingHandoverAmount.toInt()}',
                                  subtitle: '$pendingHandoverCount drivers awaiting approval',
                                  icon: Icons.hourglass_top_rounded,
                                  color: const Color(0xFFEA580C),
                                  bg: const Color(0xFFFFEDD5),
                                  isAlert: pendingHandoverCount > 0,
                                ),
                                const SizedBox(width: 10),
                                _buildMetricCard(
                                  title: 'VERIFIED SHIFT CASH',
                                  value: '₹${totalVerifiedHandover.toInt()}',
                                  subtitle: '${_handovers.where((h) => h['status']?.toString().toLowerCase() == 'accepted').length} settled deposits',
                                  icon: Icons.verified_user_rounded,
                                  color: const Color(0xFF059669),
                                  bg: const Color(0xFFDCFCE7),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),

                          // 2. Segmented Pill Tab Bar
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Row(
                              children: [
                                _buildSegmentTab(
                                  id: 'history',
                                  label: 'History',
                                  count: _payments.length + _handovers.length,
                                ),
                                _buildSegmentTab(
                                  id: 'partners',
                                  label: 'Partners',
                                  count: _deliveryBoys.length,
                                  highlight: pendingHandoverCount > 0,
                                ),
                                _buildSegmentTab(
                                  id: 'customers',
                                  label: 'Customers',
                                  count: _customers.length,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // 3. Search & Quick Filters
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: TextField(
                                    controller: _searchController,
                                    onChanged: (v) => setState(() => _searchQuery = v.trim()),
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                                    decoration: InputDecoration(
                                      hintText: _activeTab == 'history'
                                          ? 'Search payments, ref ID, names...'
                                          : _activeTab == 'partners'
                                              ? 'Search driver name, phone, area...'
                                              : 'Search customer name, phone, ID...',
                                      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12.5),
                                      prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 18),
                                      suffixIcon: _searchQuery.isNotEmpty
                                          ? IconButton(
                                              icon: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                                              onPressed: () {
                                                _searchController.clear();
                                                setState(() => _searchQuery = '');
                                              },
                                            )
                                          : null,
                                      border: InputBorder.none,
                                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                                    ),
                                  ),
                                ),
                              ),
                              if (_activeTab == 'history') ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      value: _paymentMethodFilter,
                                      icon: const Icon(Icons.tune_rounded, size: 16, color: Color(0xFF475569)),
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                      onChanged: (val) {
                                        if (val != null) setState(() => _paymentMethodFilter = val);
                                      },
                                      items: const [
                                        DropdownMenuItem(value: 'all', child: Text('All Methods')),
                                        DropdownMenuItem(value: 'cash', child: Text('Cash Only')),
                                        DropdownMenuItem(value: 'upi', child: Text('UPI Only')),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 16),

                          // 4. Tab Views
                          if (_activeTab == 'history') _buildHistoryList(),
                          if (_activeTab == 'partners') _buildPartnersList(pendingHandoverCount),
                          if (_activeTab == 'customers') _buildCustomersList(),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // Segment Tab Helper
  Widget _buildSegmentTab({
    required String id,
    required String label,
    required int count,
    bool highlight = false,
  }) {
    final bool isSelected = _activeTab == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 4),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [const BoxShadow(color: Color(0x0F000000), blurRadius: 4, offset: Offset(0, 1))]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                decoration: BoxDecoration(
                  color: highlight && !isSelected
                      ? const Color(0xFFEA580C)
                      : (isSelected ? const Color(0xFFE2F1EA) : const Color(0xFFCBD5E1)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: highlight && !isSelected
                        ? Colors.white
                        : (isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF475569)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Metric Card Helper
  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bg,
    bool isAlert = false,
  }) {
    return Container(
      width: 200,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isAlert ? const Color(0xFFFDBA74) : const Color(0xFFE2E8F0)),
        boxShadow: const [BoxShadow(color: Color(0x06000000), blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color, letterSpacing: 0.3)),
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
                child: Icon(icon, color: color, size: 15),
              ),
            ],
          ),
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: -0.4)),
          Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  // ── Tab 1: Chronological History List ──
  Widget _buildHistoryList() {
    final items = _getFilteredHistory();

    if (items.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(36),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Column(
          children: [
            Icon(Icons.receipt_long_rounded, size: 36, color: Color(0xFFCBD5E1)),
            SizedBox(height: 10),
            Text('No payment records found', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            SizedBox(height: 4),
            Text('Recorded customer receipts and driver shift deposits will show here.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B)), textAlign: TextAlign.center),
          ],
        ),
      );
    }

    return Column(
      children: items.map((item) {
        final bool isHandover = item['type'] == 'shift_handover';
        final String method = (item['method'] ?? 'cash').toString().toLowerCase();
        final String status = (item['status'] ?? 'verified').toString().toLowerCase();
        final double amount = (item['amount'] as num?)?.toDouble() ?? 0.0;
        final rawDate = item['date']?.toString() ?? '';
        String formattedDate = 'Recent';
        if (rawDate.isNotEmpty) {
          final dt = DateTime.tryParse(rawDate);
          if (dt != null) {
            formattedDate = '${dt.day}/${dt.month}/${dt.year} • ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
          }
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: status == 'pending' ? const Color(0xFFFDBA74) : const Color(0xFFE2E8F0),
            ),
            boxShadow: const [BoxShadow(color: Color(0x04000000), blurRadius: 3, offset: Offset(0, 1))],
          ),
          child: Row(
            children: [
              // Method / Icon
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: isHandover
                      ? (status == 'pending' ? const Color(0xFFFFEDD5) : const Color(0xFFDCFCE7))
                      : (method == 'upi' ? const Color(0xFFEFF6FF) : const Color(0xFFE2F1EA)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isHandover
                      ? Icons.two_wheeler_rounded
                      : (method == 'upi' ? Icons.qr_code_rounded : Icons.payments_rounded),
                  color: isHandover
                      ? (status == 'pending' ? const Color(0xFFEA580C) : const Color(0xFF059669))
                      : (method == 'upi' ? const Color(0xFF2563EB) : const Color(0xFF0D5C3A)),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),

              // Title & Subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item['title'],
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          '+₹${amount.toInt()}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: isHandover ? const Color(0xFF059669) : const Color(0xFF0D5C3A),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${item['subtitle']} • $formattedDate',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        // Status badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: status == 'accepted' || status == 'verified'
                                ? const Color(0xFFDCFCE7)
                                : (status == 'rejected' ? const Color(0xFFFEE2E2) : const Color(0xFFFFEDD5)),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            status.toUpperCase(),
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: status == 'accepted' || status == 'verified'
                                  ? const Color(0xFF059669)
                                  : (status == 'rejected' ? const Color(0xFFDC2626) : const Color(0xFFEA580C)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (isHandover && status == 'pending' && item['raw'] != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: () => _rejectHandover(item['raw']),
                            style: TextButton.styleFrom(
                              foregroundColor: const Color(0xFFDC2626),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text('Reject', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: () => _acceptHandover(item['raw']),
                            icon: const Icon(Icons.check_rounded, size: 14),
                            label: const Text('Accept Cash', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF059669),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  // ── Tab 2: Delivery Partners List ──
  Widget _buildPartnersList(int pendingHandoverCount) {
    final partners = _getFilteredPartners();

    if (partners.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(36),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Column(
          children: [
            Icon(Icons.two_wheeler_rounded, size: 36, color: Color(0xFFCBD5E1)),
            SizedBox(height: 10),
            Text('No delivery partners found', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          ],
        ),
      );
    }

    return Column(
      children: partners.map((boy) {
        final boyId = (boy['_id'] ?? boy['id'])?.toString() ?? '';
        final name = (boy['name'] ?? 'Driver').toString();
        final mobile = (boy['mobile'] ?? '—').toString();
        final area = (boy['assignedArea'] ?? 'All Hubs').toString();
        final double cashInHand = num.tryParse(boy['todayCashCollected']?.toString() ?? '0')?.toDouble() ?? 0.0;
        final double upiCollected = num.tryParse(boy['todayUpiCollected']?.toString() ?? '0')?.toDouble() ?? 0.0;

        final pendingH = _handovers.firstWhere(
          (h) => (h['status']?.toString().toLowerCase() == 'pending') &&
              ((h['deliveryBoyId']?.toString() == boyId) || (h['deliveryBoyMobile']?.toString() == mobile)),
          orElse: () => <String, dynamic>{},
        );

        final bool hasPending = pendingH.isNotEmpty;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: hasPending ? const Color(0xFFFDBA74) : const Color(0xFFE2E8F0),
            ),
            boxShadow: const [BoxShadow(color: Color(0x04000000), blurRadius: 3, offset: Offset(0, 1))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: const Color(0xFFE2F1EA),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'D',
                      style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A), fontSize: 15),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A))),
                        const SizedBox(height: 2),
                        Text('$mobile • $area', style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: boy['status'] == 'active' || boy['isActive'] == true
                          ? const Color(0xFFDCFCE7)
                          : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      boy['status'] == 'active' || boy['isActive'] == true ? 'On Duty' : 'Off Duty',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: boy['status'] == 'active' || boy['isActive'] == true
                            ? const Color(0xFF059669)
                            : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Balances Breakdown
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Cash in Hand', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
                        const SizedBox(height: 2),
                        Text('₹${cashInHand.toInt()}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: cashInHand > 0 ? const Color(0xFF0D5C3A) : const Color(0xFF94A3B8))),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Today UPI', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
                        const SizedBox(height: 2),
                        Text('₹${upiCollected.toInt()}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF2563EB))),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Shift Handover', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
                        const SizedBox(height: 2),
                        Text(
                          hasPending ? '₹${pendingH['amount']} Submitted' : 'Settled',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: hasPending ? const Color(0xFFEA580C) : const Color(0xFF059669),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              if (hasPending) ...[
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    OutlinedButton(
                      onPressed: () => _rejectHandover(pendingH),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFDC2626),
                        side: const BorderSide(color: Color(0xFFFCA5A5)),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Reject', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: () => _acceptHandover(pendingH),
                      icon: const Icon(Icons.check_circle_rounded, size: 14),
                      label: Text('Verify Handover (₹${pendingH['amount']})', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  // ── Tab 3: Customers & Ledgers List ──
  Widget _buildCustomersList() {
    final customers = _getFilteredCustomers();

    if (customers.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(36),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Column(
          children: [
            Icon(Icons.people_alt_rounded, size: 36, color: Color(0xFFCBD5E1)),
            SizedBox(height: 10),
            Text('No customers found', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          ],
        ),
      );
    }

    return Column(
      children: customers.map((c) {
        final name = (c['name'] ?? 'Customer').toString();
        final mobile = (c['mobile'] ?? '—').toString();
        final area = (c['area'] ?? '—').toString();
        final custId = (c['customerId'] ?? '').toString();
        final double balance = num.tryParse(c['currentBalance']?.toString() ?? '0')?.toDouble() ?? 0.0;
        final isDue = balance < 0;
        final isAdvance = balance > 0;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: const [BoxShadow(color: Color(0x04000000), blurRadius: 3, offset: Offset(0, 1))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: const Color(0xFFE0F2FE),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'C',
                      style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0284C7), fontSize: 15),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A)), maxLines: 1, overflow: TextOverflow.ellipsis),
                            ),
                            if (custId.isNotEmpty) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
                                child: Text(custId, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text('$mobile • $area', style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  // Ledger Balance Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDue
                          ? const Color(0xFFFEE2E2)
                          : (isAdvance ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          isDue ? 'DUE: ₹${(-balance).toInt()}' : (isAdvance ? 'ADV: ₹${balance.toInt()}' : 'Settled'),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: isDue ? const Color(0xFFDC2626) : (isAdvance ? const Color(0xFF059669) : const Color(0xFF64748B)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    onPressed: () => widget.onRecordPayment(c),
                    icon: const Icon(Icons.add_rounded, size: 14),
                    label: const Text('Record Payment', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF0D5C3A),
                      side: const BorderSide(color: Color(0xFF0D5C3A)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
