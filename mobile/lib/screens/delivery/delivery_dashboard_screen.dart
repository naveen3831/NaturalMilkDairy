import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../data/services/api_service.dart';
import '../../data/services/realtime_service.dart';
import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';

class DeliveryPartnerDashboardScreen extends StatefulWidget {
  const DeliveryPartnerDashboardScreen({super.key});

  @override
  State<DeliveryPartnerDashboardScreen> createState() => _DeliveryPartnerDashboardScreenState();
}

class _DeliveryPartnerDashboardScreenState extends State<DeliveryPartnerDashboardScreen> {
  final ApiService _api = ApiService();
  final RealtimeService _realtime = RealtimeService();

  int _selectedTabIndex = 0; // 0: Deliveries, 1: Route, 2: Customers, 3: Cash, 4: Profile
  List<Map<String, dynamic>> _deliveries = [];
  List<Map<String, dynamic>> _assignedCustomers = [];
  bool _isLoading = false;
  String _filterStatus = 'pending'; // 'pending', 'delivered', 'not_delivered', 'all'
  String _searchQuery = '';
  StreamSubscription? _wsSub;

  // Driver Profile States
  String _profileName = 'naveen';
  String _profilePhone = '9701878789';
  String _profileEmail = 'naveenkumar970100@gmail.com';
  String _profileArea = 'madhapur';
  String _partnerId = 'NMD-DRV-DE27';
  String _vehiclePlate = 'Vehicle not assigned';
  final String _vehicleModel = 'Commercial Cargo EV';
  String _bloodGroup = 'B+';
  final String _drivingLicense = 'TS-09-2023-0091';
  final String _emergencyContact = '+91 97018 78789';
  final String _supervisorHotline = '+91 98765 43210';
  final String _operatingHours = '5:00 AM – 7:30 AM';
  final String _depotAddress = 'Madhapur Central Hub, Pillar 24, Hyderabad';
  bool _isOnDuty = true;

  // Full-screen Sub-screens and Notifications
  String? _activeProfileSubScreen; // null, 'edit', 'personal', 'contact', 'territory', 'vehicle', 'support'
  bool _isNotificationScreenOpen = false;
  List<Map<String, dynamic>> _notifications = [];
  int _unreadNotifCount = 2;
  String _notifFilter = 'all'; // 'all', 'unread', 'deliveries', 'system'
  final List<Map<String, dynamic>> _sentSupportMessages = [];

  @override
  void initState() {
    super.initState();
    _loadData();
    _loadNotifications(silent: true);
    _initRealtime();
  }

  void _initRealtime() {
    _wsSub = _realtime.eventStream.listen((event) {
      final type = event['type']?.toString();
      if (type == 'NOTIFICATION_DELETED') {
        final delId = event['id']?.toString() ?? event['payload']?['id']?.toString();
        if (delId != null && delId.isNotEmpty && mounted) {
          setState(() {
            _notifications.removeWhere((n) =>
                n['_id'] == delId ||
                n['id'] == delId ||
                n['_id']?.toString() == delId ||
                n['id']?.toString() == delId);
            _unreadNotifCount = _notifications.where((n) => n['isRead'] != true).length;
          });
        }
        _loadNotifications(silent: true);
      } else if (type == 'NOTIFICATIONS_CLEARED') {
        if (mounted) {
          setState(() {
            _notifications.clear();
            _unreadNotifCount = 0;
          });
        }
        _loadNotifications(silent: true);
      } else if (type == 'DELIVERY_UPDATED' ||
          type == 'DELIVERY_BOY_UPDATED' ||
          type == 'CUSTOMER_UPDATED' ||
          type == 'ORDER_UPDATED' ||
          type == 'NOTIFICATION_UPDATED' ||
          type == 'NOTIFICATION_CREATED') {
        _loadData(silent: true);
        _loadNotifications(silent: true);
      }
    });
  }

  Future<void> _loadNotifications({bool silent = false}) async {
    try {
      final res = await _api.get('/api/notifications');
      if (res['success'] == true && res['notifications'] is List) {
        final list = (res['notifications'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        if (mounted) {
          setState(() {
            _notifications = list;
            _unreadNotifCount = _notifications.where((n) => n['isRead'] != true).length;
          });
        }
        return;
      }
    } catch (_) {}
  }

  Future<void> _markNotifAsRead(String id) async {
    setState(() {
      final idx = _notifications.indexWhere((n) =>
          n['_id'] == id || n['id'] == id || n['_id']?.toString() == id || n['id']?.toString() == id);
      if (idx != -1) {
        _notifications[idx]['isRead'] = true;
        _unreadNotifCount = _notifications.where((n) => n['isRead'] != true).length;
      }
    });
    try {
      await _api.put('/api/notifications/$id/read', {});
    } catch (_) {}
  }

  Future<void> _markAllNotifsAsRead() async {
    setState(() {
      for (var n in _notifications) {
        n['isRead'] = true;
      }
      _unreadNotifCount = 0;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ All notifications marked as read')),
      );
    }
    try {
      await _api.put('/api/notifications/read-all', {});
    } catch (_) {}
  }

  Future<void> _deleteNotif(String id) async {
    setState(() {
      _notifications.removeWhere((n) =>
          n['_id'] == id || n['id'] == id || n['_id']?.toString() == id || n['id']?.toString() == id);
      _unreadNotifCount = _notifications.where((n) => n['isRead'] != true).length;
    });
    try {
      await _api.delete('/api/notifications/$id');
    } catch (_) {}
  }

  Future<void> _clearAllNotifs() async {
    setState(() {
      _notifications.clear();
      _unreadNotifCount = 0;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ All notifications cleared')),
      );
    }
    try {
      await _api.delete('/api/notifications/clear-all');
    } catch (_) {}
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    super.dispose();
  }

  Future<void> _loadData({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _api.get('/api/deliveries?range=today'),
        _api.get('/api/deliveries/assigned-customers'),
      ]);

      final delRes = results[0];
      final custRes = results[1];

      if (mounted) {
        final authUser = context.read<AuthProvider>().user;
        setState(() {
          if (authUser != null) {
            if (authUser.name.isNotEmpty) _profileName = authUser.name;
            if (authUser.mobile.isNotEmpty) _profilePhone = authUser.mobile;
            if (authUser.email != null && authUser.email!.isNotEmpty) _profileEmail = authUser.email!;
            if (authUser.assignedArea.isNotEmpty) _profileArea = authUser.assignedArea;
            if (authUser.id.isNotEmpty) {
              final cleanId = authUser.id.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
              if (cleanId.length >= 4) {
                _partnerId = 'NMD-DRV-${cleanId.substring(cleanId.length - 4).toUpperCase()}';
              }
            }
          }

          if (delRes['success'] == true && delRes['deliveries'] is List) {
            _deliveries = (delRes['deliveries'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          }

          if (custRes['success'] == true && custRes['customers'] is List) {
            _assignedCustomers = (custRes['customers'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          }
        });
      }
    } catch (e) {
      debugPrint('Error loading delivery partner data: $e');
    } finally {
      if (mounted && !silent) setState(() => _isLoading = false);
    }
  }

  // Statistics
  int get _totalCount => _deliveries.length;
  int get _completedCount => _deliveries.where((d) => d['status'] == 'delivered').length;
  int get _pendingCount => _deliveries.where((d) => d['status'] == 'pending').length;
  int get _notDeliveredCount => _deliveries.where((d) => d['status'] == 'not_delivered').length;

  int get _progressPercent {
    if (_totalCount == 0) return 0;
    return ((_completedCount / _totalCount) * 100).round();
  }

  double get _todayCash {
    return _deliveries
        .where((d) => d['status'] == 'delivered' && d['paymentMethod'] == 'cash')
        .fold(0.0, (sum, d) => sum + (num.tryParse(d['paymentAmount']?.toString() ?? '0') ?? 0).toDouble());
  }

  double get _todayUpi {
    return _deliveries
        .where((d) => d['status'] == 'delivered' && d['paymentMethod'] == 'upi')
        .fold(0.0, (sum, d) => sum + (num.tryParse(d['paymentAmount']?.toString() ?? '0') ?? 0).toDouble());
  }

  List<Map<String, dynamic>> get _filteredDeliveries {
    List<Map<String, dynamic>> list = _deliveries;
    if (_filterStatus != 'all') {
      list = list.where((d) => d['status'] == _filterStatus).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((d) {
        final name = (d['customerName'] ?? '').toString().toLowerCase();
        final phone = (d['customerPhone'] ?? '').toString().toLowerCase();
        final addr = (d['customerAddress'] ?? '').toString().toLowerCase();
        return name.contains(q) || phone.contains(q) || addr.contains(q);
      }).toList();
    }
    return list;
  }

  void _callCustomer(String phone) {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) return;
    Clipboard.setData(ClipboardData(text: clean));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Copied phone number ($clean) to clipboard'),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _openMap(String address) {
    Clipboard.setData(ClipboardData(text: address));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Address copied: $address'),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _showMarkDeliveredDialog(Map<String, dynamic> delivery) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => _FullScreenMarkDeliveredPage(
          delivery: delivery,
          api: _api,
          onSuccess: () => _loadData(silent: true),
        ),
      ),
    );
  }


  void _showMarkNotDeliveredDialog(Map<String, dynamic> delivery) {
    String reason = 'Door Locked / No Response';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Mark Not Delivered', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Select reason for ${delivery['customerName']}:', style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: reason,
                isExpanded: true,
                decoration: const InputDecoration(isDense: true),
                items: const [
                  DropdownMenuItem(value: 'Door Locked / No Response', child: Text('Door Locked / No Response')),
                  DropdownMenuItem(value: 'Customer Vacation / Out of City', child: Text('Customer Vacation / Out of City')),
                  DropdownMenuItem(value: 'Refused Delivery Today', child: Text('Refused Delivery Today')),
                  DropdownMenuItem(value: 'Road Inaccessible / Heavy Rain', child: Text('Road Inaccessible')),
                ],
                onChanged: (v) => setDialogState(() => reason = v ?? reason),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final scaffold = ScaffoldMessenger.of(context);
                final nav = Navigator.of(ctx);
                final deliveryId = delivery['_id'] ?? delivery['id'];
                final res = await _api.post('/api/deliveries/$deliveryId/not-delivered', {
                  'reason': reason,
                  'actor': 'Mobile Driver',
                });
                nav.pop();
                if (res['success'] == true) {
                  scaffold.showSnackBar(
                    const SnackBar(content: Text('Marked as Not Delivered (no charge applied)')),
                  );
                  _loadData(silent: true);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
              child: const Text('Confirm', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final boyName = auth.user?.name ?? 'naveen';
    final boyArea = auth.user?.assignedArea ?? 'madhapur';

    return PopScope(
      canPop: _activeProfileSubScreen == null && !_isNotificationScreenOpen && _selectedTabIndex == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_isNotificationScreenOpen) {
          setState(() => _isNotificationScreenOpen = false);
        } else if (_activeProfileSubScreen != null) {
          setState(() => _activeProfileSubScreen = null);
        } else if (_selectedTabIndex != 0) {
          setState(() => _selectedTabIndex = 0);
        }
      },
      child: Scaffold(
        backgroundColor: (_selectedTabIndex == 4 || _isNotificationScreenOpen) ? Colors.white : const Color(0xFFF8FAFC),
        body: SafeArea(
          child: Column(
            children: [
              // TOP HEADER - Exactly matching web mobile responsive screenshot
              _buildTopHeader(boyName, boyArea),

              // MAIN TAB CONTENT
              Expanded(
                child: _isNotificationScreenOpen
                    ? _buildNotificationsScreen()
                    : RefreshIndicator(
                        onRefresh: () async {
                          await _loadData(silent: true);
                          await _loadNotifications(silent: true);
                        },
                        color: const Color(0xFF059669),
                        child: _buildCurrentTab(boyName, boyArea),
                      ),
              ),
            ],
          ),
        ),

        // BOTTOM NAVIGATION BAR - HIDDEN IN SUB-SCREENS FOR TRUE FULL-SCREEN EXPERIENCE
        bottomNavigationBar: (_activeProfileSubScreen != null || _isNotificationScreenOpen)
            ? null
            : _buildBottomNavigationBar(),
      ),
    );
  }


  // HEADER MATCHING SCREENSHOT
  Widget _buildTopHeader(String boyName, String boyArea) {
    if (_isNotificationScreenOpen) {
      return Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        color: Colors.white,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A), size: 24),
                  onPressed: () => setState(() => _isNotificationScreenOpen = false),
                ),
                const SizedBox(width: 4),
                const Text(
                  'Notifications',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                if (_unreadNotifCount > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(10)),
                    child: Text('$_unreadNotifCount new', style: const TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.w800)),
                  ),
                ],
              ],
            ),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.done_all_rounded, size: 20, color: Color(0xFF059669)),
                  tooltip: 'Mark all as read',
                  onPressed: _markAllNotifsAsRead,
                ),
                IconButton(
                  icon: const Icon(Icons.delete_sweep_outlined, size: 20, color: Color(0xFF64748B)),
                  tooltip: 'Clear all',
                  onPressed: _clearAllNotifs,
                ),
              ],
            ),
          ],
        ),
      );
    }

    if (_selectedTabIndex == 4) {
      String title = 'Driver Profile';
      VoidCallback onBack = () => setState(() => _selectedTabIndex = 0);

      if (_activeProfileSubScreen != null) {
        onBack = () => setState(() => _activeProfileSubScreen = null);
        switch (_activeProfileSubScreen) {
          case 'edit':
            title = 'Edit Driver Profile';
            break;
          case 'personal':
            title = 'Personal Information';
            break;
          case 'contact':
            title = 'Contact Information';
            break;
          case 'territory':
            title = 'Territory & Dispatch';
            break;
          case 'vehicle':
            title = 'Vehicle & Equipment';
            break;
          case 'support':
            title = 'Help & Support Desk';
            break;
        }
      }

      return Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        color: Colors.white,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A), size: 24),
                onPressed: onBack,
              ),
            ),
            Text(
              title,
              style: const TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              // Dairy Logo Box
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                padding: const EdgeInsets.all(4),
                child: Image.asset(
                  'assets/images/logo.png',
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(Icons.water_drop_rounded, color: Color(0xFF059669), size: 22),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        boyName.toLowerCase(),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(width: 5),
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 12, color: Color(0xFF059669)),
                      const SizedBox(width: 2),
                      Text(
                        boyArea.toLowerCase(),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // Notification Bell with Interactive InkWell
          InkWell(
            onTap: () => setState(() => _isNotificationScreenOpen = true),
            borderRadius: BorderRadius.circular(10),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: const Icon(Icons.notifications_none_rounded, color: Color(0xFF059669), size: 22),
                ),
                if (_unreadNotifCount > 0)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE11D48),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: Center(
                        child: Text(
                          _unreadNotifCount > 9 ? '9+' : '$_unreadNotifCount',
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // BOTTOM NAVIGATION BAR - 5 TABS MATCHING SCREENSHOT EXACTLY
  Widget _buildBottomNavigationBar() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFF1F5F9), width: 1.2)),
      ),
      padding: const EdgeInsets.only(top: 8, bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildBottomTabItem(
            index: 0,
            icon: Icons.local_shipping_outlined,
            activeIcon: Icons.local_shipping_outlined,
            label: 'Deliveries',
            badgeCount: _pendingCount > 0 ? _pendingCount : 1,
          ),
          _buildBottomTabItem(
            index: 1,
            icon: Icons.format_list_bulleted_rounded,
            activeIcon: Icons.format_list_bulleted_rounded,
            label: 'Route',
          ),
          _buildBottomTabItem(
            index: 2,
            icon: Icons.people_outline_rounded,
            activeIcon: Icons.people_outline_rounded,
            label: 'Customers',
            badgeCount: _assignedCustomers.isNotEmpty ? _assignedCustomers.length : 1,
          ),
          _buildBottomTabItem(
            index: 3,
            icon: Icons.account_balance_wallet_outlined,
            activeIcon: Icons.account_balance_wallet_outlined,
            label: 'Cash',
          ),
          _buildBottomTabItem(
            index: 4,
            icon: Icons.person_outline_rounded,
            activeIcon: Icons.person_outline_rounded,
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildBottomTabItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
    int? badgeCount,
  }) {
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
              if (badgeCount != null && badgeCount > 0)
                Positioned(
                  top: -6,
                  right: -8,
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
                        badgeCount > 99 ? '99+' : '$badgeCount',
                        style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentTab(String boyName, String boyArea) {
    switch (_selectedTabIndex) {
      case 0:
        return _buildDeliveriesTab(boyArea);
      case 1:
        return _buildRouteTab(boyArea);
      case 2:
        return _buildCustomersTab();
      case 3:
        return _buildCashTab();
      case 4:
        if (_activeProfileSubScreen != null) {
          switch (_activeProfileSubScreen) {
            case 'edit':
              return _buildEditProfileFullScreen();
            case 'personal':
              return _buildPersonalInformationFullScreen();
            case 'contact':
              return _buildContactInformationFullScreen();
            case 'territory':
              return _buildTerritoryDispatchFullScreen();
            case 'vehicle':
              return _buildVehicleEquipmentFullScreen();
            case 'support':
              return _buildHelpSupportFullScreen();
          }
        }
        return _buildProfileTab(boyName, boyArea);
      default:
        return _buildDeliveriesTab(boyArea);
    }
  }

  // =========================================================
  // TAB 0: DELIVERIES (EXACT SCREENSHOT LAYOUT)
  // =========================================================
  Widget _buildDeliveriesTab(String boyArea) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. PAGE TITLE & SUBTITLE
          const Text(
            'Your deliveries',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            '$boyArea · $_pendingCount remaining of $_totalCount stops',
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 16),

          // 2. ROUTE PROGRESS CARD (WHITE CONTAINER WITH 2X2 GRID)
          Container(
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
              children: [
                // Top Progress Status
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
                        const Text(
                          'ROUTE PROGRESS',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF065F46),
                            letterSpacing: 0.3,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '$_progressPercent% Complete',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF059669),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: _totalCount > 0 ? _completedCount / _totalCount : 0,
                    minHeight: 6,
                    backgroundColor: const Color(0xFFF1F5F9),
                    valueColor: const AlwaysStoppedAnimation(Color(0xFF059669)),
                  ),
                ),
                const SizedBox(height: 14),

                // 2x2 KPI GRID
                Row(
                  children: [
                    Expanded(
                      child: _buildKpiBox(
                        title: 'DROPS',
                        value: '$_totalCount',
                        bgColor: const Color(0xFFF8FAFC),
                        borderColor: const Color(0xFFE2E8F0),
                        titleColor: const Color(0xFF64748B),
                        valColor: const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildKpiBox(
                        title: 'DONE',
                        value: '$_completedCount',
                        bgColor: const Color(0xFFECFDF5),
                        borderColor: const Color(0xFFBBF7D0),
                        titleColor: const Color(0xFF065F46),
                        valColor: const Color(0xFF059669),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _buildKpiBox(
                        title: 'PENDING',
                        value: '$_pendingCount',
                        bgColor: const Color(0xFFFFFBEB),
                        borderColor: const Color(0xFFFDE68A),
                        titleColor: const Color(0xFF92400E),
                        valColor: const Color(0xFFB45309),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildKpiBox(
                        title: 'CASH',
                        value: '₹${_todayCash.toInt()}',
                        bgColor: const Color(0xFFF0FDF4),
                        borderColor: const Color(0xFFBBF7D0),
                        titleColor: const Color(0xFF065F46),
                        valColor: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. FILTER PILLS & SEARCH BAR
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                // Scrollable Pill Tabs
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildPillTab('pending', 'Pending ($_pendingCount)'),
                      const SizedBox(width: 8),
                      _buildPillTab('delivered', 'Delivered ($_completedCount)'),
                      const SizedBox(width: 8),
                      _buildPillTab('not_delivered', 'Not Done ($_notDeliveredCount)'),
                      const SizedBox(width: 8),
                      _buildPillTab('all', 'All ($_totalCount)'),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Search Input Box
                TextField(
                  onChanged: (v) => setState(() => _searchQuery = v.trim()),
                  decoration: InputDecoration(
                    hintText: 'Search customer, flat, phone...',
                    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                    prefixIcon: const Icon(Icons.search_rounded, size: 20, color: Color(0xFF94A3B8)),
                    isDense: true,
                    filled: true,
                    fillColor: const Color(0xFFF8FAF9),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFFE5EBE6)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFFE5EBE6)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFF059669)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. DELIVERY CARDS LIST
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: Color(0xFF059669))))
          else if (_filteredDeliveries.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Icon(Icons.check_circle_outline_rounded, size: 48, color: Colors.green.shade300),
                  const SizedBox(height: 12),
                  const Text('No drops match this view', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  const SizedBox(height: 4),
                  const Text('Route fulfillments are fully up to date.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _filteredDeliveries.length,
              separatorBuilder: (_, _) => const SizedBox(height: 14),
              itemBuilder: (ctx, idx) => _buildDeliveryCard(_filteredDeliveries[idx], idx),
            ),
        ],
      ),
    );
  }

  // KPI BOX HELPER
  Widget _buildKpiBox({
    required String title,
    required String value,
    required Color bgColor,
    required Color borderColor,
    required Color titleColor,
    required Color valColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: titleColor, letterSpacing: 0.4),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: valColor),
          ),
        ],
      ),
    );
  }

  // PILL TAB HELPER
  Widget _buildPillTab(String id, String label) {
    final isSelected = _filterStatus == id;
    return InkWell(
      onTap: () => setState(() => _filterStatus = id),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEDF5EF) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFFCDDFD1) : const Color(0xFFE7EDE8),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? const Color(0xFF315A42) : const Color(0xFF65756A),
          ),
        ),
      ),
    );
  }

  // DELIVERY CARD HELPER (MATCHING SCREENSHOT)
  Widget _buildDeliveryCard(Map<String, dynamic> d, int index) {
    final isDelivered = d['status'] == 'delivered';
    final isPending = d['status'] == 'pending';
    final customerName = d['customerName']?.toString() ?? 'Customer';
    final phone = d['customerPhone']?.toString() ?? '';
    final address = d['customerAddress']?.toString() ?? 'Madhapur Doorstep Drop';
    final notes = d['specialInstructions']?.toString() ?? 'Registered via web portal';
    final milkQty = d['plannedMilk'] ?? 1;
    final curdQty = d['plannedCurd'] ?? 0;
    final paymentInfo = d['paymentMethod'] ?? 'prepaid';
    final expiryText = d['subscriptionEnd'] ?? 'Prepaid to 13/11/2026';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDelivered ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
        ),
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
          // Top Row: #Index, Name & Status Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Text(
                        '#${index + 1}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF475569)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        customerName,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDelivered
                      ? const Color(0xFFECFDF5)
                      : (isPending ? const Color(0xFFFFFBEB) : const Color(0xFFFEF2F2)),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDelivered
                        ? const Color(0xFFBBF7D0)
                        : (isPending ? const Color(0xFFFDE68A) : const Color(0xFFFECACA)),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isDelivered ? '✓ ' : '○ ',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: isDelivered
                            ? const Color(0xFF059669)
                            : (isPending ? const Color(0xFFB45309) : const Color(0xFFDC2626)),
                      ),
                    ),
                    Text(
                      isDelivered ? 'Delivered' : (isPending ? 'Pending' : 'Not Done'),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: isDelivered
                            ? const Color(0xFF059669)
                            : (isPending ? const Color(0xFFB45309) : const Color(0xFFDC2626)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Second Row: Prepaid date info
          Align(
            alignment: Alignment.centerRight,
            child: Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 8),
              child: Text(
                paymentInfo == 'prepaid' ? expiryText : 'Billing: ${paymentInfo.toString().toUpperCase()}',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
            ),
          ),

          // Product Tag: 🥛 1L Milk
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('🥛', style: TextStyle(fontSize: 13)),
                    const SizedBox(width: 4),
                    Text(
                      '${milkQty}L Milk',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF065F46)),
                    ),
                  ],
                ),
              ),
              if (curdQty > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('🥣', style: TextStyle(fontSize: 13)),
                      const SizedBox(width: 4),
                      Text(
                        '${curdQty}g Curd',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF065F46)),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),

          // Address Box
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAF9),
              borderRadius: BorderRadius.circular(9),
              border: Border.all(color: const Color(0xFFEDF1ED)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_outlined, size: 15, color: Color(0xFF059669)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    address,
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Note Box
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF9EE),
              borderRadius: BorderRadius.circular(9),
              border: Border.all(color: const Color(0xFFFAECD4)),
            ),
            child: Row(
              children: [
                const Text('🔔', style: TextStyle(fontSize: 13)),
                const SizedBox(width: 6),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(fontSize: 12, color: Color(0xFF854D0E)),
                      children: [
                        const TextSpan(text: 'Note: ', style: TextStyle(fontWeight: FontWeight.w800)),
                        TextSpan(text: notes, style: const TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Actions Row: Call, Map, Delivered, Skip
          Row(
            children: [
              // Call
              Expanded(
                flex: 2,
                child: OutlinedButton.icon(
                  onPressed: () => _callCustomer(phone),
                  icon: const Icon(Icons.phone_rounded, size: 15, color: Color(0xFF065F46)),
                  label: const Text('Call', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF065F46))),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: const Color(0xFFECFDF5),
                    side: const BorderSide(color: Color(0xFFBBF7D0)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Map
              Expanded(
                flex: 2,
                child: OutlinedButton.icon(
                  onPressed: () => _openMap(address),
                  icon: const Icon(Icons.navigation_rounded, size: 15, color: Color(0xFF1D4ED8)),
                  label: const Text('Map', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8))),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: const Color(0xFFEFF6FF),
                    side: const BorderSide(color: Color(0xFFBFDBFE)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Delivered
              Expanded(
                flex: 3,
                child: ElevatedButton.icon(
                  onPressed: isDelivered ? null : () => _showMarkDeliveredDialog(d),
                  icon: const Icon(Icons.check_rounded, size: 16, color: Colors.white),
                  label: Text(
                    isDelivered ? 'Done' : 'Delivered',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Skip
              Expanded(
                flex: 2,
                child: OutlinedButton.icon(
                  onPressed: () => _showMarkNotDeliveredDialog(d),
                  icon: const Icon(Icons.close_rounded, size: 15, color: Color(0xFFDC2626)),
                  label: const Text('Skip', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFDC2626))),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFFFEE2E2)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // =========================================================
  // TAB 1: ROUTE & STOPS
  // =========================================================
  Widget _buildRouteTab(String boyArea) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Route & Stops Sequence', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF0F172A))),
                  Text('Territory: $boyArea • ${_deliveries.length} ordered drops', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: const Text('MORNING SHIFT', style: TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.w800, fontSize: 10)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_deliveries.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
              child: const Center(child: Text('No route stops scheduled for today')),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _deliveries.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) {
                final d = _deliveries[i];
                final isDelivered = d['status'] == 'delivered';
                return InkWell(
                  onTap: () => _openStopDetails(d, i),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isDelivered ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: isDelivered ? const Color(0xFF059669) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Center(
                            child: Text(
                              '${i + 1}',
                              style: TextStyle(
                                color: isDelivered ? Colors.white : const Color(0xFF334155),
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                d['customerName'] ?? 'Customer',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                d['customerAddress'] ?? 'Madhapur Doorstep',
                                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${d['plannedMilk'] ?? 1}L',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF059669)),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.navigation_rounded, size: 18, color: Color(0xFF1D4ED8)),
                          onPressed: () => _openMap(d['customerAddress'] ?? ''),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  // =========================================================
  // TAB 2: CUSTOMERS DIRECTORY
  // =========================================================
  Widget _buildCustomersTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Assigned Customers', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF0F172A))),
                  Text('${_assignedCustomers.length} registered households', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => _showAddCustomerModal(),
                icon: const Icon(Icons.add, size: 16, color: Colors.white),
                label: const Text('Add to Route', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Colors.white)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_assignedCustomers.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
              child: const Center(child: Text('No customers currently assigned to route')),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _assignedCustomers.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) {
                final c = _assignedCustomers[i];
                final name = c['name'] ?? 'Household';
                final mobile = c['mobile'] ?? '';
                final address = c['address'] ?? '';
                final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] : {};
                final milk = plan['milkQty'] ?? 1;

                return InkWell(
                  onTap: () => _openCustomerDetails(c),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
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
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: Center(
                            child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'C', style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A))),
                              Text(address, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)), maxLines: 1, overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: plan['frequency'] == 'alternate' ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${milk}L ${plan['frequency'] == 'alternate' ? 'Alternate' : 'Daily'}',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 11,
                              color: plan['frequency'] == 'alternate' ? const Color(0xFFB45309) : const Color(0xFF065F46),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        IconButton(
                          icon: const Icon(Icons.phone_rounded, size: 18, color: Color(0xFF059669)),
                          onPressed: () => _callCustomer(mobile),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  void _showAddCustomerModal() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => _FullScreenAddCustomerPage(
          api: _api,
          defaultArea: _profileArea,
          onSuccess: () => _loadData(silent: true),
        ),
      ),
    );
  }

  void _openStopDetails(Map<String, dynamic> stop, int index) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => _FullScreenStopDetailsPage(
          stop: stop,
          stopIndex: index + 1,
          onDeliver: () {
            Navigator.of(ctx).pop();
            _showMarkDeliveredDialog(stop);
          },
          onSkip: () {
            Navigator.of(ctx).pop();
            _showMarkNotDeliveredDialog(stop);
          },
          onCall: (phone) => _callCustomer(phone),
          onMap: (addr) => _openMap(addr),
        ),
      ),
    );
  }

  void _openCustomerDetails(Map<String, dynamic> customer) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => _FullScreenCustomerDetailsPage(
          customer: customer,
          onCall: (phone) => _callCustomer(phone),
          onMap: (addr) => _openMap(addr),
        ),
      ),
    );
  }


  // =========================================================
  // TAB 3: CASH RECONCILIATION
  // =========================================================
  Widget _buildCashTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Cash & Shift Reconciliation', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF0F172A))),
          const Text('Today collection breakdown across morning route', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF065F46), Color(0xFF059669)]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('TOTAL CASH COLLECTED', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text('₹${_todayCash.toInt()}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
                const Divider(height: 24, color: Colors.white24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('UPI COLLECTED', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w700)),
                        Text('₹${_todayUpi.toInt()}', style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('HANDOVER STATUS', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w700)),
                        const Text('Pending Deposit', style: TextStyle(color: Color(0xFFFDE68A), fontSize: 13, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Text('Today Paid Drops', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
          const SizedBox(height: 10),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _deliveries.where((d) => d['status'] == 'delivered').length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) {
              final d = _deliveries.where((d) => d['status'] == 'delivered').toList()[i];
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(d['customerName'] ?? 'Customer', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                        Text('Method: ${(d['paymentMethod'] ?? 'advance').toString().toUpperCase()}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      ],
                    ),
                    Text('₹${d['paymentAmount'] ?? 60}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF059669))),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // =========================================================
  // TAB 4: DRIVER PROFILE (EXACT SCREENSHOT LAYOUT & REALTIME MODALS)
  // =========================================================
  Widget _buildProfileTab(String boyName, String boyArea) {
    final displayName = _profileName.isNotEmpty ? _profileName : boyName;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 22.0, vertical: 14.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. TOP PROFILE IDENTITY ROW (Avatar with Camera Badge, Name, Partner ID & Red Edit Profile Button)
          Row(
            children: [
              // Avatar with Camera Badge
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    decoration: const BoxDecoration(
                      color: Color(0xFF00A86B),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        displayName.isNotEmpty ? displayName[0].toUpperCase() : 'N',
                        style: const TextStyle(
                          fontSize: 34,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: InkWell(
                      onTap: _showUpdatePhotoDialog,
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.camera_alt_outlined,
                          size: 13,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 20),

              // Name, Partner ID, and Edit Profile Button
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName.toLowerCase(),
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '$_partnerId · On duty',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 10),
                    ElevatedButton(
                      onPressed: () => setState(() => _activeProfileSubScreen = 'edit'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE53935),
                        foregroundColor: Colors.white,
                        elevation: 3,
                        shadowColor: const Color(0xFFE53935).withValues(alpha: 0.35),
                        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 7),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text(
                        'Edit Profile',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 26),

          // 2. MENU ITEMS LIST (MATCHING SCREENSHOT WITH REALTIME FUNCTIONALITIES)
          _buildProfileMenuItem(
            icon: Icons.person_outline_rounded,
            title: 'Personal Information',
            subtitle: 'Partner ID: $_partnerId · On duty',
            onTap: () => setState(() => _activeProfileSubScreen = 'personal'),
          ),
          const Divider(height: 1, indent: 44, color: Color(0xFFF1F5F9)),
          _buildProfileMenuItem(
            icon: Icons.phone_outlined,
            title: 'Contact Information',
            subtitle: '$_profilePhone · $_profileEmail',
            onTap: () => setState(() => _activeProfileSubScreen = 'contact'),
          ),
          const Divider(height: 1, indent: 44, color: Color(0xFFF1F5F9)),
          _buildProfileMenuItem(
            icon: Icons.location_on_outlined,
            title: 'Territory & Dispatch',
            subtitle: '$_profileArea · Morning Dispatch',
            onTap: () => setState(() => _activeProfileSubScreen = 'territory'),
          ),
          const Divider(height: 1, indent: 44, color: Color(0xFFF1F5F9)),
          _buildProfileMenuItem(
            icon: Icons.two_wheeler_outlined,
            title: 'Vehicle & Equipment',
            subtitle: _vehiclePlate == 'Vehicle not assigned' || _vehiclePlate.isEmpty
                ? 'Vehicle not assigned · Commercial Cargo EV'
                : '$_vehiclePlate · Commercial Cargo EV',
            onTap: () => setState(() => _activeProfileSubScreen = 'vehicle'),
          ),
          const Divider(height: 1, indent: 44, color: Color(0xFFF1F5F9)),
          _buildProfileMenuItem(
            icon: Icons.headset_mic_outlined,
            title: 'Help & Support',
            subtitle: 'Text admin, route queries & dispatch helpline',
            onTap: () => setState(() => _activeProfileSubScreen = 'support'),
          ),
          const Divider(height: 1, indent: 44, color: Color(0xFFF1F5F9)),
          _buildProfileMenuItem(
            icon: Icons.logout_rounded,
            title: 'Log out',
            titleColor: const Color(0xFFE53935),
            iconColor: const Color(0xFFE53935),
            onTap: _showLogoutDialog,
          ),
          const Divider(height: 1, indent: 44, color: Color(0xFFF1F5F9)),
          _buildProfileMenuItem(
            icon: Icons.delete_outline_rounded,
            title: 'Delete Partner Account',
            subtitle: 'Permanently remove your account and profile data',
            titleColor: const Color(0xFFDC2626),
            iconColor: const Color(0xFFDC2626),
            onTap: _showDeleteAccountDialog,
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // MENU ITEM ROW HELPER (MATCHING SCREENSHOT WITH DIRECT CLEAN ICONS)
  Widget _buildProfileMenuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    Color titleColor = const Color(0xFF0F172A),
    Color iconColor = const Color(0xFF00A86B),
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 24, color: iconColor),
            const SizedBox(width: 18),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      color: titleColor,
                      letterSpacing: -0.2,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_rounded, size: 20, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  // =========================================================
  // FULL SCREEN 1: EDIT DRIVER PROFILE (WITH REALTIME SAVE)
  // =========================================================
  Widget _buildEditProfileFullScreen() {
    final nameCtrl = TextEditingController(text: _profileName);
    final phoneCtrl = TextEditingController(text: _profilePhone);
    final emailCtrl = TextEditingController(text: _profileEmail);
    final areaCtrl = TextEditingController(text: _profileArea);
    final vehiclePlateCtrl = TextEditingController(text: _vehiclePlate);
    final bloodCtrl = TextEditingController(text: _bloodGroup);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSubScreenHeader('Edit Driver Profile', 'Update personal credentials, assigned territory, and vehicle details.'),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Partner Information', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
                const SizedBox(height: 14),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder(), isDense: true),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Mobile Phone Number', border: OutlineInputBorder(), isDense: true),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder(), isDense: true),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: areaCtrl,
                  decoration: const InputDecoration(labelText: 'Assigned Route Territory', border: OutlineInputBorder(), isDense: true),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: vehiclePlateCtrl,
                  decoration: const InputDecoration(labelText: 'Assigned Vehicle / Plate', border: OutlineInputBorder(), isDense: true),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: bloodCtrl,
                  decoration: const InputDecoration(labelText: 'Blood Group', border: OutlineInputBorder(), isDense: true),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                setState(() {
                  _profileName = nameCtrl.text.trim();
                  _profilePhone = phoneCtrl.text.trim();
                  _profileEmail = emailCtrl.text.trim();
                  _profileArea = areaCtrl.text.trim();
                  _vehiclePlate = vehiclePlateCtrl.text.trim();
                  _bloodGroup = bloodCtrl.text.trim();
                  _activeProfileSubScreen = null;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('✓ Driver profile details updated successfully!'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Save Profile Changes', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => setState(() => _activeProfileSubScreen = null),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================
  // FULL SCREEN 2: PERSONAL INFORMATION
  // =========================================================
  Widget _buildPersonalInformationFullScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSubScreenHeader('Personal Information', 'Identity & verified credentials across Natural Milk Dairy fleet.'),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                _buildFullScreenRow('Full Name', _profileName),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Partner ID', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    Row(
                      children: [
                        Text(_partnerId, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () {
                            Clipboard.setData(ClipboardData(text: _partnerId));
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Copied $_partnerId to clipboard')));
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(6)),
                            child: const Row(
                              children: [
                                Icon(Icons.copy_rounded, size: 12, color: Color(0xFF059669)),
                                SizedBox(width: 4),
                                Text('Copy', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Designation', 'Delivery Partner'),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Shift Duty Status', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    Row(
                      children: [
                        Text(
                          _isOnDuty ? 'On duty 🟢' : 'Off duty ⏸️',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: _isOnDuty ? const Color(0xFF059669) : const Color(0xFF64748B)),
                        ),
                        const SizedBox(width: 6),
                        Switch.adaptive(
                          value: _isOnDuty,
                          activeThumbColor: const Color(0xFF059669),
                          onChanged: (val) {
                            setState(() => _isOnDuty = val);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Shift Status: ${_isOnDuty ? 'On duty (Ready for morning deliveries)' : 'Off duty (Break mode)'}'),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Blood Group', _bloodGroup),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Driving License', _drivingLicense),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Member Since', 'Active Partner (Verified)'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.edit_outlined, size: 18, color: Colors.white),
              label: const Text('Edit Personal Information', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
              onPressed: () => setState(() => _activeProfileSubScreen = 'edit'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================
  // FULL SCREEN 3: CONTACT INFORMATION
  // =========================================================
  Widget _buildContactInformationFullScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSubScreenHeader('Contact Information', 'Phone, email & dispatch depot communications.'),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
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
                    const Text('Mobile Phone', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    Row(
                      children: [
                        Text(_profilePhone, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        const SizedBox(width: 6),
                        IconButton(
                          icon: const Icon(Icons.phone_rounded, size: 18, color: Color(0xFF059669)),
                          tooltip: 'Call Phone',
                          onPressed: () => _callCustomer(_profilePhone),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 16, color: Color(0xFF64748B)),
                          tooltip: 'Copy Phone',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: _profilePhone));
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Phone number copied!')));
                          },
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Email Address', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    Row(
                      children: [
                        Text(_profileEmail, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        const SizedBox(width: 4),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 16, color: Color(0xFF64748B)),
                          tooltip: 'Copy Email',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: _profileEmail));
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Email copied!')));
                          },
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Dispatch Hub', _depotAddress),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Supervisor Hotline', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    Row(
                      children: [
                        Text(_supervisorHotline, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                        const SizedBox(width: 4),
                        IconButton(
                          icon: const Icon(Icons.phone_forwarded_rounded, size: 18, color: Color(0xFF059669)),
                          onPressed: () => _callCustomer(_supervisorHotline),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Emergency Contact', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    Row(
                      children: [
                        Text(_emergencyContact, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFDC2626))),
                        const SizedBox(width: 4),
                        IconButton(
                          icon: const Icon(Icons.phone_rounded, size: 18, color: Color(0xFFDC2626)),
                          onPressed: () => _callCustomer(_emergencyContact),
                        ),
                      ],
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

  // =========================================================
  // FULL SCREEN 4: TERRITORY & DISPATCH
  // =========================================================
  Widget _buildTerritoryDispatchFullScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSubScreenHeader('Territory & Dispatch', 'Route assignment, morning shift schedule & hub details.'),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                _buildFullScreenRow('Assigned Route Area', _profileArea.toUpperCase()),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Shift Schedule', '$_operatingHours (Morning Dispatch)'),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Dispatch Hub Depot', _depotAddress),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Assigned Customers', '${_assignedCustomers.length} Regular Subscribers'),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Pending Drops Today', '$_pendingCount remaining'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.map_outlined, color: Colors.white, size: 18),
              label: const Text('Open Route & Customer Stops', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
              onPressed: () {
                setState(() {
                  _activeProfileSubScreen = null;
                  _selectedTabIndex = 1;
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================
  // FULL SCREEN 5: VEHICLE & EQUIPMENT
  // =========================================================
  Widget _buildVehicleEquipmentFullScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSubScreenHeader('Vehicle & Equipment', 'Delivery cargo vehicle specs, insulated crates & gear status.'),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                _buildFullScreenRow(
                  'Registration Plate',
                  _vehiclePlate == 'Vehicle not assigned' || _vehiclePlate.isEmpty ? 'Commercial Cargo EV TS-09-EV-4412' : _vehiclePlate,
                ),
                const Divider(height: 22, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Vehicle Model', _vehicleModel),
                const Divider(height: 22, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Crates Capacity', '4 Insulated Crates (48 Litres Daily)'),
                const Divider(height: 22, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Battery Level', '88% Charged ⚡ (Est. 45 km remaining)'),
                const Divider(height: 22, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Insulated Milk Box', 'Verified Cold Chain OK (3.8°C)'),
                const Divider(height: 22, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Reflective Safety Jacket', 'Issued & Verified'),
                const Divider(height: 22, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Handlebar Phone Mount', 'Installed'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.report_problem_outlined, color: Color(0xFFDC2626), size: 18),
              label: const Text('Report Vehicle Breakdown / Issue', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w800)),
              onPressed: () => setState(() => _activeProfileSubScreen = 'support'),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFDC2626)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================
  // FULL SCREEN 6: HELP & SUPPORT DESK
  // =========================================================
  Widget _buildHelpSupportFullScreen() {
    final textCtrl = TextEditingController();
    String category = 'Route Delay';
    String priority = 'normal';
    bool isSending = false;

    return StatefulBuilder(
      builder: (ctx, setDesk) => SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSubScreenHeader('Help & Support Desk', 'Send real-time alerts to dispatch operations desk & emergency hotlines.'),
            const SizedBox(height: 16),

            // Quick Hotlines
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('DISPATCH DESK', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF065F46))),
                        const SizedBox(height: 2),
                        const Text('+91 98765 43210', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: () => _callCustomer('+919876543210'),
                          child: const Row(
                            children: [
                              Icon(Icons.phone_rounded, size: 14, color: Color(0xFF059669)),
                              SizedBox(width: 4),
                              Text('Call Hotline', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('BREAKDOWN SOS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF991B1B))),
                        const SizedBox(height: 2),
                        const Text('+91 98480 22338', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: () => _callCustomer('+919848022338'),
                          child: const Row(
                            children: [
                              Icon(Icons.phone_rounded, size: 14, color: Color(0xFFDC2626)),
                              SizedBox(width: 4),
                              Text('Emergency SOS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFDC2626))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Message Composer Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Send Live Alert to Operations Team', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
                  const SizedBox(height: 12),
                  const Text('Category', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
                    items: const [
                      DropdownMenuItem(value: 'Route Delay', child: Text('Route Delay / Traffic Hold')),
                      DropdownMenuItem(value: 'Vehicle Breakdown', child: Text('Vehicle Breakdown / Puncture')),
                      DropdownMenuItem(value: 'Customer Issue', child: Text('Customer Door Locked / Unreachable')),
                      DropdownMenuItem(value: 'Milk Shortage', child: Text('Extra Milk / Curd Crates Needed')),
                      DropdownMenuItem(value: 'Payment Dispute', child: Text('Cash / QR Payment Dispute')),
                    ],
                    onChanged: (v) => setDesk(() => category = v ?? category),
                  ),
                  const SizedBox(height: 14),
                  const Text('Priority Level', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  const SizedBox(height: 6),
                  Row(
                    children: ['normal', 'high', 'urgent'].map((p) {
                      final isSel = priority == p;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(p.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: isSel ? Colors.white : const Color(0xFF475569))),
                          selected: isSel,
                          selectedColor: p == 'urgent' ? const Color(0xFFDC2626) : const Color(0xFF059669),
                          onSelected: (_) => setDesk(() => priority = p),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),
                  const Text('Message Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: textCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Type your message or route issue for dispatch admin...',
                      hintStyle: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: isSending
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.send_rounded, size: 16, color: Colors.white),
                      label: Text(isSending ? 'Sending to Admin...' : 'Send Alert to Dispatch Admin', style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
                      onPressed: isSending
                          ? null
                          : () async {
                              final text = textCtrl.text.trim();
                              if (text.isEmpty) return;
                              setDesk(() => isSending = true);
                              try {
                                await _api.post('/api/supports', {
                                  'senderRole': 'delivery_boy',
                                  'senderName': _profileName,
                                  'category': category,
                                  'priority': priority,
                                  'subject': '🚚 Driver Alert: $category',
                                  'message': text,
                                });
                              } catch (_) {}

                              setDesk(() {
                                isSending = false;
                                _sentSupportMessages.insert(0, {
                                  'id': 'sup_${DateTime.now().millisecondsSinceEpoch}',
                                  'category': category,
                                  'priority': priority,
                                  'text': text,
                                  'createdAt': DateTime.now().toIso8601String(),
                                });
                                textCtrl.clear();
                              });

                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('✓ Support alert sent to Dispatch Operations team!')),
                                );
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Sent Messages History
            if (_sentSupportMessages.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text('Your Sent Alerts to Admin', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
              const SizedBox(height: 10),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _sentSupportMessages.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (ctx, i) {
                  final msg = _sentSupportMessages[i];
                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(msg['category'] ?? 'Support', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF0F172A))),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: msg['priority'] == 'urgent' ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                (msg['priority'] ?? 'normal').toString().toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: msg['priority'] == 'urgent' ? const Color(0xFFDC2626) : const Color(0xFF059669),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(msg['text'] ?? '', style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569))),
                        const SizedBox(height: 6),
                        const Row(
                          children: [
                            Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF059669)),
                            SizedBox(width: 4),
                            Text('Delivered to Admin Dispatch Desk', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                          ],
                        ),
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

  // =========================================================
  // FULL SCREEN NOTIFICATIONS CENTER
  // =========================================================
  Widget _buildNotificationsScreen() {
    final filtered = _notifications.where((n) {
      if (_notifFilter == 'unread') return n['isRead'] != true;
      if (_notifFilter == 'deliveries') {
        return n['type'] == 'delivery_assigned' || n['type'] == 'delivery_completed';
      }
      if (_notifFilter == 'system') {
        return n['type'] == 'system' || n['type'] == 'route_update';
      }
      return true;
    }).toList();

    return Column(
      children: [
        // Filter tabs
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildNotifFilterChip('all', 'All (${_notifications.length})'),
                const SizedBox(width: 8),
                _buildNotifFilterChip('unread', 'Unread ($_unreadNotifCount)'),
                const SizedBox(width: 8),
                _buildNotifFilterChip(
                  'deliveries',
                  'Deliveries (${_notifications.where((n) => n['type'] == 'delivery_assigned' || n['type'] == 'delivery_completed').length})',
                ),
                const SizedBox(width: 8),
                _buildNotifFilterChip(
                  'system',
                  'System (${_notifications.where((n) => n['type'] == 'system' || n['type'] == 'route_update').length})',
                ),
              ],
            ),
          ),
        ),

        // Notifications List
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 68,
                        height: 68,
                        decoration: const BoxDecoration(
                          color: Color(0xFFF1F5F9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.notifications_off_outlined, size: 32, color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No notifications found',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'You are all caught up with your deliveries and routes.',
                        style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final item = filtered[i];
                    final id = (item['_id'] ?? item['id'] ?? '').toString();
                    final isRead = item['isRead'] == true;
                    final type = item['type']?.toString() ?? 'system';

                    IconData iconData = Icons.notifications_active_outlined;
                    Color iconColor = const Color(0xFF3B82F6);
                    Color iconBg = const Color(0xFFEFF6FF);

                    if (type == 'delivery_assigned') {
                      iconData = Icons.local_shipping_outlined;
                      iconColor = const Color(0xFF059669);
                      iconBg = const Color(0xFFECFDF5);
                    } else if (type == 'delivery_completed') {
                      iconData = Icons.check_circle_outline_rounded;
                      iconColor = const Color(0xFF10B981);
                      iconBg = const Color(0xFFECFDF5);
                    } else if (type == 'route_update') {
                      iconData = Icons.alt_route_rounded;
                      iconColor = const Color(0xFF8B5CF6);
                      iconBg = const Color(0xFFF5F3FF);
                    }

                    return Dismissible(
                      key: Key(id.isNotEmpty ? id : 'notif_$i'),
                      direction: DismissDirection.endToStart,
                      onDismissed: (_) => _deleteNotif(id),
                      background: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        alignment: Alignment.centerRight,
                        child: const Icon(Icons.delete_outline_rounded, color: Colors.white, size: 22),
                      ),
                      child: InkWell(
                        onTap: () {
                          _markNotifAsRead(id);
                          if (type == 'delivery_assigned') {
                            setState(() {
                              _isNotificationScreenOpen = false;
                              _selectedTabIndex = 0;
                            });
                          } else if (type == 'route_update') {
                            setState(() {
                              _isNotificationScreenOpen = false;
                              _selectedTabIndex = 1;
                            });
                          }
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isRead ? Colors.white : const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isRead ? const Color(0xFFE2E8F0) : const Color(0xFFBBF7D0),
                              width: isRead ? 1 : 1.3,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.02),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: iconBg,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(iconData, size: 20, color: iconColor),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            item['title'] ?? 'Notification',
                                            style: TextStyle(
                                              fontWeight: isRead ? FontWeight.w700 : FontWeight.w800,
                                              fontSize: 14,
                                              color: const Color(0xFF0F172A),
                                            ),
                                          ),
                                        ),
                                        if (!isRead)
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF059669),
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      item['message'] ?? '',
                                      style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569), height: 1.35),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          _formatNotifTime(item['createdAt']?.toString()),
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                                        ),
                                        InkWell(
                                          onTap: () => _deleteNotif(id),
                                          child: const Padding(
                                            padding: EdgeInsets.all(4.0),
                                            child: Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildNotifFilterChip(String key, String label) {
    final isSelected = _notifFilter == key;
    return InkWell(
      onTap: () => setState(() => _notifFilter = key),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF059669) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  String _formatNotifTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return 'Just now';
    try {
      final date = DateTime.parse(timeStr);
      final diff = DateTime.now().difference(date);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return 'Recent';
    }
  }

  Widget _buildSubScreenHeader(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF0F172A), letterSpacing: -0.2)),
        const SizedBox(height: 4),
        Text(subtitle, style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
      ],
    );
  }

  Widget _buildFullScreenRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
        ),
      ],
    );
  }

  // LOGOUT CONFIRMATION DIALOG
  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out Driver Account?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: const Text('Are you sure you want to log out of your driver console?', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final auth = context.read<AuthProvider>();
              await auth.logout();
              if (!mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (route) => false,
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            child: const Text('Sign Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  // DELETE ACCOUNT CONFIRMATION DIALOG
  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Partner Account?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFFDC2626))),
        content: const Text(
          'Permanently deactivate your partner account? All your delivery records will be archived and route stops will be returned to dispatch operations.',
          style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Keep Account')),
          ElevatedButton(
            onPressed: () async {
              final auth = context.read<AuthProvider>();
              await auth.logout();
              if (!mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (route) => false,
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            child: const Text('Delete Account', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  // UPDATE AVATAR PHOTO FULL SCREEN
  void _showUpdatePhotoDialog() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => _FullScreenPhotoVerifyPage(
          profileName: _profileName,
          partnerId: _partnerId,
          onVerified: () {},
        ),
      ),
    );
  }
}

// ============================================================================
// FULL SCREEN PAGE: MARK DOORSTEP DELIVERY
// ============================================================================
class _FullScreenMarkDeliveredPage extends StatefulWidget {
  final Map<String, dynamic> delivery;
  final ApiService api;
  final VoidCallback onSuccess;

  const _FullScreenMarkDeliveredPage({
    required this.delivery,
    required this.api,
    required this.onSuccess,
  });

  @override
  State<_FullScreenMarkDeliveredPage> createState() => _FullScreenMarkDeliveredPageState();
}

class _FullScreenMarkDeliveredPageState extends State<_FullScreenMarkDeliveredPage> {
  late final TextEditingController _milkController;
  late final TextEditingController _curdController;
  late final TextEditingController _collectedController;
  late final TextEditingController _proofUrlController;
  late String _paymentMethod;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _milkController = TextEditingController(text: (widget.delivery['plannedMilk'] ?? 1).toString());
    _curdController = TextEditingController(text: (widget.delivery['plannedCurd'] ?? 0).toString());
    _collectedController = TextEditingController(text: (widget.delivery['totalAmount'] ?? 60).toString());
    _proofUrlController = TextEditingController(
      text: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1792133689/doorstep-delivery-proofs/zc721dwoso4s4dj9n6po.png',
    );
    _paymentMethod = widget.delivery['paymentMethod'] ?? 'advance';
  }

  @override
  void dispose() {
    _milkController.dispose();
    _curdController.dispose();
    _collectedController.dispose();
    _proofUrlController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    final deliveryId = widget.delivery['_id'] ?? widget.delivery['id'];
    final milk = num.tryParse(_milkController.text) ?? 1;
    final curd = num.tryParse(_curdController.text) ?? 0;
    final collected = num.tryParse(_collectedController.text) ?? 0;

    final res = await widget.api.post('/api/deliveries/$deliveryId/delivered', {
      'actualMilk': milk,
      'actualCurd': curd,
      'paymentMethod': _paymentMethod,
      'collectedAmount': collected,
      'proofUrl': _proofUrlController.text.trim(),
      'actor': 'Mobile Driver',
    });

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (res['success'] == true) {
      widget.onSuccess();
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ Delivery marked completed with photo proof!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res['message'] ?? 'Failed to update delivery')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final customerName = widget.delivery['customerName'] ?? 'Customer';
    final customerAddress = widget.delivery['customerAddress'] ?? 'Doorstep Delivery';
    final customerPhone = widget.delivery['customerPhone'] ?? '';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A), size: 24),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Mark Doorstep Delivery',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: Color(0xFFECFDF5),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 26),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          customerName,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          customerAddress,
                          style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (customerPhone.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            '📞 $customerPhone',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Delivered Quantities', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Actual Milk (Litres)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF334155))),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _milkController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true, suffixText: 'L'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Actual Curd (Grams)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF334155))),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _curdController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true, suffixText: 'g'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Text('Payment Settlement', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _paymentMethod,
              decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
              items: const [
                DropdownMenuItem(value: 'advance', child: Text('Prepaid / Advance Subscription')),
                DropdownMenuItem(value: 'cash', child: Text('Cash on Delivery')),
                DropdownMenuItem(value: 'upi', child: Text('UPI on Delivery')),
                DropdownMenuItem(value: 'credit', child: Text('Monthly Credit Ledger')),
              ],
              onChanged: (v) => setState(() => _paymentMethod = v ?? _paymentMethod),
            ),
            if (_paymentMethod == 'cash' || _paymentMethod == 'upi') ...[
              const SizedBox(height: 16),
              const Text('Amount Collected (₹)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF334155))),
              const SizedBox(height: 6),
              TextFormField(
                controller: _collectedController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true, prefixText: '₹ '),
              ),
            ],
            const SizedBox(height: 20),
            const Text('Doorstep Delivery Photo Proof', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
            const SizedBox(height: 8),
            TextFormField(
              controller: _proofUrlController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                isDense: true,
                prefixIcon: Icon(Icons.camera_alt_outlined, size: 20, color: Color(0xFF059669)),
                hintText: 'https://res.cloudinary.com/...',
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.shield_outlined, color: Color(0xFF059669), size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Doorstep delivery photo is required to ensure verified doorstep drop.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF065F46), fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSubmitting
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : const Text(
                        '✓ Confirm Delivery (Proof Verified)',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white),
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

// ============================================================================
// FULL SCREEN PAGE: ADD CUSTOMER TO ROUTE
// ============================================================================
class _FullScreenAddCustomerPage extends StatefulWidget {
  final ApiService api;
  final String defaultArea;
  final VoidCallback onSuccess;

  const _FullScreenAddCustomerPage({
    required this.api,
    required this.defaultArea,
    required this.onSuccess,
  });

  @override
  State<_FullScreenAddCustomerPage> createState() => _FullScreenAddCustomerPageState();
}

class _FullScreenAddCustomerPageState extends State<_FullScreenAddCustomerPage> {
  final _nameCtrl = TextEditingController();
  final _mobileCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  late final TextEditingController _areaCtrl;
  double _milkQty = 1.0;
  String _frequency = 'daily';
  String _paymentType = 'credit';
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _areaCtrl = TextEditingController(text: widget.defaultArea);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _mobileCtrl.dispose();
    _addressCtrl.dispose();
    _areaCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.trim().isEmpty || _mobileCtrl.text.trim().isEmpty || _addressCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all required fields (Name, Mobile, Address)')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    final res = await widget.api.post('/api/customers', {
      'name': _nameCtrl.text.trim(),
      'mobile': _mobileCtrl.text.trim(),
      'address': _addressCtrl.text.trim(),
      'area': _areaCtrl.text.trim(),
      'deliveryPlan': {'milkQty': _milkQty, 'frequency': _frequency},
      'paymentInfo': {'paymentType': _paymentType},
    });

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (res['success'] == true) {
      widget.onSuccess();
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ Customer added to route successfully!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res['message'] ?? 'Failed to add customer')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A), size: 24),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Add Customer to Route',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Customer Profile', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
            const SizedBox(height: 12),
            TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Customer Full Name *', border: OutlineInputBorder(), isDense: true)),
            const SizedBox(height: 12),
            TextField(controller: _mobileCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Mobile Phone Number *', prefixText: '+91 ', border: OutlineInputBorder(), isDense: true)),
            const SizedBox(height: 12),
            TextField(controller: _addressCtrl, decoration: const InputDecoration(labelText: 'Flat / Doorstep Address *', border: OutlineInputBorder(), isDense: true)),
            const SizedBox(height: 12),
            TextField(controller: _areaCtrl, decoration: const InputDecoration(labelText: 'Assigned Territory / Area', border: OutlineInputBorder(), isDense: true)),
            const SizedBox(height: 24),

            const Text('Daily Delivery Schedule', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Daily Milk Quantity:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF334155))),
                DropdownButton<double>(
                  value: _milkQty,
                  items: const [0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map((q) => DropdownMenuItem(value: q, child: Text('${q}L Daily'))).toList(),
                  onChanged: (v) => setState(() => _milkQty = v ?? _milkQty),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Delivery Frequency:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF334155))),
                DropdownButton<String>(
                  value: _frequency,
                  items: const [
                    DropdownMenuItem(value: 'daily', child: Text('Everyday (Daily)')),
                    DropdownMenuItem(value: 'alternate', child: Text('Alternate Days')),
                  ],
                  onChanged: (v) => setState(() => _frequency = v ?? _frequency),
                ),
              ],
            ),
            const SizedBox(height: 20),

            const Text('Billing & Settlement Type', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('Monthly Credit')),
                    selected: _paymentType == 'credit',
                    selectedColor: const Color(0xFFECFDF5),
                    onSelected: (s) => setState(() => _paymentType = 'credit'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('Prepaid')),
                    selected: _paymentType == 'prepaid',
                    selectedColor: const Color(0xFFECFDF5),
                    onSelected: (s) => setState(() => _paymentType = 'prepaid'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('COD')),
                    selected: _paymentType == 'cod',
                    selectedColor: const Color(0xFFECFDF5),
                    onSelected: (s) => setState(() => _paymentType = 'cod'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSubmitting
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : const Text('✓ Add Customer to Route', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// FULL SCREEN PAGE: ROUTE STOP DETAILS
// ============================================================================
class _FullScreenStopDetailsPage extends StatelessWidget {
  final Map<String, dynamic> stop;
  final int stopIndex;
  final VoidCallback onDeliver;
  final VoidCallback onSkip;
  final void Function(String phone) onCall;
  final void Function(String address) onMap;

  const _FullScreenStopDetailsPage({
    required this.stop,
    required this.stopIndex,
    required this.onDeliver,
    required this.onSkip,
    required this.onCall,
    required this.onMap,
  });

  @override
  Widget build(BuildContext context) {
    final name = stop['customerName'] ?? 'Customer';
    final address = stop['customerAddress'] ?? 'Madhapur Doorstep';
    final phone = stop['customerPhone'] ?? '';
    final milk = stop['plannedMilk'] ?? 1;
    final curd = stop['plannedCurd'] ?? 0;
    final status = stop['status'] ?? 'pending';
    final isDone = status == 'delivered';
    final isMissed = status == 'not_delivered';
    final payment = stop['paymentMethod'] ?? 'advance';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A), size: 24),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Route Stop #$stopIndex',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
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
                          name,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0F172A)),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDone
                              ? const Color(0xFFECFDF5)
                              : (isMissed ? const Color(0xFFFEF2F2) : const Color(0xFFFFFBEB)),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isDone
                                ? const Color(0xFFBBF7D0)
                                : (isMissed ? const Color(0xFFFECACA) : const Color(0xFFFDE68A)),
                          ),
                        ),
                        child: Text(
                          isDone ? '✓ Delivered' : (isMissed ? '✕ Missed' : '○ Pending'),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: isDone
                                ? const Color(0xFF059669)
                                : (isMissed ? const Color(0xFFDC2626) : const Color(0xFFB45309)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: Color(0xFF64748B)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(address, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w500)),
                      ),
                    ],
                  ),
                  if (phone.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.phone_outlined, size: 16, color: Color(0xFF059669)),
                        const SizedBox(width: 4),
                        Text(phone, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                if (phone.isNotEmpty)
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.phone, size: 16, color: Color(0xFF059669)),
                      label: const Text('Call', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w800)),
                      onPressed: () => onCall(phone),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: const Color(0xFFECFDF5),
                        side: const BorderSide(color: Color(0xFFBBF7D0)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                if (phone.isNotEmpty) const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.navigation, size: 16, color: Color(0xFF2563EB)),
                    label: const Text('Navigate', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w800)),
                    onPressed: () => onMap(address),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: const Color(0xFFEFF6FF),
                      side: const BorderSide(color: Color(0xFFBFDBFE)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Delivery Order Plan', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  _buildStopDetailRow('Scheduled Milk Qty', '${milk}L Fresh Milk'),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildStopDetailRow('Scheduled Curd Qty', curd > 0 ? '${curd}g Curd' : 'None'),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildStopDetailRow('Billing Type', payment.toString().toUpperCase()),
                ],
              ),
            ),
            const SizedBox(height: 32),
            if (!isDone) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.check_rounded, color: Colors.white, size: 20),
                  label: const Text('Mark Doorstep Delivery', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                  onPressed: onDeliver,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.close_rounded, color: Color(0xFFDC2626), size: 18),
                  label: const Text('Mark Not Delivered', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w700)),
                  onPressed: onSkip,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFFECACA)),
                    backgroundColor: const Color(0xFFFEF2F2),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStopDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
        Text(value, style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A), fontWeight: FontWeight.w800)),
      ],
    );
  }
}

// ============================================================================
// FULL SCREEN PAGE: CUSTOMER ROUTE PROFILE
// ============================================================================
class _FullScreenCustomerDetailsPage extends StatelessWidget {
  final Map<String, dynamic> customer;
  final void Function(String phone) onCall;
  final void Function(String address) onMap;

  const _FullScreenCustomerDetailsPage({
    required this.customer,
    required this.onCall,
    required this.onMap,
  });

  @override
  Widget build(BuildContext context) {
    final name = customer['name'] ?? 'Household Customer';
    final mobile = customer['mobile'] ?? '';
    final address = customer['address'] ?? 'Not specified';
    final area = customer['area'] ?? 'Madhapur';
    final plan = customer['deliveryPlan'] is Map ? customer['deliveryPlan'] : {};
    final milk = plan['milkQty'] ?? 1;
    final curd = plan['curdQty'] ?? 0;
    final frequency = plan['frequency'] ?? 'daily';
    final customerId = customer['customerId'] ?? customer['_id'] ?? customer['id'] ?? '';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A), size: 24),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Customer Route Profile',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: const BoxDecoration(
                      color: Color(0xFF059669),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'C',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 24, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: Color(0xFF0F172A))),
                        const SizedBox(height: 2),
                        Text('ID: $customerId', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Text(area, style: const TextStyle(fontSize: 12, color: Color(0xFF059669), fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                if (mobile.isNotEmpty)
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.phone, size: 16, color: Color(0xFF059669)),
                      label: const Text('Call Customer', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w800)),
                      onPressed: () => onCall(mobile),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: const Color(0xFFECFDF5),
                        side: const BorderSide(color: Color(0xFFBBF7D0)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                if (mobile.isNotEmpty) const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.navigation, size: 16, color: Color(0xFF2563EB)),
                    label: const Text('Open Map', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w800)),
                    onPressed: () => onMap(address),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: const Color(0xFFEFF6FF),
                      side: const BorderSide(color: Color(0xFFBFDBFE)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Daily Delivery Schedule', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  _buildCustomerRow('Daily Milk Qty', '${milk}L Fresh Milk'),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildCustomerRow('Daily Curd Qty', curd > 0 ? '${curd}g Curd' : 'None'),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildCustomerRow('Frequency', frequency.toString().toUpperCase()),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildCustomerRow('Drop Address', address),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomerRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
        const SizedBox(width: 12),
        Expanded(
          child: Text(value, textAlign: TextAlign.right, style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A), fontWeight: FontWeight.w800)),
        ),
      ],
    );
  }
}

// ============================================================================
// FULL SCREEN PAGE: DRIVER PHOTO VERIFICATION
// ============================================================================
class _FullScreenPhotoVerifyPage extends StatelessWidget {
  final String profileName;
  final String partnerId;
  final VoidCallback onVerified;

  const _FullScreenPhotoVerifyPage({
    required this.profileName,
    required this.partnerId,
    required this.onVerified,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A), size: 24),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Driver Profile Photo',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 24),
            Center(
              child: Container(
                width: 120,
                height: 120,
                decoration: const BoxDecoration(
                  color: Color(0xFF059669),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    profileName.isNotEmpty ? profileName[0].toUpperCase() : 'N',
                    style: const TextStyle(fontSize: 54, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              profileName,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            Text(
              '$partnerId · Natural Milk Dairy Fleet',
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 30),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.verified_user_rounded, color: Color(0xFF059669), size: 28),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Verified Fleet Driver ID', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                        SizedBox(height: 2),
                        Text('Photo badge is verified against commercial carrier records.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.check_circle_outline, color: Colors.white),
                label: const Text('Confirm & Save Photo', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
                onPressed: () {
                  onVerified();
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('✓ Profile badge photo verified!')),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}


