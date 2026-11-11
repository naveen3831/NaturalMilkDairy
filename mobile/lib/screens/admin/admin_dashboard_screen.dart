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
  StreamSubscription? _wsSub;

  @override
  void initState() {
    super.initState();
    _loadAllData();
    _initRealtime();
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
                b['isOnline'] = isOnline;
                if (payload['lastOnlineAt'] != null) b['lastOnlineAt'] = payload['lastOnlineAt'];
                if (payload['lastOfflineAt'] != null) b['lastOfflineAt'] = payload['lastOfflineAt'];
                if (payload['dutyLogs'] != null) b['dutyLogs'] = payload['dutyLogs'];
              }
            }
          });
        }
      }
      _loadAllData(silent: true);
    });
  }

  String _cleanPhone(String? p) {
    if (p == null) return '';
    final d = p.replaceAll(RegExp(r'[^0-9]'), '');
    return d.length > 10 ? d.substring(d.length - 10) : d;
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
        _loadAuditLogs(),
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

  Future<void> _loadAuditLogs() async {
    try {
      final res = await _api.get('/api/reports/audit-logs');
      if (res['success'] == true && res['logs'] is List) {
        if (mounted) {
          setState(() {
            _auditLogs = (res['logs'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          });
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

  Map<String, dynamic>? _findCustomerForDelivery(Map<String, dynamic> d) {
    final custId = d['customerId'] ?? d['id'];
    final custName = (d['customerName'] ?? '').toString().toLowerCase().trim();
    for (final c in _customers) {
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

  Map<String, dynamic> _findDeliveryForCustomer(Map<String, dynamic> c) {
    final cId = c['id'] ?? c['_id'] ?? c['customerId'];
    final cName = (c['name'] ?? '').toString().toLowerCase().trim();

    for (final d in _deliveries) {
      final dCustId = d['customerId'];
      final dCustName = (d['customerName'] ?? '').toString().toLowerCase().trim();

      if (cId != null && dCustId != null && cId.toString() == dCustId.toString()) {
        return d;
      }
      if (cName.isNotEmpty && dCustName.isNotEmpty && cName == dCustName) {
        return d;
      }
    }
    return <String, dynamic>{};
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: valueColor ?? const Color(0xFF0F172A)),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }

  Widget _buildMiniStatBox(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.3)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: color)),
      ],
    );
  }

  void _showDeliveryAndUserDetails(Map<String, dynamic> d) {
    final custName = d['customerName']?.toString() ?? 'Customer';
    final custAddress = d['customerAddress']?.toString() ?? d['address']?.toString() ?? 'Doorstep Drop';
    final dLat = num.tryParse((d['customerLatitude'] ?? d['latitude'])?.toString() ?? '');
    final dLng = num.tryParse((d['customerLongitude'] ?? d['longitude'])?.toString() ?? '');
    final isDelivered = d['status'] == 'delivered';
    final isPending = d['status'] == 'pending';
    final proofUrl = d['proofImage']?.toString();
    final driverName = d['deliveryBoyName']?.toString() ?? 'Unassigned';
    final actualMilk = d['actualMilk'] ?? d['plannedMilk'] ?? 1;
    final actualCurd = d['actualCurd'] ?? d['plannedCurd'] ?? 0;
    final totalAmount = d['totalAmount'] ?? 0;
    final paymentMethod = (d['paymentMethod'] ?? 'credit').toString().toUpperCase();
    final deliveryDate = d['deliveryDate']?.toString() ?? 'Today';

    // Find customer details from _customers list
    final c = _findCustomerForDelivery(d) ?? {};
    final phone = (c['mobile'] ?? d['customerPhone'] ?? d['phone'] ?? '').toString();
    final bal = c['currentBalance'] ?? 0;
    final status = (c['status'] ?? 'active').toString().toUpperCase();
    final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] as Map : {};
    final milkQty = plan['milkQty'] ?? actualMilk;
    final deliveryDays = plan['deliveryDays'] ?? 'Everyday';
    final area = c['area'] ?? d['area'] ?? '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
              const SizedBox(height: 14),
              // Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          custName,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          'Delivery Date: $deliveryDate',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  Container(
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
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Section 1: Customer Profile Details
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(14),
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
                                    Icon(Icons.person_pin_rounded, size: 16, color: Color(0xFF059669)),
                                    SizedBox(width: 6),
                                    Text('Customer Profile Details', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: status == 'ACTIVE' ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(status, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: status == 'ACTIVE' ? const Color(0xFF059669) : const Color(0xFFB45309))),
                                ),
                              ],
                            ),
                            const Divider(height: 18),
                            _buildDetailRow('Full Name', custName),
                            if (phone.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Row(
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
                            ],
                            const SizedBox(height: 6),
                            _buildDetailRow('Doorstep Address', custAddress),
                            if (area.toString().isNotEmpty) ...[
                              const SizedBox(height: 6),
                              _buildDetailRow('Delivery Route / Area', area.toString()),
                            ],
                            if (dLat != null && dLng != null) ...[
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: () => LauncherService.openMap(lat: dLat, lng: dLng, address: custAddress),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFBFDBFE))),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.navigation_rounded, size: 13, color: Color(0xFF2563EB)),
                                      const SizedBox(width: 5),
                                      Text('Navigate to GPS (${dLat.toStringAsFixed(3)}, ${dLng.toStringAsFixed(3)})', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 6),
                            _buildDetailRow('Account Balance', '₹$bal', valueColor: bal > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669)),
                            const SizedBox(height: 6),
                            _buildDetailRow('Subscription Plan', '${milkQty}L Daily Milk • $deliveryDays'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Section 2: Delivery Details
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.local_shipping_rounded, size: 16, color: Color(0xFF2563EB)),
                                SizedBox(width: 6),
                                Text('Delivery & Fulfillment Details', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                              ],
                            ),
                            const Divider(height: 18),
                            _buildDetailRow('Planned Products', '${actualMilk}L Pure Farm Milk${actualCurd > 0 ? " + ${actualCurd}g Curd" : ""}'),
                            const SizedBox(height: 6),
                            _buildDetailRow('Billed Amount', '₹$totalAmount ($paymentMethod)'),
                            const SizedBox(height: 6),
                            _buildDetailRow('Assigned Partner', driverName),
                            if (d['updatedAt'] != null) ...[
                              const SizedBox(height: 6),
                              _buildDetailRow('Last Updated', d['updatedAt'].toString().split('T').first),
                            ],
                            if (proofUrl != null && proofUrl.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              const Text('Doorstep Delivery Photo Proof', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                              const SizedBox(height: 6),
                              InkWell(
                                onTap: () => _showProofPhotoDialog(
                                  deliveryDate,
                                  proofUrl,
                                  driverName,
                                  customerName: d['customerName']?.toString(),
                                  address: (d['customerAddress'] ?? d['deliveryAddress'] ?? d['area'])?.toString(),
                                  time: d['deliveredAt']?.toString() ?? deliveryDate,
                                  lat: dLat,
                                  lng: dLng,
                                ),
                                borderRadius: BorderRadius.circular(10),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: DeliveryProofHelper.buildImageFromSource(
                                    proofUrl,
                                    height: 140,
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

                      // Button: Jump to Customer in Directory
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(ctx);
                            setState(() {
                              _selectedTabIndex = 3;
                              _customerSearch = custName;
                            });
                          },
                          icon: const Icon(Icons.person_search_rounded, size: 16),
                          label: const Text('View Full Customer Ledger in Directory'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showPartnerAndAssignedUsers(Map<String, dynamic> b) {
    final name = b['name'] ?? 'Partner';
    final phone = b['mobile'] ?? 'N/A';
    final area = b['assignedArea'] ?? 'Madhapur';
    final vehicle = b['vehicleNumber'] ?? 'Two-Wheeler';
    final cash = b['todayCashCollected'] ?? 0;
    final upi = b['todayUpiCollected'] ?? 0;
    final bool isOnline = b['isOnline'] == true;
    final partnerId = b['id'] ?? b['_id'] ?? b['boyId'];

    // Find all assigned customers for this partner
    final assignedCustomers = _findAssignedCustomersForPartner(b);
    final completedDrops = _deliveries.where((d) =>
      (d['deliveryBoyId']?.toString() == partnerId?.toString() ||
       (d['deliveryBoyName'] ?? '').toString().toLowerCase() == name.toString().toLowerCase()) &&
      d['status'] == 'delivered'
    ).length;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (sheetCtx, setSheetState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                  const SizedBox(height: 14),
                  // Partner Profile Header
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
                              Text(name.toString(), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                              Text('Route: $area • $vehicle', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                            ],
                          ),
                        ],
                      ),
                      if (phone != 'N/A')
                        InkWell(
                          onTap: () => LauncherService.openDialer(phone.toString()),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.phone_rounded, size: 12, color: Color(0xFF2563EB)),
                                SizedBox(width: 4),
                                Text('Call', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Stats Banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildMiniStatBox('ASSIGNED', '${assignedCustomers.length} Users', const Color(0xFF0F172A)),
                        _buildMiniStatBox('DELIVERED', '$completedDrops Drops', const Color(0xFF059669)),
                        _buildMiniStatBox('COLLECTIONS', '₹${cash + upi}', const Color(0xFF0F766E)),
                        _buildMiniStatBox('DUTY', isOnline ? 'ONLINE' : 'OFFLINE', isOnline ? const Color(0xFF059669) : const Color(0xFF64748B)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Assigned Customers (${assignedCustomers.length})',
                        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      InkWell(
                        onTap: () {
                          Navigator.pop(ctx);
                          _showPartnerDutyLogsSheet(b);
                        },
                        child: const Text('Shift Logs →', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Customer List
                  Expanded(
                    child: assignedCustomers.isEmpty
                        ? Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: const Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.people_outline_rounded, size: 36, color: Color(0xFF94A3B8)),
                                  SizedBox(height: 8),
                                  Text(
                                    'No customers assigned to this route yet',
                                    style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Customers assigned to this partner or territory will appear here.',
                                    style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            itemCount: assignedCustomers.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 10),
                            itemBuilder: (cCtx, i) {
                              final c = assignedCustomers[i];
                              final cName = c['name'] ?? 'Customer';
                              final cPhone = (c['mobile'] ?? '').toString();
                              final cAddress = c['address'] ?? c['doorstepId'] ?? area;
                              final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] : {};
                              final milkQty = plan['milkQty'] ?? 1;
                              final cBal = c['currentBalance'] ?? 0;

                              // Find today's delivery for this customer
                              final custDeliv = _findDeliveryForCustomer(c);
                              final bool hasDelivery = custDeliv.isNotEmpty;
                              final bool isDone = custDeliv['status'] == 'delivered';
                              final bool isPend = custDeliv['status'] == 'pending';

                              return InkWell(
                                onTap: () {
                                  if (hasDelivery) {
                                    _showDeliveryAndUserDetails(custDeliv);
                                  } else {
                                    Navigator.pop(ctx);
                                    setState(() {
                                      _selectedTabIndex = 3;
                                      _customerSearch = cName;
                                    });
                                  }
                                },
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
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
                                              cName,
                                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A)),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                            decoration: BoxDecoration(
                                              color: isDone ? const Color(0xFFECFDF5) : (isPend ? const Color(0xFFFFF8E1) : const Color(0xFFF1F5F9)),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              isDone ? '✓ DELIVERED' : (isPend ? 'PENDING' : 'NO DROP'),
                                              style: TextStyle(
                                                fontSize: 9.5,
                                                fontWeight: FontWeight.w800,
                                                color: isDone ? const Color(0xFF059669) : (isPend ? const Color(0xFFF57F17) : const Color(0xFF64748B)),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        '$cAddress',
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('${milkQty}L Daily Milk • Bal: ₹$cBal', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                                          if (cPhone.isNotEmpty)
                                            InkWell(
                                              onTap: () => LauncherService.openDialer(cPhone),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFEFF6FF),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Row(
                                                  children: [
                                                    Icon(Icons.phone_rounded, size: 10, color: Color(0xFF2563EB)),
                                                    SizedBox(width: 3),
                                                    Text('Call', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                                                  ],
                                                ),
                                              ),
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
              ),
            );
          },
        );
      },
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
              initialCustomers: _customers,
              initialDeliveries: _deliveries,
            ),
          ),
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
              const SizedBox(height: 14),
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
                  value: '₹$todaySales',
                  sub: 'Cash & UPI',
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
                subtitle: 'Cash & UPI received today',
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
              _buildQuickActionPill('Contact & Links', Icons.share_rounded, const Color(0xFFD97706), const Color(0xFFFEF3C7), () => _openContactSettingsModal()),
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
    final name = b['name'] ?? 'Partner';
    final area = b['assignedArea'] ?? 'Madhapur';
    final bool isOnline = b['isOnline'] == true;
    final lastOnline = b['lastOnlineAt'];
    final lastOffline = b['lastOfflineAt'];
    final List logs = (b['dutyLogs'] is List) ? (b['dutyLogs'] as List) : [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.72,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$name Shift History',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      Text('Route: $area', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    ],
                  ),
                  InkWell(
                    onTap: () {
                      Navigator.pop(ctx);
                      _togglePartnerDuty(b);
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isOnline ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: isOnline ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1)),
                      ),
                      child: Text(
                        isOnline ? '🟢 ONLINE (Tap to toggle)' : '⏸ OFFLINE (Tap to toggle)',
                        style: TextStyle(
                          color: isOnline ? const Color(0xFF059669) : const Color(0xFF64748B),
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('LAST ONLINE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                          const SizedBox(height: 2),
                          Text(
                            _formatDutyTime(lastOnline),
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                          ),
                        ],
                      ),
                    ),
                    Container(width: 1, height: 30, color: const Color(0xFFCBD5E1)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('LAST OFFLINE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                          const SizedBox(height: 2),
                          Text(
                            _formatDutyTime(lastOffline),
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'DUTY TRANSITION TIMELINE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF475569), letterSpacing: 0.5),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: logs.isEmpty
                    ? Center(
                        child: Text(
                          'No shift transitions logged yet for $name.',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                        ),
                      )
                    : ListView.separated(
                        itemCount: logs.length,
                        separatorBuilder: (_, _) => const Divider(height: 12, color: Color(0xFFF1F5F9)),
                        itemBuilder: (context, idx) {
                          final item = Map<String, dynamic>.from(logs[logs.length - 1 - idx] as Map);
                          final status = (item['status'] ?? 'online').toString();
                          final isLogOnline = status == 'online';
                          final time = item['timestamp'];
                          final logArea = item['area'] ?? area;

                          return Row(
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
                                      _formatDutyTime(time),
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: Color(0xFF0F172A)),
                                    ),
                                    Text(
                                      'Territory: $logArea',
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
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
        Row(
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
            );
          },
        ),
      ],
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
    final todayMilkLitres = _summary['todayMilkLitres'] ?? 0;
    final todayCurdGrams = _summary['todayCurdGrams'] ?? 0;
    final todaySales = _summary['todaySales'] ?? 0;
    final totalOutstanding = _summary['totalOutstanding'] ?? 0;

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
                  onTap: () => setState(() => _selectedTabIndex = 1),
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
                  onTap: () => setState(() => _selectedTabIndex = 2),
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
                  onTap: () => setState(() => _selectedTabIndex = 3),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildMetricMiniCard(
                  title: 'Today Volume',
                  value: '$todayMilkLitres L Milk',
                  icon: Icons.water_drop_outlined,
                  color: const Color(0xFFD97706),
                  bg: const Color(0xFFFEF3C7),
                  onTap: () => setState(() => _selectedTabIndex = 0),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // 4. SECTION: Financial & Fulfillment Overview
          _buildProfileSectionContainer(
            icon: Icons.analytics_outlined,
            title: 'Financial & Ledger Performance',
            children: [
              _buildProfileDetailRow(
                icon: Icons.currency_rupee_rounded,
                label: 'Today Total Sales',
                value: '₹$todaySales',
                badgeText: 'Realtime',
                badgeColor: const Color(0xFF059669),
              ),
              _buildDivider(),
              _buildProfileDetailRow(
                icon: Icons.credit_card_off_rounded,
                label: 'Total Outstanding Credit',
                value: '₹$totalOutstanding',
                badgeText: totalOutstanding > 0 ? 'Recovery Due' : 'All Clear',
                badgeColor: totalOutstanding > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
              ),
              _buildDivider(),
              _buildProfileDetailRow(
                icon: Icons.inventory_2_outlined,
                label: 'Curd & Value-Add Supply',
                value: '$todayCurdGrams g Produced',
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 5. SECTION: Management Shortcuts
          _buildProfileSectionContainer(
            icon: Icons.tune_rounded,
            title: 'Management Shortcuts',
            children: [
              _buildNavigationRow(
                icon: Icons.local_shipping_outlined,
                title: 'Today Deliveries Dispatch',
                subtitle: 'Track $totalDeliveries doorstep drops & statuses',
                onTap: () => setState(() => _selectedTabIndex = 1),
              ),
              _buildDivider(),
              _buildNavigationRow(
                icon: Icons.sports_motorsports_outlined,
                title: 'Fleet & Driver Attendance',
                subtitle: '$onlinePartners of $totalPartners drivers active on duty',
                onTap: () => setState(() => _selectedTabIndex = 2),
              ),
              _buildDivider(),
              _buildNavigationRow(
                icon: Icons.people_outline_rounded,
                title: 'Customer Directory & Accounts',
                subtitle: 'Manage $totalCustomers households & subscriptions',
                onTap: () => setState(() => _selectedTabIndex = 3),
              ),
              _buildDivider(),
              _buildNavigationRow(
                icon: Icons.share_rounded,
                title: 'Contact Details & Social Media',
                subtitle: 'Manage helplines, WhatsApp & official channels',
                onTap: () => _openContactSettingsModal(),
              ),
              _buildDivider(),
              _buildNavigationRow(
                icon: Icons.refresh_rounded,
                title: 'Refresh System Data',
                subtitle: 'Sync latest orders, payments & telemetry',
                onTap: () async {
                  await _loadAllData();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('All administrative data refreshed successfully'),
                        backgroundColor: Color(0xFF059669),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  }
                },
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

  Widget _buildProfileDetailRow({
    required IconData icon,
    required String label,
    required String value,
    String? subValue,
    String? badgeText,
    Color? badgeColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: const Color(0xFF475569)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                if (subValue != null && subValue.isNotEmpty) ...[
                  const SizedBox(height: 1),
                  Text(
                    subValue,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (badgeText != null && badgeText.isNotEmpty) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: (badgeColor ?? const Color(0xFF059669)).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: (badgeColor ?? const Color(0xFF059669)).withValues(alpha: 0.3),
                ),
              ),
              child: Text(
                badgeText,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: badgeColor ?? const Color(0xFF059669),
                ),
              ),
            ),
          ],
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

  void _openContactSettingsModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ContactSettingsBottomSheet(
        api: _api,
        onSaved: () => _loadAllData(silent: true),
      ),
    );
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
// CONTACT DETAILS & SOCIAL MEDIA SETTINGS BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────
class _ContactSettingsBottomSheet extends StatefulWidget {
  final ApiService api;
  final VoidCallback onSaved;

  const _ContactSettingsBottomSheet({
    required this.api,
    required this.onSaved,
  });

  @override
  State<_ContactSettingsBottomSheet> createState() => _ContactSettingsBottomSheetState();
}

class _ContactSettingsBottomSheetState extends State<_ContactSettingsBottomSheet> {
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
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _isEditing ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    _isEditing ? Icons.edit_rounded : Icons.share_rounded,
                    color: _isEditing ? const Color(0xFFD97706) : const Color(0xFF059669),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isEditing ? 'Edit Contact & Social Media' : 'Contact & Social Links',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        _isEditing ? 'Make updates then tap Save Changes' : 'Live business helplines, WhatsApp & social directory',
                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                if (!_isEditing)
                  TextButton.icon(
                    onPressed: () => setState(() => _isEditing = true),
                    icon: const Icon(Icons.edit_rounded, size: 15, color: Color(0xFF059669)),
                    label: const Text('Edit', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w800, fontSize: 13)),
                  )
                else
                  IconButton(
                    onPressed: () {
                      _loadData();
                      setState(() => _isEditing = false);
                    },
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                  ),
              ],
            ),
          ),

          // Body: View Details Mode vs Edit Form Mode
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF059669)))
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: _isEditing ? _buildEditForm() : _buildViewDetails(),
                  ),
          ),

          // Bottom Action Bar
          Container(
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
        ],
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
  @override
  Widget build(BuildContext context) {
    final collections = widget.summary['paymentsCollected'] ?? widget.summary['todaySales'] ?? 0;
    final todayLitres = widget.summary['todayMilkLitres'] ?? '0.0';

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
                    '₹$collections',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F766E),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Total collections received from doorstep customers for ${todayLitres}L milk fulfilled today.',
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
                  final collectedSum = partnerDrops
                    .where((d) => d['status'] == 'delivered')
                    .fold<num>(0, (sum, d) => sum + (d['totalAmount'] ?? 0));

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
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('₹$collectedSum', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F766E))),
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
                  'Delivered Drops Summary',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
                ),
                InkWell(
                  onTap: widget.onSelectDeliveries,
                  child: const Text('View All Drops →', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                ),
              ],
            ),
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
